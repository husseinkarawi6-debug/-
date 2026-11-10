import { z } from "zod";

export const W = 1080;
export const H = 1920;
export const FPS = 30;
export const TOTAL = 1056;

// The only colours allowed in the film (see BRIEF.md <style>).
export const C = {
  paper: "#A39E92",
  paperLight: "#D9D2C3",
  ink: "#141210",
  mid: "#6E6A62",
  red: "#8E1B1B",
  slip: "#E4DCCB",
} as const;

// Safe area: faces and captions live between 14% from the top and 35% from the bottom.
export const SAFE_TOP = Math.round(H * 0.14);
export const SAFE_BOTTOM = Math.round(H * 0.65);

// Props you can change in Remotion Studio (right panel) or with --props.
//   boil  = strength of the line wobble (1 = normal, 0 = off)
//   grain = strength of film grain / specks / flicker (1 = normal, 0 = off)
export const inkSchema = z.object({
  boil: z.number().min(0).max(3).step(0.05),
  grain: z.number().min(0).max(3).step(0.05),
  withAudio: z.boolean(),
});
export type InkProps = z.infer<typeof inkSchema>;
export const defaultInkProps: InkProps = { boil: 1, grain: 1, withAudio: true };
