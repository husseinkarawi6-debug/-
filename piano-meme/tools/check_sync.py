#!/usr/bin/env python3
"""Sync check: everything that moves with the sound must land within 1 frame.

Checks (from audio/analysis.json and audio/mouth/*.json):
  1. cuts are exactly the timing.md frames
  2. every caption tied to a voice starts within 1 frame of that voice
  3. every mouth opening starts within 1 frame of the voice getting loud,
     and the mouth is closed (X) when the voice is quiet
  4. pianist hand changes land on piano onsets      (when the schedule exists)
  5. dance pose changes land on beats                (when the schedule exists)

Run from piano-meme:  python3 tools/check_sync.py
Exit code 0 = all good, 1 = something is off (the lines marked ✗).
"""
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
A = json.loads((ROOT / "audio/analysis.json").read_text())
TOL = 1
bad = 0


def report(ok: bool, msg: str):
    global bad
    if not ok:
        bad += 1
    print(("  ✓ " if ok else "  ✗ ") + msg)


# 1. cuts
print("1. cuts = timing.md")
md = (ROOT / "refs/reference/timing.md").read_text(encoding="utf-8")
table = []
for line in md.splitlines():
    cells = [c.strip() for c in line.strip().strip("|").split("|")]
    if len(cells) >= 5 and cells[0].isdigit():
        fr = next((c for c in cells[1:] if re.fullmatch(r"\d+\s*[–-]\s*\d+", c)), None)
        if fr:
            table.append(tuple(int(x) for x in re.split(r"\s*[–-]\s*", fr)))
shots = [(s["start"], s["end"]) for s in A["shots"]]
report(table == shots, f"{len(shots)} shots match the table" if table == shots else f"shots differ: {shots} vs {table}")

if not A.get("audioPresent"):
    print("no audio analysed yet (run audio/analyze.py)")
    sys.exit(1 if bad else 0)

voice = A["curves"]["voiceDb"]
mouths = {p.stem: json.loads(p.read_text()) for p in sorted((ROOT / "audio/mouth").glob("L*.json"))}


def onsets(cues):
    out, prev = [], "X"
    for c in cues:
        if prev == "X" and c["shape"] != "X":
            out.append(c["start"])
        prev = c["shape"]
    return out


# 2. captions
print("2. captions start with their voice")
for c in A["captions"]:
    lid = c.get("line")
    if not lid or c.get("timing", "").startswith("reference"):
        print(f"  · {c['start']:4d} {c['text'][:34]!r}: silent change, reference frame {c.get('refStart')}")
        continue
    ons = onsets(mouths[lid]["cues"])
    d = min((abs(c["start"] - o) for o in ons), default=999)
    report(d <= TOL, f"{c['start']:4d} {c['text'][:34]!r}: {d} frame(s) from the voice of {lid}")

# 3. mouths
print("3. mouths open only with their own voice")
sys.path.insert(0, str(ROOT / "audio"))
from analyze import voice_active  # the same rule the mouths were made with

vocals = A["curves"]["vocalsDb"]
for lid, m in mouths.items():
    ln = next(l for l in A["lines"] if l["id"] == lid)
    nxt = next((l["shotStart"] for l in A["lines"] if l["shotStart"] > ln["shotStart"]), None)
    on, _ = voice_active(ln, vocals, nxt)
    a = ln["shotStart"]
    shape_at = {}
    for cue in m["cues"]:
        for f in range(cue["start"], cue["end"] + 1):
            shape_at[f] = cue["shape"]
    # voice starts -> mouth open within 1 frame
    starts = [a + i for i in range(len(on)) if on[i] and (i == 0 or not on[i - 1])]
    late = [f for f in starts if all(shape_at.get(k, "X") == "X" for k in (f - 1, f, f + 1))]
    # mouth open with no voice (more than 1 frame away from any voice)
    silent_open = [a + i for i in range(len(on)) if shape_at.get(a + i, "X") != "X"
                   and not any(on[j] for j in range(max(0, i - 1), min(len(on), i + 2)))]
    report(not late and not silent_open,
           f"{lid}: {len(starts)} voice starts; mouth late: {late or 'none'}; open without voice: {silent_open[:8] or 'none'}")

# 4/5. schedules
sched = A.get("schedules", {})
print("4. pianist hands on piano onsets")
if "pianistHands" in sched:
    onset_frames = [o["frame"] for o in A["onsets"]]
    for h in sched["pianistHands"]:
        d = min(abs(h["frame"] - o) for o in onset_frames)
        report(d <= TOL, f"hand change {h['frame']}: {d} frame(s) from an onset")
else:
    print("  · not built yet")
print("5. dance on the beat")
if "dance" in sched:
    for p in sched["dance"]:
        d = min(abs(p["frame"] - b) for b in A["beats"])
        report(d <= TOL, f"pose change {p['frame']}: {d} frame(s) from a beat")
else:
    print("  · not built yet")

print("\nALL GOOD" if bad == 0 else f"\n{bad} problem(s)")
sys.exit(1 if bad else 0)
