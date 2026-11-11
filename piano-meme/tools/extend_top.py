#!/usr/bin/env python3
"""Extend a master upward by mirroring its own top wall (no new drawing).
Writes video/public/art/<ANGLE>/top.jpg and adds "top": {"h", "overlap"} to
video/src/art/<ANGLE>.json. The strip overlaps the first rows of the master
(hiding the drawing's border) and continues it as a mirror image.

  python3 tools/extend_top.py S4 [--height 220] [--overlap 28]
"""
import argparse
import json
from pathlib import Path

import cv2

ROOT = Path(__file__).resolve().parent.parent
ap = argparse.ArgumentParser()
ap.add_argument("angle")
ap.add_argument("--height", type=int, default=220)
ap.add_argument("--overlap", type=int, default=28)
a = ap.parse_args()
man_path = ROOT / "video/src/art" / f"{a.angle}.json"
man = json.loads(man_path.read_text())
master = cv2.imread(str(ROOT / "video/public" / man["master"]))
o, h = a.overlap, a.height
strip = master[o:o + h + o][::-1]  # mirror of the wall just below the border
cv2.imwrite(str(ROOT / "video/public/art" / a.angle / "top.jpg"), strip, [cv2.IMWRITE_JPEG_QUALITY, 93])
man["top"] = {"h": h, "overlap": o}
man_path.write_text(json.dumps(man, indent=1))
print(f"{a.angle}: top strip {strip.shape[1]}x{strip.shape[0]} (covers master rows 0-{o})")
