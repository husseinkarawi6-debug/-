import React from "react";
import { Plate } from "../plate/Plate";
import { useGlobalFrame, twos } from "../ink/frame";
import { mouthAt } from "../chars/mouth";
import { HangingMic } from "../ink/Mic";
import { beatFrames, lineForShot, scheduleAt, schedules, Shot } from "../timeline";

// Line 23: the piano arrives when the whole sentence is sung in Spanish.
// Six shots cut on the beat (schedules.finale, from the audio):
//  couch  : the lazy one, headphones on, hand on the ear cup, nods on the beat
//           and starts to sing along
//  wide   : he is the pianist on stage; the mic drops from above to his mouth
//  medium : close on him singing into the mic
//  hands  : his fingers on the keys, one finger at a time, on the notes
//  hero   : he rises, jacket flung open, singing (one whole drawing, no patch)
//  wide   : back wide; the mic calms on the last chord, hold
// Fixed framing in every shot. The mic keeps one clock across the cuts.

const CAM = {
  couch: { x: 837, y: 1062, zoom: 1.3 }, // face lower-left, clear of the caption block
  wide: { x: 680, y: 1150, zoom: 1.12 },
  medium: { x: 794, y: 1208, zoom: 1.2 },
  hands: { x: 680, y: 1208, zoom: 1.04 },
  hero: { x: 706, y: 1162, zoom: 1.04 },
};
const ANGLE: Record<string, string> = { couch: "S2", wide: "S5", medium: "S8", hands: "S6", hero: "S9" };

// where the mic hangs in each view (screen pixels): in front of his mouth
const MIC: Record<string, { pivotX: number; ball: number; scale: number }> = {
  wide: { pivotX: 405, ball: 862, scale: 0.42 },
  medium: { pivotX: 460, ball: 722, scale: 0.85 },
  hero: { pivotX: 388, ball: 462, scale: 0.6 },
};

export const FinaleS7: React.FC<{ shot: Shot }> = ({ shot }) => {
  const exact = useGlobalFrame();
  const g = twos(exact);
  const fin = schedules.finale;
  // cuts on the exact frame (the drawings inside each shot stay on twos)
  const sub = fin?.shots.find((s) => exact >= s.from && exact <= s.to) ?? { from: shot.start, to: shot.end, view: "wide" };
  const view = sub.view as keyof typeof CAM;
  const sung = mouthAt(lineForShot(shot.shot)?.id, g);
  const patches: Record<string, number> = {};

  if (view === "couch") {
    const down = (fin?.nods ?? []).some((b) => g >= twos(b) && g < twos(b) + 6); // head down on the beat
    patches.hp_base = 1;
    if (down) {
      patches.hp_down = 1;
      if (sung !== "X") patches.hp_down_open = 1;
    } else if (sung !== "X") patches[`mouth_${sung}`] = 1;
  } else if (view === "hero") {
    if (sung === "X") patches.closed = 1; // the drawing sings; closed between phrases
  } else {
    // the note of this shot in force: fingers down on the onset, lifted after
    const notes = (schedules.pianistHands ?? []).filter((h) => h.frame >= sub.from && h.frame <= sub.to + 4);
    const cur = scheduleAt(notes, g);
    if (view === "hands") {
      // master = all fingers down; between notes one finger group lifts
      if (cur && cur.pose === "lift") patches[`lift_${"abcd"[cur.chord % 4]}`] = 1;
    } else if (sung !== "X") {
      // wide and medium: he sings into the mic; the hands stay one clean drawing
      patches[`mouth_${sung}`] = 1;
    }
  }

  const mic = schedules.mic ?? { dropStart: shot.start, dropEnd: shot.start + 21, settleFrom: shot.end - 34, settleTo: shot.end - 10 };
  const where = MIC[view];
  return (
    <>
      <Plate angle={ANGLE[view]} camera={CAM[view]} patches={patches} />
      {where && g >= mic.dropStart ? (
        <HangingMic
          frame={g - mic.dropStart}
          pivotX={where.pivotX}
          cordLength={where.ball - 232 * where.scale}
          dropEnd={mic.dropEnd - mic.dropStart}
          beatFrames={beatFrames}
          settleFrom={mic.settleFrom - mic.dropStart}
          settleTo={mic.settleTo - mic.dropStart}
          swingDeg={2.5}
          scale={where.scale}
        />
      ) : null}
    </>
  );
};
