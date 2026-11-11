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
REF_AUDIO = ROOT / "refs/reference/audio.wav"  # the soundtrack, used exactly as it is
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
    (104, 164, "How do you say tomorrow\nin Spanish?", "en"),
    (192, 234, "Mañana", "es"),
    # rows 5–20: one word per shot, full shot length (filled from the table)
    (632, 673, "Try this", "en"),
    (674, 740, "Tomorrow morning, the\nstrange spider from Spain", "en"),
    (741, 853, "Tomorrow morning, the\nstrange spider from Spain\nskillfully scratches the\nspiderweb on the mountain", "en"),
    (854, 1055, "Mañana por la\nmañana, la extraña\naraña de España\naraña con maña la\ntelaraña de la\nmontaña", "es"),
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
    """Rows of the table in timing.md. Works with the file-name format
    (| # | file | seconds | frames | who | caption | action |): the frames are
    the first 'int–int' cell, the speaker and 'silent' come from the file name."""
    rows = []
    for line in TIMING_MD.read_text(encoding="utf-8").splitlines():
        cells = [c.strip() for c in line.strip().strip("|").split("|")]
        if len(cells) < 5 or not cells[0].isdigit():
            continue
        frames = next((c for c in cells[1:] if re.fullmatch(r"\d+\s*[–-]\s*\d+", c)), None)
        if not frames:
            continue
        f0, f1 = [int(x) for x in re.split(r"\s*[–-]\s*", frames)]
        fname = next((c for c in cells[1:] if re.fullmatch(r"\d\d_[a-z]+_[\w-]+", c)), "")
        role = fname.split("_")[1] if fname else ""
        speaker = {"learner": "learner", "lazy": "lazy", "both": "both"}.get(role)
        if speaker is None:
            sys.exit(f"timing.md: cannot tell who speaks in row {cells[0]}")
        idx = cells.index(frames)
        cap = cells[idx + 2] if len(cells) > idx + 2 else ""
        rows.append({"shot": int(cells[0]), "start": f0, "end": f1, "speaker": speaker,
                     "silent": ("silent" in fname or "stare" in fname), "file": fname,
                     "captionCell": cap})
    if len(rows) != 23:
        sys.exit(f"timing.md: expected 23 rows, found {len(rows)}")
    if rows[-1]["end"] != TOTAL - 1:
        sys.exit("timing.md: last shot must end on frame 1055")
    return rows

def measure_reference_captions() -> list[dict]:
    """Exact caption change frames in reference.mp4 (24 fps), converted to
    30 fps (first 30 fps frame at or after the change). Looks at the caption
    band at the top of the frame."""
    import math
    import cv2
    cap = cv2.VideoCapture(str(REF_VIDEO))
    fps = cap.get(cv2.CAP_PROP_FPS) or 24.0
    prev, events, k = None, [], 0
    while True:
        ok, fr = cap.read()
        if not ok:
            break
        g = cv2.cvtColor(fr, cv2.COLOR_BGR2GRAY)
        h, w = g.shape
        band = g[int(h * 0.04):int(h * 0.27), int(w * 0.08):int(w * 0.92)] < 90
        if prev is not None:
            diff = int((band ^ prev).sum())
            if diff > 250 and (not events or k - events[-1]["refFrame"] > 3):
                events.append({"refFrame": k, "frame": int(math.ceil(k * FPS / fps - 1e-6)),
                               "on": bool(band.sum() > 40)})
        prev = band
        k += 1
    return events

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



CAPTION_LINE = {0: "L01", 1: "L03", 2: "L04", **{3 + i: f"L{5 + i:02d}" for i in range(16)},
                19: "L21", 20: "L21", 21: "L21", 22: None}
SNAP_WINDOW = 8  # frames: a caption snaps to its own voice if it is this close


def voice_onsets(line_id: str) -> list[int]:
    p = MOUTH_DIR / f"{line_id}.json"
    if not p.exists():
        return []
    cues = json.loads(p.read_text())["cues"]
    out = []
    for prev, cur in zip([{"shape": "X"}] + cues[:-1], cues):
        if prev["shape"] == "X" and cur["shape"] != "X":
            out.append(cur["start"])
    return out


