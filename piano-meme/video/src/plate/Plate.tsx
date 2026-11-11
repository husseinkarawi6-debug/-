import React from "react";
import { AbsoluteFill, Img, staticFile } from "remotion";
import { H, W } from "../config";
import { ART, patchSrc } from "../art";

export type Camera = { x: number; y: number; zoom: number }; // master point at frame centre; zoom 1 = fit width
export type Breath = { amount: number; x: number; y: number }; // scale 1+amount around (x, y)

/**
 * A master drawing with replacement patches on top. Everything outside a
 * patch is the master's own pixels, so swapping a mouth or eyes never moves
 * anything else. `patches` maps patch id -> opacity (1 = on).
 */
export const Plate: React.FC<{
  angle: string;
  camera: Camera;
  patches?: Record<string, number>;
  breath?: Breath;
}> = ({ angle, camera, patches = {}, breath }) => {
  const m = ART[angle];
  const s = (W / m.width) * camera.zoom;
  const tx = W / 2 - camera.x * s;
  const ty = H / 2 - camera.y * s;
  const b = breath
    ? `translate(${breath.x}px, ${breath.y}px) scale(${1 + breath.amount}) translate(${-breath.x}px, ${-breath.y}px)`
    : "";
  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: m.width,
          height: m.height,
          transformOrigin: "0 0",
          transform: `translate(${tx}px, ${ty}px) scale(${s}) ${b}`,
        }}
      >
        <Img src={staticFile(m.master)} style={{ position: "absolute", left: 0, top: 0, width: m.width, height: m.height }} />
        {Object.entries(patches).map(([id, op]) => {
          const p = m.patches[id];
          if (!p || op <= 0) return null;
          return (
            <Img
              key={id}
              src={staticFile(patchSrc(angle, id))}
              style={{ position: "absolute", left: p.x, top: p.y, width: p.w, height: p.h, opacity: op }}
            />
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
