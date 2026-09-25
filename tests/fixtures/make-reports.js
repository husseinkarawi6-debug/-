// Generates TEST FIXTURE daily-report PDFs (Arabic, printed by Chromium like a
// web POS would). These are test inputs only — never loaded by the app itself.
//   node tests/fixtures/make-reports.js [outDir]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const OUT = path.join(HERE, 'out');
const CHROME = process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';

// catalogue used by the fixtures: [name, model, sku, brand, category, unitCost, unitPrice]
const CAT = [
  ['غسالة Hitachi 12 كغم', 'SF-120XWV', 'HT-WM12', 'Hitachi', 'غسالات', 307.5, 359],
  ['سبلت LG 1.5 طن', 'S4-Q18KL', 'LG-AS15', 'LG', 'مكيفات', 737.67, 745],
  ['ثلاجة Samsung 21 قدم', 'RT62K', 'SS-RF21', 'Samsung', 'ثلاجات', 971, 980],
  ['طباخ Fresh 90 سم', 'FR-9060', 'FR-CK90', 'Fresh', 'طباخات', 281.33, 290],
  ['تلفزيون Hisense 55', '55A6H', 'HS-TV55', 'Hisense', 'تلفزيونات', 459, 450],
  ['مجمدة Midea 300 لتر', 'HS-384', 'MD-FZ300', 'Midea', 'مجمدات', 398, 410],
  ['خلاط Nawal', 'NBL-2', 'NW-BL2', 'Nawal', 'أجهزة صغيرة', 31.9, 35],
  ['مايكرويف Panasonic', 'NN-ST25', 'PN-MW25', 'Panasonic', 'أجهزة صغيرة', 124, 130],
  ['مروحة FLOWR 16', 'FL-16', 'FL-FN16', 'FLOWR', 'أخرى', 58, 55],
];

// 25 Sep 2026 — exactly the approved design's numbers (totals cost, not unit cost)
const DAY_25 = {
  date: '2026-09-25',
  products: [
    [0, 4, 1230, 206], [1, 3, 2213, 22], [2, 2, 1942, 18], [3, 3, 844, 26], [4, 2, 918, -18],
    [5, 1, 398, 12], [6, 5, 159.51, 15.49], [7, 2, 248, 12], [8, 1, 58, -3],
  ],
  expenses: [
    ['ق-2291', 'رواتب', 'رواتب', 120, 'سلفة راتب لعامل المخزن'],
    ['ق-2294', 'مولدة', 'مولدة', 45, 'تبديل زيت + ديزل إضافي'],
    ['ق-2295', 'وقود', 'وقود', 18.5, 'بنزين سيارة التوصيل'],
    ['ق-2297', 'نقل', 'نقل', 12.02, 'أجرة نقل ثلاجة لزبون'],
    ['', 'قرطاسية', 'مصاريف عامة', 8, 'قرطاسية'],
    ['ق-2298', 'عمولة بيع', 'عمولات', 5, ''],
  ],
  other: [['عمولة تقسيط من المصرف', 180, '3 عقود'], ['خدمة تركيب وتوصيل', 144.07, '5 طلبات'], ['بيع كراتين وأجهزة تالفة', 150, 'دفعة شهرية']],
  returns: [['غسالة Samsung 8 كغم', 1, 310, 'عيب مصنعي']],
  notes: 'انقطاع الوطنية 6 ساعات. تم توصيل 5 طلبات. مرتجع غسالة Samsung 8 كغم بسبب عيب مصنعي.',
};

function rng(seed) { let s = seed; return () => { s = (s * 16807) % 2147483647; return s / 2147483647; }; }
const r2 = v => Math.round(v * 100) / 100;