def time_captions(caps: list[dict], events: list[dict]) -> list[dict]:
    """Starts: own voice onset (if within SNAP_WINDOW of the reference),
    otherwise the exact reference frame. Ends: next start - 1, or the
    reference 'caption off' frame."""
    ons = [e for e in events if e["on"]]
    offs = [e for e in events if not e["on"]]
    if len(ons) < len(caps):
        sys.exit(f"reference: found {len(ons)} caption changes, expected {len(caps)}")
    out = []
    for i, c in enumerate(caps):
        ref = ons[i]["frame"]
        c = dict(c, refStart=ref, tableStart=c["start"])
        lid = CAPTION_LINE.get(i)
        # on screen = the reference at the same moment: the caption changes on
        # the exact frame the reference caption changes
        c["start"] = ref
        c["timing"] = "reference frame"
        c["line"] = lid
        out.append(c)
    for i, c in enumerate(out):
        nxt = out[i + 1]["start"] if i + 1 < len(out) else TOTAL
        off = [e["frame"] for e in offs if c["start"] < e["frame"] < nxt]
        c["end"] = (off[0] - 1) if off else nxt - 1
    return out

# ---------------------------------------------------------------------------
# audio helpers
# ---------------------------------------------------------------------------

def extract_audio():
    """The soundtrack is refs/reference/audio.wav, copied unchanged (BRIEF.md).
    A 22 kHz mono copy is made only for the analysis."""
    import shutil
    WAV_OUT.parent.mkdir(parents=True, exist_ok=True)
    WORK.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(REF_AUDIO, WAV_OUT)
    mono = WORK / "mono22k.wav"
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(REF_AUDIO),
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


def stationary_split(y, sr):
    """Split the mix into 'held tones' (piano chords, held notes: straight
    lines in the spectrogram) and 'gliding' sound (voices: curved lines).
    Long horizontal median vs vertical median, like HPSS with a 0.5 s kernel."""
    import numpy as np
    import librosa
    import scipy.ndimage as ndi
    hop, nfft = 256, 4096
    D = librosa.stft(y, n_fft=nfft, hop_length=hop)
    M = np.abs(D)
    Ht = ndi.median_filter(M, size=(1, 43))   # ~0.5 s along time
    Vf = ndi.median_filter(M, size=(17, 1))   # ~90 Hz along frequency
    held_mask = (Ht ** 2) / (Ht ** 2 + Vf ** 2 + 1e-12)
    # REPET-SIM: what repeats in the music is accompaniment, the rest is voice
    S_rep = librosa.decompose.nn_filter(M, aggregate=np.median, metric="cosine",
                                        width=int(librosa.time_to_frames(1.0, sr=sr, hop_length=hop)))
    S_rep = np.minimum(M, S_rep)
    rep_mask = librosa.util.softmask(M - S_rep, 2 * S_rep, power=2)
    voice_mask = rep_mask * (1 - held_mask)
    freqs = librosa.fft_frequencies(sr=sr, n_fft=nfft)
    times = librosa.frames_to_time(np.arange(M.shape[1]), sr=sr, hop_length=hop)
    return dict(D=D, M=M, held_mask=held_mask, voice_mask=voice_mask,
                freqs=freqs, times=times, hop=hop, nfft=nfft)


