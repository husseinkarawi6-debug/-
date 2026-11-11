#!/usr/bin/env python3
"""Checks a rendered test (or the final film) against the rules in timing.md.

  python3 tools/check_test.py out/look-test.mp4 [--compare out/look-compare.mp4]

1. SOUND: the video's audio is audio.wav from second 0 (no cut, no offset):
   cross-correlation lag must be 0 (within 2 ms) and the first second must match.
2. CUTS: the cuts found in the picture are exactly the timing.md shot starts
   that fall inside the video (0 frames off), and there are no other cuts.
3. COMPARE (optional): left half = reference, right half = ours. Both halves
   cut together (within 1 frame: the reference is 24 fps), and the audio is
   audio.wav from 0.

Exit code 0 only if everything matches.
"""
import argparse
import re
import subprocess
import sys
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parent.parent
AUDIO = ROOT / "refs/reference/audio.wav"
TIMING = ROOT / "refs/reference/timing.md"
FPS = 30
bad = 0


def report(ok, msg):
    global bad
    bad += 0 if ok else 1
    print(("  ✓ " if ok else "  ✗ ") + msg)


def pcm(path, seconds=None, sr=16000):
    cmd = ["ffmpeg", "-v", "error", "-i", str(path)]
    if seconds:
        cmd += ["-t", f"{seconds}"]
    cmd += ["-vn", "-f", "s16le", "-ac", "1", "-ar", str(sr), "-"]
    return np.frombuffer(subprocess.run(cmd, capture_output=True).stdout, np.int16).astype(np.float64)


def lag_ms(a, b, sr=16000, max_lag=1.0):
    n = min(len(a), len(b))
    a, b = a[:n], b[:n]
    m = int(max_lag * sr)
    A, B = np.fft.rfft(a, 2 * n), np.fft.rfft(b, 2 * n)
    c = np.fft.irfft(A * np.conj(B))
    vals = np.r_[c[-m:], c[:m + 1]]
    lags = np.r_[np.arange(-m, 0), np.arange(0, m + 1)]
    k = lags[int(np.argmax(vals))]
    corr = float(vals.max() / np.sqrt((a ** 2).sum() * (b ** 2).sum() + 1e-9))
    return 1000 * k / sr, corr


def table_starts():
    starts = []
    for line in TIMING.read_text(encoding="utf-8").splitlines():
        cells = [c.strip() for c in line.strip().strip("|").split("|")]
        if len(cells) >= 5 and cells[0].isdigit():
            fr = next((c for c in cells[1:] if re.fullmatch(r"\d+\s*[–-]\s*\d+", c)), None)
            if fr:
                starts.append(int(re.split(r"\s*[–-]\s*", fr)[0]))
    return starts


def frames(path, crop=None, w=135, h=240):
    """Grey frames at 30 fps (crop = 'left'/'right' half of a side-by-side)."""
    vf = f"fps={FPS}"
    if crop == "left":
        vf += ",crop=iw/2:ih:0:0"
    elif crop == "right":
        vf += ",crop=iw/2:ih:iw/2:0"
    vf += f",scale={w}:{h},format=gray"
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", str(path), "-vf", vf, "-f", "rawvideo", "-"],
                         capture_output=True).stdout
    return np.frombuffer(raw, np.uint8).reshape(-1, h, w).astype(np.float32)


def cuts(fr, gx=6, gy=10):
    """Frames where a new shot starts: most of the picture changes at once.
    A pose swap or a caption changes only a part of the frame, the line boil
    only a little everywhere; a cut changes nearly every block a lot."""
    n, h, w = fr.shape
    bh, bw = h // gy, w // gx
    blocks = fr[:, :bh * gy, :bw * gx].reshape(n, gy, bh, gx, bw).mean(axis=(2, 4))
    d = np.abs(np.diff(fr, axis=0))[:, :bh * gy, :bw * gx].reshape(n - 1, gy, bh, gx, bw).mean(axis=(2, 4))
    typical = np.median(d, axis=0)
    out = []
    for i in range(n - 1):
        changed = d[i] > np.maximum(3 * typical, 8.0)
        if changed.mean() > 0.6:
            out.append(i + 1)
    return out, d

def spikes(fr):
    """Any big jump in the picture (cuts and pose pops): used on the reference,
    whose plain paper background does not change at a cut."""
    d = np.abs(np.diff(fr, axis=0)).mean(axis=(1, 2))
    base = np.median(d)
    return [i + 1 for i, v in enumerate(d) if v > max(4 * np.median(d[max(0, i - 8):i + 9]), base * 4, 1.0)]


def check_audio(video, label):
    dur = float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0",
                                str(video)], capture_output=True, text=True).stdout.strip() or 0)
    a = pcm(video)
    b = pcm(AUDIO, seconds=dur)
    lag, corr = lag_ms(a, b)
    report(abs(lag) <= 2 and corr > 0.9, f"{label}: audio = audio.wav from 0 s (lag {lag:+.1f} ms, match {corr:.3f})")
    lag1, corr1 = lag_ms(a[:16000], b[:16000], max_lag=0.5)
    report(abs(lag1) <= 2 and corr1 > 0.9, f"{label}: first second = start of audio.wav "
           f"(\"Spanish is easy, right?\") (lag {lag1:+.1f} ms, match {corr1:.3f})")
    return dur


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("video")
    ap.add_argument("--compare")
    a = ap.parse_args()
    starts = table_starts()

    print(f"== {a.video}")
    dur = check_audio(a.video, "test")
    fr = frames(a.video)
    n = len(fr)
    expected = [s for s in starts if 0 < s < n]
    found, _ = cuts(fr)
    report(found == expected, f"cuts {found} = timing.md {expected}")
    print(f"     ({n} frames, {dur:.2f} s)")

    if a.compare:
        print(f"== {a.compare}")
        check_audio(a.compare, "compare")
        left = spikes(frames(a.compare, "left"))
        right, _ = cuts(frames(a.compare, "right"))
        report(right == expected, f"our half cuts {right} = timing.md")
        missing = [r for r in expected if not any(abs(l - r) <= 1 for l in left)]
        report(not missing, f"every cut of ours is a cut in the reference half too (±1 frame, the reference "
               f"is 24 fps); reference changes found: {left}" + (f"; NOT in reference: {missing}" if missing else ""))

    print("\nALL MATCH" if bad == 0 else f"\n{bad} problem(s)")
    sys.exit(1 if bad else 0)


if __name__ == "__main__":
    main()
