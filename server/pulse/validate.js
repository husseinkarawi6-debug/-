// Validation: every check keeps reported / calculated / difference.
// Numbers are never "fixed" silently — a mismatch makes the report NEEDS_REVIEW.
import { round2 } from './text.js';

const sum = (arr, k) => (arr.length && arr.every(x => x[k] != null) ? round2(arr.reduce((s, x) => s + x[k], 0)) : null);
const SUMMARY_FIELDS = ['sales', 'gross_profit', 'expenses', 'other_revenue', 'net_profit', 'units_sold'];

export function validateReport(p, { tolerance = 0.05 } = {}) {
  const checks = [];
  const tol = v => Math.max(tolerance, Math.abs(v || 0) * 1e-6);
  const cmp = (code, field, reported, calculated, label) => {
    if (reported == null || calculated == null) {
      checks.push({ code, field, status: 'skip', reported, calculated, difference: null, message: `${label}: لا يمكن المقارنة (قيمة غير متوفرة)` });
      return;
    }
    const diff = round2(reported - calculated);
    const ok = Math.abs(diff) <= tol(reported);
    checks.push({ code, field, status: ok ? 'pass' : 'fail', reported, calculated, difference: diff,
      message: ok ? `${label}: مطابق` : `${label}: المذكور ${reported} والمحسوب ${calculated} (فرق ${diff})` });
  };
  const S = k => (p.summary[k] ? p.summary[k].value : null);

  if (!p.isReport) {
    checks.push({ code: 'IS_DAILY_REPORT', status: 'fail', message: 'الملف لا يحتوي على بنية تقرير يومي (تاريخ + أرقام الملخص أو جدول المنتجات)' });
    return { validation: 'FAILED', errorCode: 'PARSING_FAILED', checks, effective: null };
  }
  checks.push(p.date ? { code: 'DATE_PRESENT', field: 'date', status: 'pass', message: `التاريخ: ${p.date.value}` }
    : { code: 'DATE_PRESENT', field: 'date', status: 'fail', message: 'لم يُعثر على تاريخ التقرير' });
  if (p.meta.dateAmbiguous) checks.push({ code: 'DATE_FORMAT', field: 'date', status: 'warn', message: `التاريخ قُرئ بصيغة يوم/شهر (${p.date.value})` });
  checks.push(p.currency ? { code: 'CURRENCY_PRESENT', field: 'currency', status: 'pass', message: `العملة: ${p.currency.value}` }
    : { code: 'CURRENCY_PRESENT', field: 'currency', status: 'fail', message: 'العملة غير مذكورة في التقرير، اخترها يدوياً' });

  for (const i of p.issues.filter(i => i.code === 'UNCLEAR_VALUE' || i.code === 'ROW_UNREADABLE')) {
    checks.push({ code: i.code, status: 'fail', message: i.message, field: null });
  }
  const missing = SUMMARY_FIELDS.filter(k => !p.summary[k]);
  if (missing.length) checks.push({ code: 'MISSING_FIELDS', status: 'warn', message: `حقول غير موجودة في التقرير: ${missing.join(', ')}` });

  // product lines
  const prods = p.products;
  prods.forEach(x => {
    if (x.sales != null && x.cost != null && x.profit != null) {
      const calc = round2(x.sales - x.cost);
      if (Math.abs(calc - x.profit) > tol(x.sales)) {
        checks.push({ code: 'PRODUCT_LINE_MATH', field: 'profit', status: 'fail', reported: x.profit, calculated: calc, difference: round2(x.profit - calc),
          message: `${x.name}: الربح المذكور ${x.profit} لا يساوي المبيعات − الكلفة (${calc})` });
      }
    }
    if (x.quantity != null && x.quantity < 0) checks.push({ code: 'INCONSISTENT_VALUE', status: 'fail', message: `${x.name}: كمية سالبة` });
  });
  const pSales = sum(prods, 'sales'), pProfit = sum(prods, 'profit'), pQty = sum(prods, 'quantity');
  if (prods.length) {
    cmp('PRODUCT_SALES_TOTAL', 'sales', S('sales'), pSales, 'مجموع مبيعات المنتجات مقابل المبيعات');
    cmp('PRODUCT_PROFIT_TOTAL', 'gross_profit', S('gross_profit'), pProfit, 'مجموع ربح المنتجات مقابل ربح البضاعة');
    cmp('UNITS_TOTAL', 'units_sold', S('units_sold'), pQty, 'مجموع الكميات مقابل القطع المباعة');
    if (p.productTotals) {
      cmp('PRODUCT_TABLE_SALES', 'sales', p.productTotals.sales ?? null, pSales, 'سطر المجموع في جدول المنتجات (المبيعات)');
      cmp('PRODUCT_TABLE_PROFIT', 'gross_profit', p.productTotals.profit ?? null, pProfit, 'سطر المجموع في جدول المنتجات (الربح)');
    }
  }
  const eSum = sum(p.expenses, 'amount');
  if (p.expenses.length) {
    cmp('EXPENSES_TOTAL', 'expenses', S('expenses'), eSum, 'مجموع بنود المصاريف مقابل المصاريف');
    if (p.expenseTotal) cmp('EXPENSE_TABLE_TOTAL', 'expenses', p.expenseTotal.amount, eSum, 'سطر مجموع المصاريف');
  }
  const oSum = sum(p.otherRevenue, 'amount');
  if (p.otherRevenue.length) cmp('OTHER_REVENUE_TOTAL', 'other_revenue', S('other_revenue'), oSum, 'مجموع الإيرادات الأخرى');

  // effective values: reported first; calculated only when the report omits the total
  const eff = {}, lineage = {};
  const pick = (k, calc, how) => {
    if (S(k) != null) { eff[k] = S(k); lineage[k] = { source: 'reported' }; } else if (calc != null) { eff[k] = calc; lineage[k] = { source: 'calculated', from: how }; } else { eff[k] = null; lineage[k] = { source: 'missing' }; }
  };
  pick('sales', pSales, 'مجموع مبيعات المنتجات');
  pick('gross_profit', pProfit, 'مجموع ربح المنتجات');
  pick('expenses', eSum, 'مجموع بنود المصاريف');
  pick('other_revenue', oSum, 'مجموع الإيرادات الأخرى');
  pick('units_sold', pQty, 'مجموع الكميات');
  const netCalc = eff.gross_profit != null && eff.expenses != null
    ? round2(eff.gross_profit + (eff.other_revenue || 0) - eff.expenses) : null;
  cmp('NET_EQUATION', 'net_profit', S('net_profit'), netCalc, 'الصافي = ربح البضاعة + إيرادات أخرى − المصاريف');
  pick('net_profit', netCalc, 'ربح البضاعة + إيرادات أخرى − المصاريف');
  if (eff.sales == null) checks.push({ code: 'SALES_PRESENT', field: 'sales', status: 'fail', message: 'لا توجد مبيعات في التقرير' });

  const failed = checks.some(c => c.status === 'fail');
  return { validation: failed ? 'NEEDS_REVIEW' : 'VALID', checks, effective: eff, lineage };
}
