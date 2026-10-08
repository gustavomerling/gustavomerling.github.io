/** A full day (sunrise to sunrise) in ticks: 3 minutes at normal speed. */
export const DAY_TICKS = 3 * 60 * 60

/** New worlds start mid-morning. */
export const START_TIME = 0.32
/** With the cycle off, it's always this time (late morning, full light). */
export const FIXED_TIME = 0.42

/**
 * Daylight 0..1 for a time of day (0 = midnight, 0.25 = sunrise, 0.5 = noon, 0.75 = sunset).
 * Short dawn and dusk ramps, so most of the day is fully lit.
 */
export function daylightAt(time: number): number {
  const sun = Math.sin((time - 0.25) * Math.PI * 2)
  const t = Math.min(1, Math.max(0, (sun + 0.15) / 0.4))
  return t * t * (3 - 2 * t)
}

/**
 * Where the sun (by day) or moon (by night) sits on screen, in 0..1 coordinates (y down):
 * rises on the left, arcs across the top and sets on the right.
 */
export function sunPositionAt(time: number): { x: number; y: number } {
  const half = time >= 0.25 && time < 0.75 ? time - 0.25 : (time + 0.25) % 1
  const progress = half / 0.5
  return { x: 0.05 + progress * 0.9, y: 0.75 - Math.sin(progress * Math.PI) * 0.62 }
}
