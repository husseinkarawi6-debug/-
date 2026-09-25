// Ask ZOE inside Business Pulse. Numbers are always computed by the backend:
// with Claude, ZOE calls the small business tools; without Claude, a computed
// answer is built from the same tools (and labelled as such).
import { makeToolRunner, TOOL_DEFS } from '../pulse/tools.js';
import { claudeLoop } from './claude.js';
import { fmtMoney } from '../pulse/text.js';

const SYSTEM = `أنت زوي، مساعدة حسين في نيبتون، وتعملين الآن داخل «نبض الأعمال».
- أجيبي فقط من نتائج الأدوات (أرقام التقارير المعتمدة). لا تحسبي من الذاكرة ولا تخمّني.
- إذا لم تتوفر بيانات قولي "لا توجد بيانات" بوضوح.
- لا مخزون مرتبط: لا تقولي إن منتجاً سينفد ولا تقترحي كميات.
- لا تجمعي عملات مختلفة.
- جواب قصير (2–5 جمل) بلهجة عراقية خفيفة، مع الأرقام والعملة.`;

export async function askZoe(ctx, { question, period = 'day', date, currency, history = [] }, { client, model } = {}) {
  const q = String(question || '').trim().slice(0, 1000);
  if (!q) throw Object.assign(new Error('السؤال فارغ'), { status: 400, code: 'EMPTY' });
  const tools = makeToolRunner(ctx, { currency, period, date });
  if (!tools.currency) return { mode: 'computed', answer: 'لا توجد بيانات: ما في أي تقرير معتمد بعد. ارفع تقرير اليوم أولاً.', toolsUsed: [] };
  if (client) {
    const hist = history.slice(-6).filter(m => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
      .map(m => ({ role: m.role, content: m.content.slice(0, 2000) }));
    // history must alternate and start with user
    while (hist.length && hist[0].role !== 'user') hist.shift();
    const out = await claudeLoop(client, {
      model, system: SYSTEM, history: hist,
      user: `${q}\n\n(سياق الشاشة: الفترة=${period}${date ? `، التاريخ=${date}` : ''}، العملة=${tools.currency})`,
      tools: TOOL_DEFS, runTool: (n, i) => tools.run(n, i),
    });
    return { mode: 'claude', answer: out.text || 'لا توجد بيانات.', toolsUsed: out.toolsUsed };
  }
  return computedAnswer(tools, q, { period, date });
}

/** Deterministic answer from the same tools, used when Claude is not configured. */
export async function computedAnswer(tools, q, { period, date }) {
  const m = v => fmtMoney(v, tools.currency);
  const used = [];
  const run = async (n, i = {}) => { used.push(n); return tools.run(n, { period, date, ...i }); };
  const s = q.replace(/[أإآ]/g, 'ا');
  let answer;
  if (/مصاريف|مصروف|المصروفات/.test(s)) {
    const e = await run('get_expense_breakdown');
    const c = await run('get_business_summary');
    if (!c.current.reports) answer = 'لا توجد بيانات لهذه الفترة.';
    else {
      const top = e.categories.slice(0, 2).map(x => `${x.name} ${m(x.amount)}${x.avg7 != null ? ` (المتوسط ${m(x.avg7)})` : x.yesterday != null ? ` (أمس ${m(x.yesterday)})` : ''}`).join('، ');
      const b = c.baselines.avg7 || c.baselines.prev;
      answer = `المصاريف ${m(c.current.expenses)}${b && b.delta.expenses != null ? `، ${b.delta.expenses >= 0 ? 'أعلى' : 'أقل'} بـ${Math.abs(b.delta.expenses)}% ${b.label.replace('مقارنة ب', 'من ')}` : ''}. أكبر البنود: ${top}.`;
    }
  } else if (/قارن|مقارنه|مقارنة|امس/.test(s)) {
    const c = await run('get_period_comparison');
    const b = c.baselines.yesterday || c.baselines.prev;
    if (!c.current.reports) answer = 'لا توجد بيانات لهذه الفترة.';
    else if (!b) answer = 'لا توجد بيانات للمقارنة: ما في تقرير معتمد للفترة السابقة.';
    else answer = `${b.label}: المبيعات ${m(c.current.sales)} مقابل ${m(b.values.sales)}، الصافي ${m(c.current.net_profit)} مقابل ${m(b.values.net_profit)}، المصاريف ${m(c.current.expenses)} مقابل ${m(b.values.expenses)}.`;
  } else if (/خساره|خسارة|خسر/.test(s)) {
    const p = await run('get_product_performance', { status: 'loss', limit: 10 });
    answer = p.items.length ? `انباعت بخسارة: ${p.items.map(x => `${x.name} (${m(x.profit)})`).join('، ')}.` : 'ما في منتجات انباعت بخسارة بهذه الفترة.';
  } else if (/افضل|اقوى|الاكثر/.test(s)) {
    const p = await run('get_product_performance', { sort: /قطع|كميه|كمية/.test(s) ? 'units' : /مبيعات/.test(s) ? 'sales' : 'profit', limit: 3 });
    answer = p.items.length ? `أفضل منتج ${p.items[0].name}: ${p.items[0].quantity} قطع، ربح ${m(p.items[0].profit)}${p.items[0].share != null ? ` (${p.items[0].share}% من ربح البضاعة)` : ''}.` : 'لا توجد بيانات منتجات لهذه الفترة.';
  } else {
    const c = await run('get_business_summary');
    if (!c.current.reports) answer = 'لا توجد بيانات: ما في تقرير معتمد لهذه الفترة.';
    else {
      const a = await run('get_business_alerts');
      const p = await run('get_product_performance', { limit: 1 });
      const y = c.baselines.yesterday || c.baselines.prev;
      const parts = [`الصافي ${m(c.current.net_profit)}${y && y.delta.net_profit != null ? `، ${y.delta.net_profit >= 0 ? 'أعلى' : 'أقل'} ${y.label.replace('مقارنة ب', 'من ')} بـ${Math.abs(y.delta.net_profit)}%` : ''}.`];
      if (p.items[0]) parts.push(`أفضل منتج ${p.items[0].name} (ربح ${m(p.items[0].profit)}).`);
      if (a.alerts.length) parts.push(`انتبه: ${a.alerts.slice(0, 2).map(x => x.title).join('، ')}.`);
      answer = parts.join(' ');
    }
  }
  return { mode: 'computed', answer, toolsUsed: used, note: 'جواب محسوب من التقارير المعتمدة (Claude غير مفعّل على الخادم).' };
}
