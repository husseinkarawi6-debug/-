#!/usr/bin/env python3
"""Replacement drawings (mouths, eyes, hands, poses) made by MASKED EDITS of a master.

For every variant in art/specs/<ANGLE>.json:
  1. cut a square crop around the area from the master, scale it to the edit size
  2. make a mask (transparent = may change) from ellipses / polygons
  3. ask OpenAI to redraw only the masked area (tools/oai_image.py)
  4. scale back, align to the master with OpenCV ECC (outside the mask)
  5. measure the difference OUTSIDE the mask (must be ~0 after alignment)
  6. keep only the masked area, with a soft edge, as a patch PNG

Outputs
  video/public/art/<ANGLE>/master.jpg          the master (once)
  video/public/art/<ANGLE>/<id>.png            RGBA patches (master coordinates)
  video/src/art/<ANGLE>.json                   manifest: size + patch positions
  art/qa/<ANGLE>/<id>.png                      before / after / composite strip
  art/qa/<ANGLE>/report.json                   numbers from step 5

Run from piano-meme:
  python3 tools/variants.py S2                 # make missing variants
  python3 tools/variants.py S2 --only mouth_A  # (re)make one
  python3 tools/variants.py S2 --post-only     # redo steps 4-6 from saved edits
"""
import argparse
import concurrent.futures as cf
import json
import subprocess
import sys
from pathlib import Path

import cv2
import numpy as np

ROOT = Path(__file__).resolve().parent.parent
EDIT = 1024  # edit size sent to OpenAI


def load(p):
    im = cv2.imread(str(p), cv2.IMREAD_COLOR)
    if im is None:
        sys.exit(f"cannot read {p}")
    return im


def shape_mask(h, w, shapes, ox=0, oy=0, scale=1.0):
    m = np.zeros((h, w), np.uint8)
    for s in shapes:
        kind = s[0]
        if kind == "ellipse":
            _, cx, cy, rx, ry = s[:5]
            ang = s[5] if len(s) > 5 else 0
            cv2.ellipse(m, (int(round((cx - ox) * scale)), int(round((cy - oy) * scale))),
                        (int(round(rx * scale)), int(round(ry * scale))), ang, 0, 360, 255, -1, cv2.LINE_AA)
        elif kind == "file":  # white = may change, in master coordinates
            f = cv2.imread(str(ROOT / s[1]), cv2.IMREAD_GRAYSCALE)
            f = f[int(oy):, int(ox):]
            f = cv2.resize(f, (int(round(f.shape[1] * scale)), int(round(f.shape[0] * scale))))
            hh, ww = min(h, f.shape[0]), min(w, f.shape[1])
            m[:hh, :ww] = np.maximum(m[:hh, :ww], f[:hh, :ww])
        elif kind == "poly":
            pts = np.array([[(x - ox) * scale, (y - oy) * scale] for x, y in s[1]], np.int32)
            cv2.fillPoly(m, [pts], 255, cv2.LINE_AA)
    return m


