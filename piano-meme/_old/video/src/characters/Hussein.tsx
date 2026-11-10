import React, { useMemo } from "react";
import { interpolate, spring } from "remotion";
import rigJson from "../../public/rig/hussein/rig.json";
import { FPS, H, W } from "../palette";
import { Keys, KeyNote } from "../piano/Keys";
import { defaultLayout, KeyLayout, keyTouchPoint, whiteIndex } from "../piano/layout";
import {
  add,
  angDiff,
  angleOf,
  blend,
  boneWeights,
  clamp,
  distSeg,
  dot,
  ik2,
  len,
  lerpV,
  norm,
  rotAbout,
  rotate,
  smoothstep,
  sub,
  V,
  Xf,
} from "../rig/math";
import { PieceRect, SkinMesh, Stage3D } from "../rig/SkinMesh";
import { useImages } from "../rig/useImages";

/* ------------------------------------------------------------------ */
/*  Data                                                               */
/* ------------------------------------------------------------------ */

const FINGERS = ["thumb", "index", "middle", "ring", "pinky"] as const;
type Finger = (typeof FINGERS)[number];
/** "R" = his right hand (it is on the LEFT of the picture), "L" = his left hand. */
export type Hand = "R" | "L";

export type PianoNote = {
  frame: number;
  midi: number;
  dur: number;
  hand: Hand;
  /** 0 thumb … 4 pinky. Filled in by `assignFingers` when missing. */
  finger?: number;
  /** stressed syllable: the head gives one small nod */
  stress?: boolean;
};

type RigJson = {
  pieces: Record<string, PieceRect>;
  joints: Record<string, number[]>;
  fingertips: Record<string, Record<Finger, number[]>>;
  knuckles: Record<string, Record<Finger, number[]>>;
  overlays?: Record<string, PieceRect>;
};
const rig = rigJson as unknown as RigJson;
const J = (k: string): V => [rig.joints[k][0], rig.joints[k][1]];

/** his right hand is drawn on the picture's left side */
const SIDE: Record<Hand, "L" | "R"> = { R: "L", L: "R" };

type ArmRest = {
  S: V;
  E: V;
  Wr: V;
  tips: V[];
  knuckles: V[];
  M: V; // middle fingertip = the point the IK drives
  l1: number;
  l2: number;
  restU: number;
  restF: number;
  bend: number;
  dirU: V;
};
const armRest = (hand: Hand): ArmRest => {
  const s = SIDE[hand];
  const S = J("shoulder" + s);
  const E = J("elbow" + s);
  const Wr = J("wrist" + s);
  const tips = FINGERS.map((f) => rig.fingertips[s][f] as unknown as V);
  const knuckles = FINGERS.map((f) => rig.knuckles[s][f] as unknown as V);
  const M = tips[2];
  const l1 = len(sub(E, S));
  const l2 = len(sub(M, E));
  // pick the elbow side that reproduces the drawing
  const a = ik2(S, l1, l2, M, 1).elbow;
  const b = ik2(S, l1, l2, M, -1).elbow;
  const bend = len(sub(a, E)) < len(sub(b, E)) ? 1 : -1;
  return { S, E, Wr, tips, knuckles, M, l1, l2, restU: angleOf(S, E), restF: angleOf(E, M), bend, dirU: norm(sub(E, S)) };
};
const ARM: Record<Hand, ArmRest> = { R: armRest("R"), L: armRest("L") };

export type Placement = { x: number; y: number; scale: number };
/** where the 1024px drawing sits on the 1080x1920 stage */
export const husseinPlacement: Placement = { x: 540 - 512 * 0.85, y: 541, scale: 0.85 };

const toStage = (pl: Placement) => (p: V): V => [pl.x + p[0] * pl.scale, pl.y + p[1] * pl.scale];
const toChar = (pl: Placement, p: V): V => [(p[0] - pl.x) / pl.scale, (p[1] - pl.y) / pl.scale];

/* ------------------------------------------------------------------ */
/*  Fingers and hand travel (all derived from the notes)               */
/* ------------------------------------------------------------------ */

