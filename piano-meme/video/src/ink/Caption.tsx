import React from "react";
import { random, useCurrentFrame } from "remotion";
import { fellFamily as fontFamily } from "./font";
import { C, H, SAFE_TOP, W } from "../config";

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
  // one or two lines: centred at 18 % of the height; longer blocks hang
  // from the top of the safe area (14 %) so they never go above it
  const centreY = anchor === "top" ? H * 0.18 : SAFE_TOP + 6;

  return (
    <div
      style={{
        position: "absolute",
        left: align === "right" ? W * 0.44 : 0, // finale: block on the right, the mic hangs on the left
        width: align === "right" ? W * 0.54 : W,
        top: centreY,
        display: "flex",
        justifyContent: "center",
        transform: anchor === "top" ? "translateY(-50%)" : "none",
      }}
    >
      <div
        style={{
          maxWidth: W * 0.8,
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
            whiteSpace: "pre-line", // the reference's own line breaks
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
