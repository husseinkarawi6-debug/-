// Agent tasks created from Business Pulse. The browser sends only references
// (product key, alert id, period); the context payload is built here from the
// database so an agent never receives numbers the UI made up.
import { audit } from '../db.js';
import { resolvePeriod, addDays } from '../pulse/period.js';
import { products, comparison, expenseBreakdown, approvedReports, resolveCurrency, productDetail } from '../pulse/queries.js';
import { round2 } from '../pulse/text.js';

export const AGENTS = ['analyst', 'operations', 'purchasing', 'growth', 'designer', 'researcher'];
const KINDS = {
  purchasing: ['reorder_review', 'price_review'],
  analyst: ['analyse', 'price_review'],
  operations: ['ops_review'],
  growth: ['campaign'],
  designer: ['creative'],
  researcher: ['research'],
};

export class TaskError extends Error { constructor(code, message, status = 400) { super(message); this.code = code; this.status = status; } }

function productContext(ctx, key, period, currency) {
  const d = productDetail(ctx, key, period, currency);
  if (!d) throw new TaskError('NOT_FOUND', 'المنتج غير موجود في التقارير المعتمدة', 404);
  const p = d.product;
  const last7 = products(ctx, addDays(period.to, -6), period.to, currency, { product: key }, { limit: 1 }).items[0];
  const reports7 = approvedReports(ctx, addDays(period.to, -6), period.to, currency).length;
  const reports30 = approvedReports(ctx, addDays(period.to, -29), period.to, currency).length;
  return {
    product: { key, name: p.name, model: p.model || null, sku: p.sku || null, brand: p.brand || null, category: p.category || null },
    period: { from: period.from, to: period.to },
    currency,
    performance: { quantity: p.quantity ?? null, sales: p.sales ?? null, cost: p.cost ?? null, profit: p.profit ?? null, margin_pct: p.margin ?? null, share_of_gross_pct: p.share ?? null, tags: p.tags || [] },
    velocity: {
      last_7_days: last7 ? { units: last7.quantity, reports: reports7, units_per_report_day: reports7 ? round2(last7.quantity / reports7) : null } : { units: 0, reports: reports7 },
      last_30_days: d.last30 ? { units: d.last30.quantity, reports: reports30, units_per_report_day: reports30 ? round2(d.last30.quantity / reports30) : null } : { units: 0, reports: reports30 },
    },
    avg_unit_sale_price: p.quantity ? round2(p.sales / p.quantity) : null,
    source: d.lines.slice(0, 5).map(l => ({ report_id: l.report_id, date: l.report_date, file: l.original_name, page: l.page, line: l.line_no })),
  };
}

const STOCK = { stock: null, stock_note: 'بيانات المخزون غير مرتبطة — لا تقترح كمية شراء؛ راجع إعادة الطلب فقط.' };

