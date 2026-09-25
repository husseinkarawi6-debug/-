// Daily report import pipeline:
// upload → store original (evidence) → extract → parse → normalise → validate →
// save as PENDING preview → approve (optionally replace) → dashboards refresh.
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { tx, audit } from '../db.js';
import { extractPdf, ExtractError, isPdf } from './extract.js';
import { parseReport } from './parse.js';
import { validateReport } from './validate.js';
import { productKey, round2 } from './text.js';

export class ImportError extends Error {
  constructor(code, message, status = 400, extra = {}) { super(message); this.code = code; this.status = status; Object.assign(this, extra); }
}

const SUMMARY = ['sales', 'gross_profit', 'expenses', 'other_revenue', 'net_profit', 'units_sold'];

export async function importReport(ctx, { buffer, originalName, actor }) {
  const { db, config, business } = ctx;
  if (!buffer || !buffer.length) throw new ImportError('EMPTY_FILE', 'الملف فارغ');
  if (buffer.length > config.maxUploadBytes) throw new ImportError('FILE_TOO_LARGE', 'حجم الملف أكبر من المسموح', 413);
  if (!isPdf(buffer)) throw new ImportError('UNSUPPORTED_PDF', 'الملف ليس PDF', 415);

  const sha = crypto.createHash('sha256').update(buffer).digest('hex');
  const dupFile = db.prepare(`SELECT r.id, r.report_date, r.status FROM report_files f JOIN reports r ON r.file_id = f.id
    WHERE f.business_id = ? AND f.sha256 = ? ORDER BY r.id DESC LIMIT 1`).get(business.id, sha);
  if (dupFile) {
    throw new ImportError('DUPLICATE_REPORT', 'هذا الملف نفسه مرفوع سابقاً ولا يدخل مرتين', 409, { existingReportId: dupFile.id, sameFile: true });
  }

  // keep the original PDF, content-addressed, never deleted
  fs.mkdirSync(config.filesDir, { recursive: true });
  const stored = path.join(config.filesDir, `${sha}.pdf`);
  if (!fs.existsSync(stored)) fs.writeFileSync(stored, buffer, { flag: 'wx' });
  const safeName = String(originalName || 'report.pdf').replace(/[\\/\0]/g, '_').slice(0, 200);

  let extracted = null, parsed = null, verdict = null, failure = null;
  try {
    extracted = await extractPdf(buffer);
    parsed = parseReport(extracted.lines);
    verdict = validateReport(parsed, { tolerance: config.tolerance });
    if (verdict.validation === 'FAILED') failure = { code: verdict.errorCode, message: 'الملف ليس تقرير أداء يومي يمكن قراءته' };
  } catch (e) {
    if (!(e instanceof ExtractError)) throw e;
    failure = { code: e.code, message: e.message };
  }

  const reportId = tx(db, () => {
    const f = db.prepare(`INSERT INTO report_files (business_id, sha256, original_name, stored_path, size_bytes, pages, extraction_method, uploaded_by)
      VALUES (?,?,?,?,?,?,?,?)`).run(business.id, sha, safeName, path.relative(config.dataDir, stored), buffer.length,
      extracted ? extracted.pages : null, extracted ? extracted.method : null, actor);
    const fileId = Number(f.lastInsertRowid);
    if (failure) {
      const r = db.prepare(`INSERT INTO reports (business_id, file_id, status, validation, error_code, error_message, imported_by, parse_meta)
        VALUES (?,?,?,?,?,?,?,?)`).run(business.id, fileId, 'failed', 'FAILED', failure.code, failure.message, actor,
        JSON.stringify({ lines: extracted ? extracted.lines.length : 0 }));
      const id = Number(r.lastInsertRowid);
      if (verdict) insertChecks(db, id, verdict.checks);
      audit(db, { businessId: business.id, actor, action: 'report.import_failed', entity: 'report', entityId: id, detail: failure });
      return id;
    }
    const e = verdict.effective;
    const r = db.prepare(`INSERT INTO reports (business_id, file_id, report_date, currency, status, validation, sales, gross_profit, expenses,
      other_revenue, net_profit, units_sold, business_label, report_notes, imported_by, parse_meta) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
      .run(business.id, fileId, parsed.date ? parsed.date.value : null, parsed.currency ? parsed.currency.value : null, 'pending', verdict.validation,
        e.sales, e.gross_profit, e.expenses, e.other_revenue, e.net_profit, e.units_sold,
        parsed.business ? parsed.business.value : null, parsed.notes, actor,
        JSON.stringify({ method: extracted.method, pages: extracted.pages, lines: extracted.lines.length, lineage: verdict.lineage, ...parsed.meta, issues: parsed.issues }));
    const id = Number(r.lastInsertRowid);
    const fld = db.prepare('INSERT INTO report_fields (report_id, field, raw_text, value_num, value_text, page, line_no, confidence) VALUES (?,?,?,?,?,?,?,?)');
    if (parsed.date) fld.run(id, 'date', parsed.date.raw, null, parsed.date.value, parsed.date.page, parsed.date.lineNo, 'ok');
    if (parsed.currency) fld.run(id, 'currency', parsed.currency.raw, null, parsed.currency.value, parsed.currency.page, parsed.currency.lineNo, 'ok');
    if (parsed.business) fld.run(id, 'business', parsed.business.raw, null, parsed.business.value, parsed.business.page, parsed.business.lineNo, 'ok');
    for (const k of SUMMARY) {
      const s = parsed.summary[k];
      if (s) fld.run(id, k, s.raw, s.value, s.rawValue, s.page, s.lineNo, s.confidence);
      else if (verdict.lineage[k].source === 'calculated') fld.run(id, k, null, e[k], verdict.lineage[k].from, null, null, 'calculated');
    }
    const ip = db.prepare(`INSERT INTO report_products (report_id, item_no, name, model, sku, brand, category, product_key, quantity, sales, cost, profit, page, line_no, raw_text, confidence)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);
    for (const p of parsed.products) {
      ip.run(id, p.item_no ?? null, p.name || p.sku, p.model ?? null, p.sku ?? null, p.brand ?? null, p.category ?? null, productKey(p),
        p.quantity ?? null, p.sales ?? null, p.cost ?? null, p.profit ?? null, p.page, p.lineNo, p.raw, p.confidence);
    }
    const ie = db.prepare('INSERT INTO report_expenses (report_id, name, category, amount, ref, note, page, line_no, raw_text, confidence) VALUES (?,?,?,?,?,?,?,?,?,?)');
    for (const x of parsed.expenses) ie.run(id, x.name, x.category ?? null, x.amount ?? null, x.ref ?? null, x.note ?? null, x.page, x.lineNo, x.raw, x.confidence);
    const io = db.prepare('INSERT INTO report_other_revenue (report_id, description, amount, note, page, line_no, raw_text, confidence) VALUES (?,?,?,?,?,?,?,?)');
    for (const x of parsed.otherRevenue) io.run(id, x.description, x.amount ?? null, x.note ?? null, x.page, x.lineNo, x.raw, x.confidence);
    const ir = db.prepare('INSERT INTO report_returns (report_id, description, quantity, amount, reason, page, line_no, raw_text) VALUES (?,?,?,?,?,?,?,?)');
    for (const x of parsed.returns) ir.run(id, x.description, x.quantity ?? null, x.amount ?? null, x.reason ?? null, x.page, x.lineNo, x.raw);
    insertChecks(db, id, verdict.checks);
    audit(db, { businessId: business.id, actor, action: 'report.imported', entity: 'report', entityId: id, detail: { validation: verdict.validation, file: safeName } });
    return id;
  });
  ctx.cache.bump();
  return getReportPreview(ctx, reportId);
}

