import React from "react";
import { AbsoluteFill, Sequence, useCurrentFrame } from "remotion";
import { Hussein, PianoNote } from "./characters/Hussein";
import { TestBackdrop } from "./fx/TestBackdrop";
import { Learner, LearnerFace, LearnerMouth, mixPose, POSES } from "./characters/Learner";
import { interpolate, spring } from "remotion";
import { FPS } from "./palette";

// six notes, D minor, one finger each
const TEST_NOTES: PianoNote[] = [
  { frame: 14, midi: 62, dur: 8, hand: "R", stress: false },
  { frame: 24, midi: 65, dur: 8, hand: "R", stress: true },
  { frame: 34, midi: 64, dur: 8, hand: "R" },
  { frame: 46, midi: 69, dur: 8, hand: "R", stress: true },
  { frame: 56, midi: 67, dur: 6, hand: "R" },
  { frame: 64, midi: 62, dur: 14, hand: "R" },
  { frame: 14, midi: 38, dur: 30, hand: "L", finger: 4 },
  { frame: 46, midi: 45, dur: 30, hand: "L", finger: 0 },
];

const HusseinTest: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill>
      <TestBackdrop tone="red" />
      <Hussein frame={frame} notes={TEST_NOTES} acting={{ blinks: [6], browFrom: 74 }} />
    </AbsoluteFill>
  );
};

// six "syllables": the mouth opens on each one
const TALK = [8, 15, 22, 30, 38, 47];

const LearnerTest: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  // sway like an upside-down pendulum; the coat hem and the hair arrive a moment later
  const sway = (f: number) => 3.2 * Math.sin((f / FPS) * Math.PI * 2 * 0.9);
  const open = spring({ frame: frame - 26, fps: FPS, config: { damping: 11, stiffness: 120, mass: 0.8 } });
  const proud = spring({ frame: frame - 62, fps: FPS, config: { damping: 12, stiffness: 130 } });
  let pose = mixPose(POSES.rest, POSES.open, open);
  pose = mixPose(pose, POSES.proud, proud);
  pose = { ...pose, lean: pose.lean + sway(frame), headTilt: pose.headTilt - sway(frame) * 0.7 };
  const hemLag = (sway(frame - 4) - sway(frame)) * 9;
  const hairLag = (sway(frame - 3) - sway(frame)) * 5;
  const squashY = interpolate(frame, [0, 3, 6], [0.94, 1.03, 1], { extrapolateRight: "clamp" });
  let mouth: LearnerMouth = "closed";
  TALK.forEach((f, i) => {
    if (frame >= f && frame < f + 4) mouth = i % 3 === 2 ? "oh" : "ah";
  });
  const face: LearnerFace = frame >= 66 ? "proud" : "base";
  const blink = frame >= 54 && frame < 57;
  return (
    <AbsoluteFill>
      <TestBackdrop tone="blue" />
      <Learner pose={pose} face={face} mouth={mouth} blink={blink} squashY={squashY} hemLag={hemLag} hairLag={hairLag} breath={Math.sin(t * Math.PI * 2 * 0.3)} />
    </AbsoluteFill>
  );
};

export const RigTest: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: "#07080C" }}>
    <Sequence durationInFrames={90}>
      <HusseinTest />
    </Sequence>
    <Sequence from={90} durationInFrames={90}>
      <LearnerTest />
    </Sequence>
  </AbsoluteFill>
);
