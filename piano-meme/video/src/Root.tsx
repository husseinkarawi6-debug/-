import React from "react";
import { Composition } from "remotion";
import { FPS, H, W } from "./palette";
import { RigTest } from "./RigTest";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition id="RigTest" component={RigTest} durationInFrames={180} fps={FPS} width={W} height={H} />
    </>
  );
};
