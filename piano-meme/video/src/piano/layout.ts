import type { V } from "../rig/math";

/**
 * Keyboard seen from the front of the piano, camera above the strings looking at the
 * pianist. So the picture is mirrored compared to what the pianist sees:
 *   - low notes (bass) are on the RIGHT of the image, high notes on the LEFT;
 *   - the edge of the keys nearest the pianist is the TOP of the band,
 *     the black keys hang from the BOTTOM (fallboard side).
 */
export type KeyLayout = {
  yTop: number; // player-side edge of the keys (stage px)
  yBottom: number; // fallboard edge
  whiteW: number; // white key width at the top edge
  centerX: number; // stage x of the reference note
  centerMidi: number; // reference white note placed at centerX
  spread: number; // perspective: how much wider the band is at the bottom (0.05 = 5%)
  width: number;
};

export const defaultLayout: KeyLayout = {
  yTop: 1364,
  yBottom: 1506,
  whiteW: 36,
  centerX: 540,
  centerMidi: 57, // A3 sits in front of the pianist's chest
  spread: 0.05,
  width: 1080,
};

const WHITE_OF_PC = [0, 0, 1, 1, 2, 3, 3, 4, 4, 5, 5, 6];
const BLACK_PC = [false, true, false, true, false, false, true, false, true, false, true, false];
export const isBlack = (midi: number) => BLACK_PC[((midi % 12) + 12) % 12];
/** index of the white key (or of the white key just below a black key) */
export const whiteIndex = (midi: number) => Math.floor(midi / 12) * 7 + WHITE_OF_PC[((midi % 12) + 12) % 12];

/** x of a key's centre measured on the top edge (before perspective). */
const flatX = (L: KeyLayout, midi: number) => {
  const i = whiteIndex(midi) - whiteIndex(L.centerMidi) + (isBlack(midi) ? 0.5 : 0);
  return L.centerX - i * L.whiteW; // minus: mirrored
};
export const persp = (L: KeyLayout, x: number, y: number) => {
  const t = (y - L.yTop) / (L.yBottom - L.yTop);
  return L.width / 2 + (x - L.width / 2) * (1 + L.spread * t);
};

export const BLACK_LEN = 0.56; // black keys cover the lower part of the band
export const BLACK_W = 0.6; // of a white key

/** Where a fingertip lands on this key (stage px). */
export const keyTouchPoint = (L: KeyLayout, midi: number): V => {
  const h = L.yBottom - L.yTop;
  const y = isBlack(midi) ? L.yTop + h * (1 - BLACK_LEN) + h * 0.16 : L.yTop + h * 0.2;
  return [persp(L, flatX(L, midi), y), y];
};

export const keyRange = (L: KeyLayout) => {
  // all midi notes whose key is at least partly on screen
  const out: number[] = [];
  for (let m = 21; m <= 108; m++) {
    const x = flatX(L, m);
    if (x > -L.whiteW && x < L.width + L.whiteW) out.push(m);
  }
  return out;
};
export const keyFlatX = flatX;
