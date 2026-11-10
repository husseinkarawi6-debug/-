// Small 2D helpers for the rigs. Everything is a pure function of its inputs.
export type V = [number, number];
/** A transform: takes a point in the character's rest drawing, returns where it is now. */
export type Xf = (p: V) => V;

export const add = (a: V, b: V): V => [a[0] + b[0], a[1] + b[1]];
export const sub = (a: V, b: V): V => [a[0] - b[0], a[1] - b[1]];
export const mulS = (a: V, s: number): V => [a[0] * s, a[1] * s];
export const dot = (a: V, b: V) => a[0] * b[0] + a[1] * b[1];
export const cross = (a: V, b: V) => a[0] * b[1] - a[1] * b[0];
export const len = (a: V) => Math.hypot(a[0], a[1]);
export const norm = (a: V): V => {
  const l = len(a) || 1;
  return [a[0] / l, a[1] / l];
};
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const lerpV = (a: V, b: V, t: number): V => [lerp(a[0], b[0], t), lerp(a[1], b[1], t)];
export const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));
export const smoothstep = (e0: number, e1: number, x: number) => {
  const t = clamp((x - e0) / (e1 - e0), 0, 1);
  return t * t * (3 - 2 * t);
};
export const deg = (d: number) => (d * Math.PI) / 180;
export const rotate = (p: V, a: number): V => {
  const c = Math.cos(a);
  const s = Math.sin(a);
  return [p[0] * c - p[1] * s, p[0] * s + p[1] * c];
};

export const identity: Xf = (p) => p;
/** Rotate around `pivot` (rest position) by `angle`, then carry the pivot to `to`. Optional scale. */
export const rotAbout = (pivot: V, angle: number, to: V = pivot, sx = 1, sy = 1): Xf => {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  return (p) => {
    const x = (p[0] - pivot[0]) * sx;
    const y = (p[1] - pivot[1]) * sy;
    return [to[0] + x * c - y * s, to[1] + x * s + y * c];
  };
};
export const compose = (outer: Xf, inner: Xf): Xf => (p) => outer(inner(p));

/** Distance from p to the segment a-b. */
export const distSeg = (p: V, a: V, b: V) => {
  const ab = sub(b, a);
  const t = clamp(dot(sub(p, a), ab) / (dot(ab, ab) || 1), 0, 1);
  return len(sub(p, add(a, mulS(ab, t))));
};

/** Soft bone weights: nearer bone wins, with a smooth hand-over around each joint. */
export const boneWeights = (p: V, segs: [V, V][], power = 5): number[] => {
  const w = segs.map(([a, b]) => 1 / Math.pow(distSeg(p, a, b) + 6, power));
  const sum = w.reduce((x, y) => x + y, 0);
  return w.map((x) => x / sum);
};

export const blend = (p: V, xfs: Xf[], w: number[]): V => {
  let x = 0;
  let y = 0;
  for (let i = 0; i < xfs.length; i++) {
    if (w[i] < 1e-4) continue;
    const q = xfs[i](p);
    x += q[0] * w[i];
    y += q[1] * w[i];
  }
  return [x, y];
};

/**
 * Two-bone IK. Shoulder at `s`, bone lengths l1/l2, hand should reach `target`.
 * `bendSign` picks which side the elbow goes (copied from the rest pose).
 * Returns the absolute angles of both bones. Never fails: if the target is out
 * of reach the arm just points at it fully stretched.
 */
export const ik2 = (s: V, l1: number, l2: number, target: V, bendSign: number) => {
  const d0 = sub(target, s);
  const d = clamp(len(d0), Math.abs(l1 - l2) + 0.5, l1 + l2 - 0.5);
  const base = Math.atan2(d0[1], d0[0]);
  const cosA = clamp((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d), -1, 1);
  const a = Math.acos(cosA);
  const upper = base - bendSign * a;
  const elbow: V = [s[0] + Math.cos(upper) * l1, s[1] + Math.sin(upper) * l1];
  const fore = Math.atan2(target[1] - elbow[1], target[0] - elbow[0]);
  return { upper, fore, elbow };
};

export const angleOf = (a: V, b: V) => Math.atan2(b[1] - a[1], b[0] - a[0]);
/** shortest signed difference a-b */
export const angDiff = (a: number, b: number) => {
  let d = a - b;
  while (d > Math.PI) d -= 2 * Math.PI;
  while (d < -Math.PI) d += 2 * Math.PI;
  return d;
};
