#!/usr/bin/env python3
"""Audio analysis for the piano meme.

Reads  refs/reference/reference.mp4  (the original meme) and
       refs/reference/timing.md      (cut and caption frames)
Writes video/public/audio/meme.wav   (the soundtrack, used by Remotion)
       audio/analysis.json           (the ONLY timing source for Remotion)
       audio/mouth/<line>.json       (mouth shapes from Rhubarb, see lipsync step)

Run from the piano-meme folder:
    python3 audio/analyze.py            # full analysis (needs reference.mp4)
    python3 audio/analyze.py --no-audio # timing.md only, audio fields left empty

Everything is in frames at 30 fps. 1056 frames total.
"""
from __future__ import annotations

import argparse
import json
import re
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
REF_VIDEO = ROOT / "refs/reference/reference.mp4"
TIMING_MD = ROOT / "refs/reference/timing.md"
WAV_OUT = ROOT / "video/public/audio/meme.wav"
ANALYSIS = ROOT / "audio/analysis.json"
MOUTH_DIR = ROOT / "audio/mouth"
WORK = ROOT / "audio/work"
RHUBARB = ROOT / "tools/rhubarb/rhubarb"

FPS = 30
TOTAL = 1056

# ---------------------------------------------------------------------------
# Shots and captions. Shot frames are parsed from timing.md (table rows).
# Caption changes inside long shots are written here once, copied from the
# "caption" column of timing.md, and checked against it below.
# speaker: "learner" (Speaker A, English) / "lazy" (Speaker B, Spanish) / "both"
# ---------------------------------------------------------------------------
SENTENCE_EN_1 = "Tomorrow morning, the strange spider from Spain"
SENTENCE_EN_2 = "skillfully scratches the spiderweb on the mountain"
SENTENCE_ES = ("Mañana por la mañana, la extraña araña de España "
               "araña con maña la telaraña de la montaña")

# (start, end, text, lang). end is inclusive. Empty gaps = no caption.
CAPTIONS = [
    (8, 63, "Spanish is easy, right?", "en"),
    (104, 164, "How do you say “tomorrow” in Spanish?", "en"),
    (192, 234, "Mañana", "es"),
    # rows 5–20: one word per shot, full shot length (filled from the table)
    (632, 673, "Try this", "en"),
    (674, 740, SENTENCE_EN_1, "en"),
    (741, 853, SENTENCE_EN_1 + " " + SENTENCE_EN_2, "en"),
    (854, 1055, SENTENCE_ES, "es"),
]

# Spanish words drawn in red inside captions
SPANISH_WORDS = ["Mañana", "mañana", "por", "la", "extraña", "araña", "de",
                 "España", "con", "maña", "telaraña", "montaña", "Araña",
                 "Maña", "Telaraña", "Extraña", "Montaña"]

# What is actually SAID in each shot (for Rhubarb's dialog file).
SPOKEN = {
    1: "Spanish is easy, right?",
    3: "How do you say tomorrow in Spanish?",
    4: "Mañana",
    21: "Try this. " + SENTENCE_EN_1 + " " + SENTENCE_EN_2,
    23: SENTENCE_ES,
}


def parse_timing_md() -> list[dict]:
    rows = []
    pat = re.compile(r"^\|\s*(\d+)\s*\|\s*([\d.]+)[–-]([\d.]+)\s*\|\s*(\d+)[–-](\d+)\s*\|\s*([^|]+)\|\s*(.*)\|\s*$")
    for line in TIMING_MD.read_text(encoding="utf-8").splitlines():
        m = pat.match(line)
        if not m:
            continue
        n, _s0, _s1, f0, f1, who, cap = m.groups()
        who = who.strip()
        speaker = "both" if "+" in who else ("learner" if who.startswith("A") else "lazy")
        rows.append({"shot": int(n), "start": int(f0), "end": int(f1),
                     "speaker": speaker, "silent": "silent" in who,
                     "captionCell": cap.strip()})
    if len(rows) != 23:
        sys.exit(f"timing.md: expected 23 rows, found {len(rows)}")
    if rows[-1]["end"] != TOTAL - 1:
        sys.exit("timing.md: last shot must end on frame 1055")
    return rows


