import React from "react";
import { Plate } from "../plate/Plate";
import { useGlobalFrame, twos } from "../ink/frame";
import { mouthAt } from "../chars/mouth";
import { lineForShot, scheduleAt, schedules, Shot } from "../timeline";

// The piano part (lazy shots of lines 10–20): the lazy one in a suit at the
// grand piano. Fixed framing. Fingers go DOWN on every piano note
// (schedules.pianistHands, from the audio onsets) and lift 4 frames later.

const handPatch = (shot: Shot, g: number, angle: string): string | null => {
  const list = (schedules.pianistHands ?? []).filter((h) => h.shot === shot.shot);
  const cur = scheduleAt(list, g);
  if (!cur) return null;
  if (angle === "S6") return cur.pose === "press" ? (cur.chord === 0 ? "press_1" : "press_2") : "up";
  return cur.pose; // "press" | "lift"
};

const mouthPatch = (shot: Shot, g: number): Record<string, number> => {
  const shape = mouthAt(lineForShot(shot.shot)?.id, g);
  return shape !== "X" ? { [`mouth_${shape}`]: 1 } : {};
};

const CAM: Record<string, { x: number; y: number; zoom: number }> = {
  S5: { x: 680, y: 1150, zoom: 1.12 },
  S8: { x: 680, y: 1208, zoom: 1.04 },
  S6: { x: 680, y: 1208, zoom: 1.04 },
};

export const PianistShot: React.FC<{ shot: Shot; angle: "S5" | "S6" | "S8" }> = ({ shot, angle }) => {
  const g = twos(useGlobalFrame());
  const patches: Record<string, number> = angle === "S6" ? {} : mouthPatch(shot, g);
  const hand = handPatch(shot, g, angle);
  if (hand) patches[hand] = 1;
  return <Plate angle={angle} camera={CAM[angle]} patches={patches} />;
};
