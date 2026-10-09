import { Bug } from 'lucide-react'
import type { CellContext } from '../../engine/context.ts'
import type { ElementDefinition } from '../types.ts'
import { findNearest } from './shared.ts'

/*
 * Frogs live by the lakes: they hop along the shore (a long jump, up and over), swim, and snap
 * up fireflies, bees and butterflies that come too close. On warm nights two frogs side by side
 * near the water may have a little one, up to a few around.
 *
 * Frog `data`: bit 0 = heading right.
 */
const RIGHT = 1

const HOP_CHANCE = 0.02
const SWIM_CHANCE = 0.08
const TURN_CHANCE = 0.1
/** It stays within this many cells of water (heading back to it when further). */
const HOME_RANGE = 8
const SNAP_CHANCE = 0.2
const BREED_CHANCE = 0.0004
const CROWD = 5
const CROWD_RADIUS = 14

const PREY: ReadonlySet<string | null> = new Set(['firefly', 'bee', 'butterfly'])
/** It hops through these (keeping them where they are). */
const OPEN: ReadonlySet<string | null> = new Set(['air', 'grass', 'flower', 'litter', 'seed', 'plant'])

export const frog: ElementDefinition = {
  id: 'frog',
  name: 'Frog',
  description: 'Hops along lake shores, swims, and snaps up fireflies, bees and butterflies.',
  category: 'animals',
  matter: 'static',
  density: 12,
  color: { base: '#5f9e4a', variation: 0.15 },
  icon: Bug,
  brushFill: 0.01,
  thermal: { conductivity: 0.1, above: { temp: 70, into: 'ash' } },
  update(ctx) {
    snap(ctx)
    // Swimming: paddles about, up towards the surface, and out onto the shore now and then.
    if (ctx.under(0, 0) === 'water') {
      if (ctx.random() >= SWIM_CHANCE) return true
      const dx = ctx.data(0, 0) & RIGHT ? 1 : -1
      if (ctx.get(0, -1) === 'water' && ctx.random() < 0.5) ctx.moveOver(0, -1)
      else if (ctx.get(dx, 0) === 'water' || OPEN.has(ctx.get(dx, 0))) ctx.moveOver(dx, 0)
      else if (OPEN.has(ctx.get(dx, -1))) ctx.moveOver(dx, -1)
      else ctx.setData(0, 0, ctx.data(0, 0) ^ RIGHT)
      return true
    }
    // Gravity: falls through air (and into water).
    const below = ctx.get(0, 1)
    if (below === 'air' || below === 'water') {
      ctx.moveOver(0, 1)
      return true
    }
    if (ctx.light() < 0.3 && ctx.random() < BREED_CHANCE) breed(ctx)
    if (ctx.random() < HOP_CHANCE) hop(ctx)
    return true
  },
}

/** A long hop: up and two cells over (gravity brings it down). Heads back to the water when far from it. */
function hop(ctx: CellContext) {
  let data = ctx.data(0, 0)
  if (ctx.random() < TURN_CHANCE) data ^= RIGHT
  const water = findNearest(HOME_RANGE, (dx, dy) => ctx.get(dx, dy) === 'water')
  if (!water) {
    // Lost: look further, and head that way.
    const far = findNearest(HOME_RANGE * 3, (dx, dy) => ctx.get(dx, dy) === 'water')
    if (far) data = far[0] > 0 ? data | RIGHT : data & ~RIGHT
  }
  const dx = data & RIGHT ? 1 : -1
  if (OPEN.has(ctx.get(0, -1)) && OPEN.has(ctx.get(dx, -1)) && (OPEN.has(ctx.get(2 * dx, -1)) || ctx.get(2 * dx, -1) === 'water')) ctx.moveOver(2 * dx, -1)
  else if (OPEN.has(ctx.get(dx, 0)) || ctx.get(dx, 0) === 'water') ctx.moveOver(dx, 0)
  else data ^= RIGHT
  ctx.setData(0, 0, data)
}

/** Anything tasty right next to it: gulp. */
function snap(ctx: CellContext) {
  if (ctx.random() >= SNAP_CHANCE) return
  for (let dy = -2; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (!PREY.has(ctx.get(dx, dy))) continue
      ctx.set(dx, dy, ctx.under(dx, dy) ?? 'air')
      return
    }
  }
}

function breed(ctx: CellContext) {
  let mate = false
  for (const dx of [-2, -1, 1, 2]) if (ctx.get(dx, 0) === 'frog') mate = true
  if (!mate || !findNearest(HOME_RANGE, (dx, dy) => ctx.get(dx, dy) === 'water')) return
  let crowd = 0
  for (let dy = -CROWD_RADIUS; dy <= CROWD_RADIUS; dy++) {
    for (let dx = -CROWD_RADIUS; dx <= CROWD_RADIUS; dx++) if (ctx.get(dx, dy) === 'frog' && ++crowd >= CROWD) return
  }
  for (const dx of [-1, 1]) {
    if (ctx.get(dx, 0) === 'air') {
      ctx.set(dx, 0, 'frog', { data: dx > 0 ? RIGHT : 0 })
      return
    }
  }
}

