import { Rabbit } from 'lucide-react'
import type { CellContext } from '../../engine/context.ts'
import type { ElementDefinition } from '../types.ts'
import { decompose, shelterTime } from './shared.ts'

/*
 * Rabbits hop around on the ground, nibbling grass and (much preferred) wheat. Well-fed
 * rabbits next to each other have babies, up to a crowd. Fences keep them out of fields.
 *
 * Rabbit `data`: bit 0 = heading right. `life` = ticks since it last ate.
 */
const RIGHT = 1

const HOP_CHANCE = 0.06
const TURN_CHANCE = 0.08
/** Gets peckish after this long, starves after that. */
const HUNGRY = 900
const STARVED = 9000
const BREED_CHANCE = 0.0008
/** No more babies once this many rabbits live around here. */
const CROWD = 4
const CROWD_RADIUS = 16
/** Ticks it can stay in water before drowning (it paddles back up meanwhile). */
const DROWN = 1200

/** It hops through these (keeping them where they are). */
const OPEN: ReadonlySet<string | null> = new Set(['air', 'grass', 'flower', 'litter', 'seed'])
const FOOD: ReadonlySet<string | null> = new Set(['wheat', 'wheat_ripe', 'grass', 'flower'])

export const rabbit: ElementDefinition = {
  id: 'rabbit',
  name: 'Rabbit',
  description: 'Hops around nibbling grass and wheat, and has babies. Fences keep it out of fields.',
  category: 'animals',
  matter: 'static',
  density: 12,
  color: { base: '#c9b8a6', variation: 0.1 },
  icon: Rabbit,
  brushFill: 0.01,
  thermal: { conductivity: 0.1, above: { temp: 70, into: 'ash' } },
  update(ctx) {
    const hunger = ctx.life(0, 0) + 1
    if (hunger > STARVED) {
      decompose(ctx, 40)
      return true
    }
    ctx.setLife(0, 0, hunger)

    // In water: paddle up to the surface and towards the shore (or, rarely, drown).
    if (ctx.under(0, 0) === 'water') {
      if (ctx.random() < 1 / DROWN) {
        decompose(ctx, 20)
        return true
      }
      if (ctx.get(0, -1) === 'water') ctx.moveOver(0, -1)
      else if (ctx.random() < HOP_CHANCE) hop(ctx)
      return true
    }
    // Gravity: falls through air (and into water).
    const below = ctx.get(0, 1)
    if (below === 'air' || below === 'water') {
      ctx.moveOver(0, 1)
      return true
    }

    if (hunger > HUNGRY && nibble(ctx)) return true
    if (shelterTime(ctx)) return true
    if (hunger < HUNGRY && ctx.random() < BREED_CHANCE) breed(ctx)
    if (ctx.random() < HOP_CHANCE) hop(ctx)
    return true
  },
}

function hop(ctx: CellContext) {
  let data = ctx.data(0, 0)
  if (ctx.random() < TURN_CHANCE) data ^= RIGHT
  const dx = data & RIGHT ? 1 : -1
  // Rabbits don't hop into water (they turn around at the shore).
  const ahead = ctx.get(dx, 0)
  const swimming = ctx.under(0, 0) === 'water'
  if (!swimming && (ahead === 'water' || ctx.get(dx, 1) === 'water' || ctx.get(dx, 2) === 'water')) data ^= RIGHT
  else if (ahead === 'water' || OPEN.has(ahead)) ctx.moveOver(dx, 0)
  else if (OPEN.has(ctx.get(dx, -1)) && OPEN.has(ctx.get(0, -1))) ctx.moveOver(dx, -1)
  else data ^= RIGHT
  ctx.setData(0, 0, data)
}

/** A scarecrow this close keeps it off the wheat. */
const SCARED = 12

function scarecrowNear(ctx: CellContext): boolean {
  for (let dy = -6; dy <= 2; dy++) for (let dx = -SCARED; dx <= SCARED; dx++) if (ctx.get(dx, dy) === 'scarecrow') return true
  return false
}

/** Eats a bit of grass or wheat right next to it (wheat first, unless a scarecrow's watching). */
function nibble(ctx: CellContext): boolean {
  let best: [number, number] | null = null
  let scared: boolean | null = null
  for (const [dx, dy] of [[-1, 0], [1, 0], [0, 1], [-1, 1], [1, 1], [0, -1]] as const) {
    const id = ctx.get(dx, dy)
    if (!FOOD.has(id)) continue
    if (id === 'wheat' || id === 'wheat_ripe') {
      scared ??= scarecrowNear(ctx)
      if (scared) continue
    }
    best = [dx, dy]
    if (id === 'wheat' || id === 'wheat_ripe') break
  }
  if (!best) return false
  ctx.set(best[0], best[1], 'air')
  ctx.setLife(0, 0, 0)
  return true
}

function breed(ctx: CellContext) {
  let mate = false
  for (const dx of [-2, -1, 1, 2]) if (ctx.get(dx, 0) === 'rabbit') mate = true
  if (!mate) return
  let crowd = 0
  for (let dy = -CROWD_RADIUS; dy <= CROWD_RADIUS; dy++) {
    for (let dx = -CROWD_RADIUS; dx <= CROWD_RADIUS; dx++) if (ctx.get(dx, dy) === 'rabbit') crowd++
  }
  if (crowd >= CROWD) return
  for (const dx of [-1, 1]) {
    if (ctx.get(dx, 0) === 'air') {
      ctx.set(dx, 0, 'rabbit', { data: dx > 0 ? RIGHT : 0 })
      return
    }
  }
}
