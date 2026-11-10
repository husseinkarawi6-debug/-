import React, { useMemo } from "react";
import rigJson from "../../public/rig/learner/rig.json";
import { H, W } from "../palette";
import {
  add,
  angDiff,
  angleOf,
  blend,
  boneWeights,
  deg,
  dot,
  ik2,
  len,
  lerp,
  lerpV,
  norm,
  rotAbout,
  smoothstep,
  sub,
  V,
  Xf,
} from "../rig/math";
import { PieceRect, SkinMesh, Stage3D } from "../rig/SkinMesh";
import { useImages } from "../rig/useImages";

type RigJson = {
  pieces: Record<string, PieceRect>;
  joints: Record<string, number[]>;
  overlays: Record<string, PieceRect>;
};
const rig = rigJson as unknown as RigJson;
const J = (k: string): V => [rig.joints[k][0], rig.joints[k][1]];

/* ------------------------------------------------------------------ */
/*  Pose                                                               */
/* ------------------------------------------------------------------ */

/**
 * A pose is a handful of numbers. "L"/"R" are the picture's left/right.
 * Hands are given as wrist positions in the drawing's own pixels (1360x2048),
 * the arm joints are solved from them.
 */
export type LearnerPose = {
  handL: V;
  handR: V;
  /** whole body tips over around the feet, degrees (+ = to the picture's right) */
  lean: number;
  /** upper body bends at the waist, degrees */
  bend: number;
  headTilt: number;
  /** head moves up(-)/down(+) on the neck, px */
  headDy: number;
  /** shoulders up, px */
  shrug: number;
};

const WL = J("wristL");
const WR = J("wristR");
export const POSES: Record<string, LearnerPose> = {
  rest: { handL: WL, handR: WR, lean: 0, bend: 0, headTilt: 0, headDy: 0, shrug: 0 },
  // arms wide open, palms out: "how do you say…?"
  open: { handL: [70, 760], handR: [1280, 740], lean: 0, bend: -1.5, headTilt: 4, headDy: -6, shrug: 10 },
  // hands low and relaxed, weight on one side: cocky
  cocky: { handL: [330, 1210], handR: [1040, 1180], lean: 3, bend: -2, headTilt: -5, headDy: 0, shrug: 0 },
  // one hand to the mouth
  mouth: { handL: [600, 520], handR: [1090, 1190], lean: -1, bend: 2, headTilt: 3, headDy: 4, shrug: 14 },
  // fists on hips, chest out
  proud: { handL: [455, 1010], handR: [885, 1010], lean: 0, bend: -4, headTilt: -3, headDy: -10, shrug: -4 },
  // elbows in, shoulders up
  nervous: { handL: [520, 900], handR: [830, 880], lean: -1.5, bend: 3, headTilt: 5, headDy: 8, shrug: 26 },
  // book raised like a lecturer
  lecture: { handL: [300, 1180], handR: [1130, 560], lean: 1.5, bend: -2, headTilt: -4, headDy: -4, shrug: 4 },
  // both arms thrown up
  sing: { handL: [150, 380], handR: [1200, 360], lean: 0, bend: -5, headTilt: 0, headDy: -14, shrug: 12 },
};

export const mixPose = (a: LearnerPose, b: LearnerPose, t: number): LearnerPose => ({
  handL: lerpV(a.handL, b.handL, t),
  handR: lerpV(a.handR, b.handR, t),
  lean: lerp(a.lean, b.lean, t),
  bend: lerp(a.bend, b.bend, t),
  headTilt: lerp(a.headTilt, b.headTilt, t),
  headDy: lerp(a.headDy, b.headDy, t),
  shrug: lerp(a.shrug, b.shrug, t),
});

export type LearnerFace = "base" | "confused" | "nervous" | "proud" | "smug" | "sing";
export type LearnerMouth = "closed" | "ah" | "oh";

export type Placement = { x: number; y: number; scale: number };
export const learnerPlacement: Placement = { x: 540 - 668 * 0.72, y: 440, scale: 0.72 };

/* ------------------------------------------------------------------ */
/*  Rest geometry                                                      */
/* ------------------------------------------------------------------ */

const armRest = (s: "L" | "R") => {
  const S = J("shoulder" + s);
  const E = J("elbow" + s);
  const Wr = J("wrist" + s);
  const l1 = len(sub(E, S));
  const l2 = len(sub(Wr, E));
  return { S, E, Wr, l1, l2, restU: angleOf(S, E), restF: angleOf(E, Wr), dirU: norm(sub(E, S)), out: s === "L" ? -1 : 1 };
};
const ARMS = { L: armRest("L"), R: armRest("R") };

