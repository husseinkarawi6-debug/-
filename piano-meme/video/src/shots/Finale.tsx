import React from "react";
import { Plate } from "../plate/Plate";
import { useGlobalFrame, twos } from "../ink/frame";
import { mouthAt } from "../chars/mouth";
import { HangingMic } from "../ink/Mic";
import { beatFrames, lineForShot, scheduleAt, schedules, Shot } from "../timeline";

// Line 23, five shots cut on the beat (schedules.finale, from the audio):
//  wide   : the pianist plays, the mic drops from above to his mouth, he sings
//  medium : close on him singing into the mic; on a beat he pulls his jacket open
//  couch  : the lazy one on the couch, headphones on, hand on the ear cup,
//           nodding on every beat, singing along
//  hands  : his fingers on the keys, down on every note
//  wide   : back wide; the mic calms down on the last chord, hold
// The mic keeps one clock (frames since the line started), so its swing
// carries on across the cuts.

const WIDE_CAM = { x: 680, y: 1150, zoom: 1.12 };
const MEDIUM_CAM = { x: 794, y: 1208, zoom: 1.2 }; // him on the left, room for the caption on the right
const HANDS_CAM = { x: 680, y: 1208, zoom: 1.04 };
const COUCH_CAM = { x: 837, y: 1062, zoom: 1.3 }; // his face lower-left, clear of the caption block

// where the mic hangs in each view (screen pixels): in front of his mouth
const MIC = {
  wide: { pivotX: 405, ball: 862, scale: 0.42 },
  medium: { pivotX: 460, ball: 722, scale: 0.85 },
};

export const FinaleS7: React.FC<{ shot: Shot }> = ({ shot }) => {
  const exact = useGlobalFrame();
  const g = twos(exact);
  const fin = schedules.finale;
  // cuts on the exact frame (the drawings inside each shot stay on twos)
  const view = fin?.shots.find((s) => exact >= s.from && exact <= s.to)?.view ?? "wide";
  const sung = mouthAt(lineForShot(shot.shot)?.id, g);
  const mouth: Record<string, number> = sung !== "X" ? { [`mouth_${sung}`]: 1 } : {};

  if (view === "couch") {
    const down = (fin?.nods ?? []).some((b) => g >= twos(b) && g < twos(b) + 6); // head down on the beat
    const patches: Record<string, number> = { hp_base: 1 };
    if (down) {
      patches.hp_down = 1;
      if (sung !== "X") patches.hp_down_open = 1;
    } else Object.assign(patches, mouth);
    return <Plate angle="S2" camera={COUCH_CAM} patches={patches} />;
  }

  if (view === "hands") {
    const list = (schedules.pianistHands ?? []).filter((h) => h.shot === shot.shot);
    const cur = scheduleAt(list, g);
    const p = cur ? (cur.pose === "press" ? (cur.chord === 0 ? "press_1" : "press_2") : "up") : null;
    return <Plate angle="S6" camera={HANDS_CAM} patches={p ? { [p]: 1 } : {}} />;
  }

  const mic = schedules.mic ?? { dropStart: shot.start, dropEnd: shot.start + 21, settleFrom: shot.end - 34, settleTo: shot.end - 10 };
  const where = MIC[view === "medium" ? "medium" : "wide"];
  const patches: Record<string, number> =
    view === "medium" && fin && g >= twos(fin.jacket) ? { jacket: 1 } : { ...mouth };
  return (
    <>
      <Plate angle={view === "medium" ? "S8" : "S5"} camera={view === "medium" ? MEDIUM_CAM : WIDE_CAM} patches={patches} />
      <HangingMic
        frame={g - shot.start}
        pivotX={where.pivotX}
        cordLength={where.ball - 232 * where.scale}
        dropEnd={mic.dropEnd - shot.start}
        beatFrames={beatFrames}
        settleFrom={mic.settleFrom - shot.start}
        settleTo={mic.settleTo - shot.start}
        swingDeg={2.5}
        scale={where.scale}
      />
    </>
  );
};
