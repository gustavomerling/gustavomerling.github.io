import { Bird, Egg } from 'lucide-react'
import type { CellContext } from '../../engine/context.ts'
import type { ElementDefinition } from '../types.ts'
import { decompose, shelterTime } from './shared.ts'

/*
 * Chickens strut about on the ground pecking at grass, seeds and worms, and lay eggs. An egg
 * nobody picks up hatches into a chick (unless there are plenty of chickens around already),
 * and the chick grows into a chicken. Humans collect eggs to eat.
 *
 * Chicken and chick `data`: bit 0 = heading right. Chicken `life` = ticks since it last ate;
 * chick and egg `life` = age.
 */
const RIGHT = 1

const STEP_CHANCE = 0.07
const CHICK_STEP_CHANCE = 0.1
const TURN_CHANCE = 0.1
/** Gets peckish after this long, starves after that. */
const HUNGRY = 1200
const STARVED = 12000
/** A fed chicken lays about one egg every ~90 s. */
const LAY_CHANCE = 1 / 5400
/** An egg hatches after ~40 s; one left much longer just goes off. */
const HATCH = 2400
const ROTTEN = HATCH * 3
/** A chick is grown up after ~1 min. */
const GROW = 3600
/** Only some eggs are fertile; and none hatch once this many chickens and chicks live around here. */
const FERTILE = 0.5
const CROWD = 4
const CROWD_RADIUS = 24
/** Ticks it can stay in water before drowning (it paddles back up meanwhile). */
const DROWN = 900

/** It walks through these (keeping them where they are). */
const OPEN: ReadonlySet<string | null> = new Set(['air', 'grass', 'flower', 'litter', 'seed'])
/** Pecked up when hungry. */
const FOOD: ReadonlySet<string | null> = new Set(['seed', 'worm', 'grass', 'wheat_ripe'])
const FOWL: ReadonlySet<string | null> = new Set(['chicken', 'chick'])

export const chicken: ElementDefinition = {
  id: 'chicken',
  name: 'Chicken',
  description: 'Pecks at grass, seeds and worms and lays eggs. Eggs left alone hatch into chicks.',
  category: 'animals',
  matter: 'static',
  density: 12,
  color: { base: '#f1eee6', variation: 0.08 },
  icon: Bird,
  brushFill: 0.01,
  thermal: { conductivity: 0.1, above: { temp: 70, into: 'ash' } },
  update(ctx) {
    const hunger = ctx.life(0, 0) + 1
    if (hunger > STARVED) {
      decompose(ctx, 30)
      return true
    }
    ctx.setLife(0, 0, hunger)
    if (fallOrSwim(ctx, STEP_CHANCE)) return true

    if (hunger > HUNGRY && peck(ctx)) return true
    if (shelterTime(ctx)) return true
    if (hunger < HUNGRY && ctx.random() < LAY_CHANCE) lay(ctx)
    if (ctx.random() < STEP_CHANCE) walk(ctx)
    return true
  },
}

export const chick: ElementDefinition = {
  id: 'chick',
  name: 'Chick',
  description: 'A fluffy chick. It grows into a chicken.',
  category: 'animals',
  matter: 'static',
  density: 10,
  color: { base: '#ffd84a', variation: 0.08 },
  icon: Bird,
  brushFill: 0.01,
  thermal: { conductivity: 0.1, above: { temp: 60, into: 'ash' } },
  update(ctx) {
    const age = ctx.life(0, 0) + 1
    if (age > GROW) {
      ctx.set(0, 0, 'chicken', { data: ctx.data(0, 0) })
      return true
    }
    ctx.setLife(0, 0, age)
    if (fallOrSwim(ctx, CHICK_STEP_CHANCE)) return true
    if (shelterTime(ctx)) return true
    if (ctx.random() < CHICK_STEP_CHANCE) walk(ctx)
    return true
  },
}

export const egg: ElementDefinition = {
  id: 'egg',
  name: 'Egg',
  description: 'Laid by chickens. Humans collect them to eat; left alone, it hatches into a chick.',
  category: 'animals',
  matter: 'powder',
  density: 14,
  color: { base: '#efe3cc', variation: 0.06 },
  icon: Egg,
  movement: { slide: 0.2 },
  brushFill: 0.02,
  thermal: { conductivity: 0.1, above: { temp: 80, into: 'ash' } },
  update(ctx) {
    const age = ctx.life(0, 0) + 1
    ctx.setLife(0, 0, age)
    if (age === HATCH && ctx.random() < FERTILE && !crowded(ctx)) ctx.set(0, 0, 'chick', { data: ctx.random() < 0.5 ? RIGHT : 0 })
    else if (age > ROTTEN) ctx.set(0, 0, 'air')
  },
}

/** Falls through air, paddles up and to the shore in water. True if that took its turn. */
function fallOrSwim(ctx: CellContext, step: number): boolean {
  if (ctx.under(0, 0) === 'water') {
    if (ctx.random() < 1 / DROWN) {
      decompose(ctx, 15)
      return true
    }
    if (ctx.get(0, -1) === 'water') ctx.moveOver(0, -1)
    else if (ctx.random() < step) walk(ctx)
    return true
  }
  const below = ctx.get(0, 1)
  if (below === 'air' || below === 'water') {
    ctx.moveOver(0, 1)
    return true
  }
  return false
}

/** A step along the ground (up a little ledge too), turning back at water and walls. */
function walk(ctx: CellContext) {
  let data = ctx.data(0, 0)
  if (ctx.random() < TURN_CHANCE) data ^= RIGHT
  const dx = data & RIGHT ? 1 : -1
  const ahead = ctx.get(dx, 0)
  const swimming = ctx.under(0, 0) === 'water'
  if (!swimming && (ahead === 'water' || ctx.get(dx, 1) === 'water' || ctx.get(dx, 2) === 'water')) data ^= RIGHT
  else if (ahead === 'water' || OPEN.has(ahead)) ctx.moveOver(dx, 0)
  else if (OPEN.has(ctx.get(dx, -1)) && OPEN.has(ctx.get(0, -1))) ctx.moveOver(dx, -1)
  else data ^= RIGHT
  ctx.setData(0, 0, data)
}

/** Pecks up a seed, a worm, a ripe ear or a bit of grass right next to it. */
function peck(ctx: CellContext): boolean {
  for (const [dx, dy] of [[-1, 0], [1, 0], [0, 1], [-1, 1], [1, 1]] as const) {
    if (!FOOD.has(ctx.get(dx, dy))) continue
    ctx.set(dx, dy, 'air')
    ctx.setLife(0, 0, 0)
    return true
  }
  return false
}

/** Lays an egg on the ground beside it. */
function lay(ctx: CellContext) {
  for (const dx of ctx.random() < 0.5 ? [-1, 1] : [1, -1]) {
    if (ctx.get(dx, 0) === 'air' && ctx.get(dx, 1) !== 'air') {
      ctx.set(dx, 0, 'egg')
      return
    }
  }
}

/** Enough chickens and chicks around here already. */
function crowded(ctx: CellContext): boolean {
  let n = 0
  for (let dy = -CROWD_RADIUS; dy <= CROWD_RADIUS; dy++) {
    for (let dx = -CROWD_RADIUS; dx <= CROWD_RADIUS; dx++) if (FOWL.has(ctx.get(dx, dy)) && ++n >= CROWD) return true
  }
  return false
}
