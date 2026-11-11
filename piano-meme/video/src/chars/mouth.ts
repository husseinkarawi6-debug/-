// Mouth shapes per frame, from Rhubarb (audio/mouth/*.json, bundled in all.json).
import mouthJson from "../../../audio/mouth/all.json";

type Cue = { start: number; end: number; shape: string };
const MOUTH = mouthJson as unknown as Record<string, { cues: Cue[] }>;

/** Rhubarb shape (A–F, X = rest) for a line at a global frame. */
export const mouthAt = (lineId: string | undefined, frame: number): string => {
  if (!lineId || !MOUTH[lineId]) return "X";
  const c = MOUTH[lineId].cues.find((q) => frame >= q.start && frame <= q.end);
  return c ? c.shape : "X";
};

/** Frame of the first mouth opening of a line (for the breath before it). */
export const firstOpening = (lineId: string | undefined): number | null => {
  if (!lineId || !MOUTH[lineId]) return null;
  const c = MOUTH[lineId].cues.find((q) => q.shape !== "X");
  return c ? c.start : null;
};

export const lastOpening = (lineId: string | undefined): number | null => {
  if (!lineId || !MOUTH[lineId]) return null;
  const open = MOUTH[lineId].cues.filter((q) => q.shape !== "X");
  return open.length ? open[open.length - 1].end : null;
};
