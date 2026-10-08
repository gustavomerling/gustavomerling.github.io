import { Bird } from 'lucide-react'
import type { CellContext } from '../../engine/context.ts'
import type { ElementDefinition } from '../types.ts'

/*
 * Bird `data` layout:
 *   bits 0-1  state: FLY, PERCH, SLEEP or EAT
 *   bit 2     FULL  – ate a fruit, carrying its seed
 *   bit 3     RIGHT – flying right (else left)
 * `life` = ticks left in the current activity (eating, resting, digesting).
 */
const STATE_MASK = 0x03
const FLY = 0
const PERCH = 1
const SLEEP = 2
const EAT = 3
const FULL = 0x04
const RIGHT = 0x08

/** Chance per tick to move one cell (≈30 cells/s). */
const MOVE_CHANCE = 0.5
/** How far (in cells) a hungry bird spots fruit. */
const SIGHT = 10
const EAT_TICKS = 60
/** Time from eating to dropping the seed: long enough to carry it far away. */
const DIGEST_TICKS: Range = [150, 360]
const PERCH_CHANCE = 0.004
const PERCH_TICKS: Range = [120, 360]
const SLEEP_CHANCE = 0.35
/** Below this daylight it's night: birds land and sleep until morning. */
const NIGHT = 0.3
const NIGHT_PERCH_CHANCE = 0.05
const SLEEP_TICKS: Range = [360, 900]

type Range = [number, number]

export const bird: ElementDefinition = {
  id: 'bird',
  name: 'Bird',
  description: 'Flies around, eats fruit and drops the seeds far away. Perches and naps.',
  category: 'animals',
  matter: 'static',
  density: 5,
  color: { base: '#ffb347', variation: 0.15 },
  icon: Bird,
  brushFill: 0.01,
  update(ctx) {
    const data = ctx.data(0, 0)
    switch (data & STATE_MASK) {
      case FLY:
        fly(ctx, data)
        break
      case EAT:
        eat(ctx, data)
        break
      default:
        rest(ctx, data)
    }
    // Birds move themselves; never fall like a powder.
    return true
  },
}

function fly(ctx: CellContext, data: number) {
  const life = ctx.life(0, 0)

  if (data & FULL) {
    // Digesting: the seed drops mid-flight, once the timer runs out and there's room below.
    if (life > 0) ctx.setLife(0, 0, life - 1)
    else if (ctx.get(0, 1) === 'air') {
      ctx.set(0, 1, 'seed')
      data &= ~FULL
      ctx.setData(0, 0, data)
    }
  } else {
    if (adjacentFruit(ctx)) return setState(ctx, data, EAT, EAT_TICKS)
    const night = ctx.light() < NIGHT
    if (isPerch(ctx.get(0, 1)) && ctx.random() < (night ? NIGHT_PERCH_CHANCE : PERCH_CHANCE)) {
      return setState(ctx, data, PERCH, between(ctx, PERCH_TICKS))
    }
  }

  if (ctx.random() >= MOVE_CHANCE) return

  // Hungry birds head for the nearest fruit in sight; otherwise keep cruising.
  const fruit = data & FULL ? null : findFruit(ctx)
  const dx = fruit ? Math.sign(fruit[0]) : data & RIGHT ? 1 : -1
  const dy = fruit ? Math.sign(fruit[1]) : cruiseDy(ctx)

  if (tryFly(ctx, dx, dy)) return
  if (dy !== 0 && tryFly(ctx, dx, 0)) return
  if (dx !== 0 && fruit && tryFly(ctx, 0, dy)) return
  if (tryFly(ctx, dx, -1)) return
  // Wall ahead: turn around.
  ctx.setData(0, 0, data ^ RIGHT)
}

function eat(ctx: CellContext, data: number) {
  const fruit = adjacentFruit(ctx)
  // Fruit fell or got eaten by another bird.
  if (!fruit) return setState(ctx, data, FLY, 0)

  const life = ctx.life(0, 0)
  if (life > 0) return ctx.setLife(0, 0, life - 1)

  ctx.set(fruit[0], fruit[1], 'air')
  // Full: fly off in a random direction to drop the seed far from this tree.
  const heading = ctx.random() < 0.5 ? RIGHT : 0
  ctx.setData(0, 0, (data & ~(STATE_MASK | RIGHT)) | FLY | FULL | heading)
  ctx.setLife(0, 0, between(ctx, DIGEST_TICKS))
}

/** Perched or asleep: take off if the perch disappears, otherwise wait out the timer. */
function rest(ctx: CellContext, data: number) {
  if (!isPerch(ctx.get(0, 1))) return setState(ctx, data, FLY, 0)

  // At night, perched birds fall asleep and stay asleep until it gets light.
  const night = ctx.light() < NIGHT
  if (night && (data & STATE_MASK) !== SLEEP) return setState(ctx, data, SLEEP, between(ctx, SLEEP_TICKS))

  const life = ctx.life(0, 0)
  if (life > 0) return ctx.setLife(0, 0, life - 1)
  if (night) return

  if ((data & STATE_MASK) === PERCH && ctx.random() < SLEEP_CHANCE) {
    return setState(ctx, data, SLEEP, between(ctx, SLEEP_TICKS))
  }
  const heading = ctx.random() < 0.5 ? RIGHT : 0
  setState(ctx, (data & ~RIGHT) | heading, FLY, 0)
}

// ---------- Helpers ----------

function setState(ctx: CellContext, data: number, state: number, ticks: number) {
  ctx.setData(0, 0, (data & ~STATE_MASK) | state)
  ctx.setLife(0, 0, ticks)
}

/** Birds fly through air and also through trees, without disturbing them. */
const FLY_THROUGH: ReadonlySet<string | null> = new Set(['air', 'leaf', 'wood', 'plant'])

function tryFly(ctx: CellContext, dx: number, dy: number): boolean {
  if (!FLY_THROUGH.has(ctx.get(dx, dy))) return false
  ctx.moveOver(dx, dy)
  return true
}

/** Mostly level flight; climbs when close to the ground, never hugs the ceiling. */
function cruiseDy(ctx: CellContext): number {
  for (let k = 1; k <= 4; k++) {
    if (ctx.get(0, k) !== 'air') return ctx.random() < 0.6 ? -1 : 0
  }
  if (ctx.get(0, -3) === null) return ctx.random() < 0.5 ? 1 : 0
  const r = ctx.random()
  return r < 0.15 ? -1 : r < 0.3 ? 1 : 0
}

function isPerch(id: string | null): boolean {
  return id !== null && id !== 'air' && id !== 'water' && id !== 'bird'
}

function adjacentFruit(ctx: CellContext): [number, number] | null {
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if ((dx || dy) && ctx.get(dx, dy) === 'fruit') return [dx, dy]
    }
  }
  return null
}

/** Nearest fruit within SIGHT, searching ring by ring outwards. */
function findFruit(ctx: CellContext): [number, number] | null {
  for (let r = 2; r <= SIGHT; r++) {
    for (let d = -r; d <= r; d++) {
      if (ctx.get(d, -r) === 'fruit') return [d, -r]
      if (ctx.get(d, r) === 'fruit') return [d, r]
      if (ctx.get(-r, d) === 'fruit') return [-r, d]
      if (ctx.get(r, d) === 'fruit') return [r, d]
    }
  }
  return null
}

function between(ctx: CellContext, [min, max]: Range): number {
  return Math.round(min + ctx.random() * (max - min))
}