/** Build title + context for a task from references. */
export function buildTask(ctx, req) {
  const { agent, kind } = req;
  if (!AGENTS.includes(agent) || !(KINDS[agent] || []).includes(kind)) throw new TaskError('BAD_TASK', 'نوع مهمة غير معروف');
  const period = resolvePeriod({ period: req.period || 'day', date: req.date, from: req.from, to: req.to }, ctx.config.timezone);
  const currency = resolveCurrency(ctx, req.currency);
  if (!currency) throw new TaskError('NO_DATA', 'لا توجد تقارير معتمدة بعد', 409);
  const reason = req.reason ? String(req.reason).slice(0, 400) : null;
  const ref = req.ref || null;
  const biz = { business: ctx.business.name, timezone: ctx.config.timezone };

  if (agent === 'purchasing') {
    if (!req.productKey) throw new TaskError('BAD_TASK', 'المنتج مطلوب');
    const c = productContext(ctx, req.productKey, period, currency);
    return kind === 'reorder_review'
      ? { title: `راجع إعادة طلب ${c.product.name}`, context: { ...biz, ...c, ...STOCK, reason: reason || 'أداء قوي في نبض الأعمال', request: 'راجع إعادة الطلب' } }
      : { title: `راجع كلفة شراء ${c.product.name}`, context: { ...biz, ...c, ...STOCK, reason: reason || 'هامش منخفض', request: 'راجع كلفة الشراء وأسعار الموردين مقابل سعر البيع' } };
  }
  if (agent === 'growth') {
    if (!req.productKey) throw new TaskError('BAD_TASK', 'المنتج مطلوب');
    const c = productContext(ctx, req.productKey, period, currency);
    return { title: `حملة لـ${c.product.name}`, context: { ...biz, ...c, reason: reason || 'فرصة من نبض الأعمال', request: 'اقترح حملة تسويقية قصيرة مبنية على هذه الأرقام فقط', can_handoff_to: 'designer' } };
  }
  if (agent === 'operations') {
    const exp = expenseBreakdown(ctx, period, currency);
    const category = req.category || (exp.categories[0] && exp.categories[0].name);
    const days = approvedReports(ctx, addDays(period.anchor, -6), period.anchor, currency).map(r => {
      const row = ctx.db.prepare('SELECT SUM(amount) v FROM report_expenses WHERE report_id = ? AND COALESCE(category, name) = ?').get(r.id, category);
      return { date: r.report_date, amount: round2(row.v || 0) };
    });
    const entries = exp.entries.filter(e => (e.category || e.name) === category).map(e => ({ date: e.report_date, name: e.name, amount: e.amount, ref: e.ref, note: e.note }));
    const cat = exp.categories.find(c => c.name === category) || null;
    return { title: `راجع مصروف ${category || 'المصاريف'}`, context: { ...biz, currency, period: { from: period.from, to: period.to }, category, current: cat, baselines: exp.baselines, last_7_days: days, entries, reason: reason || 'مصروفات أعلى من المعتاد', request: 'اشرح سبب ارتفاع هذا المصروف واقترح إجراء تشغيلي' } };
  }
  if (agent === 'analyst') {
    const cmp = comparison(ctx, period, currency);
    const strip = v => { const { reportIds, dates, ...r } = v; return r; };
    const base = { ...biz, currency, period: { from: period.from, to: period.to, kind: period.kind }, current: strip(cmp.current),
      baselines: Object.fromEntries(Object.entries(cmp.baselines).map(([k, b]) => [k, { label: b.label, values: strip(b.values), delta: b.delta }])),
      source_report_ids: cmp.current.reportIds };
    if (kind === 'price_review') {
      const loss = products(ctx, period.from, period.to, currency, { status: 'loss' }, { limit: 10 }).items;
      const one = req.productKey ? products(ctx, period.from, period.to, currency, { product: req.productKey }, { limit: 1 }).items : [];
      const list = (one.length ? one : loss).map(p => ({ name: p.name, sku: p.sku, quantity: p.quantity, sales: p.sales, cost: p.cost, profit: p.profit, margin_pct: p.margin }));
      if (!list.length) throw new TaskError('NO_DATA', 'لا توجد منتجات بخسارة في هذه الفترة', 409);
      return { title: list.length === 1 ? `راجع سعر ${list[0].name}` : `راجع أسعار ${list.length} منتجات بخسارة`, context: { ...base, metric: 'profit', breakdown: list, reason: reason || 'بيع بخسارة', question: 'لماذا بيعت هذه المنتجات بخسارة؟ وما السعر الأدنى الذي يغطي الكلفة؟' } };
    }
    const metric = req.metric || null;
    const q = req.question ? String(req.question).slice(0, 300)
      : req.category ? `حلّل سبب قوة مبيعات فئة ${req.category} في آخر 7 أيام مقارنة بالأسبوع السابق.`
      : metric ? `حلّل سبب تغيّر ${metric} في هذه الفترة مقارنة بالخط الأساسي.` : 'حلّل أداء هذه الفترة وأهم أسباب التغيّر.';
    const breakdown = req.category
      ? products(ctx, addDays(period.anchor, -13), period.anchor, currency, { category: req.category }, { limit: 10 }).items.map(p => ({ name: p.name, quantity: p.quantity, sales: p.sales, profit: p.profit }))
      : products(ctx, period.from, period.to, currency, {}, { limit: 8 }).items.map(p => ({ name: p.name, quantity: p.quantity, sales: p.sales, profit: p.profit, margin_pct: p.margin }));
    return { title: q.length > 70 ? `${q.slice(0, 68)}…` : q, context: { ...base, metric, category: req.category || null, breakdown, reason, question: q } };
  }
  if (agent === 'designer') {
    throw new TaskError('BAD_TASK', 'مهام المصمّم تُنشأ من التسويق والنمو (handoff) فقط');
  }
  throw new TaskError('BAD_TASK', 'نوع مهمة غير مدعوم');
}

