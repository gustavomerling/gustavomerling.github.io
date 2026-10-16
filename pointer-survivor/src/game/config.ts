import type { Stats } from './types'

/**
 * The arena is exactly the visible window — no scrolling map. Its shape follows the window,
 * but its AREA stays constant (in game units) so difficulty doesn't depend on screen size.
 */
export const ARENA_AREA = 800 * 500
/** width/height ratio limits, so ultra-wide or ultra-tall windows stay playable */
export const ARENA_MIN_ASPECT = 0.55
export const ARENA_MAX_ASPECT = 2.2

export function arenaSize(cssW: number, cssH: number): { width: number; height: number } {
  const aspect = Math.min(ARENA_MAX_ASPECT, Math.max(ARENA_MIN_ASPECT, cssW / Math.max(1, cssH)))
  const width = Math.round(Math.sqrt(ARENA_AREA * aspect))
  return { width, height: Math.round(ARENA_AREA / width) }
}

/** Max weapons / passives carried in one run. */
export const MAX_WEAPONS = 5
export const MAX_PASSIVES = 5

export const PLAYER_RADIUS = 7

/** Ctrl+Alt+Del: kills needed to fill the meter. */
export const TASK_MANAGER_KILLS = 80
/** Seconds the Ctrl+Alt+Del window stays on screen. */
export const TASK_FX_TIME = 1.8

export const BASE_STATS: Stats = {
  maxHp: 100,
  regen: 0,
  moveSpeed: 230,
  damage: 1,
  cooldown: 1,
  projectileSpeed: 1,
  area: 1,
  magnet: 60,
  armor: 0,
  greed: 1,
  amount: 0,
  growth: 1,
  luck: 1,
  invuln: 0.6,
}

export function xpForLevel(level: number): number {
  // level 1 -> 2 needs 4, grows smoothly
  return Math.floor(4 + (level - 1) * 3 + Math.pow(level - 1, 1.5))
}

/** KB earned at the end of a run, before greed. `tier` = map number (1, 2, 3...). */
export function runEarnings(
  r: { time: number; kills: number; level: number; floppies: number; victory: boolean },
  tier: number,
): number {
  const base = r.kills * 0.2 + r.time / 4 + r.level * 3 + r.floppies * 10
  return Math.floor(base * (1 + (tier - 1) * 0.4) + (r.victory ? 120 * tier : 0))
}
