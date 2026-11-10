"""Turn expression sheets into masked face overlays for a rig.

usage: python3 tools/faces.py hussein|learner

For every overlay listed in rig/<name>/parts.json ("faces"):
  1. take its cell from the 2x2 sheet,
  2. line it up with the approved base head (affine alignment on the parts of the head
     that must NOT change: hair, ears, jaw outline),
  3. match its colours to the base on those same parts,
  4. keep only the masked region (soft edge) and save it as a transparent overlay
     that sits exactly on the base head.
Then it checks, pixel by pixel, that base+overlay differs from base ONLY inside the mask,
and writes a contact sheet to art/work/<name>_faces_check.png for eyeballing.
"""
import json
import os
import sys

import cv2
import numpy as np
from PIL import Image, ImageDraw

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
name = sys.argv[1]
spec = json.load(open(f"{ROOT}/rig/{name}/parts.json"))
cfg = spec["faces"]
out_dir = f"{ROOT}/video/public/rig/{name}"
x0, y0, x1, y1 = cfg["headcrop"]
CW, CH = x1 - x0, y1 - y0
FEATHER = cfg.get("feather", 7)

base_full = np.array(Image.open(f"{ROOT}/{spec['source']}").convert("RGBA"))
base = base_full[y0:y1, x0:x1].astype(np.float32)
base_rgb = base[..., :3]
base_a = base[..., 3]


def poly(points, size=(CW, CH)):
    m = Image.new("L", size, 0)
    ImageDraw.Draw(m).polygon([(px - x0, py - y0) for px, py in points], fill=255)
    return np.array(m)


# stable = opaque head pixels outside every region that is allowed to change
stable = (base_a > 250).astype(np.uint8) * 255
for pts in cfg["stable_exclude"]:
    stable[cv2.dilate(poly(pts), np.ones((25, 25), np.uint8)) > 0] = 0
stable = cv2.erode(stable, np.ones((7, 7), np.uint8))

