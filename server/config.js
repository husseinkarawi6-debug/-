// Runtime configuration. Everything comes from the environment so the same
// code runs locally, in tests (isolated data dir) and in production.
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export function loadConfig(env = process.env) {
  const dataDir = path.resolve(env.NEPTUNE_DATA_DIR || path.join(ROOT, 'data'));
  return {
    root: ROOT,
    port: Number(env.PORT || 8787),
    host: env.HOST || '127.0.0.1',
    dataDir,
    dbPath: path.join(dataDir, 'neptune.db'),
    filesDir: path.join(dataDir, 'reports'),
    publicDir: path.join(ROOT, 'public'),
    // Project timezone: "today" and report dates are resolved here, never in UTC.
    timezone: env.NEPTUNE_TZ || 'Asia/Baghdad',
    businessName: env.NEPTUNE_BUSINESS || 'ذروة الاقتصاد',
    maxUploadBytes: Number(env.NEPTUNE_MAX_UPLOAD_MB || 25) * 1024 * 1024,
    // Claude powers Ask ZOE and agent execution only — never page loads.
    claudeModel: env.NEPTUNE_MODEL || 'claude-opus-5',
    claudeEnabled: Boolean(env.ANTHROPIC_API_KEY || env.ANTHROPIC_AUTH_TOKEN),
    // Money comparison tolerance used by validation (absolute, in report currency).
    tolerance: Number(env.NEPTUNE_TOLERANCE || 0.05),
  };
}
