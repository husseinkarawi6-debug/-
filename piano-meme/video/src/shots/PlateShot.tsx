import React from "react";
import { Easing, interpolate, useCurrentFrame } from "remotion";
import { Plate, Camera } from "../plate/Plate";
import { twos } from "../ink/frame";

/** A master with a slow camera move from `from` to `to` over the shot (on twos). */
export const PlateShot: React.FC<{ angle: string; from: Camera; to: Camera; length: number }> = ({ angle, from, to, length }) => {
  const f = twos(useCurrentFrame());
  const t = interpolate(f, [0, Math.max(1, length - 1)], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.inOut(Easing.sin),
  });
  const cam = {
    x: from.x + (to.x - from.x) * t,
    y: from.y + (to.y - from.y) * t,
    zoom: from.zoom + (to.zoom - from.zoom) * t,
  };
  return <Plate angle={angle} camera={cam} />;
};
