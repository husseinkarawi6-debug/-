// Business Pulse read model. Only APPROVED reports feed the dashboard; every
// query is scoped to one business and ONE currency (no cross-currency sums).
import { addDays, datesIn } from './period.js';
import { round2, normLabel } from './text.js';

export const THRESHOLDS = {
  lowMargin: 2,          // % — below this a sale is "low margin"
  strongShare: 20,       // % of period gross profit — "strong" product
  fastUnitsPerDay: 3,    // units per reporting day — "fast-moving"
  avgMinReports: 3,      // minimum reports for a 7-day average baseline
  expenseSpike: 25,      // % above 7-day average
  revenueDrop: 20,       // % below 7-day average
  unusualChange: 50,     // % net change vs yesterday
};
const FIELDS = ['sales', 'gross_profit', 'expenses', 'other_revenue', 'net_profit', 'units_sold'];

export function currencies(ctx) {
  return ctx.db.prepare(`SELECT currency, COUNT(*) n, MAX(report_date) last FROM reports WHERE business_id = ? AND status = 'approved' AND currency IS NOT NULL
    GROUP BY currency ORDER BY last DESC`).all(ctx.business.id);
}

export function resolveCurrency(ctx, requested) {
  const list = currencies(ctx);
  if (requested && list.some(c => c.currency === requested)) return requested;
  if (requested && /^[A-Z]{3}$/.test(requested)) return requested; // valid but no data yet → empty state
  return list.length ? list[0].currency : null;
}

export function latestApprovedDate(ctx, currency) {
  const r = ctx.db.prepare(`SELECT MAX(report_date) d FROM reports WHERE business_id = ? AND status = 'approved' AND currency IS ?`).get(ctx.business.id, currency);
  return r ? r.d : null;
}

export function approvedReports(ctx, from, to, currency) {
  return ctx.db.prepare(`SELECT r.*, f.original_name FROM reports r JOIN report_files f ON f.id = r.file_id
    WHERE r.business_id = ? AND r.status = 'approved' AND r.currency IS ? AND r.report_date BETWEEN ? AND ? ORDER BY r.report_date`)
    .all(ctx.business.id, currency, from, to);
}

export function summarize(reports) {
  const s = { reports: reports.length, reportIds: reports.map(r => r.id), dates: reports.map(r => r.report_date) };
  for (const k of FIELDS) {
    const vals = reports.map(r => r[k]).filter(v => v != null);
    s[k] = vals.length ? round2(vals.reduce((a, b) => a + b, 0)) : null;
  }
  return s;
}

export function summary(ctx, from, to, currency) {
  return summarize(approvedReports(ctx, from, to, currency));
}

const pct = (cur, base) => (cur == null || base == null || base === 0 ? null : round2(((cur - base) / Math.abs(base)) * 100));

/** Baselines: yesterday + 7-day average for a single day; previous equal period otherwise. */
export function comparison(ctx, period, currency) {
  const cur = summary(ctx, period.from, period.to, currency);
  const out = { current: cur, baselines: {} };
  if (period.kind === 'day') {
    const y = approvedReports(ctx, period.prev.from, period.prev.to, currency);
    if (y.length) {
      const ys = summarize(y);
      out.baselines.yesterday = { label: 'مقارنة بأمس', date: period.prev.from, values: ys, reportIds: ys.reportIds, delta: deltas(cur, ys) };
    }
    const w = approvedReports(ctx, addDays(period.anchor, -7), addDays(period.anchor, -1), currency);
    if (w.length >= THRESHOLDS.avgMinReports) {
      const ws = summarize(w);
      const avg = {};
      for (const k of FIELDS) {
        const vals = w.map(r => r[k]).filter(v => v != null);
        avg[k] = vals.length ? round2(vals.reduce((a, b) => a + b, 0) / vals.length) : null;
      }
      out.baselines.avg7 = { label: 'مقارنة بمتوسط 7 أيام', reports: w.length, from: w[0].report_date, to: w[w.length - 1].report_date, values: avg, reportIds: ws.reportIds, delta: deltas(cur, avg) };
    }
  } else if (period.prev) {
    const p = summary(ctx, period.prev.from, period.prev.to, currency);
    // only compare against a period with reasonable coverage
    if (p.reports && p.reports >= Math.max(1, Math.ceil(cur.reports * 0.5))) {
      const label = { 7: 'مقارنة بالأسبوع الماضي', 30: 'مقارنة بالـ30 يوم السابقة', month: 'مقارنة بنفس الفترة من الشهر الماضي', custom: 'مقارنة بالفترة السابقة' }[period.kind];
      out.baselines.prev = { label, from: period.prev.from, to: period.prev.to, values: p, reportIds: p.reportIds, delta: deltas(cur, p) };
    }
  }
  return out;
}
function deltas(a, b) {
  const d = {};
  for (const k of FIELDS) d[k] = pct(a[k], b[k]);
  return d;
}

