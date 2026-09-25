// Logical text lines → structured daily report.
// Only fields that are actually printed on the report are returned; anything
// the parser cannot read is left null and reported as an issue (never guessed).
import { normLabel, parseNumber, clean, round2 } from './text.js';

const syn = list => list.map(normLabel);
const SECTIONS = {
  summary: syn(['الملخص', 'ملخص اليوم', 'ملخص التقرير', 'الخلاصة', 'summary', 'daily summary']),
  products: syn(['مبيعات المنتجات', 'المنتجات', 'المبيعات حسب المنتج', 'تفاصيل المبيعات', 'حركة المواد', 'المواد المباعة', 'products', 'sales by product', 'product sales']),
  expenses: syn(['المصاريف', 'المصروفات', 'تفاصيل المصاريف', 'expenses']),
  other: syn(['الإيرادات الأخرى', 'إيرادات أخرى', 'ايرادات اخرى', 'other revenue', 'other income']),
  returns: syn(['المرتجعات', 'المردودات', 'returns']),
  notes: syn(['ملاحظات', 'ملاحظات التقرير', 'ملاحظات اليوم', 'notes']),
};
const SUMMARY = {
  sales: syn(['المبيعات', 'إجمالي المبيعات', 'مجموع المبيعات', 'اجمالي المبيعات', 'total sales', 'sales']),
  gross_profit: syn(['ربح البضاعة', 'إجمالي الربح', 'الربح الإجمالي', 'مجمل الربح', 'ربح المبيعات', 'gross profit']),
  expenses: syn(['المصاريف', 'المصروفات', 'إجمالي المصاريف', 'مجموع المصاريف', 'total expenses', 'expenses']),
  other_revenue: syn(['إيرادات أخرى', 'الإيرادات الأخرى', 'other revenue', 'other income']),
  net_profit: syn(['صافي الربح', 'الصافي', 'الربح الصافي', 'صافي اليوم', 'net profit', 'net']),
  units_sold: syn(['القطع المباعة', 'عدد القطع', 'الكمية المباعة', 'عدد القطع المباعة', 'units sold', 'units']),
};
const COLS = {
  products: {
    item_no: ['#', 'ت', 'م', 'رقم', 'no', 'no.'], name: ['المنتج', 'اسم المنتج', 'المادة', 'الصنف', 'اسم المادة', 'product', 'item', 'description'],
    model: ['الموديل', 'موديل', 'model'], sku: ['sku', 'الرمز', 'رمز المنتج', 'الكود', 'الباركود', 'code', 'barcode'],
    brand: ['الماركة', 'العلامة التجارية', 'الشركة', 'brand'], category: ['الفئة', 'القسم', 'التصنيف', 'category'],
    quantity: ['الكمية', 'العدد', 'القطع', 'qty', 'quantity'], cost: ['الكلفة', 'التكلفة', 'سعر الكلفة', 'الكلفة الكلية', 'cost'],
    sales: ['المبيعات', 'مبلغ البيع', 'البيع', 'قيمة البيع', 'sales', 'amount', 'revenue'], profit: ['الربح', 'الأرباح', 'profit'],
  },
  expenses: {
    ref: ['رقم القيد', 'القيد', 'رقم السند', 'السند', 'ref', 'reference'], name: ['البند', 'المصروف', 'البيان', 'الوصف', 'expense', 'item', 'description'],
    category: ['الفئة', 'النوع', 'التصنيف', 'category'], amount: ['المبلغ', 'القيمة', 'amount'], note: ['الملاحظة', 'ملاحظة', 'ملاحظات', 'note', 'notes'],
  },
  other: {
    description: ['البيان', 'الوصف', 'المصدر', 'البند', 'description', 'item'], amount: ['المبلغ', 'القيمة', 'amount'], note: ['الملاحظة', 'ملاحظة', 'ملاحظات', 'note'],
  },
  returns: {
    description: ['المنتج', 'البيان', 'الصنف', 'product', 'item'], quantity: ['الكمية', 'العدد', 'qty', 'quantity'],
    amount: ['المبلغ', 'القيمة', 'amount'], reason: ['السبب', 'reason'],
  },
};
for (const t of Object.values(COLS)) for (const k of Object.keys(t)) t[k] = syn(t[k]);
const NUMERIC = new Set(['quantity', 'cost', 'sales', 'profit', 'amount']);
const TOTAL_WORDS = syn(['المجموع', 'الإجمالي', 'مجموع', 'اجمالي', 'total', 'مجموع المصاريف', 'إجمالي المصاريف', 'مجموع الإيرادات']);
const EMPTY = new Set(['—', '-', '–', '']);