def build_captions(rows: list[dict]) -> list[dict]:
    caps = [dict(start=a, end=b, text=t, lang=l) for a, b, t, l in CAPTIONS]
    for r in rows:
        if 5 <= r["shot"] <= 20:
            word = r["captionCell"].strip()
            caps.append(dict(start=r["start"], end=r["end"], text=word,
                             lang="es" if r["speaker"] == "lazy" else "en"))
    caps.sort(key=lambda c: c["start"])
    md = TIMING_MD.read_text(encoding="utf-8")
    for c in caps:  # every caption must come from timing.md
        probe = c["text"].replace("“", "").replace("”", "")
        head = probe.split(",")[0].split(" ")[0]
        if head not in md:
            sys.exit(f"caption not found in timing.md: {c['text']!r}")
    for a, b in zip(caps, caps[1:]):
        if a["end"] >= b["start"]:
            sys.exit(f"captions overlap: {a} / {b}")
    return caps


def build_lines(rows: list[dict]) -> list[dict]:
    """One line per shot where someone speaks."""
    lines = []
    for r in rows:
        if r["silent"]:
            continue
        text = SPOKEN.get(r["shot"])
        if text is None:
            text = r["captionCell"].strip()
        if not text:
            continue
        lang = "es" if r["speaker"] in ("lazy", "both") else "en"
        if r["shot"] == 21:
            lang = "en"
        lines.append({"id": f"L{r['shot']:02d}", "shot": r["shot"],
                      "speaker": r["speaker"], "text": text, "lang": lang,
                      "shotStart": r["start"], "shotEnd": r["end"]})
    return lines


# ---------------------------------------------------------------------------
# audio helpers
# ---------------------------------------------------------------------------

def extract_audio():
    WAV_OUT.parent.mkdir(parents=True, exist_ok=True)
    WORK.mkdir(parents=True, exist_ok=True)
    # Full-quality soundtrack, trimmed/padded to exactly 35.2 s.
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(REF_VIDEO), "-vn",
                    "-af", f"apad=whole_dur={TOTAL / FPS}", "-t", f"{TOTAL / FPS}",
                    "-ar", "48000", "-ac", "2", "-c:a", "pcm_s16le", str(WAV_OUT)],
                   check=True)
    mono = WORK / "mono22k.wav"
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(WAV_OUT),
                    "-ac", "1", "-ar", "22050", str(mono)], check=True)
    return mono


def per_frame(x, sr, fn):
    import numpy as np
    hop = sr / FPS
    out = []
    for f in range(TOTAL):
        a, b = int(round(f * hop)), int(round((f + 1) * hop))
        seg = x[a:b]
        out.append(float(fn(seg)) if len(seg) else 0.0)
    return np.array(out)


def smooth(v, n):
    import numpy as np
    if n <= 1:
        return v
    k = np.hanning(n * 2 + 1)
    k /= k.sum()
    return np.convolve(np.pad(v, n, mode="edge"), k, mode="valid")


def runs_above(v, thr, min_len):
    out, start = [], None
    for i, x in enumerate(list(v) + [-1e9]):
        if x > thr and start is None:
            start = i
        elif x <= thr and start is not None:
            if i - start >= min_len:
                out.append([start, i - 1])
            start = None
    return out


