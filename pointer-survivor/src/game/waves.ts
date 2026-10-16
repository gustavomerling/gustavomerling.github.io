/**
 * Spawn schedule entry. Active while from <= time < to.
 * `interval` = seconds between spawns, `batch` = enemies per spawn,
 * `mix` = enemy id -> relative weight. `hpScale` multiplies enemy HP.
 * Each map lists its own waves (see maps/).
 */
export interface WaveDef {
  from: number
  to: number
  interval: number
  batch: number
  mix: Record<string, number>
  hpScale: number
}

/** Hard cap on live enemies so the canvas stays smooth. */
export const MAX_ENEMIES = 260
