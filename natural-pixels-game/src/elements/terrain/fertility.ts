import type { CellContext } from '../../engine/context.ts'

/*
 * Soil fertility lives in the soil cell's `data` (0..255). Organic matter lying on soil
 * (ash, dry leaves) slowly mixes into it; plants use it up as they drink.
 */
export const MAX_FERTILITY = 255

/** Fertility of the soil cell at the offset (0 if it isn't soil). */
export function fertilityAt(ctx: CellContext, dx: number, dy: number): number {
  return ctx.get(dx, dy) === 'soil' ? ctx.data(dx, dy) : 0
}

/** Growth multiplier from fertility: 1× on plain soil, up to `1 + boost`× on the richest. */
export function fertilityBoost(fertility: number, boost: number): number {
  return 1 + (fertility / MAX_FERTILITY) * boost
}

const BELOW_AND_SIDES = [
  [0, 1],
  [-1, 0],
  [1, 0],
] as const

/**
 * Organic matter resting on soil mixes into it: with `chance` per tick the cell disappears
 * and the soil gains `amount` fertility. Returns true if it composted.
 */
export function compost(ctx: CellContext, chance: number, amount: number): boolean {
  if (ctx.random() >= chance) return false
  for (const [dx, dy] of BELOW_AND_SIDES) {
    if (ctx.get(dx, dy) !== 'soil') continue
    const fertility = ctx.data(dx, dy)
    if (fertility + amount > MAX_FERTILITY) continue
    ctx.setData(dx, dy, fertility + amount)
    ctx.set(0, 0, 'air')
    return true
  }
  return false
}

/** Plants use fertility up a little as they drink. */
export function consumeFertility(ctx: CellContext, dx: number, dy: number, chance: number) {
  const fertility = fertilityAt(ctx, dx, dy)
  if (fertility > 0 && ctx.random() < chance) ctx.setData(dx, dy, fertility - 1)
}
