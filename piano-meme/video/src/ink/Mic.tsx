import React from "react";
import { Easing, interpolate, random, spring } from "remotion";
import { C, FPS } from "../config";

/**
 * Hanging microphone for the finale, drawn in ink with cross-hatching.
 * frame      = frame inside the finale (on twos already)
 * dropEnd    = frame (inside the finale) when the drop has landed
 * beatFrames = frames per beat (one full swing = two beats)
 * settleFrom = frame where the swing starts to calm down
 */
export const HangingMic: React.FC<{
  frame: number;
  pivotX: number;
  cordLength: number;
  dropEnd: number;
  beatFrames: number;
  settleFrom: number;
  settleTo: number;
}> = ({ frame, pivotX, cordLength, dropEnd, beatFrames, settleFrom, settleTo }) => {
  // Drop: from above the frame to full cord length, with a small bounce.
  const drop = spring({ frame, fps: FPS, durationInFrames: dropEnd, config: { damping: 9, stiffness: 140, mass: 0.7 } });
  const len = interpolate(drop, [0, 1], [-420, cordLength]);

  // Pendulum: one full swing every two beats, starting after the drop.
  const t = Math.max(0, frame - dropEnd);
  const grow = interpolate(t, [0, beatFrames], [0, 1], { extrapolateRight: "clamp", easing: Easing.out(Easing.quad) });
  const calm = interpolate(frame, [settleFrom, settleTo], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.quad) });
  const angle = 9 * grow * calm * Math.sin((2 * Math.PI * t) / (2 * beatFrames));

  return (
    <svg width={1080} height={1920} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
      <g transform={`translate(${pivotX} -30) rotate(${angle})`}>
        <Cord length={Math.max(0, len + 30)} />
        <g transform={`translate(0 ${len + 30})`}>
          <MicBody />
        </g>
      </g>
    </svg>
  );
};

const Cord: React.FC<{ length: number }> = ({ length }) => {
  if (length <= 0) return null;
  const seg = 40;
  let d = "M 0 0";
  let d2 = "M 1.5 0";
  for (let y = seg; y <= length + 0.1; y += seg) {
    const w = (random(`cord-${Math.round(y)}`) - 0.5) * 3;
    d += ` Q ${w} ${y - seg / 2} 0 ${Math.min(y, length)}`;
    d2 += ` Q ${1.5 - w} ${y - seg / 2} 1.5 ${Math.min(y, length)}`;
  }
  return (
    <g fill="none" strokeLinecap="round">
      <path d={d} stroke={C.ink} strokeWidth={4.2} />
      <path d={d2} stroke={C.ink} strokeWidth={1.4} opacity={0.7} />
    </g>
  );
};

/** Vintage ball microphone hanging head-down. Origin = top of the cable sleeve. */
const MicBody: React.FC = () => {
  const hatch = (x0: number, y0: number, x1: number, y1: number, step: number, slope: number, key: string) => {
    const lines: React.ReactNode[] = [];
    let i = 0;
    for (let x = x0 - (y1 - y0); x < x1; x += step, i++) {
      const j = (random(`${key}-${i}`) - 0.5) * 2;
      lines.push(<line key={i} x1={x + j} y1={y0} x2={x + (y1 - y0) * slope + j} y2={y1} />);
    }
    return lines;
  };
  return (
    <g strokeLinecap="round" strokeLinejoin="round">
      <defs>
        <clipPath id="micHandle">
          <path d="M -15 18 L 15 18 L 21 170 L -21 170 Z" />
        </clipPath>
        <clipPath id="micHandleShade">
          <path d="M 4 18 L 15 18 L 21 170 L 6 170 Z" />
        </clipPath>
        <clipPath id="micBall">
          <circle cx={0} cy={232} r={52} />
        </clipPath>
        <clipPath id="micBallShade">
          <path d="M 10 180 A 52 52 0 0 1 10 284 A 40 52 0 0 0 10 180 Z" />
        </clipPath>
      </defs>
      {/* cable sleeve */}
      <path d="M -7 0 L 7 0 L 9 20 L -9 20 Z" fill={C.ink} />
      {/* handle */}
      <path d="M -15 18 L 15 18 L 21 170 L -21 170 Z" fill={C.paperLight} stroke={C.ink} strokeWidth={4} />
      <g clipPath="url(#micHandleShade)" stroke={C.ink} strokeWidth={1.6} opacity={0.85}>
        {hatch(0, 18, 26, 170, 6, 0.35, "hh")}
      </g>
      <path d="M -10 30 L -13 160" stroke={C.mid} strokeWidth={2} opacity={0.6} />
      {/* collar */}
      <path d="M -27 168 L 27 168 L 24 186 L -24 186 Z" fill={C.mid} stroke={C.ink} strokeWidth={4} />
      <path d="M -26 176 L 26 176" stroke={C.ink} strokeWidth={1.5} />
      {/* ball grille with mesh */}
      <circle cx={0} cy={232} r={52} fill={C.paperLight} />
      <g clipPath="url(#micBall)" stroke={C.mid} strokeWidth={1.2}>
        {hatch(-60, 175, 60, 290, 9, 1, "m1")}
        {hatch(-60, 175, 60, 290, 9, -1, "m2")}
      </g>
      <g clipPath="url(#micBallShade)" stroke={C.ink} strokeWidth={1.7}>
        {hatch(-10, 175, 60, 290, 5, 0.6, "bs")}
      </g>
      <path d="M -34 200 Q -40 226 -30 252" stroke={C.paperLight} strokeWidth={5} fill="none" opacity={0.9} />
      <circle cx={0} cy={232} r={52} fill="none" stroke={C.ink} strokeWidth={4.5} />
      <circle cx={1.5} cy={233} r={50} fill="none" stroke={C.ink} strokeWidth={1.3} opacity={0.6} />
    </g>
  );
};
