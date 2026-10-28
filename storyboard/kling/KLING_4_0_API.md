# Kling 4.0 — Text to Video (Higgsfield API)

- **Endpoint:** `POST https://api.higgsfield.ai/kling-video/v4.0/text-to-video`
- **Model ID:** `kling-video/v4.0/text-to-video`
- **Auth:** `Authorization: Key KEY_ID:KEY_SECRET`. The SDK reads `HF_CREDENTIALS`; cURL examples use `HF_KEY`.
- **SDK:** `npm install @higgsfield/client` (v2: `import { config, higgsfield } from "@higgsfield/client/v2"`), or `pip install higgsfield-client`.
- **Pricing:** not published for the API.

## Input
| Field | Type | Required | Default | Notes |
|---|---|---|---|---|
| `prompt` | string | yes | — | non-empty; subject, action, scene, lighting, camera movement |
| `duration` | integer | no | 10 | 3–30 seconds |
| `resolution` | string | no | `1080p` | `720p` or `1080p` |
| `aspect_ratio` | string | no | `16:9` | `21:9`, `16:9`, `9:16`, `1:1` (`adaptive` not supported) |

This endpoint is text-only. For animating images use `kling-video/v4.0/image-to-video`; for image/video references use `kling-video/v4.0/reference-to-video`.

## Result
Asynchronous. Submission returns `request_id`, `status`, `status_url`, `cancel_url`. Poll `status_url` (GET, same auth) while `status` is `queued` or `in_progress`; stop on `completed`, `failed`, `nsfw` or `canceled`. A completed result has the video at `video.url`.

## cURL
```bash
curl --request POST \
  --url 'https://api.higgsfield.ai/kling-video/v4.0/text-to-video' \
  --header "Authorization: Key $HF_KEY" \
  --header "Content-Type: application/json" \
  --data '{"prompt":"...","duration":10,"resolution":"720p","aspect_ratio":"9:16"}'
```

Sources: https://console.higgsfield.ai/models/kling-video/v4.0/text-to-video · https://dash.higgsfield.ai/models/kling-video/v4.0/text-to-video/llms.txt
