// Text utilities shared by extraction and parsing: Arabic normalisation,
// visual→logical reordering of positioned PDF glyphs, and number parsing.

const ARABIC = /[؀-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻿]/;
const STRONG_LTR = /[A-Za-z0-9٠-٩۰-۹]/;

export const hasArabic = s => ARABIC.test(s);

/** Canonical form used for label matching (not for display). */
export function normLabel(s) {
  return String(s || '')
    .normalize('NFKC')
    .replace(/[ً-ٰٟـ]/g, '') // harakat, superscript alef, tatweel
    .replace(/[إأآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/[:：\-–—_*•·]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

/** Display form: presentation forms unfolded, whitespace collapsed. */
export function clean(s) {
  return String(s || '').normalize('NFKC').replace(/ـ/g, '').replace(/\s+/g, ' ').trim();
}

const AR_DIGITS = { '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4', '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9',
  '۰': '0', '۱': '1', '۲': '2', '۳': '3', '۴': '4', '۵': '5', '۶': '6', '۷': '7', '۸': '8', '۹': '9' };

/**
 * Parse a money/quantity cell. Returns null when the cell is not a number.
 * Handles: 1,436.00  −18  -18.00  18.00-  (18.00)  ١٬٤٣٦٫٠٠  $1,436  1,436 د.ع  IQD 1,436
 */
export function parseNumber(raw) {
  if (raw == null) return null;
  let s = clean(raw).replace(/[٠-٩۰-۹]/g, d => AR_DIGITS[d]).replace(/٬/g, ',').replace(/٫/g, '.');
  s = s.replace(/(usd|iqd|us\$|\$|د\.?\s?ع|دينار|دولار)/gi, '').replace(/\s+/g, '');
  if (!s) return null;
  let neg = false;
  if (/^\(.*\)$/.test(s)) { neg = true; s = s.slice(1, -1); }
  if (/^[−\-–]/.test(s)) { neg = true; s = s.slice(1); }
  if (/[−\-–]$/.test(s)) { neg = true; s = s.slice(0, -1); }
  if (/^\+/.test(s)) s = s.slice(1);
  if (!/^\d{1,3}(,\d{3})*(\.\d+)?$|^\d+(\.\d+)?$/.test(s)) return null;
  const v = Number(s.replace(/,/g, ''));
  if (!Number.isFinite(v)) return null;
  return neg ? -v : v;
}

export const round2 = v => (v == null ? null : Math.round(v * 100) / 100);

/**
 * Rebuild logical text lines from pdf.js text items of one page.
 * Items arrive in drawing order with visual x positions; Arabic glyphs are often
 * one item each (presentation forms). We group by baseline, then order items:
 *   - lines with Arabic → right-to-left, keeping embedded LTR runs left-to-right
 *   - pure LTR lines     → left-to-right
 * Large horizontal gaps split a line into cells (table columns / label:value).
 */
export function buildLines(items, pageNo) {
  const toks = items
    .filter(it => it.str !== undefined)
    .map(it => {
      const fs = Math.hypot(it.transform[0], it.transform[1]) || it.height || 10;
      return { s: it.str, x: it.transform[4], y: it.transform[5], w: it.width || 0, fs };
    })
    .filter(t => t.s.length);
  // group by baseline
  toks.sort((a, b) => b.y - a.y || a.x - b.x);
  const rows = [];
  for (const t of toks) {
    const r = rows.find(r => Math.abs(r.y - t.y) <= Math.max(2, t.fs * 0.3));
    if (r) r.toks.push(t); else rows.push({ y: t.y, toks: [t] });
  }
  rows.sort((a, b) => b.y - a.y);
  return rows.map((r, i) => {
    const fs = median(r.toks.map(t => t.fs));
    const vis = r.toks.slice().sort((a, b) => a.x - b.x);
    // split into visual cells by big gaps
    const cellsVis = [];
    let cur = [];
    for (const t of vis) {
      const prev = cur[cur.length - 1];
      if (prev && t.x - (prev.x + prev.w) > fs * 1.6 && prev.s.trim() && t.s.trim()) { cellsVis.push(cur); cur = []; }
      if (!t.s.trim() && prev && !prev.s.trim()) continue;
      cur.push(t);
    }
    if (cur.length) cellsVis.push(cur);
    const rtl = r.toks.some(t => hasArabic(t.s));
    const cells = cellsVis
      .map(c => ({ text: clean(joinCell(c, fs)), x0: c[0].x, x1: c[c.length - 1].x + c[c.length - 1].w }))
      .filter(c => c.text);
    if (rtl) cells.sort((a, b) => b.x1 - a.x1); // logical reading order right→left
    const text = cells.map(c => c.text).join('  ');
    return { page: pageNo, lineNo: i + 1, y: r.y, fs, rtl, cells, text };
  });
}

function joinCell(toks, fs) {
  const rtl = toks.some(t => hasArabic(t.s));
  // insert spaces for visual gaps
  const withGaps = [];
  toks.forEach((t, i) => {
    const p = toks[i - 1];
    if (p && t.x - (p.x + p.w) > fs * 0.18 && p.s.trim() && t.s.trim()) withGaps.push({ ...t, s: ' ', gap: true });
    withGaps.push(t);
  });
  if (!rtl) return withGaps.map(t => t.s).join('');
  // RTL: reverse the visual order, but keep runs of LTR tokens (latin/digits) in visual order.
  const out = [];
  const seq = withGaps.slice().reverse();
  for (let i = 0; i < seq.length;) {
    if (isLtrTok(seq[i])) {
      let j = i;
      while (j + 1 < seq.length && (isLtrTok(seq[j + 1]) || (!seq[j + 1].s.trim() && j + 2 < seq.length && isLtrTok(seq[j + 2])))) j++;
      out.push(...seq.slice(i, j + 1).reverse());
      i = j + 1;
    } else { out.push({ ...seq[i], s: mirror(seq[i].s) }); i++; }
  }
  return out.map(t => t.s).join('');
}
const MIRROR = { '(': ')', ')': '(', '[': ']', ']': '[', '{': '}', '}': '{', '<': '>', '>': '<', '«': '»', '»': '«' };
// Glyphs drawn in an RTL run are mirrored; when reading them back as logical text swap them.
const mirror = s => (s.length === 1 && MIRROR[s] ? MIRROR[s] : s);
const isLtrTok = t => STRONG_LTR.test(t.s) && !hasArabic(t.s);
const median = a => { const s = a.slice().sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : 10; };

/** Normalise a product identity for grouping the same product across reports. */
export function productKey({ sku, model, name }) {
  const k = sku || model || name || '';
  return normLabel(k).replace(/\s+/g, '');
}

/** Money for human-readable reasons (the UI formats KPI numbers itself). */
export function fmtMoney(v, currency) {
  if (v == null) return '—';
  const neg = v < 0, a = Math.abs(v);
  if (currency === 'IQD') return `${neg ? '−' : ''}${Math.round(a).toLocaleString('en-US')} د.ع`;
  const s = a.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return currency === 'USD' || !currency ? `${neg ? '−' : ''}$${s}` : `${neg ? '−' : ''}${s} ${currency}`;
}