def crop_box(spec, var):
    c = spec["crops"][var["crop"]]
    cx, cy, w = c[0], c[1], c[2]
    h = c[3] if len(c) > 3 else w
    if len(c) > 4 and c[4] == "native":  # send the crop at its own size (multiples of 16)
        return int(cx - w // 2), int(cy - h // 2), int(w), int(h), int(w), int(h)
    ew, eh = (1024, 1536) if h > w else ((1536, 1024) if w > h else (1024, 1024))
    if abs((h / w) - (eh / ew)) > 0.02:
        sys.exit(f"crop {var['crop']}: aspect must be 1:1, 2:3 or 3:2")
    return int(cx - w // 2), int(cy - h // 2), int(w), int(h), ew, eh


def source_image(spec, var, angle):
    """The master, or the master with another patch on it (chained edits)."""
    img = load(ROOT / spec["master"]).astype(np.float32)
    base = var.get("base")
    if base:
        man = json.loads((ROOT / "video/src/art" / f"{angle}.json").read_text())
        p = man["patches"][base]
        patch = cv2.imread(str(ROOT / "video/public/art" / angle / f"{base}.png"), cv2.IMREAD_UNCHANGED)
        a = patch[..., 3:4].astype(np.float32) / 255
        roi = img[p["y"]:p["y"] + p["h"], p["x"]:p["x"] + p["w"]]
        img[p["y"]:p["y"] + p["h"], p["x"]:p["x"] + p["w"]] = patch[..., :3] * a + roi * (1 - a)
    return np.clip(img, 0, 255).astype(np.uint8)


def prepare(spec, var, work, angle):
    master = source_image(spec, var, angle)
    x0, y0, cw, ch, ew, eh = crop_box(spec, var)
    crop = master[y0:y0 + ch, x0:x0 + cw]
    big = cv2.resize(crop, (ew, eh), interpolation=cv2.INTER_LANCZOS4)
    m = shape_mask(eh, ew, var["mask"], x0, y0, ew / cw)
    m = cv2.dilate(m, np.ones((9, 9), np.uint8))
    rgba = np.dstack([np.zeros_like(big), 255 - m])  # transparent where we edit
    cv2.imwrite(str(work / f"{var['id']}_crop.png"), big)
    cv2.imwrite(str(work / f"{var['id']}_mask.png"), rgba)
    return x0, y0, cw, ch


def generate(spec, var, work, angle):
    prompt = (spec["editPrompt"].replace("{CHANGE}", var["prompt"]))
    pf = work / f"{var['id']}_prompt.txt"
    pf.write_text(prompt, encoding="utf-8")
    cmd = [sys.executable, str(ROOT / "tools/oai_image.py"), str(work / f"{var['id']}_edit.png"),
           "--prompt-file", str(pf), "--image", str(work / f"{var['id']}_crop.png"),
           "--mask", str(work / f"{var['id']}_mask.png"), "--size", "{}x{}".format(*crop_box(spec, var)[4:]),
           "--quality", spec.get("quality", "medium")]
    for r in spec.get("refs", []):
        cmd += ["--ref", str(ROOT / r)]
    p = subprocess.run(cmd, capture_output=True, text=True)
    if p.returncode != 0:
        return f"{var['id']}: FAILED {p.stderr.strip()[-300:]}"
    return f"{var['id']}: generated"


def align(src, dst, valid):
    """Affine ECC: warp src onto dst using only `valid` pixels."""
    a = cv2.cvtColor(src, cv2.COLOR_BGR2GRAY).astype(np.float32) / 255
    b = cv2.cvtColor(dst, cv2.COLOR_BGR2GRAY).astype(np.float32) / 255
    warp = np.eye(2, 3, dtype=np.float32)
    try:
        _, warp = cv2.findTransformECC(b, a, warp, cv2.MOTION_AFFINE,
                                       (cv2.TERM_CRITERIA_EPS | cv2.TERM_CRITERIA_COUNT, 200, 1e-6),
                                       valid.astype(np.uint8), 5)
    except cv2.error:
        pass
    out = cv2.warpAffine(src, warp, (dst.shape[1], dst.shape[0]), flags=cv2.INTER_LINEAR | cv2.WARP_INVERSE_MAP,
                         borderMode=cv2.BORDER_REFLECT)
    return out, warp


def post(spec, var, work, angle, feather):
    master0 = load(ROOT / spec["master"])
    master = source_image(spec, var, angle)
    x0, y0, cw, ch, _, _ = crop_box(spec, var)
    crop = master[y0:y0 + ch, x0:x0 + cw]
    crop0 = master0[y0:y0 + ch, x0:x0 + cw]
    edit = load(work / f"{var['id']}_edit.png")
    edit = cv2.resize(edit, (cw, ch), interpolation=cv2.INTER_AREA)
    m = shape_mask(ch, cw, var["mask"], x0, y0, 1.0)
    outside = cv2.erode(255 - m, np.ones((25, 25), np.uint8)) > 0
    before = float(np.abs(edit.astype(int) - crop.astype(int))[outside].mean())
    edit, warp = align(edit, crop, outside)
    # colour match on a ring just outside the mask
    ring = (cv2.dilate(m, np.ones((41, 41), np.uint8)) > 0) & outside
    for c in range(3):
        e, t = edit[..., c][ring].astype(float), crop[..., c][ring].astype(float)
        if e.std() > 1:
            edit[..., c] = np.clip((edit[..., c] - e.mean()) * (t.std() / e.std()) + t.mean(), 0, 255)
    after = float(np.abs(edit.astype(int) - crop.astype(int))[outside].mean())
    inside = float(np.abs(edit.astype(int) - crop.astype(int))[m > 0].mean()) if (m > 0).any() else 0.0
    # soft-edged patch
    alpha = cv2.GaussianBlur(m.astype(np.float32), (0, 0), feather)
    alpha = np.clip(alpha * 1.15, 0, 255).astype(np.uint8)
    if var.get("base"):
        # chained edit: the patch also carries what the base patch changed
        diff_base = (np.abs(crop.astype(int) - crop0.astype(int)).sum(2) > 0).astype(np.uint8) * 255
        base_alpha = cv2.GaussianBlur(diff_base.astype(np.float32), (0, 0), 1.0)
        alpha = np.maximum(alpha, np.clip(base_alpha * 4, 0, 255).astype(np.uint8))
    # the new drawing over the base (= master, or master + base patch)
    a_new = (cv2.GaussianBlur(m.astype(np.float32), (0, 0), feather) * 1.15 / 255).clip(0, 1)[..., None]
    comp = (edit * a_new + crop.astype(float) * (1 - a_new)).astype(np.uint8)
    ys, xs = np.where(alpha > 2)
    bx0, bx1, by0, by1 = xs.min(), xs.max() + 1, ys.min(), ys.max() + 1
    patch = np.dstack([comp[by0:by1, bx0:bx1], alpha[by0:by1, bx0:bx1]])
    out_dir = ROOT / "video/public/art" / angle
    out_dir.mkdir(parents=True, exist_ok=True)
    cv2.imwrite(str(out_dir / f"{var['id']}.png"), patch)
    # QA strip: master | edit | composite
    qa = ROOT / "art/qa" / angle
    qa.mkdir(parents=True, exist_ok=True)
    strip = np.hstack([crop0, edit, comp])
    sc = 360 / ch
    cv2.imwrite(str(qa / f"{var['id']}.png"), cv2.resize(strip, (int(strip.shape[1] * sc), 360)))
    # the composite is the master wherever alpha == 0: measure it to prove it
    hard_out = alpha == 0
    composite_out = float(np.abs(comp.astype(int) - crop0.astype(int))[hard_out].mean()) if hard_out.any() else 0.0
    shift = float(max(abs(warp[0, 2]), abs(warp[1, 2])))
    scale_err = float(max(abs(warp[0, 0] - 1), abs(warp[1, 1] - 1)))
    return {"id": var["id"], "x": int(x0 + bx0), "y": int(y0 + by0), "w": int(bx1 - bx0), "h": int(by1 - by0),
            "compositeDiffOutsideMask": round(composite_out, 3), "shiftPx": round(shift, 2),
            "scaleError": round(scale_err, 4),
            "diffOutsideBeforeAlign": round(before, 2), "diffOutsideAfterAlign": round(after, 2),
            "changeInside": round(inside, 2), "warp": [[round(float(v), 4) for v in row] for row in warp]}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("angle")
    ap.add_argument("--only", action="append")
    ap.add_argument("--post-only", action="store_true")
    ap.add_argument("--jobs", type=int, default=4)
    a = ap.parse_args()
    spec = json.loads((ROOT / f"art/specs/{a.angle}.json").read_text())
    work = ROOT / "art/work" / a.angle
    work.mkdir(parents=True, exist_ok=True)
    vars_ = [v for v in spec["variants"] if not a.only or v["id"] in a.only]

    # master for Remotion
    out_dir = ROOT / "video/public/art" / a.angle
    out_dir.mkdir(parents=True, exist_ok=True)
    master = load(ROOT / spec["master"])
    cv2.imwrite(str(out_dir / "master.jpg"), master, [cv2.IMWRITE_JPEG_QUALITY, 93])

    if not a.post_only:
        todo = [v for v in vars_ if a.only or not (work / f"{v['id']}_edit.png").exists()]
        for phase in (False, True):  # plain edits first, then edits of an edit
            batch = [v for v in todo if bool(v.get("base")) == phase]
            for v in batch:
                prepare(spec, v, work, a.angle)
            with cf.ThreadPoolExecutor(a.jobs) as ex:
                for msg in ex.map(lambda v: generate(spec, v, work, a.angle), batch):
                    print(msg, flush=True)
            if not phase:  # chained edits need their base patches on disk
                write_patches(spec, [v for v in spec["variants"] if not v.get("base")], work, a.angle, quiet=True)

    write_patches(spec, vars_, work, a.angle)


def write_patches(spec, vars_, work, angle, quiet=False):
    master = load(ROOT / spec["master"])
    man_path = ROOT / "video/src/art" / f"{angle}.json"
    man_path.parent.mkdir(parents=True, exist_ok=True)
    manifest = json.loads(man_path.read_text()) if man_path.exists() else {}
    manifest.update({"master": f"art/{angle}/master.jpg", "width": int(master.shape[1]),
                     "height": int(master.shape[0])})
    manifest.setdefault("patches", {})
    report_path = ROOT / "art/qa" / angle / "report.json"
    report = json.loads(report_path.read_text()) if report_path.exists() else {}
    for v in sorted(vars_, key=lambda v: bool(v.get("base"))):
        if not (work / f"{v['id']}_edit.png").exists():
            continue
        r = post(spec, v, work, angle, spec.get("feather", 5))
        manifest["patches"][v["id"]] = {k: r[k] for k in ("x", "y", "w", "h")}
        report[v["id"]] = r
        ok = r["shiftPx"] < 3 and r["scaleError"] < 0.01 and r["diffOutsideAfterAlign"] < 15
        man_path.write_text(json.dumps(manifest, indent=1))  # chained edits read it
        if not quiet:
            print(f"{'OK ' if ok else 'CHECK'} {v['id']}: shift {r['shiftPx']} px, raw redraw outside "
              f"{r['diffOutsideAfterAlign']}, final composite outside {r['compositeDiffOutsideMask']}, "
              f"change inside {r['changeInside']}")
    man_path.write_text(json.dumps(manifest, indent=1))
    report_path.parent.mkdir(parents=True, exist_ok=True)
    report_path.write_text(json.dumps(report, indent=1))


if __name__ == "__main__":
    main()