def analyse_audio(mono: Path, lines: list[dict], rows: list[dict]) -> dict:
    import numpy as np
    import librosa
    import soundfile as sf

    y, sr = librosa.load(str(mono), sr=22050, mono=True)
    rms = lambda s: np.sqrt(np.mean(s ** 2) + 1e-12)
    full_rms = per_frame(y, sr, rms)

    sp = stationary_split(y, sr)
    M, f = sp["M"], sp["freqs"]
    fr_t = (np.arange(TOTAL) + 0.5) / FPS

    def band_db(spec, lo, hi):
        b = (f > lo) & (f < hi)
        e = np.sqrt((spec[b] ** 2).sum(0))
        return smooth(20 * np.log10(np.maximum(np.interp(fr_t, sp["times"], e), 1e-4)), 4)

    piano_db = band_db(M * (sp["held_mask"] > 0.75), 80, 2500)   # held tones = piano
    voice_db = band_db(M * sp["voice_mask"], 250, 3000)          # gliding = voices
    lo, hi = np.percentile(piano_db, 10), np.percentile(piano_db, 99)
    piano_norm = np.clip((piano_db - lo) / max(1e-6, hi - lo), 0, 1)

    # Vocals-only track for Rhubarb
    yv = librosa.istft(sp["D"] * sp["voice_mask"], hop_length=sp["hop"], length=len(y))
    yv = yv / (np.abs(yv).max() + 1e-9) * 0.9
    sf.write(str(WORK / "vocals22k.wav"), yv, sr)
    # the level of the separated voice in the speech band: this decides when
    # a mouth may be open (bass drops and chords stay out of it)
    import scipy.signal as sps
    bb, ab = sps.butter(4, [300 / (sr / 2), 3400 / (sr / 2)], btype="band")
    vocals_db = 20 * np.log10(np.maximum(per_frame(sps.filtfilt(bb, ab, yv), sr, rms), 1e-6))

    # Piano loudness the way BRIEF.md asks: librosa HPSS, RMS of the harmonic
    # part, per frame, smoothed over ~0.5 s.
    y_harm, _ = librosa.effects.hpss(y)
    harm_db = 20 * np.log10(np.maximum(per_frame(y_harm, sr, rms), 1e-6))
    harm_db = smooth(harm_db, 15)

    # Loud piano in the middle: loudest 2 s window of the harmonic RMS inside
    # shots 5–20, then snapped to the shots it touches.
    lin = 10 ** (harm_db / 20)
    L = 60
    best = max(range(246, 632 - L + 1), key=lambda a: lin[a:a + L].mean())
    win = [best, best + L - 1]
    touched = [r for r in rows if r["end"] >= win[0] and r["start"] <= win[1] and 5 <= r["shot"] <= 20]
    # start and end the section on a lazy shot (those become the pianist)
    while touched and touched[0]["speaker"] != "lazy":
        touched = touched[1:]
    while touched and touched[-1]["speaker"] != "lazy":
        touched = touched[:-1]
    section = {
        "loudWindow": win,
        "loudWindowDb": round(float(20 * np.log10(lin[win[0]:win[1] + 1].mean())), 2),
        "start": touched[0]["start"] if touched else None,
        "end": touched[-1]["end"] if touched else None,
        "shots": [r["shot"] for r in touched],
        "pianistShots": [r["shot"] for r in touched if r["speaker"] == "lazy"],
    }

    # Beats (dance, mic) and piano onsets (pianist's hands)
    hop = 512
    onset_env = librosa.onset.onset_strength(y=y, sr=sr, hop_length=hop)
    tempo, beat_frames = librosa.beat.beat_track(onset_envelope=onset_env, sr=sr, hop_length=hop)
    beat_t = librosa.frames_to_time(beat_frames, sr=sr, hop_length=hop)
    yh = librosa.istft(sp["D"] * (sp["held_mask"] > 0.5), hop_length=sp["hop"], length=len(y))
    on_h = librosa.onset.onset_strength(y=yh, sr=sr, hop_length=hop)
    on_frames = librosa.onset.onset_detect(onset_envelope=on_h, sr=sr, hop_length=hop, backtrack=False)
    on_t = librosa.frames_to_time(on_frames, sr=sr, hop_length=hop)
    on_strength = on_h[on_frames] if len(on_frames) else np.array([])
    strong_thr = np.percentile(on_strength, 60) if len(on_strength) else 0
    to_f = lambda t: int(round(float(t) * FPS))
    onsets = [{"frame": to_f(t), "strength": round(float(s / (on_strength.max() + 1e-9)), 3),
               "strong": bool(s >= strong_thr)} for t, s in zip(on_t, on_strength)]

    # Speech start/end per line, from the voice curve
    for ln in lines:
        a, b2 = ln["shotStart"], ln["shotEnd"]
        seg = voice_db[a:b2 + 1]
        floor, peak = np.percentile(seg, 10), np.percentile(seg, 95)
        thr_v = floor + 0.5 * (peak - floor)
        active = np.where(seg > thr_v)[0]
        if len(active) and peak - floor > 8:
            ln["speechStart"], ln["speechEnd"] = int(a + active[0]), int(a + active[-1])
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
            "pianoDb": [round(float(v), 2) for v in piano_db],
            "harmonicDb": [round(float(v), 2) for v in harm_db],
            "piano": [round(float(v), 4) for v in piano_norm],
            "voiceDb": [round(float(v), 2) for v in voice_db],
            "vocalsDb": [round(float(v), 2) for v in vocals_db],
        },
        "pianoSection": section,
    }


