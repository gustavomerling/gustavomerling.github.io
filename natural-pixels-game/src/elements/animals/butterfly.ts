import { Flower } from 'lucide-react'
import type { CellContext } from '../../engine/context.ts'
import type { ElementDefinition } from '../types.ts'
import { findNearest, shelterTime, tryMoveOver } from './shared.ts'

/*
 * Butterflies flutter low over the meadows by day, from flower to flower, and settle down at
 * night (or in the rain). Flowers in the sun now and then bring a new one; they live a few
 * days. Every butterfly is a little different in colour.
 *
 * Butterfly `data`: bit 0 = heading right.
 */
const RIGHT = 1

const MOVE_CHANCE = 0.35
/** How far it spots a flower. */
const SIGHT = 7
/** They stay this low over the ground. */
const MAX_HEIGHT = 10
/** A flower in the sun brings a butterfly now and then, while there are few around. */
const HATCH_CHANCE = 0.001
const CROWD = 3
const CROWD_RADIUS = 10

const FLY_THROUGH: ReadonlySet<string | null> = new Set(['air', 'grass', 'flower', 'plant', 'wheat', 'wheat_ripe'])

export const butterfly: ElementDefinition = {
  id: 'butterfly',
  name: 'Butterfly',
  description: 'Flutters from flower to flower on sunny days and settles down at night.',
  category: 'animals',
  matter: 'static',
  density: 1,
  color: { base: '#ffa86b', variation: 0.45 },
  icon: Flower,
  brushFill: 0.01,
  thermal: { conductivity: 0.05, above: { temp: 60, into: 'air' } },
  lifetime: { min: 9000, max: 18000 },
  update(ctx) {
    if (shelterTime(ctx)) {
      // Floats down to rest on whatever is below.
      if (ctx.get(0, 1) === 'air' && ctx.random() < 0.2) ctx.moveOver(0, 1)
      return true
    }
    if (ctx.random() < MOVE_CHANCE) flutter(ctx)
    return true
  },
}

/** Too far above the ground: time to come down a bit. */
function tooHigh(ctx: CellContext): boolean {
  for (let k = 1; k <= MAX_HEIGHT; k++) if (!FLY_THROUGH.has(ctx.get(0, k))) return false
  return true
}

function flutter(ctx: CellContext) {
  let data = ctx.data(0, 0)
  if (ctx.random() < 0.05) data ^= RIGHT
  let dx = data & RIGHT ? 1 : -1
  // Up and down a lot: that's how butterflies fly.
  let dy = tooHigh(ctx) ? 1 : ctx.random() < 0.5 ? -1 : 1
  const flower = ctx.random() < 0.5 ? findNearest(SIGHT, (fx, fy) => ctx.get(fx, fy) === 'flower') : null
  if (flower) {
    dx = Math.sign(flower[0]) || dx
    dy = Math.sign(flower[1] - 1) || dy
  }
  if (tryMoveOver(ctx, dx, dy, FLY_THROUGH) || tryMoveOver(ctx, dx, 0, FLY_THROUGH) || tryMoveOver(ctx, 0, -1, FLY_THROUGH)) {
    ctx.setData(0, 0, data)
    return
  }
  ctx.setData(0, 0, data ^ RIGHT)
}

/** Called by flowers in the sun: a butterfly just above, if there are few around. */
export function hatchButterfly(ctx: CellContext) {
  if (ctx.random() >= HATCH_CHANCE || ctx.get(0, -1) !== 'air') return
  let around = 0
  for (let dy = -CROWD_RADIUS; dy <= CROWD_RADIUS; dy++) {
    for (let dx = -CROWD_RADIUS; dx <= CROWD_RADIUS; dx++) {
      if (ctx.get(dx, dy) === 'butterfly' && ++around >= CROWD) return
    }
  }
  ctx.set(0, -1, 'butterfly', { data: ctx.random() < 0.5 ? RIGHT : 0 })
}
