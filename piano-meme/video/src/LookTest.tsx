import React from "react";
import { Sequence } from "remotion";
import { InkProps } from "./config";
import { PianoMeme } from "./PianoMeme";

// 4 s look test: the film from frame 165 (shot 4, "Mañana"), always on S2,
// with the real soundtrack, mouth, blinks, thumbs, boil and paper.
export const LOOK_FROM = 165;
export const LookTest: React.FC<InkProps> = (props) => (
  <Sequence from={-LOOK_FROM}>
    <PianoMeme {...props} forceAngle="S2" />
  </Sequence>
);