base_gray = cv2.cvtColor(base_rgb.astype(np.uint8), cv2.COLOR_RGB2GRAY)
sheets = {}
overlays = {}
tiles = []
report = []
for ov in cfg["overlays"]:
    if ov["sheet"] not in sheets:
        sheets[ov["sheet"]] = np.array(Image.open(f"{ROOT}/{ov['sheet']}").convert("RGB"))
    sh = sheets[ov["sheet"]]
    r, c = ov["cell"]
    ch, cw = sh.shape[0] // 2, sh.shape[1] // 2
    cell = cv2.resize(sh[r * ch:(r + 1) * ch, c * cw:(c + 1) * cw], (CW, CH), interpolation=cv2.INTER_LANCZOS4)
    cell_gray = cv2.cvtColor(cell, cv2.COLOR_RGB2GRAY)

    # --- 2. align (coarse translation search, then ECC affine) ---
    M = np.eye(2, 3, dtype=np.float32)
    best = -1
    small = 4
    bg = cv2.resize(base_gray, None, fx=1 / small, fy=1 / small, interpolation=cv2.INTER_AREA).astype(np.float32)
    cg = cv2.resize(cell_gray, None, fx=1 / small, fy=1 / small, interpolation=cv2.INTER_AREA).astype(np.float32)
    sm = cv2.resize(stable, None, fx=1 / small, fy=1 / small, interpolation=cv2.INTER_AREA) > 128
    for s in np.arange(0.90, 1.12, 0.01):
        for dx in range(-10, 11, 2):
            for dy in range(-10, 11, 2):
                Ms = np.array([[s, 0, (1 - s) * bg.shape[1] / 2 + dx], [0, s, (1 - s) * bg.shape[0] / 2 + dy]], np.float32)
                w = cv2.warpAffine(cg, Ms, (bg.shape[1], bg.shape[0]), flags=cv2.INTER_LINEAR | cv2.WARP_INVERSE_MAP)
                a, b = bg[sm], w[sm]
                cc = np.corrcoef(a, b)[0, 1]
                if cc > best:
                    best, M0 = cc, Ms.copy()
    M = M0.copy()
    M[:, 2] *= small
    try:
        crit = (cv2.TERM_CRITERIA_EPS | cv2.TERM_CRITERIA_COUNT, 300, 1e-6)
        _, M = cv2.findTransformECC(base_gray, cell_gray, M, cv2.MOTION_AFFINE, crit, stable, 5)
    except cv2.error as e:
        print("  ECC failed for", ov["name"], "- keeping coarse alignment")
    aligned = cv2.warpAffine(cell, M, (CW, CH), flags=cv2.INTER_LANCZOS4 | cv2.WARP_INVERSE_MAP).astype(np.float32)

    # --- 3. colour match on the stable region ---
    sel = stable > 0
    for k in range(3):
        A = np.stack([aligned[..., k][sel], np.ones(sel.sum())], 1)
        g, o = np.linalg.lstsq(A, base_rgb[..., k][sel], rcond=None)[0]
        g = float(np.clip(g, 0.8, 1.25))
        o = float(np.mean(base_rgb[..., k][sel]) - g * np.mean(aligned[..., k][sel]))
        aligned[..., k] = np.clip(aligned[..., k] * g + o, 0, 255)
    resid = float(np.abs(aligned - base_rgb)[sel].mean())

    # --- 4. masked overlay ---
    hard = poly(ov["mask"])
    soft = cv2.GaussianBlur(cv2.erode(hard, np.ones((FEATHER, FEATHER), np.uint8)), (0, 0), FEATHER / 2.2)
    soft = np.minimum(soft, hard).astype(np.float32)  # never leaks outside the polygon
    # where the base head is transparent (below the chin) only keep skin-like pixels of the
    # new drawing, so the sheet's coloured backdrop cannot leak in next to a dropped jaw
    hsv = cv2.cvtColor(aligned.astype(np.uint8), cv2.COLOR_RGB2HSV).astype(np.float32)
    skin = (1 - np.clip((hsv[..., 1] - 95) / 50, 0, 1)) * np.clip((hsv[..., 2] - 70) / 40, 0, 1)
    soft = np.where(base_a < 200, soft * np.maximum(skin, base_a / 255.0), soft)
    rgba = np.dstack([aligned, soft]).astype(np.uint8)
    ys, xs = np.where(soft > 0)
    bx0, bx1, by0, by1 = xs.min(), xs.max() + 1, ys.min(), ys.max() + 1
    Image.fromarray(rgba[by0:by1, bx0:bx1]).save(f"{out_dir}/{ov['name']}.png")
    overlays[ov["name"]] = {"file": f"rig/{name}/{ov['name']}.png", "x": int(x0 + bx0), "y": int(y0 + by0), "w": int(bx1 - bx0), "h": int(by1 - by0)}

    # --- check: change is confined to the mask ---
    al = soft[..., None] / 255.0
    comp = base_rgb * (1 - al) + aligned * al
    comp_a = np.maximum(base_a, soft)
    diff = np.abs(comp - base_rgb).max(axis=2) + np.abs(comp_a - base_a)
    outside = diff[hard == 0].max()
    changed = (diff > 12)
    report.append((ov["name"], round(float(best), 4), round(resid, 2), float(outside), int(changed.sum())))
    assert outside == 0, f"{ov['name']}: pixels changed outside the mask"
    tile = np.dstack([comp, comp_a]).astype(np.uint8)
    heat = np.zeros((CH, CW, 4), np.uint8); heat[..., 3] = 255
    heat[..., 0] = np.clip(diff * 3, 0, 255)
    tiles.append((ov["name"], tile, heat))

rig_path = f"{out_dir}/rig.json"
rig = json.load(open(rig_path))
rig["overlays"] = overlays
rig["headcrop"] = cfg["headcrop"]
json.dump(rig, open(rig_path, "w"), indent=1)

print(f"{'overlay':16s} align-corr  stable-resid  max-diff-outside-mask  changed-px")
for row in report:
    print(f"{row[0]:16s} {row[1]:<10} {row[2]:<12} {row[3]:<21} {row[4]}")

# contact sheet: top row = base+overlay, bottom row = where pixels changed (red)
n = len(tiles)
sheet = Image.new("RGBA", (CW * (n + 1), CH * 2), (60, 60, 68, 255))
sheet.alpha_composite(Image.fromarray(base.astype(np.uint8)), (0, 0))
for i, (nm, tile, heat) in enumerate(tiles):
    sheet.alpha_composite(Image.fromarray(tile), (CW * (i + 1), 0))
    sheet.alpha_composite(Image.fromarray(heat), (CW * (i + 1), CH))
os.makedirs(f"{ROOT}/art/work", exist_ok=True)
sheet.convert("RGB").save(f"{ROOT}/art/work/{name}_faces_check.png")
print("wrote art/work/%s_faces_check.png" % name)
