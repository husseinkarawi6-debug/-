import React from "react";
import { random } from "remotion";
import { Plate } from "../plate/Plate";
import { useGlobalFrame, twos } from "../ink/frame";
import { mouthAt } from "../chars/mouth";
import { lineForShot, Shot } from "../timeline";

// S2: the lazy one, close. Same framing in every shot (the repetition is the joke).
export const S2_CAMERA = { x: 680, y: 1196, zoom: 1.045 };

/** Which patches are on at global frame g (already on twos). */
export const lazyPatches = (shot: Shot, g: number): Record<string, number> => {
  const p: Record<string, number> = {};
  const line = shot.speaker === "lazy" ? lineForShot(shot.shot) : undefined;

  // mouth from Rhubarb (X = the master's closed mouth)
  const shape = mouthAt(line?.id, g);
  if (shape !== "X") p[`mouth_${shape}`] = 1;

  // eyes
  let eyesBusy = false;
  if (shot.shot === 2) {
    // stops playing; only his eyes slide toward the learner (to the right)
    if (g >= 70) p.eyes_right = 1;
    else if (g >= 66) p.eyes_right = 0.5;
    eyesBusy = true;
  }
  if (shot.shot === 4) {
    // closes his eyes like a sigh, then back to the screen; one quick blink later
    if (g < 183 || (g >= 236 && g < 240)) p.eyes_closed = 1;
    eyesBusy = true;
  }
  if (shot.shot === 22 && g >= 846) {
    p.brow_raise = 1;
    eyesBusy = true;
  }
  if (!eyesBusy) {
    // one seeded blink per shot at most, never in the first 6 frames
    const len = shot.end - shot.start + 1;
    for (let k = 0; k < 3; k++) {
      if (random(`blink-on-${shot.shot}-${k}`) > 0.55) continue;
      const at = shot.start + 6 + Math.floor(random(`blink-at-${shot.shot}-${k}`) * Math.max(1, len - 12));
      if (g >= twos(at) && g < twos(at) + 4) p.eyes_closed = 1;
      break; // one blink per shot at most (two in under a second read as sleepy)
    }
  }

  // thumbs: little taps on a seeded random rhythm (not while he has stopped playing)
  const playing = !(shot.shot === 2 || (shot.shot === 22 && g >= 836));
  if (playing) {
    const block = Math.floor(g / 6);
    const r = random(`thumb-${block}`);
    if (r < 0.22) p.thumbs_1 = 1;
    else if (r < 0.4) p.thumbs_2 = 1;
  }
  return p;
};

// Fixed framing: no camera move, no sway, no whole-picture breathing.
export const LazyS2: React.FC<{ shot: Shot }> = ({ shot }) => {
  const g = twos(useGlobalFrame());
  return <Plate angle="S2" camera={S2_CAMERA} patches={lazyPatches(shot, g)} />;
};
