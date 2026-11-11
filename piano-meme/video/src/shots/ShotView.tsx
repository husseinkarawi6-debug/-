import React from "react";
import { Shot } from "../timeline";
import { Placeholder } from "./Placeholder";
import { LazyS2 } from "./LazyS2";
import { LearnerS4 } from "./LearnerS4";
import { PianistShot } from "./Pianist";
import { FinaleS7 } from "./Finale";

// Who is on screen comes from analysis.json (shot.angle), made by
// audio/analyze.py from timing.md: learner alone = S4, lazy alone = S2,
// pianist S5/S6 only in lazy shots of the loud-piano section, both = S7.
export const angleFor = (s: Shot) => s.angle ?? (s.speaker === "lazy" ? "S2" : s.speaker === "both" ? "S7" : "S4");

export const ShotView: React.FC<{ shot: Shot }> = ({ shot }) => {
  const angle = angleFor(shot);
  if (angle === "S2") return <LazyS2 shot={shot} />;
  if (angle === "S4") return <LearnerS4 shot={shot} />;
  if (angle === "S5" || angle === "S6" || angle === "S8") return <PianistShot shot={shot} angle={angle} />;
  if (angle === "S7") return <FinaleS7 shot={shot} />;
  return <Placeholder label={`${shot.shot} · ${angle}`} sub="" />;
};
