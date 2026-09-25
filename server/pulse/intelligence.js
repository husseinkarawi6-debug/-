// Deterministic rules → alerts, opportunities and ZOE's daily brief.
// No LLM here: every item is derived from DB numbers with its baseline and source.
import { THRESHOLDS, approvedReports } from './queries.js';
import { addDays } from './period.js';
import { round2, fmtMoney } from './text.js';

const SEV_ORDER = { high: 0, med: 1, info: 2 };
const names = list => list.map(p => p.name).join(' و');

/**
 * @param d  { period, currency, cmp, prods (unfiltered items), exp (breakdown), returns, pending }
 */
export function buildAlerts(d) {
  const { period, cmp, prods, exp, returns, pending } = d;
  const m = v => fmtMoney(v, d.currency);
  const pid = t => `${t}:${period.from}:${period.to}`;
  const src = ids => ({ reportIds: ids });
  const cur = cmp.current;
  const base = cmp.baselines.avg7 || cmp.baselines.prev || null;
  const out = [];

  const loss = prods.filter(p => p.tags.includes('loss'));
  if (loss.length) {
    const total = round2(loss.reduce((s, p) => s + p.profit, 0));
    out.push({ id: pid('LOSS_SALE'), type: 'LOSS_SALE', severity: 'high', title: 'بيع بخسارة',
      reason: `${names(loss)}: سعر البيع أقل من التكلفة.`, impact: { kind: 'loss', value: total },
      metrics: { loss: total, products: loss.map(p => ({ key: p.key, name: p.name, profit: p.profit, margin: p.margin, quantity: p.quantity })) },
      baseline: null, source: src(uniq(loss.flatMap(p => p.reportIds))),
      recommended: 'راجع سعر البيع مقابل الكلفة',
      actions: [{ label: 'راجع السعر', kind: 'filter_status', status: 'loss' }, { label: 'اسأل المحلّل', kind: 'agent', agent: 'analyst', task: 'price_review' }] });
  }
  const pendingInRange = pending.filter(r => !r.report_date || (r.report_date >= period.from && r.report_date <= period.to));
  for (const r of pendingInRange) {
    out.push({ id: `NEEDS_REVIEW:${r.id}`, type: 'NEEDS_REVIEW', severity: 'med', title: r.failing ? 'رقم يحتاج مراجعة' : 'تقرير بانتظار الاعتماد',
      reason: `${r.original_name}${r.report_date ? `، ${r.report_date}` : ''}: ${r.failing ? `${r.failing} قيمة تحتاج مراجعة قبل الاعتماد` : 'لم يُعتمد بعد، أرقامه غير محسوبة في النبض'}.`,
      impact: null, metrics: { failing: r.failing }, baseline: null, source: src([r.id]), recommended: 'راجع التقرير واعتمده',
      actions: [{ label: 'مراجعة', kind: 'review_report', reportId: r.id }] });
  }
  if (base && cur.expenses != null && base.values.expenses) {
    const up = round2(((cur.expenses - base.values.expenses) / base.values.expenses) * 100);
    if (up >= THRESHOLDS.expenseSpike) {
      const ref = exp.categories.map(c => ({ ...c, ref: base === cmp.baselines.avg7 ? c.avg7 : c.prev }))
        .filter(c => c.ref != null).sort((a, b) => (b.amount - b.ref) - (a.amount - a.ref));
      const driver = ref[0] && ref[0].amount > ref[0].ref ? ref[0] : null;
      out.push({ id: pid('EXPENSE_SPIKE'), type: 'EXPENSE_SPIKE', severity: 'med', title: 'مصروفات أعلى من المعتاد',
        reason: `${m(cur.expenses)} مقابل ${base.label.replace('مقارنة ب', '')} ${m(base.values.expenses)}${driver ? `، أكبر زيادة في ${driver.name} (${m(driver.amount)} مقابل ${m(driver.ref)})` : ''}.`,
        impact: { kind: 'pct', value: up }, metrics: { expenses: cur.expenses, baseline: base.values.expenses, pct: up, driver },
        baseline: { label: base.label, value: base.values.expenses, reports: base.reports || base.values.reports }, source: src(cur.reportIds),
        recommended: driver ? `راجع مصروف ${driver.name}` : 'راجع بنود المصاريف',
        actions: [{ label: 'عرض', kind: 'scroll', target: 'expenses' }, { label: 'اسأل العمليات', kind: 'agent', agent: 'operations', task: 'ops_review', category: driver ? driver.name : null }] });
    }
  }
  const low = prods.filter(p => p.tags.includes('low'));
  if (low.length) {
    const p = low[0];
    out.push({ id: pid('LOW_MARGIN'), type: 'LOW_MARGIN', severity: 'med', title: 'هامش منخفض جداً',
      reason: low.length === 1 ? `${p.name}: هامش ${p.margin}% على ${p.quantity} قطع.` : `${low.length} منتجات هامشها أقل من ${THRESHOLDS.lowMargin}%: ${names(low.slice(0, 3))}.`,
      impact: { kind: 'profit', value: p.profit }, metrics: { products: low.map(x => ({ key: x.key, name: x.name, margin: x.margin, profit: x.profit, quantity: x.quantity })) },
      baseline: { label: `حد الهامش ${THRESHOLDS.lowMargin}%` }, source: src(uniq(low.flatMap(x => x.reportIds))),
      recommended: 'راجع كلفة الشراء أو سعر البيع',
      actions: [{ label: 'عرض', kind: 'filter_status', status: 'low' }, { label: 'اسأل المشتريات', kind: 'agent', agent: 'purchasing', task: 'price_review', productKey: p.key }] });
  }
  if (base && cur.sales != null && base.values.sales) {
    const ch = round2(((cur.sales - base.values.sales) / base.values.sales) * 100);
    if (ch <= -THRESHOLDS.revenueDrop) {
      out.push({ id: pid('REVENUE_DROP'), type: 'REVENUE_DROP', severity: 'med', title: 'المبيعات أقل من المعتاد',
        reason: `المبيعات ${m(cur.sales)} مقابل ${m(base.values.sales)} (${base.label}).`, impact: { kind: 'pct', value: ch },
        metrics: { sales: cur.sales, baseline: base.values.sales, pct: ch }, baseline: { label: base.label, value: base.values.sales }, source: src(cur.reportIds),
        recommended: 'حلّل سبب انخفاض المبيعات', actions: [{ label: 'اسأل المحلّل', kind: 'agent', agent: 'analyst', task: 'analyse', metric: 'sales' }] });
    }
  }
  const y = cmp.baselines.yesterday;
  if (y && cur.net_profit != null && y.values.net_profit && !out.some(a => a.type === 'EXPENSE_SPIKE' || a.type === 'REVENUE_DROP')) {
    const ch = y.delta.net_profit;
    if (ch != null && Math.abs(ch) >= THRESHOLDS.unusualChange) {
      out.push({ id: pid('UNUSUAL_CHANGE'), type: 'UNUSUAL_CHANGE', severity: 'info', title: ch > 0 ? 'الصافي أعلى بكثير من أمس' : 'الصافي أقل بكثير من أمس',
        reason: `الصافي ${m(cur.net_profit)} مقابل ${m(y.values.net_profit)} أمس.`, impact: { kind: 'pct', value: ch },
        metrics: { net: cur.net_profit, yesterday: y.values.net_profit, pct: ch }, baseline: { label: 'أمس', value: y.values.net_profit }, source: src([...cur.reportIds, ...y.reportIds]),
        recommended: 'قارن مكونات الصافي', actions: [{ label: 'مقارنة', kind: 'compare' }, { label: 'اسأل المحلّل', kind: 'agent', agent: 'analyst', task: 'analyse', metric: 'net_profit' }] });
    }
  }
  if (returns.length) {
    const amt = round2(returns.reduce((s, r) => s + (r.amount || 0), 0));
    out.push({ id: pid('RETURNS'), type: 'RETURNS', severity: 'info', title: returns.length === 1 ? 'مرتجع واحد' : `${returns.length} مرتجعات`,
      reason: returns.slice(0, 2).map(r => `${r.description}${r.reason ? `، ${r.reason}` : ''}`).join('؛ ') + '.',
      impact: { kind: 'amount', value: amt }, metrics: { amount: amt, count: returns.length }, baseline: null, source: src(uniq(returns.map(r => r.report_id))),
      recommended: 'راجع سبب المرتجع', actions: [{ label: 'عرض', kind: 'scroll', target: 'returns' }] });
  }
  return out.sort((a, b) => SEV_ORDER[a.severity] - SEV_ORDER[b.severity]);
}

