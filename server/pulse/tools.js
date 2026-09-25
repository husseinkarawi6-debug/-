// Small, read-only business tools. Used by Ask ZOE and by agents executed via
// the Harness. Each returns a compact JSON payload — never a DB dump.
import { resolvePeriod, addDays } from './period.js';
import { comparison, products, expenseBreakdown, returnsList, pendingReports, resolveCurrency } from './queries.js';
import { buildAlerts, buildOpportunities } from './intelligence.js';

const periodSchema = {
  period: { type: 'string', enum: ['day', '7', '30', 'month'], description: 'day = one report day, 7/30 = trailing days, month = month to date' },
  date: { type: 'string', description: 'Anchor date YYYY-MM-DD (defaults to the dashboard date)' },
};

export const TOOL_DEFS = [
  { name: 'get_business_summary', description: 'Totals for a period (sales, gross_profit, expenses, other_revenue, net_profit, units_sold, number of reports) with baselines (yesterday, 7-day average or previous period).',
    input_schema: { type: 'object', properties: periodSchema, additionalProperties: false } },
  { name: 'get_period_comparison', description: 'Compare a period to its baseline; returns current, baseline values and % deltas. Only baselines backed by approved reports are returned.',
    input_schema: { type: 'object', properties: periodSchema, additionalProperties: false } },
  { name: 'get_product_performance', description: 'Products aggregated for a period: quantity, sales, cost, profit, margin %, share of gross profit, status tags (loss, low, strong, fast, returned). Optional search/filter.',
    input_schema: { type: 'object', properties: { ...periodSchema, sort: { type: 'string', enum: ['sales', 'profit', 'units', 'margin'] }, q: { type: 'string' }, brand: { type: 'string' }, category: { type: 'string' }, status: { type: 'string', enum: ['loss', 'low', 'strong', 'fast', 'returned'] }, limit: { type: 'integer', minimum: 1, maximum: 20 } }, additionalProperties: false } },
  { name: 'get_expense_breakdown', description: 'Expenses by category for a period with baselines (yesterday / 7-day average / previous period) and the largest expense entries with their notes and journal refs.',
    input_schema: { type: 'object', properties: periodSchema, additionalProperties: false } },
  { name: 'get_business_alerts', description: 'Deterministic alerts for the period (loss sales, low margin, expense spike, revenue drop, unusual change, returns, reports pending review).',
    input_schema: { type: 'object', properties: periodSchema, additionalProperties: false } },
  { name: 'get_business_opportunities', description: 'Deterministic opportunities for the period (strong product, sales velocity, good-margin/low-volume, category growth). No stock data exists.',
    input_schema: { type: 'object', properties: periodSchema, additionalProperties: false } },
];

export function makeToolRunner(ctx, defaults) {
  const cur = resolveCurrency(ctx, defaults.currency);
  const per = input => resolvePeriod({ period: input.period || defaults.period || 'day', date: input.date || defaults.date }, ctx.config.timezone);
  const brief = p => ({ from: p.from, to: p.to, kind: p.kind });
  const slimCmp = c => ({ current: strip(c.current), baselines: Object.fromEntries(Object.entries(c.baselines).map(([k, b]) => [k, { label: b.label, values: strip(b.values), delta: b.delta }])) });
  const strip = v => { const { reportIds, dates, ...rest } = v; return rest; };
  const intel = input => {
    const p = per(input);
    const cmp = comparison(ctx, p, cur);
    const prods = products(ctx, p.from, p.to, cur, {}, { limit: 500 }).items;
    const exp = expenseBreakdown(ctx, p, cur);
    const d = { period: p, currency: cur, cmp, prods, exp, returns: returnsList(ctx, p.from, p.to, cur), pending: pendingReports(ctx) };
    return { p, d };
  };
  return {
    currency: cur,
    async run(name, input = {}) {
      switch (name) {
        case 'get_business_summary':
        case 'get_period_comparison': {
          const p = per(input);
          return { currency: cur, period: brief(p), ...slimCmp(comparison(ctx, p, cur)) };
        }
        case 'get_product_performance': {
          const p = per(input);
          const r = products(ctx, p.from, p.to, cur, { q: input.q, brand: input.brand, category: input.category, status: input.status }, { sort: input.sort || 'profit', limit: Math.min(input.limit || 8, 20) });
          return { currency: cur, period: brief(p), total: r.total, items: r.items.map(x => ({ name: x.name, sku: x.sku, model: x.model, brand: x.brand, category: x.category, quantity: x.quantity, sales: x.sales, cost: x.cost, profit: x.profit, margin: x.margin, share: x.share, tags: x.tags })) };
        }
        case 'get_expense_breakdown': {
          const p = per(input);
          const e = expenseBreakdown(ctx, p, cur);
          return { currency: cur, period: brief(p), baselines: e.baselines, categories: e.categories, entries: e.entries.slice(0, 10).map(x => ({ date: x.report_date, name: x.name, category: x.category, amount: x.amount, ref: x.ref, note: x.note })) };
        }
        case 'get_business_alerts': {
          const { p, d } = intel(input);
          return { currency: cur, period: brief(p), alerts: buildAlerts(d).map(a => ({ type: a.type, severity: a.severity, title: a.title, reason: a.reason, baseline: a.baseline, recommended: a.recommended })) };
        }
        case 'get_business_opportunities': {
          const { p, d } = intel(input);
          return { currency: cur, period: brief(p), stock_data: 'not connected', opportunities: buildOpportunities(ctx, d).map(o => ({ type: o.type, title: o.title, reason: o.reason, facts: o.facts })) };
        }
        default: throw new Error(`unknown tool ${name}`);
      }
    },
  };
}

export { addDays };
