import { Easing, interpolate } from "remotion";

/**
 * Breathing as a tiny whole-body scale (max 1%): a slow idle breath, plus an
 * in-breath 4–6 frames before speaking that is held while talking and let go
 * after the line.
 */
export const breathAmount = (f: number, speakStart: number | null, speakEnd: number | null, seed = 0) => {
  const idle = 0.0018 * (0.5 + 0.5 * Math.sin((f / 30) * 2 * Math.PI * 0.28 + seed));
  if (speakStart === null || speakEnd === null) return idle;
  const inhale = interpolate(f, [speakStart - 6, speakStart - 1], [0, 0.006], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.quad),
  });
  const exhale = interpolate(f, [speakEnd, speakEnd + 12], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.inOut(Easing.quad),
  });
  return idle + inhale * exhale;
};