/**
 * Choose a finger for every note. Inside one word the hand keeps a five-finger position:
 * the lowest note of the word gets the thumb (right hand) and each white key above it
 * the next finger.
 */
export const assignFingers = (notes: PianoNote[]): PianoNote[] => {
  const out = notes.map((n) => ({ ...n }));
  for (const hand of ["R", "L"] as Hand[]) {
    const mine = out.filter((n) => n.hand === hand).sort((a, b) => a.frame - b.frame);
    let group: PianoNote[] = [];
    const flush = () => {
      if (!group.length) return;
      const lo = Math.min(...group.map((n) => whiteIndex(n.midi)));
      const hi = Math.max(...group.map((n) => whiteIndex(n.midi)));
      for (const n of group) {
        if (n.finger !== undefined) continue;
        const up = whiteIndex(n.midi) - lo;
        // right hand: thumb on the lowest note. left hand: thumb on the highest note.
        n.finger = hand === "R" ? clamp(up, 0, 4) : clamp(hi - whiteIndex(n.midi), 0, 4);
      }
      group = [];
    };
    for (const n of mine) {
      if (group.length && n.frame - group[group.length - 1].frame > 14) flush();
      group.push(n);
    }
    flush();
  }
  return out;
};

/**
 * Finger press in rest pixels: negative = lifted, positive = pushed into the key.
 * It reaches the bottom exactly on the note's frame.
 */
export const fingerPress = (frame: number, n: { frame: number; dur: number }) => {
  const t = frame - n.frame;
  const hold = Math.max(3, Math.min(n.dur, 14));
  return interpolate(t, [-5, -2, 0, hold, hold + 4], [0, -11, 7, 7, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
};

type Stop = { frame: number; anchor: V; dur: number };

/** For every note: where the middle fingertip must be so that the chosen finger sits on the key. */
const planHand = (hand: Hand, notes: PianoNote[], L: KeyLayout, pl: Placement, shoulder: V): Stop[] => {
  const R = ARM[hand];
  return notes
    .filter((n) => n.hand === hand)
    .sort((a, b) => a.frame - b.frame)
    .map((n) => {
      const key = toChar(pl, keyTouchPoint(L, n.midi));
      const off = sub(R.tips[n.finger ?? 2], R.M);
      let d = 0;
      let anchor: V = key;
      for (let i = 0; i < 4; i++) {
        anchor = sub(key, rotate(off, d));
        const sol = ik2(shoulder, R.l1, R.l2, anchor, R.bend);
        d = angDiff(sol.fore, R.restF);
      }
      return { frame: n.frame, anchor, dur: n.dur };
    });
};

/** Middle-fingertip position at any frame: waits on a key, then glides (with a small lift) to the next. */
const anchorAt = (frame: number, stops: Stop[], home: V): V => {
  if (!stops.length) return home;
  const ARRIVE = 2; // the hand is in place this many frames before the note; the finger does the rest
  const glide = (from: V, to: V, start: number, end: number): V => {
    const u = smoothstep(start, end, frame);
    const p = lerpV(from, to, u);
    const lift = Math.min(16, len(sub(to, from)) * 0.25) * Math.sin(Math.PI * u);
    return [p[0], p[1] - lift];
  };
  const first = stops[0];
  if (frame <= first.frame) {
    const end = first.frame - ARRIVE;
    return glide(home, first.anchor, end - 12, end);
  }
  for (let i = 0; i < stops.length - 1; i++) {
    const a = stops[i];
    const b = stops[i + 1];
    if (frame > a.frame && frame <= b.frame) {
      const end = b.frame - ARRIVE;
      const start = Math.max(a.frame + 1, end - 9);
      return glide(a.anchor, b.anchor, start, Math.max(end, start + 1));
    }
  }
  const last = stops[stops.length - 1];
  const rest = last.frame + Math.max(3, last.dur) + 8;
  return glide(last.anchor, home, rest, rest + 16);
};

/* ------------------------------------------------------------------ */
/*  Acting                                                             */
/* ------------------------------------------------------------------ */

export type HusseinActing = {
  /** frames (local to the shot) where a blink starts */
  blinks?: number[];
  /** long eye-close (the "sigh"): [startFrame, endFrame] */
  eyesClosed?: [number, number];
  /** one eyebrow up from this frame */
  browFrom?: number;
};

const blinkAmount = (frame: number, a: HusseinActing) => {
  let c = 0;
  for (const b of a.blinks ?? []) {
    c = Math.max(c, interpolate(frame - b, [0, 2, 4, 7], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }));
  }
  if (a.eyesClosed) {
    const [s, e] = a.eyesClosed;
    c = Math.max(c, interpolate(frame, [s, s + 4, e - 4, e], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }));
  }
  return c;
};

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

