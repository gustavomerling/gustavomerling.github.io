import { Beef, Cloud } from 'lucide-react'
import type { CellContext } from '../../engine/context.ts'
import type { ElementDefinition } from '../types.ts'
import { decompose, findNearest, shelterTime } from './shared.ts'

/*
 * Farm animals: sheep and cows. They wander slowly over the meadows grazing grass, and two
 * well-fed ones side by side now and then have a young one (up to a small herd around). Fences
 * keep them in: a human with a pen (see human/tasks/herd.ts) brings wild ones home, shears the
 * sheep for wool and milks the cows.
 *
 * Wool: a woolly `sheep` sheared becomes `sheep_shorn`, which grows its fleece back over a few
 * minutes (counted in `data`). Milk: a cow's `data` fills up as it grazes; at MILK_FULL it can be
 * milked. Every animal's `life` = ticks since it last ate.
 */

const STEP_CHANCE = 0.025
const TURN_CHANCE = 0.1
/** Gets peckish after this long, starves after that. */
const HUNGRY = 1200
const STARVED = 30000
/** Hungry, it heads for grass it can see this far away. */
const GRASS_SIGHT = 30
const BREED_CHANCE = 0.0004
const CROWD = 5
const CROWD_RADIUS = 14
/** A shorn sheep grows its wool back over this many ticks (in steps of WOOL_STEP). */
const WOOL_REGROW = 6000
const WOOL_STEP = 25
/** A cow's milk fills up by one every few ticks while it's fed, up to this. */
export const MILK_FULL = 200
const MILK_CHANCE = 0.06

/** It ambles through these (keeping them where they are). Never fences: that's the point of them. */
const OPEN: ReadonlySet<string | null> = new Set(['air', 'grass', 'flower', 'litter', 'seed', 'snail'])
const FOOD: ReadonlySet<string | null> = new Set(['grass', 'flower'])
const THERMAL = { conductivity: 0.1, above: { temp: 70, into: 'ash' } }

export const sheep: ElementDefinition = {
  id: 'sheep',
  name: 'Sheep',
  description: 'A woolly sheep grazing the meadow. Humans keep them in a pen and shear them for wool.',
  category: 'animals',
  matter: 'static',
  density: 14,
  color: { base: '#f1ede4', variation: 0.06 },
  icon: Cloud,
  brushFill: 0.01,
  thermal: THERMAL,
  update(ctx) {
    live(ctx, 'sheep')
    return true
  },
}

/** A sheep that's been shorn: it grows its fleece back (and is a sheep again). */
export const sheepShorn: ElementDefinition = {
  id: 'sheep_shorn',
  name: 'Sheep',
  description: 'A freshly shorn sheep. Its wool grows back.',
  category: 'animals',
  matter: 'static',
  density: 14,
  color: { base: '#d9c7bd', variation: 0.06 },
  icon: Cloud,
  hidden: true,
  thermal: THERMAL,
  update(ctx) {
    const wool = ctx.data(0, 0) + 1
    if (ctx.random() < 1 / WOOL_STEP) {
      if (wool * WOOL_STEP >= WOOL_REGROW) {
        ctx.retype(0, 0, 'sheep')
        ctx.setData(0, 0, 0)
        return true
      }
      ctx.setData(0, 0, Math.min(255, wool))
    }
    live(ctx, 'sheep_shorn')
    return true
  },
}

export const cow: ElementDefinition = {
  id: 'cow',
  name: 'Cow',
  description: 'A cow grazing the meadow. Humans keep them in a pen and milk them.',
  category: 'animals',
  matter: 'static',
  density: 18,
  color: { base: '#8a5a3c', variation: 0.25 },
  icon: Beef,
  brushFill: 0.01,
  thermal: THERMAL,
  update(ctx) {
    // Milk fills up while it's fed.
    if (ctx.life(0, 0) < HUNGRY && ctx.random() < MILK_CHANCE) ctx.setData(0, 0, Math.min(MILK_FULL, ctx.data(0, 0) + 1))
    live(ctx, 'cow')
    return true
  },
}

