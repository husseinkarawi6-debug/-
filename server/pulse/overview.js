// One payload per Business Pulse render (cached, invalidated on data writes).
import { resolvePeriod, addDays, todayIn } from './period.js';
import * as Q from './queries.js';
import { buildAlerts, buildOpportunities, buildBrief } from './intelligence.js';
import { listTasks } from '../agents/tasks.js';

const FILTER_KEYS = ['brand', 'category', 'status', 'q'];

export function overview(ctx, params = {}) {
  const tz = ctx.config.timezone;
  const period = resolvePeriod(params, tz);
  const currency = Q.resolveCurrency(ctx, params.currency);
  const filters = Object.fromEntries(FILTER_KEYS.map(k => [k, params[k] ? String(params[k]).slice(0, 80) : '']));
  const sort = params.sort || 'profit';
  const key = JSON.stringify({ period, currency, filters, sort });
  const o = ctx.cache.wrap(`overview:${key}`, () => build(ctx, period, currency, filters, sort, tz));
  // tasks change independently of report data → always fresh
  return { ...o, tasks: listTasks(ctx, { origin: 'business_pulse', limit: 8 }).map(slimTask) };
}

function build(ctx, period, currency, filters, sort, tz) {
  const today = todayIn(tz);
  const pending = Q.pendingReports(ctx);
  const history = Q.reportHistory(ctx, { limit: 30 });
  const lastFailed = Q.lastFailed(ctx);
  const lastApproved = currency ? Q.latestApprovedDate(ctx, currency) : null;
  const base = { today, period, currency, filters, sort, pending, history, lastApproved, lastFailed, timezone: tz, business: ctx.business.name,
    options: currency ? Q.filterOptions(ctx, period.from, period.to, currency) : { brands: [], categories: [], currencies: [] } };
  if (!currency) return { ...base, state: 'no_reports' };

  const cmp = Q.comparison(ctx, period, currency);
  if (!cmp.current.reports) {
    return { ...base, state: 'no_data', cmp, alerts: buildAlerts({ period, currency, cmp, prods: [], exp: { categories: [] }, returns: [], pending }) };
  }
  const prodsAll = Q.products(ctx, period.from, period.to, currency, {}, { limit: 1000 }).items;
  const prodsView = Q.hasProductFilter(filters) || sort !== 'profit'
    ? Q.products(ctx, period.from, period.to, currency, filters, { sort, limit: 100 })
    : { items: prodsAll.slice(0, 100), total: prodsAll.length, sort: 'profit' };
  const exp = Q.expenseBreakdown(ctx, period, currency);
  const returns = Q.returnsList(ctx, period.from, period.to, currency);
  const d = { period, currency, cmp, prods: prodsAll, exp, returns, pending };
  const alerts = buildAlerts(d);
  const opportunities = buildOpportunities(ctx, d);
  const brief = buildBrief(d, alerts, opportunities);
  const chartFrom = period.kind === 'day' ? addDays(period.anchor, -13) : period.from;
  const dayReport = period.kind === 'day' ? Q.approvedReports(ctx, period.from, period.to, currency)[0] || null : null;
  return {
    ...base, state: 'ok', cmp, alerts, opportunities, brief,
    products: prodsView, exp, returns,
    other: Q.otherRevenue(ctx, period.from, period.to, currency),
    reportNotes: Q.reportNotes(ctx, period.from, period.to, currency),
    series: Q.series(ctx, chartFrom, period.to, currency, filters),
    groups: { category: Q.groups(ctx, period.from, period.to, currency, 'category', filters), brand: Q.groups(ctx, period.from, period.to, currency, 'brand', filters) },
    dayReport: dayReport && { id: dayReport.id, file: dayReport.original_name, validation: dayReport.validation, approved_at: dayReport.approved_at },
    top: pickTop(alerts, opportunities, prodsAll),
  };
}

function pickTop(alerts, opps, prods) {
  const issue = alerts.find(a => a.type !== 'RETURNS' && a.type !== 'NEEDS_REVIEW') || null;
  const opp = opps[0] || null;
  const action = opp ? opp.actions.find(a => a.primary) || opp.actions[0] : null;
  return { issue, opportunity: opp, action: action && opp ? { ...action, product: opp.product, title: opp.title } : null, best: prods.filter(p => p.profit > 0)[0] || null };
}

