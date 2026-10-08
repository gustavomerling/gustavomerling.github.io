/*
 * Time of day runs 0..1: 0 = midnight, 0.25 = sunrise, 0.5 = noon, 0.75 = sunset.
 * Day and night pass at different speeds: a long day and a short night.
 */

/** Sunrise to sunset, in ticks: 3 minutes at normal speed. */
export const DAY_PHASE_TICKS = 3 * 60 * 60
/** Sunset to sunrise, in ticks: 45 seconds. */
export const NIGHT_PHASE_TICKS = 45 * 60

/** New worlds start mid-morning. */
export const START_TIME = 0.32
/** With the cycle off, it's always this time (late morning, full light). */
export const FIXED_TIME = 0.42

export function isDaytime(time: number): boolean {
  return time >= 0.25 && time < 0.75
}

/** Time of day after one more tick. */
export function advanceTime(time: number): number {
  const step = 0.5 / (isDaytime(time) ? DAY_PHASE_TICKS : NIGHT_PHASE_TICKS)
  return (time + step) % 1
}

/**
 * Daylight 0..1 for a time of day. Short dawn and dusk ramps, so most of the day is fully lit.
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
  const half = isDaytime(time) ? time - 0.25 : (time + 0.25) % 1
  const progress = half / 0.5
  return { x: 0.05 + progress * 0.9, y: 0.75 - Math.sin(progress * Math.PI) * 0.62 }
}
