import React from "react";
import { AbsoluteFill, Img, random, staticFile } from "remotion";
import { C, H, W } from "../config";
import { twos, useGlobalFrame } from "./frame";

/**
 * The hand-drawn layer that sits over every shot:
 *  - line boil: SVG turbulence + displacement, new seed every 2 frames
 *  - old paper under and over everything (multiply)
 *  - grain that changes every frame, rare ink specks and scratches
 *  - vignette and ±2% light flicker
 * `boil` and `grain` are the strengths (1 = normal).
 */
export const HandDrawn: React.FC<{
  boil: number;
  grain: number;
  children: React.ReactNode;
}> = ({ boil, grain, children }) => {
  const g = useGlobalFrame();
  const seed = Math.floor(g / 2);
  // baseFrequency 0.02–0.035 and scale 2–3 px at boil = 1
  const freq = 0.024 + 0.008 * random(`freq-${seed}`);
  const scale = (2 + random(`scale-${seed}`)) * boil;
  const flicker = 1 + (random(`flicker-${g}`) - 0.5) * 0.04 * Math.min(grain, 1.5);

  return (
    <AbsoluteFill style={{ backgroundColor: C.paper }}>
      <svg width={0} height={0} style={{ position: "absolute" }}>
        <defs>
          <filter id="boil" x="-2%" y="-2%" width="104%" height="104%" colorInterpolationFilters="sRGB">
            <feTurbulence type="fractalNoise" baseFrequency={freq} numOctaves={2} seed={seed} result="n" />
            <feDisplacementMap in="SourceGraphic" in2="n" scale={scale} xChannelSelector="R" yChannelSelector="G" />
          </filter>
        </defs>
      </svg>
      <Img src={staticFile("fx/paper_base.jpg")} style={{ position: "absolute", width: W, height: H }} />
      <AbsoluteFill style={{ filter: boil > 0 ? `url(#boil) brightness(${flicker})` : `brightness(${flicker})` }}>
        {children}
      </AbsoluteFill>
      <Img
        src={staticFile("fx/paper_overlay.jpg")}
        style={{ position: "absolute", width: W, height: H, mixBlendMode: "multiply", opacity: Math.min(1, 0.85 * grain + 0.15) }}
      />
      <Grain frame={g} strength={grain} />
      <Specks frame={g} strength={grain} />
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse 75% 62% at 50% 46%, rgba(20,18,16,0) 55%, rgba(20,18,16,${0.42 * Math.min(grain, 2)}) 100%)`,
        }}
      />
    </AbsoluteFill>
  );
};

const Grain: React.FC<{ frame: number; strength: number }> = ({ frame, strength }) => {
  if (strength <= 0) return null;
  const tile = Math.floor(random(`grain-tile-${frame}`) * 8);
  const dx = Math.round(random(`grain-x-${frame}`) * 540);
  const dy = Math.round(random(`grain-y-${frame}`) * 960);
  return (
    <AbsoluteFill
      style={{
        backgroundImage: `url(${staticFile(`fx/grain_${tile}.png`)})`,
        backgroundSize: "540px 960px",
        backgroundPosition: `${dx}px ${dy}px`,
        opacity: Math.min(1, 0.32 * strength),
      }}
    />
  );
};

// Rare ink specks and hair scratches (deterministic, about 1 frame in 8).
const Specks: React.FC<{ frame: number; strength: number }> = ({ frame, strength }) => {
  if (strength <= 0) return null;
  const f = twos(frame);
  const items: React.ReactNode[] = [];
  if (random(`speck-on-${f}`) < 0.14 * Math.min(strength, 2)) {
    const n = 1 + Math.floor(random(`speck-n-${f}`) * 3);
    for (let i = 0; i < n; i++) {
      const x = random(`sx-${f}-${i}`) * W;
      const y = random(`sy-${f}-${i}`) * H;
      const r = 1.5 + random(`sr-${f}-${i}`) * 4;
      items.push(<ellipse key={`s${i}`} cx={x} cy={y} rx={r} ry={r * (0.6 + random(`se-${f}-${i}`) * 0.6)} fill={C.ink} opacity={0.55} />);
    }
  }
  if (random(`scratch-on-${f}`) < 0.05 * Math.min(strength, 2)) {
    const x = random(`kx-${f}`) * W;
    const y = random(`ky-${f}`) * H * 0.7;
    const len = 120 + random(`kl-${f}`) * 420;
    const bend = (random(`kb-${f}`) - 0.5) * 30;
    items.push(
      <path
        key="k"
        d={`M ${x} ${y} q ${bend} ${len / 2} ${bend * 0.3} ${len}`}
        stroke={random(`kc-${f}`) < 0.5 ? C.ink : C.paperLight}
        strokeWidth={1.1}
        fill="none"
        opacity={0.5}
      />,
    );
  }
  if (!items.length) return null;
  return (
    <svg width={W} height={H} style={{ position: "absolute", inset: 0 }}>
      {items}
    </svg>
  );
};