export const slimTask = t => ({ id: t.id, agent: t.agent, kind: t.kind, title: t.title, status: t.status, status_reason: t.status_reason, result: t.result, created_at: t.created_at, updated_at: t.updated_at, parent_task_id: t.parent_task_id, origin: t.origin, origin_ref: t.origin_ref });

/** Items orbiting the Business Pulse planet — every one backed by a DB record. */
export function planetItems(ctx, params = {}) {
  const o = overview(ctx, { ...params, period: 'day', date: params.date });
  const items = [];
  if (o.state !== 'ok') {
    for (const p of o.pending.slice(0, 2)) items.push({ id: `report:${p.id}`, type: 'review', title: p.original_name, meta: p.failing ? `${p.failing} قيمة تحتاج مراجعة` : 'بانتظار الاعتماد', status: 'pending', source: { reportId: p.id }, action: { kind: 'review_report', reportId: p.id } });
    if (o.lastFailed) items.push({ id: `report:${o.lastFailed.id}`, type: 'alert', title: 'تعذّرت قراءة تقرير', meta: o.lastFailed.original_name, status: 'failed', source: { reportId: o.lastFailed.id }, action: { kind: 'report', reportId: o.lastFailed.id } });
    return { state: o.state, lastApproved: o.lastApproved, currency: o.currency, items, sub: o.state === 'no_reports' ? 'لا توجد تقارير بعد' : 'لا يوجد تقرير لليوم بعد' };
  }
  for (const a of o.alerts.slice(0, 3)) items.push({ id: `alert:${a.id}`, type: 'alert', title: a.title, meta: a.reason, status: a.severity, source: a.source, action: { kind: 'alert', id: a.id }, alert: a });
  for (const op of o.opportunities.slice(0, 2)) items.push({ id: `opp:${op.id}`, type: 'opportunity', title: op.title, meta: op.reason, status: 'open', source: op.source, action: { kind: 'opportunity', id: op.id }, opportunity: op });
  const best = o.top.best;
  if (best && !o.opportunities.some(op => op.product === best.key)) items.push({ id: `product:${best.key}`, type: 'product', title: best.name, meta: `${best.quantity} قطع`, status: best.status, source: { reportIds: best.reportIds }, action: { kind: 'product', key: best.key }, product: best });
  const y = o.cmp.baselines.yesterday;
  if (y) items.push({ id: `compare:${o.period.anchor}`, type: 'compare', title: 'اليوم مقابل أمس', meta: null, status: 'info', source: { reportIds: [...o.cmp.current.reportIds, ...y.reportIds] }, action: { kind: 'compare' }, delta: y.delta });
  if (o.dayReport) items.push({ id: `report:${o.dayReport.id}`, type: 'file', title: o.dayReport.file, meta: o.dayReport.validation === 'VALID' ? 'تقرير اليوم، معتمد' : 'تقرير اليوم، معتمد مع فروقات', status: 'approved', source: { reportId: o.dayReport.id }, action: { kind: 'report', reportId: o.dayReport.id } });
  items.push({ id: `net:${o.period.anchor}`, type: 'output', title: 'صافي اليوم', meta: null, status: 'info', source: { reportIds: o.cmp.current.reportIds }, action: { kind: 'metric', key: 'net_profit' }, values: o.cmp.current });
  for (const t of o.tasks.slice(0, 2)) items.push({ id: `task:${t.id}`, type: 'agent', title: t.title, meta: null, status: t.status, source: { taskId: t.id }, action: { kind: 'task', id: t.id }, task: t });
  if (o.reportNotes[0]) items.push({ id: `note:${o.reportNotes[0].reportId}`, type: 'note', title: 'ملاحظات التقرير', meta: o.reportNotes[0].text.split(/[.\n]/)[0], status: 'info', source: { reportId: o.reportNotes[0].reportId }, action: { kind: 'notes' } });
  return { state: 'ok', currency: o.currency, date: o.period.anchor, net: o.cmp.current.net_profit, yesterday: y ? { net: y.values.net_profit, delta: y.delta.net_profit } : null, alertCount: o.alerts.length, items };
}