/** Their life: eat, fall, wander, have young. */
function live(ctx: CellContext, id: string) {
  const hunger = ctx.life(0, 0) + 1
  if (hunger > STARVED) {
    decompose(ctx, 60)
    return
  }
  ctx.setLife(0, 0, hunger)
  const below = ctx.get(0, 1)
  if (below === 'air' || below === 'water') {
    ctx.moveOver(0, 1)
    return
  }
  if (hunger > HUNGRY && graze(ctx)) return
  if (shelterTime(ctx)) return
  if (hunger < HUNGRY && ctx.random() < BREED_CHANCE) breed(ctx, id)
  if (ctx.random() < STEP_CHANCE) amble(ctx, hunger > HUNGRY)
}

/** A step, mostly at random; hungry, towards the nearest grass. */
function amble(ctx: CellContext, hungry: boolean) {
  const grass = hungry ? findNearest(GRASS_SIGHT, (gx, gy) => FOOD.has(ctx.get(gx, gy)) && Math.abs(gy) <= 6) : null
  const dx = grass ? Math.sign(grass[0]) || 1 : ctx.random() < 0.5 ? -1 : 1
  if (!grass && ctx.random() < TURN_CHANCE) return
  // Can't get that way (a bank too high, the shore): the other way, then.
  if (!step(ctx, dx)) step(ctx, -dx)
}

/** One step sideways (or up a step); never into water. False if it can't. */
function step(ctx: CellContext, dx: number): boolean {
  if (ctx.get(dx, 0) === 'water' || ctx.get(dx, 1) === 'water') return false
  if (OPEN.has(ctx.get(dx, 0)) && !ctx.under(dx, 0)) ctx.moveOver(dx, 0)
  else if (OPEN.has(ctx.get(dx, -1)) && OPEN.has(ctx.get(0, -1)) && !ctx.under(dx, -1)) ctx.moveOver(dx, -1)
  else return false
  return true
}

/**
 * A mouthful of grass (or a flower) right next to it. A grass tip or a flower is eaten; grazing a
 * bare blade just crops it (it stays and grows a new tip), so a meadow is never grazed bare.
 */
function graze(ctx: CellContext): boolean {
  let bite: [number, number] | null = null
  let tip = false
  for (const [dx, dy] of [[-1, 0], [1, 0], [-1, 1], [1, 1], [0, -1], [-1, -1], [1, -1]] as const) {
    if (!FOOD.has(ctx.get(dx, dy))) continue
    bite = [dx, dy]
    tip = ctx.get(dx, dy + 1) === 'grass' || ctx.get(dx, dy) === 'flower'
    if (tip) break
  }
  if (bite) {
    if (tip) ctx.set(bite[0], bite[1], 'air')
    ctx.setLife(0, 0, 0)
    return true
  }
  // Standing in tall grass: that'll do.
  if (FOOD.has(ctx.under(0, 0))) {
    ctx.setLife(0, 0, 0)
    return true
  }
  return false
}

/** Two of a kind (shorn or not) side by side: a young one, while the herd's small. */
function breed(ctx: CellContext, id: string) {
  const kind = (other: string | null) => other === id || (id.startsWith('sheep') && other !== null && other.startsWith('sheep'))
  let mate = false
  for (const dx of [-2, -1, 1, 2]) if (kind(ctx.get(dx, 0))) mate = true
  if (!mate) return
  let herd = 0
  for (let dy = -CROWD_RADIUS; dy <= CROWD_RADIUS; dy++) {
    for (let dx = -CROWD_RADIUS; dx <= CROWD_RADIUS; dx++) if (kind(ctx.get(dx, dy)) && ++herd >= CROWD) return
  }
  for (const dx of [-1, 1]) {
    if (ctx.get(dx, 0) === 'air') {
      ctx.set(dx, 0, id === 'cow' ? 'cow' : 'sheep')
      return
    }
  }
}