/** Product filters are applied in SQL. q searches name/model/SKU/brand (Arabic-normalised). */
function productWhere(filters, args) {
  const w = [];
  if (filters.brand) { w.push('p.brand = ?'); args.push(filters.brand); }
  if (filters.category) { w.push('p.category = ?'); args.push(filters.category); }
  if (filters.product) { w.push('p.product_key = ?'); args.push(filters.product); }
  if (filters.q) {
    w.push("(nlabel(p.name) LIKE ? OR nlabel(p.model) LIKE ? OR nlabel(p.sku) LIKE ? OR nlabel(p.brand) LIKE ?)");
    const like = `%${normLabel(filters.q).replace(/[%_]/g, '')}%`;
    args.push(like, like, like, like);
  }
  return w.length ? ` AND ${w.join(' AND ')}` : '';
}

export function hasProductFilter(f) { return !!(f.brand || f.category || f.q || f.status || f.product); }

export function products(ctx, from, to, currency, filters = {}, { sort = 'profit', limit = 200 } = {}) {
  const args = [ctx.business.id, currency, from, to];
  const where = productWhere(filters, args);
  const rows = ctx.db.prepare(`SELECT p.product_key AS key, MAX(p.name) name, MAX(p.model) model, MAX(p.sku) sku, MAX(p.brand) brand, MAX(p.category) category,
      SUM(p.quantity) quantity, SUM(p.sales) sales, SUM(p.cost) cost, SUM(p.profit) profit, COUNT(DISTINCT r.id) days,
      GROUP_CONCAT(DISTINCT r.id) report_ids, MIN(CASE WHEN p.confidence != 'ok' THEN 0 ELSE 1 END) clear
    FROM report_products p JOIN reports r ON r.id = p.report_id
    WHERE r.business_id = ? AND r.status = 'approved' AND r.currency IS ? AND r.report_date BETWEEN ? AND ? ${where}
    GROUP BY p.product_key`).all(...args);
  const totals = summary(ctx, from, to, currency);
  const periodReports = totals.reports || 1;
  const returned = new Set(ctx.db.prepare(`SELECT nlabel(x.description) d FROM report_returns x JOIN reports r ON r.id = x.report_id
    WHERE r.business_id = ? AND r.status = 'approved' AND r.currency IS ? AND r.report_date BETWEEN ? AND ?`).all(ctx.business.id, currency, from, to).map(x => x.d));
  let list = rows.map(r => {
    const margin = r.sales ? round2((r.profit / r.sales) * 100) : null;
    const share = totals.gross_profit > 0 && r.profit > 0 ? round2((r.profit / totals.gross_profit) * 100) : null;
    const perDay = r.quantity != null ? r.quantity / periodReports : null;
    const tags = [];
    if (r.profit != null && r.profit < 0) tags.push('loss');
    else if (margin != null && margin < THRESHOLDS.lowMargin) tags.push('low');
    if (share != null && share >= THRESHOLDS.strongShare) tags.push('strong');
    if (perDay != null && perDay >= THRESHOLDS.fastUnitsPerDay && (r.profit == null || r.profit >= 0)) tags.push('fast');
    if (returned.has(normLabel(r.name))) tags.push('returned');
    return {
      ...r, sales: round2(r.sales), cost: round2(r.cost), profit: round2(r.profit), quantity: r.quantity,
      margin, share, perDay: perDay != null ? round2(perDay) : null, tags,
      status: tags.includes('loss') ? 'loss' : tags.includes('low') ? 'low' : tags.includes('strong') ? 'strong' : tags.includes('fast') ? 'fast' : 'normal',
      reportIds: String(r.report_ids || '').split(',').filter(Boolean).map(Number), clear: !!r.clear,
    };
  });
  if (filters.status) list = list.filter(p => p.tags.includes(filters.status) || p.status === filters.status);
  const key = { sales: 'sales', profit: 'profit', units: 'quantity', quantity: 'quantity', margin: 'margin' }[sort] || 'profit';
  list.sort((a, b) => (b[key] ?? -Infinity) - (a[key] ?? -Infinity));
  return { items: list.slice(0, limit), total: list.length, sort: key };
}