function insertChecks(db, reportId, checks) {
  db.prepare('DELETE FROM report_checks WHERE report_id = ?').run(reportId);
  const st = db.prepare('INSERT INTO report_checks (report_id, code, status, field, reported, calculated, difference, message) VALUES (?,?,?,?,?,?,?,?)');
  for (const c of checks) st.run(reportId, c.code, c.status, c.field ?? null, c.reported ?? null, c.calculated ?? null, c.difference ?? null, c.message);
}

/** Everything the review overlay needs, plus the duplicate-date conflict if any. */
export function getReportPreview(ctx, id) {
  const { db, business } = ctx;
  const r = db.prepare(`SELECT r.*, f.original_name, f.sha256, f.pages, f.extraction_method, f.uploaded_at, f.size_bytes
    FROM reports r JOIN report_files f ON f.id = r.file_id WHERE r.id = ? AND r.business_id = ?`).get(id, business.id);
  if (!r) return null;
  const q = sql => db.prepare(sql).all(id);
  const conflict = r.report_date && r.status === 'pending'
    ? db.prepare(`SELECT id, report_date, currency, sales, net_profit, approved_at FROM reports WHERE business_id = ? AND report_date = ? AND status = 'approved'
      AND (currency IS ? OR ? IS NULL) AND id != ?`).get(business.id, r.report_date, r.currency, r.currency, id) : null;
  return {
    ...r,
    parse_meta: r.parse_meta ? JSON.parse(r.parse_meta) : null,
    fields: q('SELECT * FROM report_fields WHERE report_id = ? ORDER BY id'),
    products: q('SELECT * FROM report_products WHERE report_id = ? ORDER BY id'),
    expenses: q('SELECT * FROM report_expenses WHERE report_id = ? ORDER BY id'),
    otherRevenue: q('SELECT * FROM report_other_revenue WHERE report_id = ? ORDER BY id'),
    returns: q('SELECT * FROM report_returns WHERE report_id = ? ORDER BY id'),
    checks: q('SELECT * FROM report_checks WHERE report_id = ? ORDER BY id'),
    corrections: q('SELECT * FROM report_corrections WHERE report_id = ? ORDER BY id'),
    conflict: conflict || null,
  };
}

