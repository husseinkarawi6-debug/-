// PDF → logical text lines. Text layer first; OCR only when the text layer is
// missing/unusable AND an OCR engine is installed on the server.
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { buildLines, clean } from './text.js';

let pdfjsP;
const pdfjs = () => (pdfjsP ||= import('pdfjs-dist/legacy/build/pdf.mjs'));

export class ExtractError extends Error {
  constructor(code, message) { super(message); this.code = code; }
}

export function isPdf(buf) {
  return buf.length > 5 && buf.subarray(0, 5).toString('latin1') === '%PDF-';
}

/** @returns {{pages:number, method:'text'|'ocr', lines:Array}} */
export async function extractPdf(buf) {
  if (!isPdf(buf)) throw new ExtractError('UNSUPPORTED_PDF', 'الملف ليس PDF صالحاً');
  const { getDocument } = await pdfjs();
  let doc;
  try {
    doc = await getDocument({ data: new Uint8Array(buf), isEvalSupported: false, disableFontFace: true, useSystemFonts: false, verbosity: 0 }).promise;
  } catch (e) {
    throw new ExtractError(/password/i.test(e.message) ? 'UNSUPPORTED_PDF' : 'PARSING_FAILED',
      /password/i.test(e.message) ? 'الملف محمي بكلمة مرور' : 'تعذّر فتح ملف PDF');
  }
  const lines = [];
  let chars = 0;
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const tc = await page.getTextContent();
    const pl = buildLines(tc.items, p);
    chars += pl.reduce((s, l) => s + l.text.replace(/\s/g, '').length, 0);
    lines.push(...pl);
  }
  const pages = doc.numPages;
  await doc.destroy();
  // A usable text layer has a reasonable amount of text per page.
  if (chars >= 40 * Math.max(1, pages) * 0.5) return { pages, method: 'text', lines };
  const ocr = ocrAvailable();
  if (!ocr.ok) {
    throw new ExtractError('UNSUPPORTED_PDF', `الملف بدون طبقة نص (صفحات مصوّرة)، و OCR غير مثبّت على الخادم: ${ocr.reason}`);
  }
  return { pages, method: 'ocr', lines: ocrPdf(buf, pages) };
}

/** OCR needs `pdftoppm` (poppler) + `tesseract` with Arabic data. Detected at runtime. */
export function ocrAvailable() {
  const has = bin => spawnSync('sh', ['-c', `command -v ${bin}`]).status === 0;
  if (!has('tesseract')) return { ok: false, reason: 'tesseract غير موجود' };
  if (!has('pdftoppm')) return { ok: false, reason: 'pdftoppm غير موجود' };
  const langs = spawnSync('tesseract', ['--list-langs'], { encoding: 'utf8' }).stdout || '';
  if (!/\bara\b/.test(langs)) return { ok: false, reason: 'حزمة اللغة العربية لـ tesseract غير مثبتة' };
  return { ok: true };
}

function ocrPdf(buf, pages) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'neptune-ocr-'));
  try {
    const src = path.join(dir, 'in.pdf');
    fs.writeFileSync(src, buf);
    execFileSync('pdftoppm', ['-r', '300', '-png', src, path.join(dir, 'p')]);
    const out = [];
    for (let p = 1; p <= pages; p++) {
      const img = fs.readdirSync(dir).find(f => new RegExp(`^p-0*${p}\\.png$`).test(f));
      if (!img) continue;
      const txt = execFileSync('tesseract', [path.join(dir, img), '-', '-l', 'ara+eng', '--psm', '6'], { encoding: 'utf8' });
      txt.split('\n').map(clean).filter(Boolean).forEach((t, i) => out.push({
        page: p, lineNo: i + 1, rtl: true, ocr: true,
        cells: t.split(/\s{2,}|\t/).map(x => ({ text: clean(x) })).filter(c => c.text), text: t,
      }));
    }
    return out;
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}