export function buildOpportunities(ctx, d) {
  const { period, currency, prods, cmp } = d;
  const out = [];
  const pid = (t, k) => `${t}:${k}:${period.from}:${period.to}`;
  const pos = prods.filter(p => p.profit > 0);
  const top = pos.slice().sort((a, b) => b.profit - a.profit)[0];
  if (top && top.share >= 30 && top.quantity >= 2) {
    out.push({ id: pid('STRONG_PRODUCT', top.key), type: 'STRONG_PRODUCT', tone: 'ok', title: `${top.name}، الأقوى ${period.kind === 'day' ? 'اليوم' : 'بالفترة'}`,
      product: top.key, facts: [{ k: 'units', v: top.quantity }, { k: 'profit', v: top.profit }, { k: 'share', v: top.share }],
      reason: `ربح عالي ومبيعات قوية: ${top.share}% من ربح البضاعة`, source: { reportIds: top.reportIds },
      actions: [{ label: 'أرسل للمشتريات', kind: 'agent', agent: 'purchasing', task: 'reorder_review', productKey: top.key, primary: true },
        { label: 'اصنع حملة', kind: 'agent', agent: 'growth', task: 'campaign', productKey: top.key }] });
  }
  const fast = pos.filter(p => p.tags.includes('fast') && (!top || p.key !== top.key)).sort((a, b) => b.quantity - a.quantity)[0];
  if (fast) {
    out.push({ id: pid('VELOCITY', fast.key), type: 'VELOCITY', tone: 'mem', title: `${fast.name} يتحرك بسرعة`, product: fast.key,
      facts: [{ k: 'units', v: fast.quantity }, { k: 'margin', v: fast.margin }], reason: `${fast.perDay} قطعة لكل يوم تقرير`, source: { reportIds: fast.reportIds },
      actions: [{ label: 'راجع إعادة الطلب', kind: 'agent', agent: 'purchasing', task: 'reorder_review', productKey: fast.key },
        { label: 'اصنع حملة', kind: 'agent', agent: 'growth', task: 'campaign', productKey: fast.key }] });
  }
  const margins = pos.map(p => p.margin).filter(m => m != null).sort((a, b) => a - b);
  const median = margins.length ? margins[Math.floor(margins.length / 2)] : null;
  const promo = median != null ? pos.filter(p => p.margin >= Math.max(5, median * 1.5) && p.quantity <= 1 && p.days <= 1).sort((a, b) => b.margin - a.margin)[0] : null;
  if (promo) {
    out.push({ id: pid('PROMOTION', promo.key), type: 'PROMOTION', tone: 'wait', title: `${promo.name}: هامش جيد وحركة ضعيفة`, product: promo.key,
      facts: [{ k: 'margin', v: promo.margin }, { k: 'units', v: promo.quantity }], reason: `هامش ${promo.margin}% (الوسيط ${median}%) مع ${promo.quantity} قطعة فقط`, source: { reportIds: promo.reportIds },
      actions: [{ label: 'اصنع حملة', kind: 'agent', agent: 'growth', task: 'campaign', productKey: promo.key }] });
  }
  // category growth: last 7 days vs previous 7 days (needs coverage on both sides)
  const a = approvedReports(ctx, addDays(period.anchor, -6), period.anchor, currency);
  const b = approvedReports(ctx, addDays(period.anchor, -13), addDays(period.anchor, -7), currency);
  if (a.length >= 4 && b.length >= 4) {
    const q = (from, to) => Object.fromEntries(ctx.db.prepare(`SELECT p.category k, SUM(p.sales) v FROM report_products p JOIN reports r ON r.id = p.report_id
      WHERE r.business_id = ? AND r.status = 'approved' AND r.currency IS ? AND r.report_date BETWEEN ? AND ? AND p.category IS NOT NULL GROUP BY k`)
      .all(ctx.business.id, currency, from, to).map(x => [x.k, x.v]));
    const cw = q(addDays(period.anchor, -6), period.anchor), pw = q(addDays(period.anchor, -13), addDays(period.anchor, -7));
    const best = Object.keys(cw).filter(k => pw[k] > 0).map(k => ({ k, g: round2(((cw[k] / a.length - pw[k] / b.length) / (pw[k] / b.length)) * 100) }))
      .filter(x => x.g >= 25).sort((x, y) => y.g - x.g)[0];
    if (best) {
      out.push({ id: pid('CATEGORY_GROWTH', best.k), type: 'CATEGORY_GROWTH', tone: 'wait', title: `${best.k} قوية هذا الأسبوع`, category: best.k,
        facts: [{ k: 'growth', v: best.g }], reason: `متوسط مبيعات اليوم +${best.g}% عن الأسبوع السابق (${a.length} مقابل ${b.length} تقارير)`,
        source: { reportIds: a.map(r => r.id) }, actions: [{ label: 'اسأل المحلّل', kind: 'agent', agent: 'analyst', task: 'analyse', category: best.k }] });
    }
  }
  return out;
}