const MONTHS = {
  'كانون الثاني': 1, 'شباط': 2, 'اذار': 3, 'نيسان': 4, 'ايار': 5, 'حزيران': 6, 'تموز': 7, 'اب': 8, 'ايلول': 9,
  'تشرين الاول': 10, 'تشرين الثاني': 11, 'كانون الاول': 12,
  'يناير': 1, 'فبراير': 2, 'مارس': 3, 'ابريل': 4, 'مايو': 5, 'يونيو': 6, 'يوليو': 7, 'اغسطس': 8, 'سبتمبر': 9, 'اكتوبر': 10, 'نوفمبر': 11, 'ديسمبر': 12,
  january: 1, february: 2, march: 3, april: 4, may: 5, june: 6, july: 7, august: 8, september: 9, october: 10, november: 11, december: 12,
};

export function parseDate(text) {
  const t = normLabel(text).replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d));
  const iso = (y, m, d) => (m >= 1 && m <= 12 && d >= 1 && d <= 31 && y > 2000 && y < 2100)
    ? `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}` : null;
  let m = t.match(/(\d{4})[\/.\s](\d{1,2})[\/.\s](\d{1,2})/) || t.match(/(\d{4}) (\d{1,2}) (\d{1,2})/);
  if (m) return { value: iso(+m[1], +m[2], +m[3]), format: 'YYYY-MM-DD' };
  m = t.match(/(\d{1,2})[\/.\s](\d{1,2})[\/.\s](\d{4})/) || t.match(/(\d{1,2}) (\d{1,2}) (\d{4})/);
  if (m) {
    const a = +m[1], b = +m[2];
    // Regional convention (Iraq): day first. Only swap when day-first is impossible.
    if (a <= 12 && b > 12) return { value: iso(+m[3], a, b), format: 'MM/DD/YYYY' };
    return { value: iso(+m[3], b, a), format: 'DD/MM/YYYY', ambiguous: a <= 12 && b <= 12 && a !== b };
  }
  for (const [name, mon] of Object.entries(MONTHS).sort((x, y) => y[0].length - x[0].length)) {
    const re = new RegExp(`(\\d{1,2})\\s+${normLabel(name)}\\s+(\\d{4})`);
    const mm = t.match(re);
    if (mm) return { value: iso(+mm[2], mon, +mm[1]), format: 'D MONTH YYYY' };
  }
  return null;
}

export function parseCurrency(text) {
  const t = normLabel(text);
  const usd = /\busd\b|us\$|\$|دولار/.test(t), iqd = /\biqd\b|دينار|د\.? ?ع\b/.test(t);
  if (usd && !iqd) return 'USD';
  if (iqd && !usd) return 'IQD';
  return null;
}

const matchAny = (label, list) => list.includes(normLabel(label));
const src = l => ({ page: l.page, lineNo: l.lineNo, raw: l.text });