# ---------------------------------------------------------------------------
# Rhubarb lip sync
# ---------------------------------------------------------------------------


VOICE_FLOOR_DB = -31.0   # separated voice louder than this = someone is talking
VOICE_RANGE_DB = 20.0    # ...and within 20 dB of the line's loudest moment
SPILL_FRAMES = 6         # voice running over a cut belongs to the next speaker


def voice_active(ln, vocals_db, next_start=None):
    """Frames (inside the line's shot) where THIS speaker's voice sounds.
    Voice that is still sounding at the cut and carries on into the next shot
    is the next speaker starting early: it is not ours."""
    import numpy as np
    a, b = ln["shotStart"], ln["shotEnd"]
    seg = np.array(vocals_db[a:b + 1], float)
    thr = max(VOICE_FLOOR_DB, float(np.percentile(seg, 97)) - VOICE_RANGE_DB)
    on = seg > thr
    if next_start is not None and next_start == b + 1 and b + 1 < len(vocals_db):
        nxt_on = vocals_db[b + 1] > thr
        if on[-1] and nxt_on:
            i = len(on) - 1
            while i >= 0 and on[i] and (len(on) - 1 - i) < SPILL_FRAMES:
                on[i] = False
                i -= 1
    # bridge 1-frame gaps (a syllable boundary is not a closed mouth)
    for i in range(1, len(on) - 1):
        if not on[i] and on[i - 1] and on[i + 1]:
            on[i] = True
    return on, thr


def gate_cues(cues, ln, vocals_db, next_start=None):
    """Mouth open ONLY while this speaker's voice sounds; Rhubarb picks the
    shape, the voice level how wide it opens; closed (X) everywhere else."""
    import numpy as np
    a, b = ln["shotStart"], ln["shotEnd"]
    per = {}
    for c in cues:
        for f in range(c["start"], c["end"] + 1):
            per[f] = c["shape"]
    on, thr = voice_active(ln, vocals_db, next_start)
    seg = np.array(vocals_db[a:b + 1], float)
    peak = float(seg.max())
    out = []
    for i, f in enumerate(range(a, b + 1)):
        if not on[i]:
            out.append("X")
            continue
        level = (seg[i] - thr) / max(1e-6, peak - thr)
        shape = per.get(f, "X")
        if shape in ("X", "A"):  # voice sounds but Rhubarb shut the mouth
            shape = "D" if level > 0.85 else ("C" if level > 0.45 else "B")
        out.append(shape)
    merged = []
    for i, sh in enumerate(out):
        f = a + i
        if merged and merged[-1]["shape"] == sh:
            merged[-1]["end"] = f
        else:
            merged.append({"start": f, "end": f, "shape": sh})
    return merged