/** ZOE's brief: 3–4 short computed insights, only those backed by data. */
export function buildBrief(d, alerts, opps) {
  const { cmp, prods, exp } = d;
  const lines = [];
  const top = prods.filter(p => p.profit > 0).sort((a, b) => b.profit - a.profit)[0];
  if (top && top.share != null) lines.push({ kind: 'top', text: `${top.name} حقق ${top.share}% من ربح البضاعة.`, ref: { type: 'product', key: top.key } });
  const spike = alerts.find(a => a.type === 'EXPENSE_SPIKE');
  if (spike) lines.push({ kind: 'expense', text: `المصاريف أعلى من المعتاد بـ${spike.metrics.pct}%${spike.metrics.driver ? `، والسبب الرئيسي ${spike.metrics.driver.name}` : ''}.`, ref: { type: 'alert', id: spike.id } });
  const loss = prods.filter(p => p.tags.includes('loss'));
  if (loss.length) lines.push({ kind: 'loss', text: loss.length === 1 ? `${loss[0].name} انباع بخسارة.` : `${loss.length} منتجات انباعت بخسارة.`, ref: { type: 'alert', id: alerts.find(a => a.type === 'LOSS_SALE').id } });
  const y = cmp.baselines.yesterday || cmp.baselines.prev;
  if (y && y.delta.net_profit != null && lines.length < 4) {
    const ch = y.delta.net_profit;
    lines.push({ kind: 'net', text: `الصافي ${ch >= 0 ? 'أعلى' : 'أقل'} بـ${Math.abs(ch)}% ${y.label.replace('مقارنة ب', 'من ').replace('من أمس', 'من أمس')}.` });
  }
  if (lines.length < 4 && opps[0] && opps[0].type !== 'STRONG_PRODUCT') lines.push({ kind: 'opp', text: `فرصة: ${opps[0].title}.`, ref: { type: 'opportunity', id: opps[0].id } });
  if (!exp.baselines.avg7 && !exp.baselines.prev && lines.length < 4) lines.push({ kind: 'nobase', text: 'لا توجد تقارير كافية قبل هذه الفترة لحساب المتوسط.' });
  return lines.slice(0, 4);
}

const uniq = a => [...new Set(a)];
