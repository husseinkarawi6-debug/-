// Manifests written by tools/variants.py: master size + where each patch sits.
import S2 from "./S2.json";
import S4b from "./S4b.json";
import S5 from "./S5.json";
import S6 from "./S6.json";
import S8 from "./S8.json";

export type Patch = { x: number; y: number; w: number; h: number };
export type Manifest = {
  master: string;
  width: number;
  height: number;
  patches: Record<string, Patch>;
  top?: { h: number; overlap: number }; // mirrored wall above the drawing (tools/extend_top.py)
};

export const ART: Record<string, Manifest> = {
  S2: S2 as Manifest, // the lazy one on the couch (+ headphones for the finale)
  S4b: S4b as Manifest, // the learner, distracted face
  S5: S5 as Manifest, // pianist, wide stage (+ "empty" stage for the finale)
  S6: S6 as Manifest, // pianist's hands
  S8: S8 as Manifest, // pianist, medium: face and hands
};

export const patchSrc = (angle: string, id: string) => `art/${angle}/${id}.png`;
