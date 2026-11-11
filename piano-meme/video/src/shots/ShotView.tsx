import React from "react";
import { useCurrentFrame } from "remotion";
import { HangingMic } from "../ink/Mic";
import { FloatingNotes } from "../ink/Notes";
import { twos } from "../ink/frame";
import { beatFrames, beats, Shot } from "../timeline";
import { Placeholder } from "./Placeholder";
import { LazyS2 } from "./LazyS2";
import { PlateShot } from "./PlateShot";
import { analysis } from "../timeline";

// Camera angle per shot. Shots 5–20 alternate learner / lazy; the loud-piano
// shots (S5/S6) get filled in after audio/analyze.py finds the loud section.
const ANGLE: Record<number, string> = { 1: "S1", 2: "S2", 3: "S3", 4: "S2", 21: "S4", 22: "S2", 23: "S7" };
const NAMES: Record<string, string> = {
  S1: "wide living room",
  S2: "lazy one, close",
  S3: "learner, over the shoulder",
  S4: "learner, close",
  S5: "pianist, wide stage",
  S6: "pianist's hands",
  S7: "finale, both",
};

// The loud-piano section (from analysis.json): its lazy shots become the pianist.
const PIANO = analysis.pianoSection;
const pianistAngle = (s: Shot) => {
  if (!PIANO || !PIANO.pianistShots.includes(s.shot)) return null;
  return PIANO.pianistShots.indexOf(s.shot) === 0 ? "S5" : "S6";
};

export const angleFor = (s: Shot) =>
  pianistAngle(s) ?? ANGLE[s.shot] ?? (s.speaker === "lazy" ? "S2" : s.shot % 4 === 1 ? "S4" : "S3");

export const ShotView: React.FC<{ shot: Shot; forceAngle?: string }> = ({ shot, forceAngle }) => {
  const angle = forceAngle ?? angleFor(shot);
  const len = shot.end - shot.start + 1;
  let body: React.ReactNode;
  if (angle === "S2") body = <LazyS2 shot={shot} />;
  else if (angle === "S1")
    body = <PlateShot angle="S1" length={len} from={{ x: 680, y: 1180, zoom: 1.04 }} to={{ x: 820, y: 900, zoom: 1.22 }} />;
  else if (angle === "S5")
    body = <PlateShot angle="S5" length={len} from={{ x: 900, y: 1300, zoom: 1.25 }} to={{ x: 480, y: 1000, zoom: 1.12 }} />;
  else body = <Placeholder label={`${shot.shot} · ${angle}`} sub={NAMES[angle]} />;
  return (
    <>
      {body}
      {angle === "S7" ? <FinaleOverlay shot={shot} /> : null}
    </>
  );
};

const FinaleOverlay: React.FC<{ shot: Shot }> = ({ shot }) => {
  const f = twos(useCurrentFrame());
  const len = shot.end - shot.start + 1;
  const localBeats = beats.filter((b) => b >= shot.start + 22 && b < shot.end - 12).map((b) => b - shot.start);
  const spawns = localBeats.length ? localBeats : Array.from({ length: Math.floor((len - 40) / beatFrames) }, (_, i) => 22 + i * beatFrames);
  return (
    <>
      <HangingMic
        frame={f}
        pivotX={540}
        cordLength={640}
        dropEnd={880 - 859}
        beatFrames={beatFrames}
        settleFrom={len - 34}
        settleTo={len - 10}
      />
      <FloatingNotes frame={f} spawns={spawns.filter((s) => s < len - 20)} area={{ x0: 200, x1: 880, y: 1150 }} />
    </>
  );
};
