import React from "react";
import { random, useCurrentFrame } from "remotion";
import { fellFamily as fontFamily } from "./font";
import { C, H, W } from "../config";

// Torn paper edge as a CSS polygon: positions in %, tears in px, so the tear
// size stays the same whatever the slip size is.
const tornPolygon = (seedKey: string) => {
  const pts: string[] = [];
  const n = 18;
  const jag = (k: string, amp: number) => (random(k) * amp).toFixed(1);
  for (let i = 0; i <= n; i++) pts.push(`${((i / n) * 100).toFixed(2)}% ${jag(`${seedKey}t${i}`, 7)}px`);
  for (let i = 1; i <= 4; i++) pts.push(`calc(100% - ${jag(`${seedKey}r${i}`, 6)}px) ${((i / 5) * 100).toFixed(2)}%`);
  for (let i = n; i >= 0; i--) pts.push(`${((i / n) * 100).toFixed(2)}% calc(100% - ${jag(`${seedKey}b${i}`, 7)}px)`);
  for (let i = 4; i >= 1; i--) pts.push(`${jag(`${seedKey}l${i}`, 6)}px ${((i / 5) * 100).toFixed(2)}%`);
  return `polygon(${pts.join(", ")})`;
};

/**
 * One caption on a torn slip. Appears at once on its first frame
 * (scale 1.03 for that single frame, then 1). Spanish captions are red.
 * `from` is the frame (inside the current Sequence) the caption appears.
 * Place it inside <HandDrawn> so it boils with the drawing.
 */
export const Caption: React.FC<{
  text: string;
  lang: "en" | "es";
  from: number;
  anchor?: "top" | "block";
  align?: "center" | "right";
}> = ({ text, lang, from, anchor = "top", align = "center" }) => {
  const frame = useCurrentFrame();
  const scale = frame === from ? 1.03 : 1;
  const seedKey = text.slice(0, 24);
  const tilt = (random(`tilt-${seedKey}`) - 0.5) * 1.6;
  const centreY = anchor === "top" ? H * 0.18 : H * 0.245;

  return (
    <div
      style={{
        position: "absolute",
        left: align === "right" ? W * 0.36 : 0,
        width: align === "right" ? W * 0.6 : W,
        top: centreY,
        display: "flex",
        justifyContent: "center",
        transform: "translateY(-50%)",
      }}
    >
      <div
        style={{
          maxWidth: anchor === "top" ? W * 0.8 : W * 0.56,
          transform: `scale(${scale}) rotate(${tilt}deg)`,
          filter: `drop-shadow(0 0 0.8px ${C.ink}) drop-shadow(2px 3px 0px rgba(20,18,16,0.35))`,
        }}
      >
        <div
          style={{
            backgroundColor: C.slip,
            clipPath: tornPolygon(seedKey),
            padding: anchor === "top" ? "22px 40px 26px" : "30px 46px 34px",
            fontFamily,
            fontSize: 58,
            lineHeight: 1.16,
            textAlign: "center",
            color: lang === "es" ? C.red : C.ink,
          }}
        >
          {text}
        </div>
      </div>
    </div>
  );
};

/** Picks the caption for the current global frame from analysis.json. */
export type CaptionData = { start: number; end: number; text: string; lang: "en" | "es" };
