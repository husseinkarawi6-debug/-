import React from "react";
import { Plate } from "../plate/Plate";
import { useGlobalFrame, twos } from "../ink/frame";
import { mouthAt } from "../chars/mouth";
import { HangingMic } from "../ink/Mic";
import { FloatingNotes } from "../ink/Notes";
import { beatFrames, lineForShot, scheduleAt, schedules, Shot } from "../timeline";

// Line 23: both of them, small on plain paper (like the cats in the reference).
// The pose changes on the beat (schedules.dance); while nobody sings the
// mouths close (the closed_* drawings); the mic drops, then swings.
export const FinaleS7: React.FC<{ shot: Shot }> = ({ shot }) => {
  const gAbs = useGlobalFrame();
  const g = twos(gAbs);
  const cur = scheduleAt(schedules.dance, g);
  const pose = cur ? cur.pose : "master";
  const singing = mouthAt(lineForShot(shot.shot)?.id, g) !== "X";
  // the pose first, then (when nobody sings) its closed-mouth drawing on top
  const patches: Record<string, number> = {};
  if (pose !== "master") patches[pose] = 1;
  if (!singing) patches[`closed_${pose}`] = 1;

  const mic = schedules.mic ?? { dropStart: shot.start, dropEnd: shot.start + 21, settleFrom: shot.end - 34, settleTo: shot.end - 10 };
  const local = g - shot.start;
  const spawns = (schedules.dance ?? []).filter((d) => d.kind === "beat").map((d) => d.frame - shot.start);
  return (
    <>
      <Plate angle="S7c" camera={{ x: 680, y: 1208, zoom: 1.04 }} patches={patches} />
      <HangingMic
        frame={local}
        pivotX={250}
        cordLength={348}
        dropEnd={mic.dropEnd - shot.start}
        beatFrames={beatFrames}
        settleFrom={mic.settleFrom - shot.start}
        settleTo={mic.settleTo - shot.start}
      />
      <FloatingNotes frame={local} spawns={spawns.filter((s) => s < mic.settleFrom - shot.start)} area={{ x0: 560, x1: 700, y: 1000 }} />
    </>
  );
};
