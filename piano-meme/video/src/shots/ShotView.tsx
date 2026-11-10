import React from "react";
import { useCurrentFrame } from "remotion";
import { HangingMic } from "../ink/Mic";
import { FloatingNotes } from "../ink/Notes";
import { twos } from "../ink/frame";
import { beatFrames, beats, Shot } from "../timeline";
import { Placeholder } from "./Placeholder";

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

export const angleFor = (s: Shot) => ANGLE[s.shot] ?? (s.speaker === "lazy" ? "S2" : s.shot % 4 === 1 ? "S4" : "S3");

export const ShotView: React.FC<{ shot: Shot }> = ({ shot }) => {
  const angle = angleFor(shot);
  return (
    <>
      <Placeholder label={`${shot.shot} · ${angle}`} sub={NAMES[angle]} />
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
