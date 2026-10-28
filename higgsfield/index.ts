// Seedance 2.5 text-to-video example using the official Higgsfield SDK (v2 client).
// Run: npm run higgsfield:example   (Node >= 22.18 runs .ts directly via type stripping)
// Credentials: HF_CREDENTIALS=KEY_ID:KEY_SECRET in .env.local (git-ignored), loaded at runtime.
import fs from 'node:fs';
import path from 'node:path';
import { config, higgsfield } from '@higgsfield/client/v2';

const MODEL = 'bytedance/seedance-2.5/text-to-video';

const envFile = path.resolve(import.meta.dirname, '..', '.env.local');
if (fs.existsSync(envFile)) process.loadEnvFile(envFile);

const credentials = process.env.HF_CREDENTIALS?.trim();
if (!credentials || !credentials.includes(':')) {
  console.error('HF_CREDENTIALS is missing or not in KEY_ID:KEY_SECRET format. Set it in .env.local.');
  process.exit(1);
}

// The SDK stops polling on completed / failed / nsfw. Cap the wait so a canceled request
// ends in a TimeoutError instead of polling forever.
config({ credentials, maxPollTime: 15 * 60 * 1000 });

const input = {
  prompt: 'A cinematic scene at sunset',
  duration: 5,
  resolution: '720p',
  aspect_ratio: '16:9',
};

type Status = { status?: string; request_id?: string; error?: string; video?: { url?: string } };

try {
  console.log(`Submitting ${MODEL} (${input.duration}s, ${input.resolution}, ${input.aspect_ratio})...`);
  const result = (await higgsfield.subscribe(MODEL, { input, withPolling: true })) as Status;

  switch (result.status) {
    case 'completed':
      if (!result.video?.url) {
        console.error(`Request ${result.request_id} completed without a video URL.`);
        process.exit(2);
      }
      console.log(`Completed (request ${result.request_id})`);
      console.log(`Video URL: ${result.video.url}`);
      break;
    case 'failed':
      console.error(`Generation failed (request ${result.request_id}): ${result.error ?? 'no error message'}`);
      process.exit(3);
    case 'nsfw':
      console.error(`Generation was blocked by moderation (request ${result.request_id}).`);
      process.exit(4);
    case 'canceled':
      console.error(`Generation was canceled (request ${result.request_id}).`);
      process.exit(5);
    default:
      console.error(`Unexpected status "${result.status}" (request ${result.request_id}).`);
      process.exit(6);
  }
} catch (err) {
  const e = err as Error & { status?: number };
  console.error(`Request did not complete: ${e.name}: ${e.message}${e.status ? ` (HTTP ${e.status})` : ''}`);
  process.exit(7);
}