const EDITABLE = {
  report: new Set(SUMMARY),
  product: new Set(['quantity', 'sales', 'cost', 'profit']),
  expense: new Set(['amount']),
  other_revenue: new Set(['amount']),
};
const TABLE = { product: 'report_products', expense: 'report_expenses', other_revenue: 'report_other_revenue' };

/** Rebuild a parse-shaped object from stored rows so corrected reports re-validate with the same rules. */
function reparsedFromDb(db, id, corrected) {
  const r = db.prepare('SELECT * FROM reports WHERE id = ?').get(id);
  const fields = db.prepare('SELECT * FROM report_fields WHERE report_id = ?').all(id);
  const summary = {};
  for (const f of fields) {
    if (!SUMMARY.includes(f.field) || f.confidence === 'calculated') continue;
    const v = corrected.has(f.field) ? r[f.field] : f.value_num;
    summary[f.field] = { value: v, confidence: v == null ? 'unclear' : 'ok' };
  }
  for (const k of corrected) if (SUMMARY.includes(k)) summary[k] = { value: r[k], confidence: 'ok' };
  const rows = t => db.prepare(`SELECT * FROM ${t} WHERE report_id = ?`).all(id);
  const products = rows('report_products');
  const expenses = rows('report_expenses');
  const otherRevenue = rows('report_other_revenue');
  const issues = [...products, ...expenses, ...otherRevenue]
    .filter(x => x.confidence === 'unclear')
    .map(x => ({ code: 'UNCLEAR_VALUE', message: `قيمة غير واضحة في سطر ${x.name || x.description}` }));
  return {
    isReport: true,
    date: r.report_date ? { value: r.report_date } : null,
    currency: r.currency ? { value: r.currency } : null,
    summary, products, expenses, otherRevenue, returns: [], issues, meta: {},
    productTotals: null, expenseTotal: null,
  };
}

