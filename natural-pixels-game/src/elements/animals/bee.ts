import { Bug } from 'lucide-react'
import type { CellContext } from '../../engine/context.ts'
import { POLLINATED } from '../plants/leaf.ts'
import type { ElementDefinition } from '../types.ts'
import { between, findNearest, shelterTime, tryMoveOver, type Range } from './shared.ts'

/*
 * Bee `data`: bit 0 = resting, bit 1 = heading right.
 * Bee `life` = ticks left resting.
 */
const RESTING = 1
const RIGHT = 2

const MOVE_CHANCE = 0.6
/** How far a bee spots leaves that still need pollinating. */
const SIGHT = 8
const REST_CHANCE = 0.01
const REST_TICKS: Range = [60, 180]
/** Bees visiting flowers sometimes bring a new bee along, up to a swarm. */
const BROOD_CHANCE = 0.002
const SWARM = 8
const SWARM_RADIUS = 8

/** Bees zip through foliage like birds do, without disturbing it. */
const FLY_THROUGH: ReadonlySet<string | null> = new Set(['air', 'leaf', 'wood', 'plant', 'grass'])
const FOLIAGE: ReadonlySet<string | null> = new Set(['leaf', 'wood', 'plant', 'grass'])

export const bee: ElementDefinition = {
  id: 'bee',
  name: 'Bee',
  description: 'Buzzes around tree crowns pollinating them: pollinated leaves bear much more fruit.',
  category: 'animals',
  matter: 'static',
  density: 2,
  color: { base: '#f5c518', variation: 0.1 },
  icon: Bug,
  brushFill: 0.01,
  thermal: { conductivity: 0.05, above: { temp: 70, into: 'air' } },
  update(ctx) {
    pollinate(ctx)
    const data = ctx.data(0, 0)

    // At night (and in the rain) bees settle on whatever is below and wait for the sun.
    if (shelterTime(ctx)) {
      if (ctx.get(0, 1) === 'air') ctx.moveOver(0, 1)
      return true
    }

    if (data & RESTING) {
      const left = ctx.life(0, 0)
      if (left > 0) ctx.setLife(0, 0, left - 1)
      else ctx.setData(0, 0, data & ~RESTING)
      return true
    }

    if (ctx.random() < REST_CHANCE && FOLIAGE.has(ctx.under(0, 0))) {
      ctx.setData(0, 0, data | RESTING)
      ctx.setLife(0, 0, between(ctx, REST_TICKS))
      return true
    }

    if (ctx.random() < MOVE_CHANCE) fly(ctx, data)
    return true
  },
}

function fly(ctx: CellContext, data: number) {
  const target = findNearest(SIGHT, (dx, dy) => needsPollen(ctx, dx, dy))
  let dx: number
  let dy: number
  if (target && ctx.random() < 0.8) {
    dx = Math.sign(target[0])
    dy = Math.sign(target[1])
  } else {
    // Wandering: erratic zig-zag in the current heading.
    dx = data & RIGHT ? 1 : -1
    dy = Math.floor(ctx.random() * 3) - 1
  }

  if (tryMoveOver(ctx, dx, dy, FLY_THROUGH)) return
  if (tryMoveOver(ctx, dx, -1, FLY_THROUGH)) return
  ctx.setData(0, 0, data ^ RIGHT)
}

function needsPollen(ctx: CellContext, dx: number, dy: number): boolean {
  const id = ctx.get(dx, dy)
  return id === 'flower' || (id === 'leaf' && (ctx.data(dx, dy) & POLLINATED) === 0)
}

/** Every leaf touching the bee gets pollinated; a flower may bring a new bee. */
function pollinate(ctx: CellContext) {
  let flower = false
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (!dx && !dy) continue
      const id = ctx.get(dx, dy)
      if (id === 'leaf') ctx.setData(dx, dy, ctx.data(dx, dy) | POLLINATED)
      else if (id === 'flower') flower = true
    }
  }
  if (flower && ctx.random() < BROOD_CHANCE) brood(ctx)
}

function brood(ctx: CellContext) {
  let bees = 0
  for (let dy = -SWARM_RADIUS; dy <= SWARM_RADIUS; dy++) {
    for (let dx = -SWARM_RADIUS; dx <= SWARM_RADIUS; dx++) if (ctx.get(dx, dy) === 'bee') bees++
  }
  if (bees >= SWARM) return
  if (ctx.get(0, -1) === 'air') ctx.set(0, -1, 'bee')
}
