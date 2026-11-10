import React from "react";
import { AbsoluteFill } from "remotion";
import { fellFamily as fontFamily } from "../ink/font";
import { C, SAFE_BOTTOM, SAFE_TOP } from "../config";

/** Stand-in for a shot whose drawings are not made yet: pencil label + safe-area guides. */
export const Placeholder: React.FC<{ label: string; sub: string }> = ({ label, sub }) => (
  <AbsoluteFill>
    <svg width={1080} height={1920} style={{ position: "absolute" }}>
      <rect x={54} y={SAFE_TOP} width={972} height={SAFE_BOTTOM - SAFE_TOP} fill="none" stroke={C.mid} strokeWidth={3} strokeDasharray="18 14" />
      <path d="M 120 1180 q 220 -60 420 0 t 420 0" stroke={C.ink} strokeWidth={5} fill="none" />
      <path d="M 124 1188 q 220 -58 418 -4 t 418 4" stroke={C.ink} strokeWidth={1.6} fill="none" opacity={0.7} />
    </svg>
    <div style={{ position: "absolute", top: 860, width: "100%", textAlign: "center", fontFamily, color: C.ink }}>
      <div style={{ fontSize: 120 }}>{label}</div>
      <div style={{ fontSize: 52, color: C.mid }}>{sub}</div>
    </div>
  </AbsoluteFill>
);
