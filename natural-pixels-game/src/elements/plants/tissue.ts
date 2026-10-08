import { WATER_CELL_UNITS } from '../../engine/constants.ts'
import type { CellContext } from '../../engine/context.ts'
import { consumeFertility, fertilityAt, fertilityBoost } from '../terrain/fertility.ts'

/**
 * Shared rules for living plant tissue (plant stem, wood, leaf).
 * All tissue shares the 'plant' moisture group, so sap spreads between them.
 */

export const TISSUE_GROUP = 'plant'

/** Plants grow mostly by daylight: 10% speed at night, full speed by day. */
export function sunlight(ctx: CellContext): number {
  return 0.1 + 0.9 * ctx.light()
}

/** Roots drink up to this many times faster from the most fertile soil. */
const FERTILE_DRINK_BOOST = 1.5

/** Pulls water from wet soil touching the cell from below (the plant's roots). */
export function drinkFromSoil(ctx: CellContext, rate: number, capacity: number) {
  for (let dx = -1; dx <= 1; dx++) {
    const room = capacity - ctx.water(0, 0)
    if (room <= 0) return
    if (ctx.get(dx, 1) !== 'soil') continue
    const boosted = Math.round(rate * fertilityBoost(fertilityAt(ctx, dx, 1), FERTILE_DRINK_BOOST))
    const take = Math.min(boosted, ctx.water(dx, 1), room)
    if (take <= 0) continue
    ctx.setWater(dx, 1, ctx.water(dx, 1) - take)
    ctx.setWater(0, 0, ctx.water(0, 0) + take)
    consumeFertility(ctx, dx, 1, 0.05)
  }
}

const SIDES = [
  [0, -1],
  [-1, 0],
  [1, 0],
  [0, 1],
] as const

/**
 * Soaks up one touching water cell if there's room. Same idea as `moisture.absorbs`,
 * for tissue that only absorbs under a condition (tree wood, not painted wood).
 */
export function absorbWater(ctx: CellContext, capacity: number) {
  const water = ctx.water(0, 0)
  if (water + WATER_CELL_UNITS > capacity) return
  const [dx, dy] = SIDES[(ctx.random() * SIDES.length) | 0]
  if (ctx.get(dx, dy) !== 'water') return
  ctx.set(dx, dy, 'air')
  ctx.setWater(0, 0, water + WATER_CELL_UNITS)
}
