// All timing comes from ../../audio/analysis.json (made by audio/analyze.py).
// Nothing here invents a time: change the timing in timing.md / analyze.py and re-run.
import analysisJson from "../../audio/analysis.json";

export type Speaker = "learner" | "lazy" | "both";
export type Shot = { shot: number; start: number; end: number; speaker: Speaker; silent: boolean };
export type CaptionEntry = { start: number; end: number; text: string; lang: "en" | "es" };
export type Line = {
  id: string;
  shot: number;
  speaker: Speaker;
  text: string;
  lang: "en" | "es";
  shotStart: number;
  shotEnd: number;
  speechStart?: number;
  speechEnd?: number;
};
export type Onset = { frame: number; strength: number; strong: boolean };

type Analysis = {
  fps: number;
  durationInFrames: number;
  audioPresent: boolean;
  shots: Shot[];
  captions: CaptionEntry[];
  lines: Line[];
  tempo?: number;
  beats?: number[];
  onsets?: Onset[];
  pianoLoud?: { threshold: number; runs: [number, number][]; main: [number, number] | null };
};

export const analysis = analysisJson as unknown as Analysis;

export const shots = analysis.shots;
export const captions = analysis.captions;
export const lines = analysis.lines;
export const beats = analysis.beats ?? [];
export const onsets = analysis.onsets ?? [];

/** Frames per beat (falls back to 120 bpm until the audio is analysed). */
export const beatFrames = analysis.tempo ? (60 / analysis.tempo) * analysis.fps : 15;

export const lineForShot = (shot: number) => lines.find((l) => l.shot === shot);
