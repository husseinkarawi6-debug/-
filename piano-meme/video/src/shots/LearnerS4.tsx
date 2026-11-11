import React from "react";
import { random } from "remotion";
import { Plate } from "../plate/Plate";
import { useGlobalFrame, twos } from "../ink/frame";
import { mouthAt } from "../chars/mouth";
import { lineForShot, Shot } from "../timeline";

// S4: the learner alone, close, distracted face (master S4b). The framing is
// fixed: no camera move, no sway. Everything that moves is a drawing:
// mouth, eyes, blink, the head scratch. The book is always the same drawing.
const PLATE = "S4b";
const CAMERA = { x: 680, y: 1110, zoom: 1.04 };

type Beat = { from: number; pose?: string; eyes?: string }; // from = frame inside the shot

// The learner's story (timing.md), told with drawings only.
const ACTING: Record<number, Beat[]> = {
  // 1: looks into the book and scratches his head, then looks up at the lazy one
  1: [
    { from: 0, pose: "scratch_A", eyes: "eyes_down" },
    { from: 4, pose: "scratch_B", eyes: "eyes_down" },
    { from: 8, pose: "scratch_A", eyes: "eyes_down" },
    { from: 12, pose: "scratch_B", eyes: "eyes_down" },
    { from: 16, pose: "scratch_A", eyes: "eyes_down" },
    { from: 20, pose: "scratch_B", eyes: "eyes_down" },
    { from: 24 }, // hand back on the book, eyes up to the lazy one
  ],
  // 3: looks for the word in the book, then up at the lazy one to ask
  3: [{ from: 0, eyes: "eyes_down" }, { from: 20 }],
  // 5: reads the new word in the book, then looks up and asks the next one
  5: [{ from: 0, eyes: "eyes_down" }, { from: 6 }],
};

const beatAt = (shot: Shot, local: number): Beat => {
  const beats = ACTING[shot.shot];
  if (!beats) return { from: 0 };
  let cur = beats[0];
  for (const b of beats) if (local >= b.from) cur = b;
  return cur;
};

export const LearnerS4: React.FC<{ shot: Shot }> = ({ shot }) => {
  const g = twos(useGlobalFrame());
  const local = g - shot.start;
  const line = lineForShot(shot.shot);
  const beat = beatAt(shot, local);

  const patches: Record<string, number> = {};
  if (beat.pose) patches[beat.pose] = 1;
  const shape = mouthAt(line?.id, g);
  if (shape !== "X") patches[`mouth_${shape}`] = 1;
  if (beat.eyes) patches[beat.eyes] = 1;
  else {
    const len = shot.end - shot.start + 1;
    const at = shot.start + 8 + Math.floor(random(`lblink-${shot.shot}`) * Math.max(1, len - 16));
    if (len > 24 && g >= twos(at) && g < twos(at) + 4) patches.eyes_closed = 1;
  }
  return <Plate angle={PLATE} camera={CAMERA} patches={patches} />;
};