export function parseReport(lines) {
  const out = {
    business: null, date: null, currency: null, summary: {},
    products: [], productTotals: null, expenses: [], expenseTotal: null, otherRevenue: [], returns: [], notes: null,
    issues: [], meta: {},
  };
  let section = null, header = null;
  const notes = [];
  const issue = (code, message, l) => out.issues.push({ code, message, ...(l ? src(l) : {}) });

  lines.forEach((l, idx) => {
    const cells = l.cells.map(c => c.text).filter(c => c && c.trim());
    if (!cells.length) return;
    const first = normLabel(cells[0]);

    // header metadata: date / currency can share a line
    if (!out.date && /(^|\s)(التاريخ|تاريخ التقرير|date)(\s|$)/.test(normLabel(l.text))) {
      const d = parseDate(l.text);
      if (d && d.value) { out.date = { value: d.value, ...src(l) }; out.meta.dateFormat = d.format; if (d.ambiguous) out.meta.dateAmbiguous = true; }
    }
    if (!out.currency && /(العمله|currency)/.test(normLabel(l.text))) {
      const c = parseCurrency(l.text.split(/العملة|العمله|currency/i).pop());
      if (c) out.currency = { value: c, ...src(l) };
    }
    if (idx === 0 && cells.length === 1 && !Object.values(SECTIONS).some(s => s.includes(first))) {
      out.business = { value: clean(cells[0]), ...src(l) };
    }

    // section header: a single cell equal to a known section title
    if (cells.length === 1) {
      const sec = Object.entries(SECTIONS).find(([, names]) => names.includes(first));
      if (sec) { section = sec[0]; header = null; return; }
    }
    if (section === 'notes') { notes.push(clean(l.text)); return; }

    // summary rows: label + one number (allowed before any table section too)
    if ((section === null || section === 'summary') && cells.length === 2) {
      const f = Object.entries(SUMMARY).find(([, names]) => names.includes(first));
      if (f) {
        const v = parseNumber(cells[1]);
        out.summary[f[0]] = { value: v, confidence: v == null ? 'unclear' : 'ok', rawValue: cells[1], ...src(l) };
        if (v == null) issue('UNCLEAR_VALUE', `قيمة «${cells[0]}» غير واضحة في التقرير`, l);
        return;
      }
    }

    const table = COLS[section];
    if (!table) return;
    // table header row
    const colMatch = cells.map(c => Object.entries(table).find(([, names]) => names.includes(normLabel(c)))?.[0]);
    if (colMatch.filter(Boolean).length >= Math.min(2, cells.length) && colMatch.filter(Boolean).length >= cells.length * 0.6) {
      header = l.cells.map((c, i) => ({ field: colMatch[i], x0: c.x0, x1: c.x1 })).filter(h => h.field);
      return;
    }
    if (!header) { issue('ROW_WITHOUT_HEADER', 'سطر داخل جدول بدون رأس أعمدة واضح', l); return; }

    const row = mapRow(l, header);
    const isTotal = cells.some(c => TOTAL_WORDS.includes(normLabel(c)));
    if (isTotal) {
      const nums = {};
      for (const [k, v] of Object.entries(row)) if (NUMERIC.has(k)) nums[k] = parseNumber(v);
      if (section === 'products') out.productTotals = { ...nums, ...src(l) };
      else if (section === 'expenses') out.expenseTotal = { amount: firstNum(l.cells), ...src(l) };
      return;
    }
    const rec = { ...src(l), confidence: 'ok' };
    for (const h of header) {
      const raw = row[h.field];
      if (NUMERIC.has(h.field)) {
        const v = raw == null || EMPTY.has(raw.trim()) ? null : parseNumber(raw);
        rec[h.field] = v;
        if (raw != null && !EMPTY.has(raw.trim()) && v == null) { rec.confidence = 'unclear'; issue('UNCLEAR_VALUE', `قيمة غير واضحة (${raw}) في سطر ${clean(row.name || row.description || '')}`, l); }
      } else {
        rec[h.field] = raw == null || EMPTY.has(raw.trim()) ? null : clean(raw);
      }
    }
    if (section === 'products') {
      if (!rec.name && !rec.sku) { issue('ROW_UNREADABLE', 'سطر منتج بدون اسم أو رمز', l); return; }
      out.products.push(rec);
    } else if (section === 'expenses') {
      if (!rec.name) rec.name = rec.category || rec.note;
      if (!rec.name) { issue('ROW_UNREADABLE', 'سطر مصروف بدون بند', l); return; }
      out.expenses.push(rec);
    } else if (section === 'other') {
      if (!rec.description) { issue('ROW_UNREADABLE', 'سطر إيراد بدون بيان', l); return; }
      out.otherRevenue.push(rec);
    } else if (section === 'returns') {
      if (!rec.description) return;
      out.returns.push(rec);
    }
  });
  if (notes.length) out.notes = notes.join('\n');
  out.isReport = !!(out.date && (Object.keys(out.summary).length >= 2 || out.products.length));
  return out;
}

const firstNum = cells => { for (const c of cells) { const v = parseNumber(c.text); if (v != null) return v; } return null; };

/** Assign each cell of a data row to a header column by horizontal position. */
function mapRow(l, header) {
  const row = {};
  const hasPos = l.cells.every(c => c.x0 != null) && header.every(h => h.x0 != null);
  if (!hasPos) { // OCR lines: fall back to column order
    if (l.cells.length === header.length) header.forEach((h, i) => { row[h.field] = l.cells[i].text; });
    return row;
  }
  for (const c of l.cells) {
    let best = null, bestScore = -Infinity;
    for (const h of header) {
      const overlap = Math.min(c.x1, h.x1) - Math.max(c.x0, h.x0);
      const score = overlap > 0 ? overlap : -Math.min(Math.abs(c.x1 - h.x1), Math.abs(c.x0 - h.x0), Math.abs((c.x0 + c.x1) / 2 - (h.x0 + h.x1) / 2));
      if (score > bestScore) { bestScore = score; best = h; }
    }
    if (best) row[best.field] = row[best.field] ? `${row[best.field]} ${c.text}` : c.text;
  }
  return row;
}

export { round2 };
