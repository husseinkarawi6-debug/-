#!/usr/bin/env python3
"""OpenAI Images API (direct) — the only drawing tool for this film.

    python3 tools/oai_image.py OUT.png --prompt-file P.txt [--ref a.png --ref b.png]
                               [--image master.png --mask mask.png]
                               [--size 1024x1536] [--quality medium] [--model gpt-image-2.6-sunburst]

- no --ref/--image  -> /v1/images/generations
- --ref (references) and/or --image (+ optional --mask) -> /v1/images/edits
  The mask is a PNG with alpha: transparent pixels = the area to redraw.
- Every call is logged to art/gen/log.jsonl (prompt, inputs, size, usage).

The key is injected by the network proxy (never stored in the code).
"""
import argparse
import base64
import json
import mimetypes
import sys
import time
from pathlib import Path

import requests

ROOT = Path(__file__).resolve().parent.parent
LOG = ROOT / "art/gen/log.jsonl"
API = "https://api.openai.com/v1/images"
HEAD = {"Authorization": "Bearer proxy-injected"}  # the proxy swaps in the real key


def call(a, prompt, images, stream):
    """One request. Streaming keeps the connection alive with partial images
    (the proxy drops silent requests after ~30 s)."""
    fields = {"model": a.model, "prompt": prompt, "size": a.size, "quality": a.quality}
    if stream:
        fields.update(stream=True, partial_images=2)
    else:
        fields["n"] = a.n
    if images:
        data = {k: (str(v).lower() if isinstance(v, bool) else str(v)) for k, v in fields.items()}
        if a.fidelity:
            data["input_fidelity"] = a.fidelity
        files = [("image[]", (Path(p).name, open(p, "rb"), mimetypes.guess_type(p)[0] or "image/png")) for p in images]
        if a.mask:
            files.append(("mask", (Path(a.mask).name, open(a.mask, "rb"), "image/png")))
        r = requests.post(f"{API}/edits", headers=HEAD, data=data, files=files, timeout=900, stream=stream)
    else:
        r = requests.post(f"{API}/generations", headers={**HEAD, "Content-Type": "application/json"},
                          json=fields, timeout=900, stream=stream)
    if r.status_code != 200:
        raise RuntimeError(f"HTTP {r.status_code}: {r.text[:600]}")
    if not stream:
        j = r.json()
        if "data" not in j:
            raise RuntimeError(json.dumps(j)[:600])
        return j
    final, usage = None, None
    for raw in r.iter_lines(decode_unicode=True):
        if not raw or not raw.startswith("data:"):
            continue
        payload = raw[5:].strip()
        if payload == "[DONE]":
            break
        ev = json.loads(payload)
        typ = ev.get("type", "")
        if typ.endswith(".completed"):
            final, usage = ev.get("b64_json"), ev.get("usage")
        elif "error" in ev:
            raise RuntimeError(json.dumps(ev)[:600])
    if not final:
        raise RuntimeError("stream ended without a final image")
    return {"data": [{"b64_json": final}], "usage": usage}


def data_url(path: str, max_side: int = 0) -> str:
    """PNG/JPEG file -> data URL. References are sent as JPEG to keep requests small."""
    import io
    from PIL import Image
    im = Image.open(path)
    if max_side and max(im.size) > max_side:
        im.thumbnail((max_side, max_side), Image.LANCZOS)
    buf = io.BytesIO()
    if im.mode in ("RGBA", "LA"):
        im.save(buf, "PNG")
        mime = "image/png"
    else:
        im.convert("RGB").save(buf, "JPEG", quality=93)
        mime = "image/jpeg"
    return f"data:{mime};base64," + base64.b64encode(buf.getvalue()).decode()


