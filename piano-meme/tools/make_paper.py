#!/usr/bin/env python3
"""Procedural old-paper textures for the hand-drawn layer.

video/public/fx/paper_base.jpg     colour paper (#A39E92 .. #D9D2C3) for empty areas
video/public/fx/paper_overlay.jpg  near-white fibres + stains, used with multiply
video/public/fx/grain_<n>.png      8 grain tiles (alpha), one picked per frame

Deterministic (fixed seeds). Run from piano-meme: python3 tools/make_paper.py
"""
from pathlib import Path

import cv2
import numpy as np

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "video/public/fx"
W, H = 1080, 1920
rng = np.random.default_rng(1907)


def fbm(h, w, octaves=6, base=4, seed=0):
    r = np.random.default_rng(seed)
    acc = np.zeros((h, w), np.float32)
    amp, tot = 1.0, 0.0
    for o in range(octaves):
        n = base * 2 ** o
        small = r.random((n * h // w + 2, n + 2)).astype(np.float32)
        acc += amp * cv2.resize(small, (w, h), interpolation=cv2.INTER_CUBIC)
        tot += amp
        amp *= 0.55
    acc /= tot
    return (acc - acc.min()) / (acc.max() - acc.min() + 1e-6)


def fibres(h, w, n, seed):
    r = np.random.default_rng(seed)
    img = np.zeros((h, w), np.float32)
    for _ in range(n):
        x, y = r.uniform(0, w), r.uniform(0, h)
        ang = r.uniform(0, np.pi)
        ln = r.uniform(6, 40)
        pts = []
        for t in np.linspace(0, 1, 6):
            ang += r.normal(0, 0.25)
            x += np.cos(ang) * ln / 6
            y += np.sin(ang) * ln / 6
            pts.append((x, y))
        cv2.polylines(img, [np.int32(pts)], False, float(r.uniform(0.3, 1.0)), 1, cv2.LINE_AA)
    return cv2.GaussianBlur(img, (0, 0), 0.6)


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    low = fbm(H, W, 5, 3, 11)
    mid = fbm(H, W, 4, 24, 12)
    fib = fibres(H, W, 9000, 13)
    stains = np.clip((fbm(H, W, 4, 2, 14) - 0.62) * 3.0, 0, 1)
    grainy = rng.normal(0, 1, (H, W)).astype(np.float32)
    grainy = cv2.GaussianBlur(grainy, (0, 0), 0.7)

    # colour paper: blend between #A39E92 and #D9D2C3
    dark = np.array([0xA3, 0x9E, 0x92], np.float32)[::-1]  # BGR
    light = np.array([0xD9, 0xD2, 0xC3], np.float32)[::-1]
    t = np.clip(0.55 + 0.35 * (low - 0.5) + 0.12 * (mid - 0.5) - 0.25 * stains, 0, 1)
    base = dark + (light - dark) * t[..., None]
    base -= fib[..., None] * 14
    base += grainy[..., None] * 3.5
    # edge darkening (old sheet)
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    d = np.minimum.reduce([xx, W - xx, yy, H - yy]) / 120.0
    base *= (0.86 + 0.14 * np.clip(d, 0, 1))[..., None]
    cv2.imwrite(str(OUT / "paper_base.jpg"), np.clip(base, 0, 255).astype(np.uint8),
                [cv2.IMWRITE_JPEG_QUALITY, 92])

    # multiply overlay: white = no change
    ov = 255 - (18 * (1 - low) + 10 * mid + 30 * fib + 26 * stains + 4 * np.abs(grainy))
    ov = np.clip(ov, 0, 255)
    # warm tint so it multiplies toward the paper colours
    tint = np.array([0.93, 0.97, 1.0], np.float32)  # BGR
    ov_rgb = (ov[..., None] * tint).astype(np.uint8)
    cv2.imwrite(str(OUT / "paper_overlay.jpg"), ov_rgb, [cv2.IMWRITE_JPEG_QUALITY, 90])

    # grain tiles: dark specks in alpha, 540x960 (scaled 2x in CSS)
    for i in range(8):
        r = np.random.default_rng(100 + i)
        g = r.normal(0, 1, (960, 540)).astype(np.float32)
        g = cv2.GaussianBlur(g, (0, 0), 0.6)
        a = np.clip(np.abs(g) * 60 - 20, 0, 255).astype(np.uint8)
        rgba = np.zeros((960, 540, 4), np.uint8)
        rgba[..., :3] = (0x14, 0x12, 0x10)
        rgba[..., 3] = a
        cv2.imwrite(str(OUT / f"grain_{i}.png"), rgba)
    print("paper + grain written to", OUT.relative_to(ROOT))


if __name__ == "__main__":
    main()
