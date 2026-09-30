export const durations = { instant: 0, fast: 150, normal: 250, slow: 400 } as const;
export type DurationName = keyof typeof durations;

// Curva cúbica estándar [x1, y1, x2, y2] (Easing.bezier en RN)
export const easing = { standard: [0.2, 0, 0, 1] as const };

export function resolveDurations(reduceMotion: boolean): Record<DurationName, number> {
  return reduceMotion ? { instant: 0, fast: 0, normal: 0, slow: 0 } : { ...durations };
}
