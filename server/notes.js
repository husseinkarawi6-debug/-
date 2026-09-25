// Notes attached to Business Pulse entities (report, date, product, alert, opportunity, task, expense).
import { audit } from './db.js';

const TYPES = new Set(['report', 'date', 'product', 'alert', 'opportunity', 'task', 'expense']);

export function createNote(ctx, { entityType, entityId, reportId, date, body }, { actor } = {}) {
  const text = String(body || '').trim();
  if (!text) throw Object.assign(new Error('الملاحظة فارغة'), { status: 400, code: 'EMPTY' });
  if (text.length > 4000) throw Object.assign(new Error('الملاحظة طويلة جداً'), { status: 400, code: 'TOO_LONG' });
  if (!TYPES.has(entityType)) throw Object.assign(new Error('نوع غير معروف'), { status: 400, code: 'BAD_ENTITY' });
  if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) throw Object.assign(new Error('تاريخ غير صالح'), { status: 400, code: 'BAD_DATE' });
  if (reportId != null && !ctx.db.prepare('SELECT 1 FROM reports WHERE id = ? AND business_id = ?').get(reportId, ctx.business.id)) {
    throw Object.assign(new Error('التقرير غير موجود'), { status: 404, code: 'NOT_FOUND' });
  }
  const r = ctx.db.prepare('INSERT INTO notes (business_id, entity_type, entity_id, report_id, note_date, body, author) VALUES (?,?,?,?,?,?,?)')
    .run(ctx.business.id, entityType, entityId != null ? String(entityId).slice(0, 200) : null, reportId ?? null, date || null, text, actor || null);
  audit(ctx.db, { businessId: ctx.business.id, actor, action: 'note.created', entity: 'note', entityId: Number(r.lastInsertRowid) });
  return ctx.db.prepare('SELECT * FROM notes WHERE id = ?').get(r.lastInsertRowid);
}

export function listNotes(ctx, { entityType, entityId, reportId, from, to, limit = 50 } = {}) {
  const w = ['business_id = ?'], a = [ctx.business.id];
  if (entityType) { w.push('entity_type = ?'); a.push(entityType); }
  if (entityId) { w.push('entity_id = ?'); a.push(String(entityId)); }
  if (reportId) { w.push('report_id = ?'); a.push(Number(reportId)); }
  if (from && to) { w.push('(note_date BETWEEN ? AND ? OR report_id IN (SELECT id FROM reports WHERE report_date BETWEEN ? AND ?))'); a.push(from, to, from, to); }
  a.push(Math.min(Number(limit) || 50, 200));
  return ctx.db.prepare(`SELECT * FROM notes WHERE ${w.join(' AND ')} ORDER BY id DESC LIMIT ?`).all(...a);
}