export function filterOptions(ctx, from, to, currency) {
  const q = col => ctx.db.prepare(`SELECT DISTINCT p.${col} v FROM report_products p JOIN reports r ON r.id = p.report_id
    WHERE r.business_id = ? AND r.status = 'approved' AND r.currency IS ? AND r.report_date BETWEEN ? AND ? AND p.${col} IS NOT NULL ORDER BY v`)
    .all(ctx.business.id, currency, from, to).map(x => x.v);
  return { brands: q('brand'), categories: q('category'), currencies: currencies(ctx).map(c => c.currency) };
}

/** Daily points for the chart; product filters switch sales/gross to the filtered product lines. */
export function series(ctx, from, to, currency, filters = {}) {
  const reports = approvedReports(ctx, from, to, currency);
  const byDate = Object.fromEntries(reports.map(r => [r.report_date, r]));
  let prodByDate = null;
  if (hasProductFilter(filters)) {
    const args = [ctx.business.id, currency, from, to];
    const where = productWhere(filters, args);
    let rows = ctx.db.prepare(`SELECT r.report_date d, p.product_key, SUM(p.sales) sales, SUM(p.profit) profit, SUM(p.quantity) q
      FROM report_products p JOIN reports r ON r.id = p.report_id WHERE r.business_id = ? AND r.status = 'approved' AND r.currency IS ? AND r.report_date BETWEEN ? AND ? ${where}
      GROUP BY r.report_date, p.product_key`).all(...args);
    if (filters.status) {
      const keep = new Set(products(ctx, from, to, currency, filters, { limit: 10000 }).items.map(p => p.key));
      rows = rows.filter(r => keep.has(r.product_key));
    }
    prodByDate = {};
    for (const r of rows) {
      const o = (prodByDate[r.d] ||= { sales: 0, gross: 0, units: 0 });
      o.sales += r.sales || 0; o.gross += r.profit || 0; o.units += r.q || 0;
    }
  }
  return {
    filtered: !!prodByDate,
    points: datesIn(from, to).map(d => {
      const r = byDate[d];
      if (!r) return { date: d, reportId: null };
      if (prodByDate) {
        const p = prodByDate[d] || { sales: 0, gross: 0, units: 0 };
        return { date: d, reportId: r.id, sales: round2(p.sales), gross: round2(p.gross), units: p.units, exp: null, net: null, other: null };
      }
      return { date: d, reportId: r.id, sales: r.sales, gross: r.gross_profit, exp: r.expenses, net: r.net_profit, other: r.other_revenue, units: r.units_sold };
    }),
  };
}

