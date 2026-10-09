import { Fish } from 'lucide-react'
import type { CellContext } from '../../engine/context.ts'
import type { ElementDefinition } from '../types.ts'
import { decompose, touches, trySwap } from './shared.ts'

/*
 * Fish swim through water (swapping places with it) and through seaweed: swimming into a strand
 * it hides it for a moment (the strand comes back as it swims on), so the water stays the same.
 *
 * Fish `data` = heading (0 left, 1 right).
 * Fish `life` = ticks spent out of water.
 */
const RIGHT = 1
const SWIM_CHANCE = 0.3
const TURN_CHANCE = 0.01
/** Ticks a fish survives out of water (~5 s). */
const OUT_OF_WATER = 300
const FLOP_CHANCE = 0.05
/** Two fish close together now and then spawn another, up to a school. */
const SPAWN_CHANCE = 0.0006
const SCHOOL = 6
const SCHOOL_RADIUS = 12

const WATER: ReadonlySet<string | null> = new Set(['water'])
/** What counts as being in the water (seaweed grows in it). */
const WET: ReadonlySet<string | null> = new Set(['water', 'seaweed'])
const FALLS_THROUGH: ReadonlySet<string | null> = new Set(['air'])
const FLOPS_INTO: ReadonlySet<string | null> = new Set(['air', 'water'])

export const fish: ElementDefinition = {
  id: 'fish',
  name: 'Fish',
  description: 'Swims around in water. Out of water it flops and dies; boiling water cooks it.',
  category: 'animals',
  matter: 'static',
  density: 10,
  color: { base: '#ff9f43', variation: 0.15 },
  icon: Fish,
  brushFill: 0.02,
  thermal: { conductivity: 0.2, above: { temp: 45, into: 'air' } },
  update(ctx) {
    if (!touches(ctx, WET) && ctx.under(0, 0) !== 'seaweed') {
      stranded(ctx)
      return true
    }
    ctx.setLife(0, 0, 0)
    if (ctx.random() < SPAWN_CHANCE) spawn(ctx)
    if (ctx.random() < SWIM_CHANCE) swim(ctx)
    return true
  },
}

function swim(ctx: CellContext) {
  let data = ctx.data(0, 0)
  if (ctx.random() < TURN_CHANCE) data ^= RIGHT
  const dx = data & RIGHT ? 1 : -1
  const r = ctx.random()
  const dy = r < 0.2 ? -1 : r < 0.4 ? 1 : 0
  ctx.setData(0, 0, data)

  // Fish only ever move through water (and the seaweed in it).
  if (swimTo(ctx, dx, dy) || (dy !== 0 && swimTo(ctx, dx, 0))) return
  ctx.setData(0, 0, data ^ RIGHT)
}

/**
 * One cell through the water. Into seaweed: the fish covers the strand and leaves water where it
 * was; out of seaweed into water: the fish takes that water's place and the strand shows again.
 * Either way there's as much water as before.
 */
function swimTo(ctx: CellContext, dx: number, dy: number): boolean {
  const target = ctx.get(dx, dy)
  const inWeed = ctx.under(0, 0) === 'seaweed'
  if (target === 'water') {
    if (!inWeed) return trySwap(ctx, dx, dy, WATER)
    ctx.set(dx, dy, 'fish', { data: ctx.data(0, 0) })
    ctx.reveal(0, 0)
    return true
  }
  if (target !== 'seaweed') return false
  ctx.moveOver(dx, dy)
  if (!inWeed) ctx.set(0, 0, 'water')
  return true
}

/** With another fish close by and room in the water, a new fish (so lakes don't fish out). */
function spawn(ctx: CellContext) {
  let mate = false
  for (let dy = -2; dy <= 2 && !mate; dy++) for (let dx = -2; dx <= 2; dx++) if ((dx || dy) && ctx.get(dx, dy) === 'fish') mate = true
  if (!mate) return
  let school = 0
  for (let dy = -SCHOOL_RADIUS; dy <= SCHOOL_RADIUS; dy++) {
    for (let dx = -SCHOOL_RADIUS; dx <= SCHOOL_RADIUS; dx++) if (ctx.get(dx, dy) === 'fish' && ++school >= SCHOOL) return
  }
  for (const [dx, dy] of [[-1, 0], [1, 0], [0, 1], [0, -1]] as const) {
    if (ctx.get(dx, dy) !== 'water') continue
    ctx.set(dx, dy, 'fish', { data: ctx.random() < 0.5 ? RIGHT : 0 })
    return
  }
}

/** Out of water: fall, flop around, and die after a few seconds. */
function stranded(ctx: CellContext) {
  const out = ctx.life(0, 0) + 1
  if (out > OUT_OF_WATER) return decompose(ctx, 30)
  ctx.setLife(0, 0, out)

  if (trySwap(ctx, 0, 1, FALLS_THROUGH)) return
  if (ctx.random() < FLOP_CHANCE) {
    const side = ctx.random() < 0.5 ? -1 : 1
    // A hop: up and sideways if there's room, else just sideways (maybe back into the water).
    if (!trySwap(ctx, side, -1, FLOPS_INTO)) trySwap(ctx, side, 0, FLOPS_INTO)
  }
}