export function approveReport(ctx, id, { actor, replace = false, acknowledge = false, corrections = [], date, currency } = {}) {
  const { db, business, config } = ctx;
  const r = db.prepare('SELECT * FROM reports WHERE id = ? AND business_id = ?').get(id, business.id);
  if (!r) throw new ImportError('NOT_FOUND', 'التقرير غير موجود', 404);
  if (r.status !== 'pending') throw new ImportError('NOT_PENDING', 'التقرير ليس بانتظار الاعتماد', 409);
  if (r.validation === 'FAILED') throw new ImportError('PARSING_FAILED', 'لا يمكن اعتماد تقرير فشلت قراءته', 409);

  const result = tx(db, () => {
    const corrected = new Set(db.prepare("SELECT field FROM report_corrections WHERE report_id = ? AND entity = 'report'").all(id).map(x => x.field));
    if (date) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new ImportError('BAD_DATE', 'تاريخ غير صالح');
      db.prepare('UPDATE reports SET report_date = ? WHERE id = ?').run(date, id);
      audit(db, { businessId: business.id, actor, action: 'report.date_set', entity: 'report', entityId: id, detail: { old: r.report_date, new: date } });
    }
    if (currency) {
      if (!/^[A-Z]{3}$/.test(currency)) throw new ImportError('BAD_CURRENCY', 'عملة غير صالحة');
      db.prepare('UPDATE reports SET currency = ? WHERE id = ?').run(currency, id);
      audit(db, { businessId: business.id, actor, action: 'report.currency_set', entity: 'report', entityId: id, detail: { old: r.currency, new: currency } });
    }
    for (const c of corrections) {
      const value = Number(c.value);
      if (!EDITABLE[c.entity] || !EDITABLE[c.entity].has(c.field) || !Number.isFinite(value)) throw new ImportError('BAD_CORRECTION', 'تصحيح غير صالح');
      if (c.entity === 'report') {
        const old = db.prepare(`SELECT ${c.field} AS v FROM reports WHERE id = ?`).get(id).v;
        db.prepare(`UPDATE reports SET ${c.field} = ? WHERE id = ?`).run(round2(value), id);
        db.prepare('INSERT INTO report_corrections (report_id, entity, entity_id, field, old_value, new_value, reason, corrected_by) VALUES (?,?,?,?,?,?,?,?)')
          .run(id, 'report', id, c.field, old, round2(value), c.reason || null, actor);
        corrected.add(c.field);
      } else {
        const t = TABLE[c.entity];
        const row = db.prepare(`SELECT * FROM ${t} WHERE id = ? AND report_id = ?`).get(c.entityId, id);
        if (!row) throw new ImportError('BAD_CORRECTION', 'السطر غير موجود');
        db.prepare(`UPDATE ${t} SET ${c.field} = ?, confidence = 'ok' WHERE id = ?`).run(round2(value), row.id);
        db.prepare('INSERT INTO report_corrections (report_id, entity, entity_id, field, old_value, new_value, reason, corrected_by) VALUES (?,?,?,?,?,?,?,?)')
          .run(id, c.entity, row.id, c.field, row[c.field], round2(value), c.reason || null, actor);
      }
    }
    // re-validate with exactly the same rules
    const p = reparsedFromDb(db, id, corrected);
    const v = validateReport(p, { tolerance: config.tolerance });
    insertChecks(db, id, v.checks);
    // effective values follow corrections; re-derive the ones the report never printed
    const cur = db.prepare('SELECT * FROM reports WHERE id = ?').get(id);
    const upd = {};
    for (const k of SUMMARY) if (!corrected.has(k) && v.lineage[k].source === 'calculated') upd[k] = v.effective[k];
    for (const [k, val] of Object.entries(upd)) db.prepare(`UPDATE reports SET ${k} = ? WHERE id = ?`).run(val, id);
    db.prepare('UPDATE reports SET validation = ? WHERE id = ?').run(v.validation, id);

    if (!cur.report_date) throw new ImportError('DATE_REQUIRED', 'حدّد تاريخ التقرير قبل الاعتماد', 422);
    if (!cur.currency) throw new ImportError('CURRENCY_REQUIRED', 'حدّد عملة التقرير قبل الاعتماد', 422);
    const failing = v.checks.filter(c => c.status === 'fail');
    if (failing.length && !acknowledge) {
      throw new ImportError('NEEDS_REVIEW', 'ما زالت هناك قيم تحتاج مراجعة', 422, { checks: failing });
    }
    const existing = db.prepare(`SELECT id FROM reports WHERE business_id = ? AND report_date = ? AND currency = ? AND status = 'approved'`)
      .get(business.id, cur.report_date, cur.currency);
    if (existing && !replace) {
      throw new ImportError('DUPLICATE_REPORT', 'يوجد تقرير معتمد لنفس اليوم', 409, { existingReportId: existing.id });
    }
    if (existing) {
      db.prepare("UPDATE reports SET status = 'superseded', superseded_by = ? WHERE id = ?").run(id, existing.id);
      audit(db, { businessId: business.id, actor, action: 'report.replaced', entity: 'report', entityId: existing.id, detail: { by: id } });
    }
    db.prepare(`UPDATE reports SET status = 'approved', approved_at = strftime('%Y-%m-%dT%H:%M:%fZ','now'), approved_by = ? WHERE id = ?`).run(actor, id);
    audit(db, { businessId: business.id, actor, action: 'report.approved', entity: 'report', entityId: id,
      detail: { acknowledged: failing.map(c => c.code), corrections: corrections.length, replaced: existing ? existing.id : null } });
    return id;
  });
  ctx.cache.bump();
  return getReportPreview(ctx, result);
}

export function cancelReport(ctx, id, { actor } = {}) {
  const { db, business } = ctx;
  const r = db.prepare('SELECT * FROM reports WHERE id = ? AND business_id = ?').get(id, business.id);
  if (!r) throw new ImportError('NOT_FOUND', 'التقرير غير موجود', 404);
  if (r.status !== 'pending') throw new ImportError('NOT_PENDING', 'التقرير ليس بانتظار الاعتماد', 409);
  db.prepare("UPDATE reports SET status = 'rejected' WHERE id = ?").run(id);
  audit(db, { businessId: business.id, actor, action: 'report.cancelled', entity: 'report', entityId: id });
  ctx.cache.bump();
  return getReportPreview(ctx, id);
}

export function reportFilePath(ctx, id) {
  const row = ctx.db.prepare('SELECT f.stored_path, f.original_name FROM reports r JOIN report_files f ON f.id = r.file_id WHERE r.id = ? AND r.business_id = ?')
    .get(id, ctx.business.id);
  if (!row) return null;
  const p = path.resolve(ctx.config.dataDir, row.stored_path);
  if (!p.startsWith(path.resolve(ctx.config.dataDir) + path.sep)) return null;
  return { path: p, name: row.original_name };
}