export function expenseBreakdown(ctx, period, currency) {
  const { from, to } = period;
  const cat = `COALESCE(e.category, e.name)`;
  const sumBy = (f, t) => Object.fromEntries(ctx.db.prepare(`SELECT ${cat} k, SUM(e.amount) v, COUNT(DISTINCT r.id) n FROM report_expenses e JOIN reports r ON r.id = e.report_id
    WHERE r.business_id = ? AND r.status = 'approved' AND r.currency IS ? AND r.report_date BETWEEN ? AND ? GROUP BY k`).all(ctx.business.id, currency, f, t).map(x => [x.k, x.v]));
  const cur = sumBy(from, to);
  const out = { categories: [], baselines: {} };
  let y = null, avg = null, prev = null;
  if (period.kind === 'day') {
    const yr = approvedReports(ctx, period.prev.from, period.prev.to, currency);
    if (yr.length) y = sumBy(period.prev.from, period.prev.to);
    const w = approvedReports(ctx, addDays(period.anchor, -7), addDays(period.anchor, -1), currency);
    if (w.length >= THRESHOLDS.avgMinReports) {
      const s = sumBy(addDays(period.anchor, -7), addDays(period.anchor, -1));
      avg = Object.fromEntries(Object.entries(s).map(([k, v]) => [k, round2(v / w.length)]));
      out.baselines.avg7 = { reports: w.length };
    }
    if (y) out.baselines.yesterday = { date: period.prev.from };
  } else if (period.prev) {
    const pr = approvedReports(ctx, period.prev.from, period.prev.to, currency);
    if (pr.length) { prev = sumBy(period.prev.from, period.prev.to); out.baselines.prev = { from: period.prev.from, to: period.prev.to, reports: pr.length }; }
  }
  const keys = new Set([...Object.keys(cur), ...Object.keys(y || {}), ...Object.keys(avg || {}), ...Object.keys(prev || {})]);
  out.categories = [...keys].map(k => ({
    name: k, amount: round2(cur[k] || 0),
    yesterday: y ? round2(y[k] || 0) : null, avg7: avg ? round2(avg[k] || 0) : null, prev: prev ? round2(prev[k] || 0) : null,
  })).sort((a, b) => b.amount - a.amount);
  out.entries = ctx.db.prepare(`SELECT e.id, e.name, e.category, e.amount, e.ref, e.note, e.page, e.line_no, e.confidence, r.id report_id, r.report_date
    FROM report_expenses e JOIN reports r ON r.id = e.report_id WHERE r.business_id = ? AND r.status = 'approved' AND r.currency IS ? AND r.report_date BETWEEN ? AND ?
    ORDER BY e.amount DESC LIMIT 30`).all(ctx.business.id, currency, from, to);
  return out;
}

const rowsInRange = (ctx, table, from, to, currency, order) => ctx.db.prepare(`SELECT x.*, r.report_date FROM ${table} x JOIN reports r ON r.id = x.report_id
  WHERE r.business_id = ? AND r.status = 'approved' AND r.currency IS ? AND r.report_date BETWEEN ? AND ? ORDER BY ${order} LIMIT 50`).all(ctx.business.id, currency, from, to);
export const otherRevenue = (ctx, from, to, currency) => rowsInRange(ctx, 'report_other_revenue', from, to, currency, 'x.amount DESC');
export const returnsList = (ctx, from, to, currency) => rowsInRange(ctx, 'report_returns', from, to, currency, 'r.report_date DESC');

export function reportNotes(ctx, from, to, currency) {
  return approvedReports(ctx, from, to, currency).filter(r => r.report_notes).map(r => ({ reportId: r.id, date: r.report_date, text: r.report_notes }));
}

export function groups(ctx, from, to, currency, key, filters = {}) {
  const col = key === 'brand' ? 'brand' : 'category';
  const args = [ctx.business.id, currency, from, to];
  const where = productWhere(filters, args);
  return ctx.db.prepare(`SELECT COALESCE(p.${col}, '') k, SUM(p.quantity) quantity, SUM(p.sales) sales, SUM(p.profit) profit
    FROM report_products p JOIN reports r ON r.id = p.report_id WHERE r.business_id = ? AND r.status = 'approved' AND r.currency IS ? AND r.report_date BETWEEN ? AND ? ${where}
    GROUP BY k ORDER BY sales DESC`).all(...args)
    .map(g => ({ ...g, sales: round2(g.sales), profit: round2(g.profit), margin: g.sales ? round2((g.profit / g.sales) * 100) : null }));
}