const FILES = ["torso", "head", "armL", "armR"].map((k) => rig.pieces[k].file);

export const Hussein: React.FC<{
  frame: number;
  notes: PianoNote[];
  acting?: HusseinActing;
  layout?: KeyLayout;
  placement?: Placement;
  /** extra content drawn between the body and the arms, under the keys (the piano body) */
  pianoBody?: React.ReactNode;
}> = ({ frame, notes, acting = {}, layout = defaultLayout, placement = husseinPlacement, pianoBody }) => {
  const imgs = useImages(FILES);
  const fingered = useMemo(() => assignFingers(notes), [notes]);
  const keyNotes: KeyNote[] = fingered;

  const pose = useMemo(() => {
    const place = toStage(placement);

    /* breathing: slow, the chest and shoulders rise a little */
    const breath = Math.sin((frame / FPS) * Math.PI * 2 * 0.24);
    const torso: Xf = (p) => [
      p[0] + (p[0] - 512) * 0.006 * breath * smoothstep(900, 450, p[1]),
      p[1] - 4.5 * breath * smoothstep(960, 380, p[1]),
    ];

    /* head: one small nod on each stressed note, nothing else */
    let nod = 0;
    for (const n of fingered) {
      if (!n.stress) continue;
      const t = frame - n.frame;
      if (t < -1) continue;
      const s = spring({ frame: t + 1, fps: FPS, config: { damping: 9, stiffness: 190, mass: 0.6 } });
      nod += 7 * (interpolate(t, [-1, 1], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) - s);
    }
    const neck = J("neck");
    const drift = Math.sin((frame / FPS) * Math.PI * 2 * 0.11 + 1.3);
    const roll = (0.5 * drift * Math.PI) / 180;
    const headBase = rotAbout(neck, roll, add(torso(neck), [0, nod]));
    /* hair follows the head late (spring) */
    let hairLag = 0;
    for (const n of fingered) {
      if (!n.stress) continue;
      const t = frame - n.frame - 2;
      if (t < 0) continue;
      const s = spring({ frame: t, fps: FPS, config: { damping: 6, stiffness: 120, mass: 0.7 } });
      hairLag += 5 * (interpolate(t, [0, 2], [0, 1], { extrapolateRight: "clamp" }) - s);
    }
    const hairSway = 1.6 * Math.sin((frame / FPS) * Math.PI * 2 * 0.33);

    const close = blinkAmount(frame, acting);
    const brow =
      acting.browFrom === undefined
        ? 0
        : spring({ frame: frame - acting.browFrom, fps: FPS, config: { damping: 13, stiffness: 160 } });

    // eyelids: [x0, x1, yUnderBrow, yUpperLid, yLowerLid]
    const EYES = [
      [436, 487, 282, 291, 307.5],
      [544, 601, 279, 286, 301.5],
    ];
    const head: Xf = (p0) => {
      let x = p0[0];
      let y = p0[1];
      // --- soft warps in the drawing's own space ---
      if (close > 0) {
        for (const [x0, x1, yt, ye, yb] of EYES) {
          const wx = smoothstep(x0 - 6, x0 + 5, x) * smoothstep(x1 + 6, x1 - 5, x);
          if (wx <= 0 || y < yt || y > yb) continue;
          const full = 0.92 * (yb - ye);
          const d = y < ye ? (full * (y - yt)) / (ye - yt) : 0.92 * (yb - y);
          y += d * wx * close;
        }
      }
      if (brow > 0) {
        const wx = smoothstep(508, 540, x) * smoothstep(640, 606, x);
        const wy = smoothstep(214, 248, y) * smoothstep(303, 286, y);
        const arch = 0.55 + 0.45 * smoothstep(535, 590, x);
        y -= 11 * brow * wx * wy * arch;
      }
      const q = headBase([x, y]);
      const k = smoothstep(225, 20, p0[1]);
      return place([q[0] + (hairSway + hairLag * 0.4) * k * k, q[1] + hairLag * k]);
    };

    /* arms: IK to the keys */
    const arms = (["R", "L"] as Hand[]).map((hand) => {
      const R = ARM[hand];
      const S2 = torso(R.S);
      const stops = planHand(hand, fingered, layout, placement, S2);
      // resting spot: hovering just above the keys, under the drawn hand position
      const homeY = (layout.yTop + (layout.yBottom - layout.yTop) * 0.2 - placement.y) / placement.scale - 10;
      const home: V = [R.M[0], homeY + 2 * Math.sin((frame / FPS) * 2 * Math.PI * 0.21 + (hand === "R" ? 0 : 2))];
      const anchor = anchorAt(frame, stops, home);
      const sol = ik2(S2, R.l1, R.l2, anchor, R.bend);
      const aU = angDiff(sol.upper, R.restU);
      const aF = angDiff(sol.fore, R.restF);
      const upper = rotAbout(R.S, aU, S2);
      const E2 = upper(R.E);
      const fore = rotAbout(R.E, aF, E2);
      const mine = fingered.filter((n) => n.hand === hand);
      const press = FINGERS.map((_, fi) => {
        let q = 0;
        for (const n of mine) {
          if (n.finger !== fi) continue;
          const v = fingerPress(frame, n);
          if (Math.abs(v) > Math.abs(q)) q = v;
        }
        return q;
      });
      const segs: [V, V][] = [
        [R.S, R.E],
        [R.E, R.M],
      ];
      const xf: Xf = (p) => {
        const s1 = smoothstep(-40, 55, dot(sub(p, R.S), R.dirU));
        const w = boneWeights(p, segs, 6);
        const q = blend(p, [upper, fore], w);
        const r0 = torso(p);
        let x = r0[0] * (1 - s1) + q[0] * s1;
        let y = r0[1] * (1 - s1) + q[1] * s1;
        // fingers: each one is a little lever from knuckle to tip
        for (let fi = 0; fi < 5; fi++) {
          if (press[fi] === 0) continue;
          const K = R.knuckles[fi];
          const T = R.tips[fi];
          const ax = sub(T, K);
          const L2 = len(ax);
          const along = dot(sub(p, K), ax) / (L2 * L2);
          if (along < 0) continue;
          const lateral = distSeg(p, K, add(T, [ax[0] * 0.4, ax[1] * 0.4]));
          const wgt = smoothstep(0, 0.85, along) * Math.exp(-(lateral * lateral) / (15 * 15));
          y += press[fi] * wgt;
        }
        return place([x, y]);
      };
      const tipNow = (fi: number): V => {
        const q = fore(R.tips[fi]);
        return place([q[0], q[1] + press[fi]]);
      };
      return { hand, xf, tipNow, press };
    });

    return { torso: ((p: V) => place(torso(p))) as Xf, head, arms };
  }, [frame, fingered, acting, layout, placement]);

  if (!imgs) return null;
  const P = rig.pieces;
  return (
    <>
      <Stage3D width={W} height={H}>
        <SkinMesh img={imgs[P.torso.file]} rect={P.torso} deform={pose.torso} cell={32} order={1} />
        <SkinMesh img={imgs[P.head.file]} rect={P.head} deform={pose.head} cell={5} order={2} />
      </Stage3D>
      {pianoBody}
      <Keys frame={frame} notes={keyNotes} layout={layout} />
      <Stage3D width={W} height={H}>
        <SkinMesh img={imgs[P.armL.file]} rect={P.armL} deform={pose.arms[0].xf} cell={10} order={3} />
        <SkinMesh img={imgs[P.armR.file]} rect={P.armR} deform={pose.arms[1].xf} cell={10} order={4} />
      </Stage3D>
    </>
  );
};
