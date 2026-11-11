import React from "react";
import { Shot } from "../timeline";
import { LazyS2 } from "./LazyS2";
import { LearnerS4 } from "./LearnerS4";
import { FinaleS7 } from "./Finale";

// Who is on screen comes from analysis.json (shot.angle), made by
// audio/analyze.py from timing.md: learner alone = S4, lazy alone = S2,
// line 23 = the finale (the piano, S7).
export const angleFor = (s: Shot) => s.angle ?? (s.speaker === "lazy" ? "S2" : s.speaker === "both" ? "S7" : "S4");

export const ShotView: React.FC<{ shot: Shot }> = ({ shot }) => {
  const angle = angleFor(shot);
  if (angle === "S7") return <FinaleS7 shot={shot} />;
  if (angle === "S4") return <LearnerS4 shot={shot} />;
  return <LazyS2 shot={shot} />;
};
