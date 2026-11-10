"""Cut an approved character painting into rig pieces.

usage: python3 tools/cut_rig.py hussein|learner

Reads   rig/<name>/parts.json   (hand-edited polygons + joints, in base-image pixels)
Writes  video/public/rig/<name>/<piece>.png  and  video/public/rig/<name>/rig.json

Every piece keeps the pixels of the approved base image untouched; pieces are only
cropped. Transparent pixels get the colour of the nearest opaque pixel ("edge bleed")
so that texture filtering never pulls a dark or light fringe into an edge.
"""
import json
import os
import sys

import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
name = sys.argv[1]
spec = json.load(open(f"{ROOT}/rig/{name}/parts.json"))
out_dir = f"{ROOT}/video/public/rig/{name}"
os.makedirs(out_dir, exist_ok=True)

base = np.array(Image.open(f"{ROOT}/{spec['source']}").convert("RGBA"))
H, W = base.shape[:2]


def poly_mask(points):
    m = Image.new("L", (W, H), 0)
    ImageDraw.Draw(m).polygon([tuple(p) for p in points], fill=255)
    return np.array(m) > 0


def bleed(rgba):
    """Copy nearest opaque colour into fully transparent pixels (alpha stays 0)."""
    a = rgba[..., 3]
    solid = a > 8
    if not solid.any():
        return rgba
    idx = ndimage.distance_transform_edt(~solid, return_distances=False, return_indices=True)
    out = rgba.copy()
    out[..., :3] = rgba[..., :3][idx[0], idx[1]]
    return out


def save_piece(pname, rgba, pad=6, extra=None):
    rgba = rgba.copy()
    rgba[..., 3] = np.where(rgba[..., 3] < 12, 0, rgba[..., 3])  # drop stray near-invisible specks
    a = rgba[..., 3]
    ys, xs = np.where(a > 0)
    x0, x1 = max(xs.min() - pad, 0), min(xs.max() + pad + 1, W)
    y0, y1 = max(ys.min() - pad, 0), min(ys.max() + pad + 1, H)
    crop = bleed(rgba[y0:y1, x0:x1])
    Image.fromarray(crop).save(f"{out_dir}/{pname}.png")
    info = {"file": f"rig/{name}/{pname}.png", "x": int(x0), "y": int(y0), "w": int(x1 - x0), "h": int(y1 - y0)}
    if extra:
        info.update(extra)
    return info


pieces = {}
masks = {k: poly_mask(v) for k, v in spec["polygons"].items()}
front = np.zeros((H, W), bool)  # everything that is cut away from the torso
for pname, m in masks.items():
    if pname in spec.get("not_pieces", []):
        continue
    piece = base.copy()
    piece[..., 3] = np.where(m, base[..., 3], 0)
    zone = spec.get("hand_zones", {}).get(pname)
    if zone:
        # keep only the lit skin inside the hand zone (drops the dark lap between the fingers)
        import cv2

        z = poly_mask(zone)
        bright = (base[..., :3].max(axis=2) > 58).astype(np.uint8)
        bright = cv2.morphologyEx(bright, cv2.MORPH_CLOSE, np.ones((5, 5), np.uint8))
        bright = cv2.morphologyEx(bright, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))
        n, lab, stats, _ = cv2.connectedComponentsWithStats((bright > 0) & z & m if False else ((bright > 0) & z & m).astype(np.uint8))
        keep = np.zeros_like(bright)
        if n > 1:
            big = 1 + int(np.argmax(stats[1:, cv2.CC_STAT_AREA]))
            keep = (lab == big).astype(np.uint8)
        soft = cv2.GaussianBlur(keep.astype(np.float32), (0, 0), 0.8)
        piece[..., 3] = np.where(z, (piece[..., 3] * np.clip(soft * 1.6 - 0.3, 0, 1)).astype(np.uint8), piece[..., 3])
    pieces[pname] = save_piece(pname, piece)
    front |= m

# ---- torso = what is left -------------------------------------------------
torso = base.copy()
torso[..., 3] = np.where(front, 0, base[..., 3])
torso_note = "cut from the base image"

under = spec.get("torso_underlay")
if under:
    # Hidden areas (behind head / arms) completed by the OpenAI inpaint, aligned to the base.
    u = np.array(Image.open(f"{ROOT}/{under['file']}").convert("RGBA"))
    hole = front & (u[..., 3] > 0)
    torso[hole] = u[hole]
    torso_note = f"base + hidden areas from {under['file']}"
elif spec.get("torso_temp_fill"):
    # TEMPORARY stand-in while the image tool is unavailable: smear the neighbouring
    # suit colours into the hidden areas so the rig can be tested. Replaced by the
    # OpenAI inpaint (torso_underlay) as soon as it exists.
    import cv2

    body = poly_mask(spec["torso_temp_fill"]["body"])
    hole = front & body
    rgb = np.ascontiguousarray(base[..., :3])
    known = (~front) & (base[..., 3] > 200)
    inpaint_mask = (~known).astype(np.uint8) * 255
    filled = cv2.inpaint(rgb, inpaint_mask, 9, cv2.INPAINT_TELEA)
    filled = cv2.GaussianBlur(filled, (0, 0), 2.0)
    # behind the arms: plain dark suit colour (the smear looked like stains)
    arms_hole = hole & ~masks["head"]
    dark = np.array([11, 11, 17], np.float32)
    filled = np.where(arms_hole[..., None], dark, filled).astype(np.uint8)
    torso[..., :3] = np.where(hole[..., None], filled, torso[..., :3])
    torso[..., 3] = np.where(hole, 255, torso[..., 3])
    torso_note = "TEMPORARY: hidden areas smeared by code, waiting for the OpenAI inpaint"

pieces["torso"] = save_piece("torso", torso, extra={"note": torso_note})

rig = {
    "name": name,
    "size": spec["size"],
    "pieces": pieces,
    "joints": spec["joints"],
}
for k in ("fingertips", "knuckles", "faces"):
    if k in spec:
        rig[k] = spec[k]
# keep face overlays written by tools/faces.py
old = f"{out_dir}/rig.json"
if os.path.exists(old):
    prev = json.load(open(old))
    if "overlays" in prev:
        rig["overlays"] = prev["overlays"]
json.dump(rig, open(old, "w"), indent=1)
print(name, "pieces:", {k: (v["w"], v["h"]) for k, v in pieces.items()})
print("torso:", torso_note)
