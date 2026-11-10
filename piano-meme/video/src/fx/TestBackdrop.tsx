import React from "react";
import { AbsoluteFill } from "remotion";
import { C } from "../palette";

/** Plain code-made backdrop for the rig test only (the painted backgrounds come in the next stage). */
export const TestBackdrop: React.FC<{ tone: "red" | "blue" }> = ({ tone }) => (
  <AbsoluteFill style={{ backgroundColor: C.black }}>
    <AbsoluteFill
      style={{
        background:
          tone === "red"
            ? `radial-gradient(ellipse 70% 45% at 22% 38%, ${C.red}66 0%, transparent 70%), radial-gradient(ellipse 60% 50% at 90% 55%, ${C.blue}33 0%, transparent 70%), linear-gradient(${C.navy}, ${C.black})`
            : `radial-gradient(ellipse 75% 50% at 72% 34%, ${C.blue}55 0%, transparent 70%), radial-gradient(ellipse 50% 40% at 8% 60%, ${C.red}2e 0%, transparent 70%), linear-gradient(${C.navy}, ${C.black})`,
      }}
    />
  </AbsoluteFill>
);
