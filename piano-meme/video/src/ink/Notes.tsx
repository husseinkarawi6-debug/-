import React from "react";
import { random } from "remotion";
import { C } from "../config";

/** Small ink music notes that float up. Spawned on the given frames. */
export const FloatingNotes: React.FC<{
  frame: number; // on twos
  spawns: number[]; // frames (same clock as `frame`) where a note starts
  area: { x0: number; x1: number; y: number };
  life?: number; // frames a note lives
  rise?: number; // pixels it travels up
}> = ({ frame, spawns, area, life = 42, rise = 340 }) => {
  const notes: React.ReactNode[] = [];
  spawns.forEach((s, i) => {
    const t = frame - s;
    if (t < 0 || t >= life) return;
    const p = t / life;
    const x0 = area.x0 + random(`nx-${i}`) * (area.x1 - area.x0);
    const x = x0 + Math.sin(p * Math.PI * 2 + i) * 18;
    const y = area.y - p * rise;
    const size = 0.75 + random(`ns-${i}`) * 0.5;
    const rot = (random(`nr-${i}`) - 0.5) * 30 + Math.sin(p * 6 + i) * 6;
    const kind = random(`nk-${i}`) < 0.6 ? "eighth" : "beamed";
    // pops in on its first drawing, shrinks away on the last few
    const scale = size * (p > 0.85 ? (1 - p) / 0.15 : 1);
    notes.push(
      <g key={i} transform={`translate(${x} ${y}) rotate(${rot}) scale(${scale})`}>
        {kind === "eighth" ? <Eighth /> : <Beamed />}
      </g>,
    );
  });
  if (!notes.length) return null;
  return (
    <svg width={1080} height={1920} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
      {notes}
    </svg>
  );
};

const Eighth: React.FC = () => (
  <g stroke={C.ink} strokeLinecap="round" fill={C.ink}>
    <ellipse cx={0} cy={0} rx={13} ry={9} transform="rotate(-22)" />
    <path d="M 11 -3 L 12 -62" strokeWidth={4} fill="none" />
    <path d="M 12 -62 Q 30 -50 28 -30 Q 26 -40 13 -44" strokeWidth={3} />
  </g>
);

const Beamed: React.FC = () => (
  <g stroke={C.ink} strokeLinecap="round" fill={C.ink}>
    <ellipse cx={0} cy={0} rx={12} ry={8.5} transform="rotate(-22)" />
    <ellipse cx={38} cy={-8} rx={12} ry={8.5} transform="rotate(-22 38 -8)" />
    <path d="M 10 -3 L 11 -60 M 48 -11 L 49 -68" strokeWidth={4} fill="none" />
    <path d="M 11 -60 L 49 -68 L 49 -58 L 11 -50 Z" strokeWidth={2} />
  </g>
);
