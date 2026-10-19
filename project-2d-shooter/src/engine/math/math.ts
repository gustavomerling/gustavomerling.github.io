export const clamp = (v: number, min: number, max: number): number => (v < min ? min : v > max ? max : v);

export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

/** Moves `current` towards `target` by at most `maxDelta` without overshooting. */
export const approach = (current: number, target: number, maxDelta: number): number =>
  current < target ? Math.min(current + maxDelta, target) : Math.max(current - maxDelta, target);

/** Frame-rate independent exponential smoothing factor (use as `lerp(a, b, damp(rate, dt))`). */
export const damp = (rate: number, dt: number): number => 1 - Math.exp(-rate * dt);

export const sign = (v: number): -1 | 0 | 1 => (v > 0 ? 1 : v < 0 ? -1 : 0);

export const DEG2RAD = Math.PI / 180;