def run_rhubarb(mono: Path, lines: list[dict], voice_db=None):
    if not RHUBARB.exists():
        print("! Rhubarb not found at tools/rhubarb — run tools/get_rhubarb.sh")
        return
    MOUTH_DIR.mkdir(parents=True, exist_ok=True)
    for ln in lines:
        a = max(0, ln["shotStart"] - 3)
        b = ln["shotEnd"] + 1
        seg = WORK / f"{ln['id']}.wav"
        src = WORK / "vocals22k.wav" if (WORK / "vocals22k.wav").exists() else mono
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(src), "-ss", f"{a / FPS}",
                        "-t", f"{(b - a) / FPS}", "-ac", "1", "-ar", "16000", str(seg)], check=True)
        dialog = WORK / f"{ln['id']}.txt"
        dialog.write_text(ln["text"], encoding="utf-8")
        out = WORK / f"{ln['id']}.rhubarb.json"
        # English lines: speech recogniser + dialog text. Spanish lines: phonetic.
        rec = "pocketSphinx" if ln["lang"] == "en" else "phonetic"
        cmd = [str(RHUBARB), "-q", "-f", "json", "-r", rec, "--extendedShapes", "X",
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
        if voice_db is not None:
            nxt = next((l["shotStart"] for l in lines if l["shotStart"] > ln["shotStart"]), None)
            frames = gate_cues(frames, ln, voice_db, nxt)
        res = {"line": ln["id"], "speaker": ln["speaker"], "text": ln["text"],
               "recognizer": rec, "gated": voice_db is not None, "cues": frames}
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
        for need in (REF_VIDEO, REF_AUDIO):
            if not need.exists():
                sys.exit(f"missing file: {need.relative_to(ROOT)}")
        mono = extract_audio()
        result.update(analyse_audio(mono, lines, rows))
        result["audioPresent"] = True
        run_rhubarb(mono, lines, result["curves"]["vocalsDb"])
        result["referenceCaptionEvents"] = measure_reference_captions()
        result["captions"] = time_captions(captions, result["referenceCaptionEvents"])
    # Who is on screen in each shot (rules in timing.md): learner alone = S4,
    # lazy alone = S2 (the pianist S5/S6 replaces lazy shots in the loud-piano
    # section, same frames), both = S7 (finale only).
    # The piano belongs to the finale (Hussein: "the piano appears at the end,
    # when he sings in Spanish"). Every lazy line is the lazy one on the couch
    # (S2), every learner line the learner (S4), line 23 is the finale (S7).
    if result.get("pianoSection"):
        result["pianoSection"].update(pianistShots=[], shots=[],
                                      note="measured only: the piano is shown in the finale")
    for sh in result["shots"]:
        sh["angle"] = {"learner": "S4", "both": "S7"}.get(sh["speaker"], "S2")

    # Schedules (frames the drawings change on), all from the audio.
    if result.get("audioPresent"):
        sched = {}
        presses = []
        for sh in result["shots"]:
            if sh["angle"] != "S7":
                continue
            # Finale (line 23): six shots cut on the beat.
            #   couch  : the lazy one puts his headphones on, hand on the ear cup,
            #            nods on the beat and starts to sing along
            #   wide   : ...and he is the pianist on stage: the mic drops from
            #            above to his mouth, he plays and sings
            #   medium : close on him singing into the mic
            #   hands  : his fingers on the keys, one finger at a time, on the notes
            #   hero   : he rises, jacket flung open, singing (one whole drawing)
            #   wide   : back wide; the mic calms on the last chord, hold
            strong = [o["frame"] for o in result["onsets"]
                      if o["strong"] and sh["start"] + 40 <= o["frame"] <= sh["end"] - 10]
            last_chord = strong[-1] if strong else sh["end"] - 20
            bs = [b for b in result["beats"] if b >= sh["start"] + 30]
            cuts = [bs[0], bs[3], bs[6], bs[8], bs[11]]
            views = ["couch", "wide", "medium", "hands", "hero", "wide"]
            bounds = [sh["start"]] + cuts + [sh["end"] + 1]
            shots_f = [{"from": bounds[i], "to": bounds[i + 1] - 1, "view": views[i]} for i in range(len(views))]
            sched["finale"] = {
                "shots": shots_f,
                "nods": [b for b in result["beats"] if shots_f[0]["from"] <= b <= shots_f[0]["to"]],
                "lastChord": last_chord,
            }
            for sub in shots_f:
                if sub["view"] != "hands":  # the playing is shown in the close-up only
                    continue
                last, k = -99, 0
                for o in result["onsets"]:
                    if sub["from"] <= o["frame"] <= sub["to"] - 2 and o["frame"] - last >= 5:
                        # a note: fingers down on the onset, a finger lifts 4 frames later
                        presses.append({"frame": o["frame"], "pose": "press", "chord": k % 4, "shot": sh["shot"]})
                        presses.append({"frame": o["frame"] + 4, "pose": "lift", "chord": k % 4, "shot": sh["shot"]})
                        last, k = o["frame"], k + 1
            mic_from = shots_f[1]["from"]
            sched["mic"] = {"dropStart": mic_from, "dropEnd": mic_from + 21,
                            "settleFrom": max(mic_from + 21, last_chord - 24), "settleTo": sh["end"] - 10}
        sched["pianistHands"] = presses
        result["schedules"] = sched

    ANALYSIS.write_text(json.dumps(result, ensure_ascii=False, indent=1, allow_nan=False))
    print(f"wrote {ANALYSIS.relative_to(ROOT)}: {len(shots)} shots, {len(captions)} captions, "
          f"{len(lines)} spoken lines, audio={'yes' if result['audioPresent'] else 'no'}")
    ps = result.get("pianoSection")
    if ps:
        a, b = ps["loudWindow"]
        print(f"loudest piano (2 s window): frames {a}–{b}; piano section = shots {ps['shots']} "
              f"(frames {ps['start']}–{ps['end']}), pianist in shots {ps['pianistShots']}")


if __name__ == "__main__":
    main()
