import React from "react";
import { Easing, interpolate, random } from "remotion";
import { Plate } from "../plate/Plate";
import { useGlobalFrame, twos } from "../ink/frame";
import { firstOpening, lastOpening, mouthAt } from "../chars/mouth";
import { breathAmount } from "../chars/breath";
import { lineForShot, Shot } from "../timeline";

// S4: the learner alone, close. He always faces LEFT (toward the couch).
const BASE = { x: 680, y: 1110, zoom: 1.04 }; // head and hands clear of the caption
const CHEST = { x: 660, y: 1250 };

type Beat = { from: number; pose?: string; eyes?: string }; // from = frame inside the shot

// What his body does in each of his shots (the learner's story, timing.md).
const ACTING: Record<number, Beat[]> = {
  // 1: puzzled, looks at the book and scratches his head, then looks up at the lazy one
  1: [
    { from: 0, pose: "scratch_1", eyes: "eyes_down" },
    { from: 4, pose: "scratch_2", eyes: "eyes_down" },
    { from: 8, pose: "scratch_3", eyes: "eyes_down" },
    { from: 12, pose: "scratch_2", eyes: "eyes_down" },
    { from: 16, pose: "scratch_1", eyes: "eyes_down" },
    { from: 20, pose: "scratch_3", eyes: "eyes_down" },
    { from: 24 }, // hand back on the book, eyes up to the lazy one
  ],
  // 3: finger on a word, then turns the book toward the lazy one while asking
  3: [
    { from: 0, pose: "point_1", eyes: "eyes_down" },
    { from: 24, pose: "point_2" },
  ],
  // 5: writes "Mañana" in the book, then points at the next word and asks
  5: [
    { from: 0, pose: "write_1", eyes: "eyes_down" },
    { from: 6, pose: "point_3" },
  ],
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
    // one seeded blink in shots long enough for it
    const len = shot.end - shot.start + 1;
    const at = shot.start + 8 + Math.floor(random(`lblink-${shot.shot}`) * Math.max(1, len - 16));
    if (len > 24 && g >= twos(at) && g < twos(at) + 4) patches.eyes_closed = 1;
  }

  // (the 0.97 -> 1.01 -> 1 squash comes back once he is his own layer:
  //  on the flat drawing it squashed the room too and read as a camera bump)
  // gentle sway, about ±0.5 % of the width
  const sway = Math.sin((g / 30) * Math.PI * 0.9 + shot.shot) * 0.005 * 1360;
  // shot 1: slow push-in toward him
  const push = shot.shot === 1 ? interpolate(local, [0, 50], [0, 1], { extrapolateRight: "clamp", easing: Easing.inOut(Easing.sin) }) : 0;
  const camera = {
    x: BASE.x - sway + push * (600 - BASE.x),
    y: BASE.y + push * (1000 - BASE.y),
    zoom: BASE.zoom + push * 0.14,
  };
  const breath = breathAmount(g, firstOpening(line?.id), lastOpening(line?.id), shot.shot);
  return (
    <Plate angle="S4" camera={camera} patches={patches} breath={{ amount: breath, ...CHEST }} />
  );
};
