// HTTP app: static UI + JSON API. No framework — node:http only.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { openDb, ensureBusiness } from './db.js';
import { createCache } from './pulse/cache.js';
import { importReport, approveReport, cancelReport, getReportPreview, reportFilePath, ImportError } from './pulse/import.js';
import { overview, planetItems, slimTask } from './pulse/overview.js';
import { resolvePeriod } from './pulse/period.js';
import * as Q from './pulse/queries.js';
import { createTask, getTask, listTasks, TaskError } from './agents/tasks.js';
import { createHarness } from './agents/harness.js';
import { makeClaudeClient } from './zoe/claude.js';
import { askZoe } from './zoe/ask.js';
import { createNote, listNotes } from './notes.js';
import { ocrAvailable } from './pulse/extract.js';

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon', '.json': 'application/json' };

export function createApp(config, { claudeClient } = {}) {
  const db = openDb(config.dbPath);
  const business = ensureBusiness(db, config.businessName, config.timezone);
  const cache = createCache();
  const ctx = { db, config, business, cache };
  const client = claudeClient !== undefined ? claudeClient : makeClaudeClient(config);
  const harness = createHarness(ctx, { client, model: config.claudeModel });
  ctx.harness = harness;
  const actorOf = req => decodeHeader(req.headers['x-neptune-user']) || process.env.NEPTUNE_USER || 'حسين';

  const routes = [];
  const on = (method, pattern, fn) => routes.push({ method, re: new RegExp(`^${pattern.replace(/:(\w+)/g, '(?<$1>[^/]+)')}$`), fn });

  on('GET', '/api/health', () => ({ ok: true, business: business.name, timezone: config.timezone,
    claude: { enabled: !!client, model: client ? config.claudeModel : null, reason: client ? null : 'ANTHROPIC_API_KEY غير مضبوط على الخادم' },
    ocr: ocrAvailable(), stock: { connected: false, reason: 'بيانات المخزون غير مرتبطة' } }));

  // ---- Business Pulse reads
  on('GET', '/api/pulse/overview', ({ q }) => overview(ctx, q));
  on('GET', '/api/pulse/products', ({ q }) => {
    const p = resolvePeriod(q, config.timezone); const cur = Q.resolveCurrency(ctx, q.currency);
    if (!cur) return { items: [], total: 0 };
    return cache.wrap(`products:${JSON.stringify([p, cur, q.brand, q.category, q.status, q.q, q.sort])}`,
      () => Q.products(ctx, p.from, p.to, cur, { brand: q.brand, category: q.category, status: q.status, q: q.q }, { sort: q.sort, limit: 100 }));
  });
  on('GET', '/api/pulse/compare', ({ q }) => {
    const p = resolvePeriod(q, config.timezone); const cur = Q.resolveCurrency(ctx, q.currency);
    return { period: p, currency: cur, ...(cur ? Q.comparison(ctx, p, cur) : { current: null, baselines: {} }) };
  });
  on('GET', '/api/pulse/metric/:key', ({ q, params }) => {
    const p = resolvePeriod(q, config.timezone); const cur = Q.resolveCurrency(ctx, q.currency);
    return Q.metricDetail(ctx, params.key, p, cur);
  });
  on('GET', '/api/pulse/product/:key', ({ q, params }) => {
    const p = resolvePeriod(q, config.timezone); const cur = Q.resolveCurrency(ctx, q.currency);
    const d = Q.productDetail(ctx, decodeURIComponent(params.key), p, cur);
    if (!d) throw httpError(404, 'NOT_FOUND', 'المنتج غير موجود');
    return { ...d, notes: listNotes(ctx, { entityType: 'product', entityId: d.key }), tasks: listTasks(ctx, { limit: 50 }).filter(t => t.context.product && t.context.product.key === d.key).map(slimTask) };
  });
  on('GET', '/api/pulse/expense/:id', ({ params }) => {
    const e = Q.expenseDetail(ctx, Number(params.id));
    if (!e) throw httpError(404, 'NOT_FOUND', 'المصروف غير موجود');
    return { ...e, notes: listNotes(ctx, { entityType: 'expense', entityId: e.id }) };
  });
  on('GET', '/api/pulse/planet', ({ q }) => planetItems(ctx, q));
  on('GET', '/api/pulse/reports', () => ({ reports: Q.reportHistory(ctx, { limit: 100 }), pending: Q.pendingReports(ctx) }));
  on('GET', '/api/pulse/reports/:id', ({ params }) => {
    const r = getReportPreview(ctx, Number(params.id));
    if (!r) throw httpError(404, 'NOT_FOUND', 'التقرير غير موجود');
    return { ...r, notes: listNotes(ctx, { reportId: r.id }) };
  });
  on('GET', '/api/pulse/reports/:id/file', ({ params, res }) => {
    const f = reportFilePath(ctx, Number(params.id));
    if (!f || !fs.existsSync(f.path)) throw httpError(404, 'NOT_FOUND', 'الملف الأصلي غير موجود');
    res.writeHead(200, { 'content-type': 'application/pdf', 'content-disposition': `inline; filename*=UTF-8''${encodeURIComponent(f.name)}`, 'x-content-type-options': 'nosniff', 'cache-control': 'private, max-age=3600' });
    fs.createReadStream(f.path).pipe(res);
    return STREAMED;
  });

  // ---- Business Pulse writes
  on('POST', '/api/pulse/reports', async ({ req }) => {
    const buffer = await readBody(req, config.maxUploadBytes);
    return importReport(ctx, { buffer, originalName: decodeHeader(req.headers['x-filename']) || 'report.pdf', actor: actorOf(req) });
  });
  on('POST', '/api/pulse/reports/:id/approve', async ({ req, params }) => {
    const b = await readJson(req);
    return approveReport(ctx, Number(params.id), { actor: actorOf(req), replace: !!b.replace, acknowledge: !!b.acknowledge, corrections: Array.isArray(b.corrections) ? b.corrections : [], date: b.date, currency: b.currency });
  });
  on('POST', '/api/pulse/reports/:id/cancel', ({ req, params }) => cancelReport(ctx, Number(params.id), { actor: actorOf(req) }));

  // ---- notes
  on('GET', '/api/notes', ({ q }) => ({ notes: listNotes(ctx, { entityType: q.entityType, entityId: q.entityId, reportId: q.reportId, from: q.from, to: q.to }) }));
  on('POST', '/api/notes', async ({ req }) => { const b = await readJson(req); return createNote(ctx, b, { actor: actorOf(req) }); });

  // ---- agents
  on('GET', '/api/agents/tasks', ({ q }) => ({ tasks: listTasks(ctx, q).map(slimTask), harness: { enabled: harness.enabled } }));
  on('GET', '/api/agents/tasks/:id', ({ params }) => { const t = getTask(ctx, Number(params.id)); if (!t) throw httpError(404, 'NOT_FOUND', 'المهمة غير موجودة'); return t; });
  on('POST', '/api/agents/tasks', async ({ req }) => {
    const b = await readJson(req);
    const t = createTask(ctx, b, { actor: actorOf(req) });
    return harness.dispatch(t.id);
  });

  // ---- ZOE
  on('POST', '/api/zoe/ask', async ({ req }) => {
    const b = await readJson(req);
    try {
      return await askZoe(ctx, b, { client, model: config.claudeModel });
    } catch (e) {
      if (e.status) throw e;
      throw httpError(502, 'AGENT_FAILED', `تعذّر على زوي الإجابة: ${e.userMessage || e.message}`.slice(0, 300));
    }
  });

  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://x');
    try {
      if (url.pathname.startsWith('/api/')) {
        const route = routes.find(r => r.method === req.method && r.re.test(url.pathname));
        if (!route) throw httpError(404, 'NOT_FOUND', 'غير موجود');
        const params = url.pathname.match(route.re).groups || {};
        const out = await route.fn({ req, res, params, q: Object.fromEntries(url.searchParams) });
        if (out === STREAMED) return;
        return sendJson(res, 200, out);
      }
      return serveStatic(config.publicDir, url.pathname, res);
    } catch (e) {
      const status = e.status || (e instanceof ImportError || e instanceof TaskError ? 400 : 500);
      if (status >= 500) console.error(e);
      const code = e.code && typeof e.code === 'string' && !/^(ERR_|SQLITE)/.test(e.code) ? e.code : status >= 500 ? 'DATABASE_ERROR' : 'BAD_REQUEST';
      const body = { error: { code, message: status >= 500 && code === 'DATABASE_ERROR' ? 'خطأ داخلي في قاعدة البيانات' : e.message } };
      for (const k of ['existingReportId', 'sameFile', 'checks']) if (e[k] !== undefined) body.error[k] = e[k];
      if (!res.headersSent) sendJson(res, status, body); else res.end();
    }
  });

  harness.resumeQueued();
  return { server, ctx, harness, close: () => new Promise(r => server.close(() => { db.close(); r(); })) };
}

