// SQLite access (node:sqlite, no native deps) + forward-only migrations.
import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { normLabel } from './pulse/text.js';

const MIGRATIONS_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), 'migrations');

export function openDb(dbPath) {
  if (dbPath !== ':memory:') fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  const db = new DatabaseSync(dbPath);
  db.exec('PRAGMA foreign_keys = ON;');
  if (dbPath !== ':memory:') db.exec('PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000;');
  // Arabic-aware search normalisation available to SQL (search, filters).
  db.function('nlabel', { deterministic: true }, v => (v == null ? '' : normLabel(v)));
  migrate(db);
  return db;
}

export function migrate(db) {
  db.exec(`CREATE TABLE IF NOT EXISTS schema_migrations (version TEXT PRIMARY KEY, applied_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')))`);
  const done = new Set(db.prepare('SELECT version FROM schema_migrations').all().map(r => r.version));
  const files = fs.readdirSync(MIGRATIONS_DIR).filter(f => f.endsWith('.sql')).sort();
  for (const f of files) {
    const version = f.replace(/\.sql$/, '');
    if (done.has(version)) continue;
    tx(db, () => {
      db.exec(fs.readFileSync(path.join(MIGRATIONS_DIR, f), 'utf8'));
      db.prepare('INSERT INTO schema_migrations (version) VALUES (?)').run(version);
    });
  }
}

export function tx(db, fn) {
  db.exec('BEGIN');
  try {
    const r = fn();
    db.exec('COMMIT');
    return r;
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }
}

export function ensureBusiness(db, name, timezone) {
  const row = db.prepare('SELECT * FROM businesses WHERE name = ?').get(name);
  if (row) return row;
  const { lastInsertRowid } = db.prepare('INSERT INTO businesses (name, timezone) VALUES (?, ?)').run(name, timezone);
  return db.prepare('SELECT * FROM businesses WHERE id = ?').get(lastInsertRowid);
}

export function audit(db, { businessId, actor, action, entity, entityId, detail }) {
  db.prepare('INSERT INTO audit_log (business_id, actor, action, entity, entity_id, detail) VALUES (?,?,?,?,?,?)')
    .run(businessId ?? null, actor ?? null, action, entity ?? null, entityId != null ? String(entityId) : null, detail ? JSON.stringify(detail) : null);
}