def analyse_audio(mono: Path, lines: list[dict]) -> dict:
    import numpy as np
    import librosa
    import scipy.signal as sps

    y, sr = librosa.load(str(mono), sr=22050, mono=True)
    rms = lambda s: np.sqrt(np.mean(s ** 2) + 1e-12)

    # Harmonic / percussive split. Piano + voice are both harmonic; the piano
    # carries most of the low/mid energy, the voice most of 300–3400 Hz.
    D = librosa.stft(y, n_fft=2048, hop_length=512)
    H, P = librosa.decompose.hpss(D, margin=2.0)
    yh = librosa.istft(H, hop_length=512, length=len(y))
    yp = librosa.istft(P, hop_length=512, length=len(y))

    full_rms = per_frame(y, sr, rms)
    harm_rms = per_frame(yh, sr, rms)
    perc_rms = per_frame(yp, sr, rms)

    # "piano" curve: harmonic energy below 1.2 kHz (keeps most of the voice out)
    b, a = sps.butter(4, 1200 / (sr / 2), btype="low")
    yh_low = sps.filtfilt(b, a, yh)
    piano_rms = per_frame(yh_low, sr, rms)
    # "voice" curve: harmonic energy 300–3400 Hz
    b, a = sps.butter(4, [300 / (sr / 2), 3400 / (sr / 2)], btype="band")
    voice = per_frame(sps.filtfilt(b, a, yh), sr, rms)

    def db(v):
        return 20 * np.log10(np.maximum(v, 1e-6))

    piano_db = smooth(db(piano_rms), 6)
    piano_norm = (piano_db - np.percentile(piano_db, 10)) / max(
        1e-6, np.percentile(piano_db, 98) - np.percentile(piano_db, 10))
    piano_norm = np.clip(piano_norm, 0, 1)

    # Loud piano section in the middle of the clip (between shot 5 and 21).
    mid = np.zeros(TOTAL, bool)
    mid[246:632] = True
    thr = np.percentile(piano_norm[mid], 70)
    loud_runs = [r for r in runs_above(np.where(mid, piano_norm, 0), thr, 10)]
    # merge runs separated by < 8 frames
    merged = []
    for r in loud_runs:
        if merged and r[0] - merged[-1][1] < 8:
            merged[-1][1] = r[1]
        else:
            merged.append(r)
    loud_main = max(merged, key=lambda r: float(piano_norm[r[0]:r[1] + 1].sum()), default=None)

    # Beats and onsets
    hop = 512
    onset_env = librosa.onset.onset_strength(y=y, sr=sr, hop_length=hop)
    tempo, beat_frames = librosa.beat.beat_track(onset_envelope=onset_env, sr=sr, hop_length=hop)
    beat_t = librosa.frames_to_time(beat_frames, sr=sr, hop_length=hop)
    on_h = librosa.onset.onset_strength(y=yh_low, sr=sr, hop_length=hop)
    on_frames = librosa.onset.onset_detect(onset_envelope=on_h, sr=sr, hop_length=hop, backtrack=False)
    on_t = librosa.frames_to_time(on_frames, sr=sr, hop_length=hop)
    on_strength = on_h[on_frames] if len(on_frames) else np.array([])
    strong_thr = np.percentile(on_strength, 60) if len(on_strength) else 0

    to_f = lambda t: int(round(float(t) * FPS))
    onsets = [{"frame": to_f(t), "strength": round(float(s / (on_strength.max() + 1e-9)), 3),
               "strong": bool(s >= strong_thr)} for t, s in zip(on_t, on_strength)]

    # Speech start/end inside each line's shot (voice band above local floor)
    vdb = smooth(db(voice), 1)
    for ln in lines:
        a, b2 = ln["shotStart"], ln["shotEnd"]
        seg = vdb[a:b2 + 1]
        floor = np.percentile(seg, 15)
        peak = np.percentile(seg, 95)
        thr_v = floor + 0.45 * (peak - floor)
        active = np.where(seg > thr_v)[0]
        if len(active) and peak - floor > 6:
            ln["speechStart"] = int(a + active[0])
            ln["speechEnd"] = int(a + active[-1])
            ln["speechFromAudio"] = True
        else:
            ln["speechStart"], ln["speechEnd"] = a + 4, b2 - 4
            ln["speechFromAudio"] = False

    return {
        "tempo": float(np.atleast_1d(tempo)[0]),
        "beats": [to_f(t) for t in beat_t],
        "onsets": onsets,
        "curves": {
            "full": [round(float(v), 5) for v in full_rms],
            "harmonic": [round(float(v), 5) for v in harm_rms],
            "percussive": [round(float(v), 5) for v in perc_rms],
            "piano": [round(float(v), 4) for v in piano_norm],
            "voice": [round(float(v), 5) for v in voice],
        },
        "pianoLoud": {
            "threshold": round(float(thr), 4),
            "runs": merged,
            "main": loud_main,
        },
    }