const STREAMED = Symbol('streamed');
const httpError = (status, code, message) => Object.assign(new Error(message), { status, code });
const decodeHeader = v => { if (!v) return null; try { return decodeURIComponent(String(v)); } catch { return String(v); } };

function sendJson(res, status, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' });
  res.end(body);
}

function readBody(req, max) {
  return new Promise((resolve, reject) => {
    const chunks = []; let n = 0;
    req.on('data', c => { n += c.length; if (n > max) { reject(httpError(413, 'FILE_TOO_LARGE', 'حجم الملف أكبر من المسموح')); req.destroy(); } else chunks.push(c); });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}
async function readJson(req) {
  const b = await readBody(req, 1024 * 1024);
  if (!b.length) return {};
  try { return JSON.parse(b.toString('utf8')); } catch { throw httpError(400, 'BAD_JSON', 'JSON غير صالح'); }
}

function serveStatic(root, pathname, res) {
  const rel = pathname === '/' ? '/index.html' : decodeURIComponent(pathname);
  const file = path.resolve(root, `.${rel}`);
  if (!file.startsWith(path.resolve(root) + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
    res.writeHead(404, { 'content-type': 'text/plain' }); return res.end('not found');
  }
  res.writeHead(200, { 'content-type': MIME[path.extname(file)] || 'application/octet-stream', 'cache-control': 'no-cache', 'x-content-type-options': 'nosniff' });
  fs.createReadStream(file).pipe(res);
}
