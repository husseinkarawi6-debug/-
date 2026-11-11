import React from "react";
import { useCurrentFrame } from "remotion";
import { HangingMic } from "../ink/Mic";
import { FloatingNotes } from "../ink/Notes";
import { twos } from "../ink/frame";
import { beatFrames, beats, Shot } from "../timeline";
import { Placeholder } from "./Placeholder";
import { LazyS2 } from "./LazyS2";
import { LearnerS4 } from "./LearnerS4";
import { PlateShot } from "./PlateShot";

// Camera angle per shot. Shots 5–20 alternate learner / lazy; the loud-piano
// shots (S5/S6) get filled in after audio/analyze.py finds the loud section.
const ANGLE: Record<number, string> = { 1: "S4", 2: "S2", 3: "S4", 4: "S2", 21: "S4", 22: "S2", 23: "S7" };
const NAMES: Record<string, string> = {
  S1: "wide living room",
  S2: "lazy one, close",
  S3: "learner, over the shoulder",
  S4: "learner, close",
  S5: "pianist, wide stage",
  S6: "pianist's hands",
  S7: "finale, both",
};

// Who is on screen comes from analysis.json (shot.angle), made by
// audio/analyze.py from timing.md: learner alone = S4, lazy alone = S2,
// pianist S5/S6 only in lazy shots of the loud-piano section, both = S7.
export const angleFor = (s: Shot) => s.angle ?? ANGLE[s.shot] ?? (s.speaker === "lazy" ? "S2" : "S4");

export const ShotView: React.FC<{ shot: Shot }> = ({ shot }) => {
  const angle = angleFor(shot);
  const len = shot.end - shot.start + 1;
  let body: React.ReactNode;
  if (angle === "S2") body = <LazyS2 shot={shot} />;
  else if (angle === "S4") body = <LearnerS4 shot={shot} />;
  else if (angle === "S5")
    body = <PlateShot angle="S5" length={len} from={{ x: 680, y: 1150, zoom: 1.12 }} to={{ x: 680, y: 1150, zoom: 1.12 }} />; // fixed
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
