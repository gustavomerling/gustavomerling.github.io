import type { CellContext } from '../../engine/context.ts'

/*
 * Small helpers shared by animal elements (bird, worm, fish, bee).
 */

export type Range = [number, number]

/** Below this daylight it's night: animals rest. */
export const NIGHT = 0.3

/** Random whole number of ticks in `[min, max]`. */
export function between(ctx: CellContext, [min, max]: Range): number {
  return Math.round(min + ctx.random() * (max - min))
}

/** Nearest cell (by rings, closest first) within `radius` that matches. */
export function findNearest(radius: number, match: (dx: number, dy: number) => boolean): [number, number] | null {
  for (let r = 1; r <= radius; r++) {
    for (let d = -r; d <= r; d++) {
      if (match(d, -r)) return [d, -r]
      if (match(d, r)) return [d, r]
      if (match(-r, d)) return [-r, d]
      if (match(r, d)) return [r, d]
    }
  }
  return null
}

/** Moves over the target (keeping it underneath) if its id is in `through`. */
export function tryMoveOver(ctx: CellContext, dx: number, dy: number, through: ReadonlySet<string | null>): boolean {
  if (!through.has(ctx.get(dx, dy))) return false
  ctx.moveOver(dx, dy)
  return true
}

/** Swaps places with the target if its id is in `into` (e.g. a fish through water). */
export function trySwap(ctx: CellContext, dx: number, dy: number, into: ReadonlySet<string | null>): boolean {
  if (!into.has(ctx.get(dx, dy))) return false
  ctx.swap(dx, dy)
  return true
}

const SIDES = [
  [0, -1],
  [-1, 0],
  [1, 0],
  [0, 1],
] as const

/** True if any of the 4 neighbours is one of `ids`. */
export function touches(ctx: CellContext, ids: ReadonlySet<string | null>): boolean {
  for (const [dx, dy] of SIDES) if (ids.has(ctx.get(dx, dy))) return true
  return false
}

/** A dead animal feeds the soil below it (if any) and disappears. */
export function decompose(ctx: CellContext, fertility: number) {
  if (ctx.get(0, 1) === 'soil') ctx.setData(0, 1, Math.min(255, ctx.data(0, 1) + fertility))
  ctx.set(0, 0, 'air')
}