# ---------------------------------------------------------------------------
# Rhubarb lip sync
# ---------------------------------------------------------------------------

def run_rhubarb(mono: Path, lines: list[dict]):
    if not RHUBARB.exists():
        print("! Rhubarb not found at tools/rhubarb — run tools/get_rhubarb.sh")
        return
    MOUTH_DIR.mkdir(parents=True, exist_ok=True)
    for ln in lines:
        a = max(0, ln["shotStart"] - 3)
        b = ln["shotEnd"] + 1
        seg = WORK / f"{ln['id']}.wav"
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(mono), "-ss", f"{a / FPS}",
                        "-t", f"{(b - a) / FPS}", "-ac", "1", "-ar", "16000", str(seg)], check=True)
        dialog = WORK / f"{ln['id']}.txt"
        dialog.write_text(ln["text"], encoding="utf-8")
        out = WORK / f"{ln['id']}.rhubarb.json"
        # English lines: speech recogniser + dialog text. Spanish lines: phonetic.
        rec = "pocketSphinx" if ln["lang"] == "en" else "phonetic"
        cmd = [str(RHUBARB), "-q", "-f", "json", "-r", rec, "--extendedShapes", "GX",
               "-o", str(out), str(seg)]
        if rec == "pocketSphinx":
            cmd[1:1] = ["-d", str(dialog)]
        subprocess.run(cmd, check=True)
        cues = json.loads(out.read_text())["mouthCues"]
        frames = []
        for c in cues:
            f0 = a + int(round(c["start"] * FPS))
            f1 = a + int(round(c["end"] * FPS)) - 1
            f0, f1 = max(f0, ln["shotStart"]), min(f1, ln["shotEnd"])
            if f1 >= f0:
                frames.append({"start": f0, "end": f1, "shape": c["value"]})
        res = {"line": ln["id"], "speaker": ln["speaker"], "text": ln["text"],
               "recognizer": rec, "cues": frames}
        (MOUTH_DIR / f"{ln['id']}.json").write_text(json.dumps(res, ensure_ascii=False, indent=1))
        ln["mouth"] = f"audio/mouth/{ln['id']}.json"
    # bundle for Remotion (same data, one import)
    bundle = {p.stem: json.loads(p.read_text()) for p in sorted(MOUTH_DIR.glob("L*.json"))}
    (MOUTH_DIR / "all.json").write_text(json.dumps(bundle, ensure_ascii=False))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--no-audio", action="store_true")
    args = ap.parse_args()

    rows = parse_timing_md()
    captions = build_captions(rows)
    lines = build_lines(rows)
    shots = [{"shot": r["shot"], "start": r["start"], "end": r["end"],
              "speaker": r["speaker"], "silent": r["silent"]} for r in rows]

    result = {"fps": FPS, "durationInFrames": TOTAL, "audioPresent": False,
              "shots": shots, "captions": captions, "lines": lines,
              "spanishWords": SPANISH_WORDS}

    if not args.no_audio:
        if not REF_VIDEO.exists():
            sys.exit(f"missing file: {REF_VIDEO.relative_to(ROOT)}")
        mono = extract_audio()
        result.update(analyse_audio(mono, lines))
        result["audioPresent"] = True
        run_rhubarb(mono, lines)

    ANALYSIS.write_text(json.dumps(result, ensure_ascii=False, indent=1))
    print(f"wrote {ANALYSIS.relative_to(ROOT)}: {len(shots)} shots, {len(captions)} captions, "
          f"{len(lines)} spoken lines, audio={'yes' if result['audioPresent'] else 'no'}")
    if result.get("pianoLoud", {}).get("main"):
        a, b = result["pianoLoud"]["main"]
        print(f"loud piano: frames {a}–{b} ({(b - a + 1) / FPS:.2f} s)")


if __name__ == "__main__":
    main()
