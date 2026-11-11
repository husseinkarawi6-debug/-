import React from "react";
import { Composition } from "remotion";
import { defaultInkProps, FPS, H, inkSchema, TOTAL, W } from "./config";
import { PianoMeme } from "./PianoMeme";
import { LookTest } from "./LookTest";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="PianoMeme"
        component={PianoMeme}
        durationInFrames={TOTAL}
        fps={FPS}
        width={W}
        height={H}
        schema={inkSchema}
        defaultProps={defaultInkProps}
      />
      <Composition
        id="LookTest"
        component={LookTest}
        durationInFrames={120}
        fps={FPS}
        width={W}
        height={H}
        schema={inkSchema}
        defaultProps={defaultInkProps}
      />
    </>
  );
};
