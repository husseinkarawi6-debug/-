import React from "react";
import { interpolate, random } from "remotion";
import { C } from "../palette";
import { BLACK_LEN, BLACK_W, isBlack, keyFlatX, keyRange, KeyLayout, persp } from "./layout";

export type KeyNote = { frame: number; midi: number; dur: number };

/** 0 = up, 1 = fully down. Goes down ON the note's frame, comes back up after `dur`. */
export const keyDown = (frame: number, n: KeyNote) => {
  const t = frame - n.frame;
  if (t < 0) return 0;
  const hold = Math.max(3, n.dur);
  return interpolate(t, [0, hold, hold + 4], [1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
};
/** short flash of light when the hammer hits */
const keyGlow = (frame: number, n: KeyNote) => {
  const t = frame - n.frame;
  if (t < 0) return 0;
  return interpolate(t, [0, 1, 10], [1, 0.8, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
};

/**
 * Piano keys drawn in code. Every key that has a note in `notes` sinks and lights up on that frame.
 * Lit like the rest of the film: red key light from the image-left, blue from the right.
 */
export const Keys: React.FC<{ frame: number; notes: KeyNote[]; layout: KeyLayout }> = ({ frame, notes, layout: L }) => {
  const h = L.yBottom - L.yTop;
  const midis = keyRange(L);
  const state = (m: number) => {
    let d = 0;
    let g = 0;
    for (const n of notes) {
      if (n.midi !== m) continue;
      d = Math.max(d, keyDown(frame, n));
      g = Math.max(g, keyGlow(frame, n));
    }
    return { d, g };
  };
  const quad = (xa: number, xb: number, ya: number, yb: number) =>
    `${persp(L, xa, ya)},${ya} ${persp(L, xb, ya)},${ya} ${persp(L, xb, yb)},${yb} ${persp(L, xa, yb)},${yb}`;

  const whites = midis.filter((m) => !isBlack(m));
  const blacks = midis.filter((m) => isBlack(m));
  return (
    <svg width={L.width} height={1920} style={{ position: "absolute", left: 0, top: 0 }}>
      <defs>
        <linearGradient id="keyLight" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor={C.red} stopOpacity="0.85" />
          <stop offset="0.42" stopColor={C.red} stopOpacity="0.28" />
          <stop offset="0.6" stopColor={C.navy} stopOpacity="0.45" />
          <stop offset="1" stopColor={C.blue} stopOpacity="0.55" />
        </linearGradient>
        <linearGradient id="keyDepth" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#000" stopOpacity="0" />
          <stop offset="0.75" stopColor="#000" stopOpacity="0.35" />
          <stop offset="1" stopColor="#000" stopOpacity="0.8" />
        </linearGradient>
        <filter id="keyBlur" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="9" />
        </filter>
      </defs>
      {/* key bed (dark slot the keys sit in) */}
      <polygon points={quad(-80, L.width + 80, L.yTop - 10, L.yBottom + 6)} fill={C.black} />
      {whites.map((m) => {
        const cx = keyFlatX(L, m);
        const { d, g } = state(m);
        const dip = d * 7; // the player-side end sinks
        const shade = 0.78 + 0.22 * random(`wk${m}`);
        const v = Math.round(214 * shade * (1 - 0.22 * d));
        return (
          <g key={m}>
            <polygon
              points={quad(cx - L.whiteW / 2 + 1.2, cx + L.whiteW / 2 - 1.2, L.yTop + dip, L.yBottom)}
              fill={`rgb(${v},${Math.round(v * 0.94)},${Math.round(v * 0.9)})`}
            />
            {/* a hard-edged facet, like a brush stroke */}
            <polygon
              points={`${persp(L, cx - L.whiteW / 2 + 1.2, L.yTop + dip)},${L.yTop + dip} ${persp(L, cx + L.whiteW / 2 - 1.2, L.yTop + dip)},${L.yTop + dip} ${persp(L, cx - L.whiteW / 2 + 1.2, L.yTop + h * (0.35 + 0.4 * random(`wf${m}`)))},${L.yTop + h * (0.35 + 0.4 * random(`wf${m}`))}`}
              fill="#fff"
              opacity={0.1 + 0.1 * random(`wo${m}`)}
            />
            {g > 0 ? (
              <polygon
                points={quad(cx - L.whiteW / 2 + 1.2, cx + L.whiteW / 2 - 1.2, L.yTop + dip, L.yBottom)}
                fill={C.red}
                opacity={0.55 * g}
              />
            ) : null}
          </g>
        );
      })}
      {/* coloured light across the whole keyboard */}
      <polygon points={quad(-80, L.width + 80, L.yTop, L.yBottom)} fill="url(#keyLight)" style={{ mixBlendMode: "multiply" }} />
      <polygon points={quad(-80, L.width + 80, L.yTop, L.yBottom)} fill="url(#keyDepth)" />
      {blacks.map((m) => {
        const cx = keyFlatX(L, m);
        const { d, g } = state(m);
        const top = L.yTop + h * (1 - BLACK_LEN) + d * 5;
        const bw = L.whiteW * BLACK_W;
        return (
          <g key={m}>
            <polygon points={quad(cx - bw / 2, cx + bw / 2, top, L.yBottom + 2)} fill={C.black} />
            <polygon points={quad(cx - bw / 2, cx + bw / 2, top, top + 9)} fill="#1b2030" opacity={0.9 * (1 - d * 0.6)} />
            <polygon points={quad(cx - bw / 2 + 1.5, cx - bw / 2 + 4.5, top + 2, L.yBottom - 30)} fill={C.red} opacity={0.32 * (1 - d * 0.5)} />
            <polygon points={quad(cx + bw / 2 - 3.5, cx + bw / 2 - 1.5, top + 2, L.yBottom - 50)} fill={C.blue} opacity={0.22} />
            {g > 0 ? <polygon points={quad(cx - bw / 2, cx + bw / 2, top, L.yBottom)} fill={C.red} opacity={0.6 * g} /> : null}
          </g>
        );
      })}
      {/* soft bloom above a struck key */}
      {notes.map((n, i) => {
        const g = keyGlow(frame, n);
        if (g <= 0) return null;
        const cx = keyFlatX(L, n.midi);
        return (
          <ellipse
            key={i}
            cx={persp(L, cx, L.yTop + h * 0.4)}
            cy={L.yTop + h * 0.4}
            rx={L.whiteW * 1.3}
            ry={h * 0.55}
            fill={C.red}
            opacity={0.5 * g}
            filter="url(#keyBlur)"
            style={{ mixBlendMode: "screen" }}
          />
        );
      })}
      {/* fallboard edge */}
      <polygon points={quad(-80, L.width + 80, L.yBottom, L.yBottom + 10)} fill={C.black} />
    </svg>
  );
};
