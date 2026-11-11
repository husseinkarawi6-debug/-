import React from "react";
import { Plate } from "../plate/Plate";
import { useGlobalFrame, twos } from "../ink/frame";
import { mouthAt } from "../chars/mouth";
import { lineForShot, scheduleAt, schedules, Shot } from "../timeline";

// The loud-piano section: the lazy one, in a suit, at the grand piano.
// Fixed framing (no camera moves).

/** S5: wide, on stage. He says the lazy one's word (lips with the voice). */
export const PianistS5: React.FC<{ shot: Shot }> = ({ shot }) => {
  const g = twos(useGlobalFrame());
  const shape = mouthAt(lineForShot(shot.shot)?.id, g);
  const patches: Record<string, number> = shape !== "X" ? { [`mouth_${shape}`]: 1 } : {};
  return <Plate angle="S5" camera={{ x: 680, y: 1150, zoom: 1.12 }} patches={patches} />;
};

/** S6: his hands; a new hand drawing on every piano note (schedules.pianistHands). */
export const PianistS6: React.FC = () => {
  const g = twos(useGlobalFrame());
  const cur = scheduleAt(schedules.pianistHands, g);
  const patches: Record<string, number> = cur ? { [cur.pose]: 1 } : {};
  return <Plate angle="S6" camera={{ x: 680, y: 1208, zoom: 1.04 }} patches={patches} />;
};