def call_responses(a, prompt, images):
    """Responses API in background mode: the request returns at once and we
    poll for the result, so no connection is held open for long."""
    tool = {"type": "image_generation", "model": a.model, "size": a.size, "quality": a.quality,
            "output_format": "png"}
    if a.fidelity:
        tool["input_fidelity"] = a.fidelity
    if a.mask:
        tool["input_image_mask"] = {"image_url": data_url(a.mask)}
    content = [{"type": "input_text", "text":
                "Call the image generation tool exactly once. Use this prompt verbatim, do not "
                "shorten or change it. " + ("The FIRST attached image is the image to edit; the "
                "others are references. " if a.image else "The attached images are references. ")
                + "PROMPT:\n" + prompt}]
    for i, pth in enumerate(images):
        content.append({"type": "input_image", "image_url": data_url(pth, 0 if (a.image and i == 0) else 1536)})
    body = {"model": a.orchestrator, "input": [{"role": "user", "content": content}],
            "tools": [tool], "tool_choice": {"type": "image_generation"}, "background": True,
            "store": True}
    r = requests.post("https://api.openai.com/v1/responses", headers={**HEAD, "Content-Type": "application/json"},
                      json=body, timeout=120)
    if r.status_code != 200:
        raise RuntimeError(f"HTTP {r.status_code}: {r.text[:600]}")
    rid = r.json()["id"]
    t0 = time.time()
    while True:
        time.sleep(4)
        g = requests.get(f"https://api.openai.com/v1/responses/{rid}", headers=HEAD, timeout=120)
        if g.status_code != 200:
            if time.time() - t0 > 900:
                raise RuntimeError(f"poll HTTP {g.status_code}: {g.text[:300]}")
            continue
        j = g.json()
        st = j.get("status")
        if st in ("queued", "in_progress"):
            if time.time() - t0 > 900:
                raise RuntimeError("timed out waiting for the image")
            continue
        if st != "completed":
            raise RuntimeError(f"response {st}: {json.dumps(j.get('error') or j.get('incomplete_details'))[:400]}")
        calls = [o for o in j.get("output", []) if o.get("type") == "image_generation_call"]
        if not calls or not calls[0].get("result"):
            raise RuntimeError("no image in the response: " + json.dumps(j.get("output"))[:400])
        return {"data": [{"b64_json": calls[0]["result"]}], "usage": j.get("usage"),
                "revised_prompt": calls[0].get("revised_prompt"), "response_id": rid}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("out")
    ap.add_argument("--prompt-file", required=True)
    ap.add_argument("--ref", action="append", default=[])
    ap.add_argument("--image", default=None, help="image to edit (first image)")
    ap.add_argument("--mask", default=None)
    ap.add_argument("--size", default="1024x1536")
    ap.add_argument("--quality", default="medium")
    ap.add_argument("--model", default="gpt-image-2.6-sunburst")
    ap.add_argument("--fidelity", default=None, help="input_fidelity (high/low) if supported")
    ap.add_argument("--n", type=int, default=1)
    ap.add_argument("--no-stream", action="store_true", help="plain request (may time out after ~30 s)")
    ap.add_argument("--tries", type=int, default=3)
    ap.add_argument("--via", default="responses", choices=["responses", "images"],
                    help="responses = background job + polling (default, no 30 s limit)")
    ap.add_argument("--orchestrator", default="gpt-5.4-mini")
    a = ap.parse_args()

    prompt = Path(a.prompt_file).read_text(encoding="utf-8").strip()
    out = Path(a.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    t0 = time.time()
    images = ([a.image] if a.image else []) + a.ref
    stream = not a.no_stream and a.n == 1
    j, err = None, None
    for attempt in range(a.tries):
        try:
            j = call_responses(a, prompt, images) if a.via == "responses" else call(a, prompt, images, stream)
            break
        except RuntimeError as e:
            err = str(e)
            print(f"attempt {attempt + 1} failed: {err[:200]}", file=sys.stderr)
            time.sleep(3)
    if j is None:
        sys.exit(err)
    dt = time.time() - t0
    paths = []
    for i, d in enumerate(j["data"]):
        p = out if i == 0 else out.with_name(f"{out.stem}_{i}{out.suffix}")
        p.write_bytes(base64.b64decode(d["b64_json"]))
        paths.append(str(p.relative_to(ROOT)) if p.is_relative_to(ROOT) else str(p))
    LOG.parent.mkdir(parents=True, exist_ok=True)
    with LOG.open("a") as f:
        f.write(json.dumps({"time": time.strftime("%Y-%m-%d %H:%M:%S"), "out": paths, "model": a.model,
                            "size": a.size, "quality": a.quality, "refs": a.ref, "image": a.image,
                            "mask": a.mask, "seconds": round(dt, 1), "usage": j.get("usage"),
                            "via": a.via, "revised_prompt": j.get("revised_prompt"),
                            "prompt": prompt}, ensure_ascii=False) + "\n")
    print(json.dumps({"out": paths, "seconds": round(dt, 1), "usage": j.get("usage")}))


if __name__ == "__main__":
    main()
