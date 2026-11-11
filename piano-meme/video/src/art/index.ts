// Manifests written by tools/variants.py: master size + where each patch sits.
import S1 from "./S1.json";
import S2 from "./S2.json";
import S4 from "./S4.json";
import S5 from "./S5.json";

export type Patch = { x: number; y: number; w: number; h: number };
export type Manifest = {
  master: string;
  width: number;
  height: number;
  patches: Record<string, Patch>;
  top?: { h: number; overlap: number }; // mirrored wall above the drawing (tools/extend_top.py)
};

export const ART: Record<string, Manifest> = {
  S1: S1 as Manifest,
  S2: S2 as Manifest,
  S4: S4 as Manifest,
  S5: S5 as Manifest,
};

export const patchSrc = (angle: string, id: string) => `art/${angle}/${id}.png`;