/** Deterministic history day (no report on skipDates). */
export function historyDay(date) {
  const seed = Number(date.replace(/-/g, '')) % 2147483647;
  const r = rng(seed);
  const products = [];
  CAT.forEach((c, i) => {
    if (r() < 0.35) return;
    const q = 1 + Math.floor(r() * 4);
    const price = c[6] * (0.97 + r() * 0.06);
    const sales = r2(price * q), cost = r2(c[5] * q);
    products.push([i, q, cost, r2(sales - cost)]);
  });
  const gen = r2(14 + r() * 12);
  return {
    date,
    products,
    expenses: [['', 'رواتب', 'رواتب', r2(90 + r() * 25), ''], ['', 'مولدة', 'مولدة', gen, 'ديزل'], ['', 'وقود', 'وقود', r2(12 + r() * 8), ''], ['', 'نقل', 'نقل', r2(10 + r() * 6), '']],
    other: [['عمولة تقسيط من المصرف', r2(100 + r() * 120), ''], ['خدمة تركيب وتوصيل', r2(40 + r() * 80), '']],
    returns: [],
    notes: '',
  };
}

const fmt = v => (v < 0 ? '-' : '') + Math.abs(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function totals(d) {
  const sales = r2(d.products.reduce((s, p) => s + p[2] + p[3], 0));
  const gross = r2(d.products.reduce((s, p) => s + p[3], 0));
  const exp = r2(d.expenses.reduce((s, e) => s + e[3], 0));
  const other = r2(d.other.reduce((s, o) => s + o[1], 0));
  const units = d.products.reduce((s, p) => s + p[1], 0);
  return { sales, gross, exp, other, units, net: r2(gross + other - exp), cost: r2(d.products.reduce((s, p) => s + p[2], 0)) };
}

export function reportHtml(d, { override = {}, currency = 'USD', business = 'ذروة الاقتصاد للأجهزة المنزلية' } = {}) {
  const t = { ...totals(d), ...override };
  const [y, m, dd] = d.date.split('-');
  const curLabel = currency === 'USD' ? 'دولار أمريكي (USD)' : 'دينار عراقي (IQD)';
  const row = cells => `<tr>${cells.map(c => `<td>${c}</td>`).join('')}</tr>`;
  return `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><style>
    body{font-family:"DejaVu Sans",sans-serif;font-size:11px;margin:24px}
    h1{font-size:16px;margin:0}h2{font-size:13px;margin:16px 0 6px}
    table{border-collapse:collapse;width:100%}td,th{padding:3px 14px;text-align:right;border-bottom:1px solid #ccc;white-space:nowrap}
    .meta span{margin-left:60px}
  </style></head><body>
  <h1>${business}</h1><div>تقرير الأداء اليومي</div>
  <p class="meta"><span>التاريخ: ${dd}/${m}/${y}</span><span>العملة: ${curLabel}</span></p>
  <h2>الملخص</h2><table>
    ${row(['المبيعات', fmt(t.sales)])}${row(['ربح البضاعة', fmt(t.gross)])}${row(['إيرادات أخرى', fmt(t.other)])}
    ${row(['المصاريف', fmt(t.exp)])}${row(['صافي الربح', fmt(t.net)])}${row(['القطع المباعة', String(t.units)])}
  </table>
  <h2>مبيعات المنتجات</h2><table>
    <tr><th>#</th><th>المنتج</th><th>الموديل</th><th>SKU</th><th>الماركة</th><th>الفئة</th><th>الكمية</th><th>الكلفة</th><th>المبيعات</th><th>الربح</th></tr>
    ${d.products.map(([i, q, cost, profit], k) => { const c = CAT[i]; return row([String(k + 1), c[0], c[1], c[2], c[3], c[4], String(q), fmt(cost), fmt(cost + profit), fmt(profit)]); }).join('')}
    ${row(['', 'المجموع', '', '', '', '', String(t.units), fmt(t.cost), fmt(t.sales), fmt(t.gross)])}
  </table>
  <h2>المصاريف</h2><table>
    <tr><th>رقم القيد</th><th>البند</th><th>الفئة</th><th>المبلغ</th><th>الملاحظة</th></tr>
    ${d.expenses.map(e => row([e[0] || '—', e[1], e[2], fmt(e[3]), e[4] || '—'])).join('')}
    ${row(['', 'مجموع المصاريف', '', fmt(d.expenses.reduce((s, e) => s + e[3], 0)), ''])}
  </table>
  <h2>الإيرادات الأخرى</h2><table>
    <tr><th>البيان</th><th>المبلغ</th><th>ملاحظة</th></tr>
    ${d.other.map(o => row([o[0], fmt(o[1]), o[2] || '—'])).join('')}
  </table>
  ${d.returns.length ? `<h2>المرتجعات</h2><table><tr><th>المنتج</th><th>الكمية</th><th>المبلغ</th><th>السبب</th></tr>${d.returns.map(x => row([x[0], String(x[1]), fmt(x[2]), x[3]])).join('')}</table>` : ''}
  ${d.notes ? `<h2>ملاحظات</h2><p>${d.notes}</p>` : ''}
  </body></html>`;
}

export async function makeFixtures(outDir = OUT) {
  fs.mkdirSync(outDir, { recursive: true });
  const browser = await chromium.launch({ executablePath: CHROME });
  const page = await browser.newPage();
  const print = async (html, name) => { await page.setContent(html); await page.pdf({ path: path.join(outDir, name), format: 'A4', landscape: true }); return path.join(outDir, name); };
  const files = {};
  files.day25 = await print(reportHtml(DAY_25), 'report-2026-09-25.pdf');
  // history: 26 Aug → 24 Sep, no report on Fridays-off 18 Sep (gap test)
  files.history = [];
  for (let d = new Date(Date.UTC(2026, 7, 26)); d < new Date(Date.UTC(2026, 8, 25)); d.setUTCDate(d.getUTCDate() + 1)) {
    const iso = d.toISOString().slice(0, 10);
    if (iso === '2026-09-18') continue;
    files.history.push(await print(reportHtml(historyDay(iso)), `report-${iso}.pdf`));
  }
  // 26 Sep: reported expenses total disagrees with its own expense lines → NEEDS_REVIEW
  const d26 = historyDay('2026-09-26');
  files.review = await print(reportHtml(d26, { override: { exp: r2(totals(d26).exp + 20), net: r2(totals(d26).net - 20) } }), 'report-2026-09-26-review.pdf');
  // same date as 25 Sep, different content → duplicate date (replace/cancel)
  const d25b = JSON.parse(JSON.stringify(DAY_25)); d25b.products[0][1] = 5; d25b.products[0][2] = 1537.5; d25b.products[0][3] = 257.5;
  files.day25b = await print(reportHtml(d25b), 'report-2026-09-25-corrected.pdf');
  // IQD report for 25 Sep (must never be summed with USD)
  files.iqd = await print(reportHtml(historyDay('2026-09-25'), { currency: 'IQD' }), 'report-2026-09-25-iqd.pdf');
  // not a report
  files.notReport = await print('<html dir="rtl"><body style="font-family:DejaVu Sans"><h1>فاتورة كهرباء</h1><p>رقم الاشتراك 88213. المبلغ المستحق 45,000 دينار. يرجى التسديد قبل نهاية الشهر.</p></body></html>', 'not-a-report.pdf');
  // scanned: the day's report rendered as an image only (no text layer)
  await page.setContent(reportHtml(historyDay('2026-09-24')));
  const png = await page.screenshot({ fullPage: true });
  await page.setContent(`<html><body style="margin:0"><img style="width:100%" src="data:image/png;base64,${png.toString('base64')}"></body></html>`);
  files.scanned = path.join(outDir, 'scanned-report.pdf');
  await page.pdf({ path: files.scanned, format: 'A4', landscape: true });
  await browser.close();
  return files;
}

export { DAY_25 };

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const files = await makeFixtures(process.argv[2] || OUT);
  console.log(JSON.stringify(files, null, 1).slice(0, 600));
}