export function reportHistory(ctx, { limit = 30 } = {}) {
  return ctx.db.prepare(`SELECT r.id, r.report_date, r.currency, r.status, r.validation, r.error_code, r.error_message, r.sales, r.gross_profit, r.net_profit,
      r.imported_at, r.approved_at, r.approved_by, r.imported_by, r.superseded_by, f.original_name, f.pages, f.extraction_method,
      (SELECT COUNT(*) FROM report_checks c WHERE c.report_id = r.id AND c.status = 'fail') failing
    FROM reports r JOIN report_files f ON f.id = r.file_id WHERE r.business_id = ? ORDER BY COALESCE(r.report_date, '9999') DESC, r.id DESC LIMIT ?`)
    .all(ctx.business.id, limit);
}

export function pendingReports(ctx) {
  return ctx.db.prepare(`SELECT r.id, r.report_date, r.currency, r.validation, f.original_name,
      (SELECT COUNT(*) FROM report_checks c WHERE c.report_id = r.id AND c.status = 'fail') failing
    FROM reports r JOIN report_files f ON f.id = r.file_id WHERE r.business_id = ? AND r.status = 'pending' ORDER BY r.id DESC`).all(ctx.business.id);
}

export function lastFailed(ctx) {
  return ctx.db.prepare(`SELECT r.id, r.error_code, r.error_message, r.imported_at, f.original_name FROM reports r JOIN report_files f ON f.id = r.file_id
    WHERE r.business_id = ? AND r.status = 'failed' ORDER BY r.id DESC LIMIT 1`).get(ctx.business.id) || null;
}

/** KPI drill-down with lineage: per report, the source line + validation check + corrections. */
export function metricDetail(ctx, key, period, currency) {
  if (!FIELDS.includes(key)) throw Object.assign(new Error('مؤشر غير معروف'), { status: 400, code: 'BAD_METRIC' });
  const cmp = comparison(ctx, period, currency);
  const reports = approvedReports(ctx, period.from, period.to, currency);
  const lineage = reports.slice(-31).map(r => {
    const f = ctx.db.prepare('SELECT * FROM report_fields WHERE report_id = ? AND field = ?').get(r.id, key);
    const checks = ctx.db.prepare('SELECT code, status, reported, calculated, difference, message FROM report_checks WHERE report_id = ? AND field = ?').all(r.id, key);
    const corr = ctx.db.prepare("SELECT old_value, new_value, reason, corrected_at, corrected_by FROM report_corrections WHERE report_id = ? AND entity = 'report' AND field = ?").all(r.id, key);
    return {
      reportId: r.id, date: r.report_date, file: r.original_name, value: r[key],
      source: f ? (f.confidence === 'calculated' ? { kind: 'calculated', from: f.value_text } : { kind: 'reported', raw: f.raw_text, page: f.page, line: f.line_no, printed: f.value_text }) : { kind: 'missing' },
      checks, corrections: corr,
      formula: key === 'net_profit' ? { gross_profit: r.gross_profit, other_revenue: r.other_revenue, expenses: r.expenses } : null,
    };
  });
  return { key, value: cmp.current[key], currency, period, baselines: cmp.baselines, lineage };
}

export function productDetail(ctx, key, period, currency) {
  const agg = products(ctx, period.from, period.to, currency, { product: key }, { limit: 1 }).items[0] || null;
  const lines = ctx.db.prepare(`SELECT p.*, r.report_date, f.original_name FROM report_products p JOIN reports r ON r.id = p.report_id JOIN report_files f ON f.id = r.file_id
    WHERE r.business_id = ? AND r.status = 'approved' AND r.currency IS ? AND p.product_key = ? ORDER BY r.report_date DESC LIMIT 30`).all(ctx.business.id, currency, key);
  if (!agg && !lines.length) return null;
  const last30 = products(ctx, addDays(period.to, -29), period.to, currency, { product: key }, { limit: 1 }).items[0] || null;
  return { key, period, currency, product: agg || { key, name: lines[0].name, sku: lines[0].sku, model: lines[0].model, brand: lines[0].brand, category: lines[0].category, tags: [] }, last30, lines };
}

export function expenseDetail(ctx, id) {
  return ctx.db.prepare(`SELECT e.*, r.report_date, r.currency, r.status report_status, f.original_name FROM report_expenses e JOIN reports r ON r.id = e.report_id
    JOIN report_files f ON f.id = r.file_id WHERE e.id = ? AND r.business_id = ?`).get(id, ctx.business.id) || null;
}
