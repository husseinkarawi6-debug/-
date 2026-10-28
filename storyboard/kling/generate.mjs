// Generate one Kling 4.0 text-to-video clip through the Higgsfield API.
// Usage: HF_CREDENTIALS="KEY_ID:KEY_SECRET" node generate.mjs <prompt-file> [duration 3-30] [720p|1080p]
import { config, higgsfield } from '@higgsfield/client/v2';
import fs from 'node:fs';
import path from 'node:path';

const MODEL = 'kling-video/v4.0/text-to-video';
const [promptFile, durationArg = '10', resolution = '720p'] = process.argv.slice(2);

if (!promptFile) {
  console.error('Usage: node generate.mjs <prompt-file> [duration 3-30] [720p|1080p]');
  process.exit(1);
}
if (!process.env.HF_CREDENTIALS) {
  console.error('Set HF_CREDENTIALS="KEY_ID:KEY_SECRET" (from the Higgsfield console) in the environment.');
  process.exit(1);
}
const duration = Number(durationArg);
if (!Number.isInteger(duration) || duration < 3 || duration > 30) {
  console.error('duration must be a whole number from 3 to 30');
  process.exit(1);
}
if (!['720p', '1080p'].includes(resolution)) {
  console.error('resolution must be 720p or 1080p');
  process.exit(1);
}

config({ credentials: process.env.HF_CREDENTIALS });

const prompt = fs.readFileSync(promptFile, 'utf8').trim();
const input = { prompt, duration, resolution, aspect_ratio: '9:16' };
console.log(`Submitting ${MODEL}: ${duration}s, ${resolution}, 9:16, ${prompt.split(/\s+/).length} words`);

const result = await higgsfield.subscribe(MODEL, { input, withPolling: true });
const url = result?.video?.url ?? result?.jobs?.[0]?.results?.raw?.url;
const status = result?.status ?? (result?.isCompleted ? 'completed' : 'unknown');
console.log(`Status: ${status}`);

if (!url) {
  console.error('No video URL in the result:');
  console.error(JSON.stringify(result, null, 2));
  process.exit(2);
}
console.log(`Video: ${url}`);

const outDir = path.join(path.dirname(new URL(import.meta.url).pathname), 'outputs');
fs.mkdirSync(outDir, { recursive: true });
const outFile = path.join(outDir, `${path.basename(promptFile, '.txt')}_${duration}s_${resolution}.mp4`);
const res = await fetch(url);
if (!res.ok) {
  console.error(`Download failed (${res.status}); open the URL above instead.`);
  process.exit(3);
}
fs.writeFileSync(outFile, Buffer.from(await res.arrayBuffer()));
console.log(`Saved: ${outFile}`);
