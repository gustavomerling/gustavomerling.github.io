import type { CellContext } from '../../engine/context.ts'

/*
 * Wood soaks up puddles: rain that collects against (or a few cells from) trees, house walls,
 * floors, doors and fences slowly sinks in and dries off, instead of standing there for ever in
 * every nook. Only shallow water (a puddle open to the sky, at most a couple of cells deep) —
 * never a lake, nor the water under a pier.
 */

/** Chance per tick that a wooden cell soaks up a puddle cell beside it. */
const SOAK_CHANCE = 0.02
/** It draws on puddle cells this far along beside it. */
const REACH = 3
/** Puddles this deep (or shallower) soak away. */
const SHALLOW = 2

const SIDES = [
  [0, -1],
  [-1, 0],
  [1, 0],
  [0, 1],
] as const

/** A puddle cell touching this one: gone (soaked into the wood), now and then. */
export function soakPuddles(ctx: CellContext) {
  if (ctx.random() >= SOAK_CHANCE) return
  const side = SIDES[(ctx.random() * SIDES.length) | 0]
  const dy = side[1]
  let dx: number = side[0]
  // Sideways it draws water from a little way along the ground too (the middle of a puddle).
  if (dy === 0) {
    const reach = 1 + Math.floor(ctx.random() * REACH)
    for (let k = 1; k < reach; k++) if (ctx.get(dx * k, 0) !== 'water' && ctx.get(dx * k, 0) !== 'air') return
    dx *= reach
  }
  if (ctx.get(dx, dy) !== 'water') return
  // The top of the puddle (open to the sky)...
  let top = dy
  while (ctx.get(dx, top - 1) === 'water') top--
  if (ctx.get(dx, top - 1) !== 'air') return
  // ...and not deep: a lake isn't a puddle.
  let depth = 1
  while (depth <= SHALLOW && ctx.get(dx, top + depth) === 'water') depth++
  if (depth > SHALLOW) return
  // The top cell goes (the puddle sinks from the top down).
  ctx.set(dx, top, 'air')
}