const FILES = [
  ...["legL", "legR", "torso", "neck", "head", "armL", "armR"].map((k) => rig.pieces[k].file),
  ...Object.values(rig.overlays).map((o) => o.file),
];

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export const Learner: React.FC<{
  pose: LearnerPose;
  face?: LearnerFace;
  mouth?: LearnerMouth;
  blink?: boolean;
  placement?: Placement;
  /** squash & stretch of the whole figure from the feet (1 = none) */
  squashY?: number;
  /** how far the coat hem trails behind, px (give it a delayed copy of the body motion) */
  hemLag?: number;
  /** how far the hair trails behind, px */
  hairLag?: number;
  /** slow breathing, -1..1 */
  breath?: number;
}> = ({ pose, face = "base", mouth = "closed", blink = false, placement = learnerPlacement, squashY = 1, hemLag = 0, hairLag = 0, breath = 0 }) => {
  const imgs = useImages(FILES);

  const xf = useMemo(() => {
    const place = (p: V): V => [placement.x + p[0] * placement.scale, placement.y + p[1] * placement.scale];
    const G = J("ground");
    const waist = J("waist");
    const squashX = 1 / Math.sqrt(squashY);
    /* whole body: lean + squash, pivoting on the floor */
    const root = rotAbout(G, deg(pose.lean), G, squashX, squashY);

    /* spine: everything above the waist bends a little more */
    const upper = rotAbout(waist, deg(pose.bend));
    const body: Xf = (p) => {
      const k = smoothstep(1120, 780, p[1]); // 0 below the belt, 1 at the chest
      const q = upper(p);
      let x = p[0] + (q[0] - p[0]) * k;
      let y = p[1] + (q[1] - p[1]) * k;
      // breathing + shrug lift the shoulder line
      const sh = smoothstep(900, 560, p[1]);
      y -= (pose.shrug * smoothstep(60, 250, Math.abs(p[0] - 668)) + 3 * breath) * sh;
      x += (p[0] - 668) * 0.008 * breath * sh;
      // the long coat trails behind below the belt
      const t = smoothstep(1150, 1760, p[1]);
      x += hemLag * t * t;
      return [x, y];
    };
    const torso: Xf = (p) => place(root(body(p)));

    /* legs: shoes stay on the floor, the rest follows the body */
    const leg: Xf = (p) => {
      const planted = smoothstep(1850, 1950, p[1]);
      const q = root(body(p));
      return place([q[0] + (p[0] - q[0]) * planted, q[1] + (p[1] - q[1]) * planted]);
    };

    /* head on a stretchy neck */
    const neckBase = J("neckBase");
    const headBase = J("headBase");
    const headPivot = add(body(headBase), [0, pose.headDy]);
    const headRigid = rotAbout(headBase, deg(pose.headTilt + pose.bend * 0.3), headPivot);
    const head: Xf = (p) => {
      const q = headRigid(p);
      const k = smoothstep(190, 10, p[1]); // hair on top trails
      return place(root([q[0] + hairLag * k * k, q[1]]));
    };
    const neck: Xf = (p) => {
      const k = smoothstep(neckBase[1] - 20, headBase[1] + 5, p[1]);
      const a = body(p);
      const b = headRigid(p);
      return place(root([a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k]));
    };

    /* arms: wrists are placed by the pose, shoulder and elbow are solved */
    const arm = (s: "L" | "R", target: V): Xf => {
      const R = ARMS[s];
      const S2 = body(R.S);
      // elbow goes to the outside of the body
      const a = ik2(S2, R.l1, R.l2, target, 1);
      const b = ik2(S2, R.l1, R.l2, target, -1);
      const sol = (a.elbow[0] - S2[0]) * R.out + a.elbow[1] * 0.35 > (b.elbow[0] - S2[0]) * R.out + b.elbow[1] * 0.35 ? a : b;
      const up = rotAbout(R.S, angDiff(sol.upper, R.restU), S2);
      const fore = rotAbout(R.E, angDiff(sol.fore, R.restF), up(R.E));
      const segs: [V, V][] = [
        [R.S, R.E],
        [R.E, add(R.Wr, sub(R.Wr, R.E))],
      ];
      return (p) => {
        const s1 = smoothstep(-45, 80, dot(sub(p, R.S), R.dirU));
        const q = blend(p, [up, fore], boneWeights(p, segs, 6));
        const r0 = body(p);
        return place(root([r0[0] * (1 - s1) + q[0] * s1, r0[1] * (1 - s1) + q[1] * s1]));
      };
    };

    return { torso, leg, head, neck, armL: arm("L", pose.handL), armR: arm("R", pose.handR) };
  }, [pose, placement, squashY, hemLag, hairLag, breath]);

  if (!imgs) return null;
  const P = rig.pieces;
  const O = rig.overlays;
  const faceOverlay = face === "base" ? null : O["face_" + face];
  const mouthOverlay = mouth === "closed" ? null : O["mouth_" + mouth];
  const blinkOverlay = blink && face === "base" ? O.eyes_blink : null;
  return (
    <Stage3D width={W} height={H}>
      <SkinMesh img={imgs[P.legL.file]} rect={P.legL} deform={xf.leg} cell={24} order={1} />
      <SkinMesh img={imgs[P.legR.file]} rect={P.legR} deform={xf.leg} cell={24} order={1} />
      <SkinMesh img={imgs[P.torso.file]} rect={P.torso} deform={xf.torso} cell={26} order={2} />
      <SkinMesh img={imgs[P.neck.file]} rect={P.neck} deform={xf.neck} cell={12} order={3} />
      <SkinMesh img={imgs[P.head.file]} rect={P.head} deform={xf.head} cell={16} order={4} />
      {faceOverlay ? <SkinMesh img={imgs[faceOverlay.file]} rect={faceOverlay} deform={xf.head} cell={16} order={5} /> : null}
      {blinkOverlay ? <SkinMesh img={imgs[blinkOverlay.file]} rect={blinkOverlay} deform={xf.head} cell={16} order={5} /> : null}
      {mouthOverlay && face !== "sing" ? (
        <SkinMesh img={imgs[mouthOverlay.file]} rect={mouthOverlay} deform={xf.head} cell={16} order={6} />
      ) : null}
      <SkinMesh img={imgs[P.armL.file]} rect={P.armL} deform={xf.armL} cell={14} order={7} />
      <SkinMesh img={imgs[P.armR.file]} rect={P.armR} deform={xf.armR} cell={14} order={8} />
    </Stage3D>
  );
};