export function createTask(ctx, req, { actor, parentId = null, origin = 'business_pulse' } = {}) {
  const t = req.title && req.context ? req : buildTask(ctx, req);
  const r = ctx.db.prepare(`INSERT INTO agent_tasks (business_id, agent, kind, title, origin, origin_ref, context, status, parent_task_id)
    VALUES (?,?,?,?,?,?,?,?,?)`).run(ctx.business.id, req.agent, req.kind, t.title, origin, req.ref ? JSON.stringify(req.ref) : null, JSON.stringify(t.context), 'queued', parentId);
  const id = Number(r.lastInsertRowid);
  audit(ctx.db, { businessId: ctx.business.id, actor, action: 'task.created', entity: 'agent_task', entityId: id, detail: { agent: req.agent, kind: req.kind } });
  return getTask(ctx, id);
}

export function getTask(ctx, id) {
  const t = ctx.db.prepare('SELECT * FROM agent_tasks WHERE id = ? AND business_id = ?').get(id, ctx.business.id);
  if (!t) return null;
  return { ...t, context: JSON.parse(t.context), origin_ref: t.origin_ref ? JSON.parse(t.origin_ref) : null };
}

export function listTasks(ctx, { agent, status, origin, since, limit = 50 } = {}) {
  const w = ['business_id = ?'], a = [ctx.business.id];
  if (agent) { w.push('agent = ?'); a.push(agent); }
  if (status) { w.push('status = ?'); a.push(status); }
  if (origin) { w.push('origin LIKE ?'); a.push(`${origin}%`); }
  if (since) { w.push('updated_at > ?'); a.push(since); }
  a.push(Math.min(Number(limit) || 50, 200));
  return ctx.db.prepare(`SELECT * FROM agent_tasks WHERE ${w.join(' AND ')} ORDER BY id DESC LIMIT ?`).all(...a)
    .map(t => ({ ...t, context: JSON.parse(t.context), origin_ref: t.origin_ref ? JSON.parse(t.origin_ref) : null }));
}

export function setTaskStatus(ctx, id, status, { reason = null, result } = {}) {
  ctx.db.prepare(`UPDATE agent_tasks SET status = ?, status_reason = ?, result = COALESCE(?, result), updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = ?`)
    .run(status, reason, result ?? null, id);
}

/** Growth → Designer handoff: canonical product + verified facts, no re-research. */
export function handoffToDesigner(ctx, growthTask, brief) {
  const c = growthTask.context;
  const facts = [];
  if (c.performance.quantity != null) facts.push(`باع ${c.performance.quantity} قطعة بين ${c.period.from} و${c.period.to}`);
  if (c.avg_unit_sale_price != null) facts.push(`متوسط سعر البيع الفعلي ${c.avg_unit_sale_price} ${c.currency}`);
  const context = {
    business: c.business,
    brand_identity: { business_name: c.business, source: 'اسم النشاط في نيبتون' },
    canonical_product: c.product,
    verified_facts: facts,
    campaign_brief: String(brief || '').slice(0, 2000),
    product_images: [], product_images_note: 'لا توجد صور منتج مرفوعة في نيبتون لهذا المنتج',
    rules: 'لا تبحث من جديد عن المنتج؛ استخدم الحقائق أعلاه فقط. لا تكتب سعراً غير موجود في الحقائق.',
  };
  return createTask(ctx, { agent: 'designer', kind: 'creative', ref: { type: 'task', id: growthTask.id }, title: `تصميم حملة ${c.product.name}`, context },
    { actor: 'agent:growth', parentId: growthTask.id, origin: `agent:growth` });
}
