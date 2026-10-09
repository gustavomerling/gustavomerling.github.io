import { Worm } from 'lucide-react'
import type { CellContext } from '../../engine/context.ts'
import type { ElementDefinition } from '../types.ts'
import { decompose, findNearest, touches, trySwap } from './shared.ts'

/*
 * Worm `data` = heading (0 left, 1 right, 2 up, 3 down).
 * Worm `life` = ticks spent outside the soil (it dries out and dies).
 *
 * Worms are hungry: they smell dead leaves and ash nearby and burrow towards them. A grass
 * carpet doesn't stop them: they poke up through it (trading places with the blade, which
 * stays rooted in the soil underneath) to eat what lies on top, then slip back down.
 */
const DX = [-1, 1, 0, 0]
const DY = [0, 0, -1, 1]

const MOVE_CHANCE = 0.15
/** With food in smell range it crawls much more eagerly, straight for it. */
const HUNGRY_MOVE_CHANCE = 0.45
const SMELL_RANGE = 8
const TURN_CHANCE = 0.3
/** Ticks a worm survives outside soil (~8 s). */
const DRY_OUT = 480
/** Fertility added to soil the worm crawls through (castings). */
const CASTING_CHANCE = 0.3
/** In the rain, worms near the surface crawl out (and don't dry out until it stops). */
const SURFACE_CHANCE = 0.02
const RAINY = 0.3
/** Fertility a meal adds to the soil around it (eating never makes new soil). */
const EATEN_FERTILITY = 80

const SOIL: ReadonlySet<string | null> = new Set(['soil', 'mud'])
/** Soil, or poking up through the grass on top of it (counts as being at home). */
const HOME: ReadonlySet<string | null> = new Set(['soil', 'mud', 'grass'])
const FOOD: ReadonlySet<string | null> = new Set(['litter', 'ash'])
const FALLS_THROUGH: ReadonlySet<string | null> = new Set(['air', 'water'])

export const worm: ElementDefinition = {
  id: 'worm',
  name: 'Worm',
  description: 'Burrows through soil, fertilizing it. Eats dead leaves and ash, enriching the soil around it.',
  category: 'animals',
  matter: 'static',
  density: 13,
  color: { base: '#d98a8a', variation: 0.12 },
  icon: Worm,
  brushFill: 0.02,
  thermal: { conductivity: 0.1, above: { temp: 60, into: 'air' } },
  update(ctx) {
    if (!touches(ctx, HOME)) {
      exposed(ctx)
      return true
    }
    ctx.setLife(0, 0, 0)
    if (ctx.get(0, 1) === 'grass') {
      surfaced(ctx)
      return true
    }
    const buried = ctx.get(-1, 0) === 'soil' || ctx.get(1, 0) === 'soil'
    if (ctx.rain() > RAINY && buried && ctx.get(0, -1) === 'air' && ctx.random() < SURFACE_CHANCE) {
      ctx.swap(0, -1)
      return true
    }
    // Only sniffs around when it might move (cheaper than smelling every tick).
    if (ctx.random() >= HUNGRY_MOVE_CHANCE) return true
    const food = findNearest(SMELL_RANGE, (dx, dy) => reachable(ctx, dx, dy))
    if (food || ctx.random() < MOVE_CHANCE / HUNGRY_MOVE_CHANCE) crawl(ctx, food)
    return true
  },
}

/** Most it can reach above its burrow: through a grass blade and its tip. */
const REACH_UP = 3

/**
 * Food it could actually get to: lying on the ground (not caught up in a tree or still falling)
 * and not too high above it. Otherwise it would keep poking up through the grass for nothing.
 */
function reachable(ctx: CellContext, dx: number, dy: number): boolean {
  if (dy < -REACH_UP || !FOOD.has(ctx.get(dx, dy))) return false
  const below = ctx.get(dx, dy + 1)
  return HOME.has(below) || FOOD.has(below) || below === 'worm'
}

/** The heading that gets it closer to (dx, dy): sideways first, then up or down. */
function towards(ctx: CellContext, [dx, dy]: [number, number]): number {
  const sideways = dx < 0 ? 0 : 1
  const vertical = dy < 0 ? 2 : 3
  if (dx === 0) return vertical
  if (dy === 0) return sideways
  // Blocked one way: try the other.
  const first = ctx.random() < 0.5 ? sideways : vertical
  const other = first === sideways ? vertical : sideways
  return HOME.has(ctx.get(DX[first], DY[first])) || FOOD.has(ctx.get(DX[first], DY[first])) ? first : other
}

function crawl(ctx: CellContext, food: [number, number] | null) {
  let heading = ctx.data(0, 0) & 3
  if (food) heading = towards(ctx, food)
  else if (ctx.random() < TURN_CHANCE) heading = Math.floor(ctx.random() * 4)
  const dx = DX[heading]
  const dy = DY[heading]
  ctx.setData(0, 0, heading)

  const target = ctx.get(dx, dy)
  if (FOOD.has(target)) {
    ctx.set(dx, dy, 'air')
    enrich(ctx)
    return
  }
  // Grass right above: poke up through it (the blade ends up just below, still on its soil).
  if (target === 'grass' && dy === -1 && ctx.get(0, 1) !== 'air') {
    ctx.swap(dx, dy)
    return
  }
  // Otherwise it only ever crawls through soil, so it stays underground.
  if (!SOIL.has(target)) return

  // The soil it pushes through ends up behind it, a little richer.
  ctx.swap(dx, dy)
  if (ctx.random() < CASTING_CHANCE && ctx.get(0, 0) === 'soil') ctx.setData(0, 0, Math.min(255, ctx.data(0, 0) + 1))
}

/**
 * Poking up through the grass: eat whatever lies on top or alongside, then slip back down
 * (trading places with the blade again). Eaten leaves feed the soil under the grass.
 */
function surfaced(ctx: CellContext) {
  for (const [dx, dy] of [[0, -1], [-1, 0], [1, 0], [-1, -1], [1, -1]] as const) {
    if (!FOOD.has(ctx.get(dx, dy))) continue
    ctx.set(dx, dy, 'air')
    enrich(ctx)
    return
  }
  if (ctx.random() < MOVE_CHANCE) ctx.swap(0, 1)
}

/** Its castings enrich the soil next to it (or under the grass it poked through). */
function enrich(ctx: CellContext) {
  for (const [dx, dy] of [[0, 1], [-1, 0], [1, 0], [0, 2], [0, -1]] as const) {
    if (ctx.get(dx, dy) !== 'soil') continue
    ctx.setData(dx, dy, Math.min(255, ctx.data(dx, dy) + EATEN_FERTILITY))
    return
  }
}

/** Out of the soil: fall, wriggle back in if possible, or dry out. */
function exposed(ctx: CellContext) {
  if (ctx.rain() > RAINY) {
    // Out in the rain: wriggle along the wet ground.
    ctx.setLife(0, 0, 0)
    if (trySwap(ctx, 0, 1, FALLS_THROUGH)) return
    const side = ctx.random() < 0.5 ? -1 : 1
    if (ctx.random() < 0.05 && ctx.get(side, 0) === 'air' && ctx.get(side, 1) !== 'air') ctx.swap(side, 0)
    return
  }
  const dried = ctx.life(0, 0) + 1
  if (dried > DRY_OUT) return decompose(ctx, 20)
  ctx.setLife(0, 0, dried)

  if (trySwap(ctx, 0, 1, FALLS_THROUGH)) return
  const side = ctx.random() < 0.5 ? -1 : 1
  if (ctx.random() < 0.1 && SOIL.has(ctx.get(side, 1))) ctx.swap(side, 1)
}
