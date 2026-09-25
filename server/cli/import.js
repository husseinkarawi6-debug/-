// Bulk import historical reports through the SAME pipeline as the UI.
//   npm run import -- <file-or-dir> [--approve]
// --approve auto-approves only VALID reports; NEEDS_REVIEW stay pending for the UI.
import fs from 'node:fs';
import path from 'node:path';
import { loadConfig } from '../config.js';
import { openDb, ensureBusiness } from '../db.js';
import { createCache } from '../pulse/cache.js';
import { importReport, approveReport, ImportError } from '../pulse/import.js';

const args = process.argv.slice(2);
const approve = args.includes('--approve');
const target = args.find(a => !a.startsWith('--'));
if (!target) { console.error('usage: npm run import -- <file-or-dir> [--approve]'); process.exit(1); }
const config = loadConfig();
const db = openDb(config.dbPath);
const ctx = { db, config, business: ensureBusiness(db, config.businessName, config.timezone), cache: createCache() };
const files = fs.statSync(target).isDirectory() ? fs.readdirSync(target).filter(f => f.toLowerCase().endsWith('.pdf')).sort().map(f => path.join(target, f)) : [target];
for (const f of files) {
  try {
    const r = await importReport(ctx, { buffer: fs.readFileSync(f), originalName: path.basename(f), actor: 'cli' });
    let status = r.status;
    if (approve && r.validation === 'VALID') status = approveReport(ctx, r.id, { actor: 'cli' }).status;
    console.log(`${path.basename(f)}\t${r.report_date || '-'}\t${r.validation}\t${status}${r.error_code ? `\t${r.error_code}` : ''}`);
  } catch (e) {
    if (!(e instanceof ImportError)) throw e;
    console.log(`${path.basename(f)}\t-\t${e.code}\t${e.message}`);
  }
}
