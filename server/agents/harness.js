// Harness adapter. Business Pulse only calls dispatch(taskId); how a task is
// executed is decided here. The default executor runs the agent on Claude with
// small read-only business tools. If an external Harness exists, replace
// `execute` — the task table and the UI do not change.
import { getTask, setTaskStatus, handoffToDesigner, listTasks } from './tasks.js';
import { makeToolRunner, TOOL_DEFS } from '../pulse/tools.js';
import { claudeLoop } from '../zoe/claude.js';

const ROLE = {
  analyst: 'أنت المحلّل في نيبتون. تحلل أرقام نبض الأعمال وتشرح الأسباب بدقة وباختصار.',
  operations: 'أنت وكيل العمليات في نيبتون. تراجع المصاريف التشغيلية وتقترح إجراءات عملية.',
  purchasing: 'أنت وكيل المشتريات في نيبتون. تراجع إعادة الطلب وكلفة الشراء.',
  growth: 'أنت وكيل التسويق والنمو في نيبتون. تكتب خطة حملة قصيرة مبنية على الأرقام الحقيقية فقط.',
  designer: 'أنت المصمّم في نيبتون. تكتب مواصفات تصميم (نص، تكوين، ألوان) من البريف والحقائق المعطاة فقط.',
  researcher: 'أنت الباحث في نيبتون.',
};
const RULES = `القواعد:
- استخدم فقط السياق المعطى ونتائج الأدوات. إذا معلومة غير موجودة قل "لا توجد بيانات".
- لا تخترع مخزوناً أو أسعاراً أو مواصفات أو اتجاهات أو مقارنات.
- بيانات المخزون غير مرتبطة: لا تقترح كميات شراء.
- اكتب بالعربية (لهجة عراقية خفيفة مقبولة)، مختصر، نقاط واضحة، وأذكر الأرقام مع العملة.`;

const HANDOFF_TOOL = {
  name: 'handoff_to_designer',
  description: 'Send the finished campaign brief to the Designer agent with the canonical product and verified facts already in your context.',
  input_schema: { type: 'object', properties: { brief: { type: 'string', description: 'Campaign brief for the designer: message, audience, format, copy lines. Only verified facts.' } }, required: ['brief'], additionalProperties: false },
};

export function createHarness(ctx, { client = null, model, onChange = () => {} } = {}) {
  const running = new Set();

  async function execute(task) {
    const tools = makeToolRunner(ctx, { currency: task.context.currency, period: 'day', date: task.context.period ? task.context.period.to : undefined });
    const defs = task.agent === 'designer' ? [] : task.agent === 'growth' ? [...TOOL_DEFS, HANDOFF_TOOL] : TOOL_DEFS;
    let handoff = null;
    const out = await claudeLoop(client, {
      model,
      system: `${ROLE[task.agent]}\n${RULES}`,
      user: `المهمة: ${task.title}\nالسياق (JSON من قاعدة بيانات نيبتون):\n${JSON.stringify(task.context)}`,
      tools: defs,
      runTool: async (name, input) => {
        if (name === 'handoff_to_designer') { handoff = handoffToDesigner(ctx, task, input.brief); return { ok: true, designer_task_id: handoff.id }; }
        return tools.run(name, input);
      },
    });
    return { text: out.text, handoff };
  }

  async function dispatch(id) {
    const task = getTask(ctx, id);
    if (!task || running.has(id)) return task;
    if (!client) {
      setTaskStatus(ctx, id, 'queued', { reason: 'مشغّل الوكلاء غير متصل: لم يُضبط مفتاح Claude (ANTHROPIC_API_KEY) على الخادم. المهمة محفوظة وتُنفَّذ تلقائياً عند التفعيل.' });
      onChange(id);
      return getTask(ctx, id);
    }
    running.add(id);
    setTaskStatus(ctx, id, 'running');
    onChange(id);
    // run in the background; the UI polls /api/agents/tasks
    (async () => {
      try {
        const { text, handoff } = await execute(task);
        setTaskStatus(ctx, id, 'done', { result: text, reason: handoff ? `أُرسل للمصمّم (مهمة #${handoff.id})` : null });
        if (handoff) dispatch(handoff.id);
      } catch (e) {
        setTaskStatus(ctx, id, 'failed', { reason: `فشل الوكيل: ${e.userMessage || e.message}`.slice(0, 400) });
      } finally {
        running.delete(id);
        onChange(id);
      }
    })();
    return getTask(ctx, id);
  }

  /** On startup (or when Claude becomes available) pick up tasks that were waiting. */
  function resumeQueued() {
    if (!client) return 0;
    const q = listTasks(ctx, { status: 'queued', limit: 50 });
    q.forEach(t => dispatch(t.id));
    return q.length;
  }

  return { dispatch, resumeQueued, get enabled() { return !!client; }, running };
}
