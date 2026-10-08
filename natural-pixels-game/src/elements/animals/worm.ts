import { Worm } from 'lucide-react'
import type { CellContext } from '../../engine/context.ts'
import type { ElementDefinition } from '../types.ts'
import { decompose, touches, trySwap } from './shared.ts'

/*
 * Worm `data` = heading (0 left, 1 right, 2 up, 3 down).
 * Worm `life` = ticks spent outside the soil (it dries out and dies).
 */
const DX = [-1, 1, 0, 0]
const DY = [0, 0, -1, 1]

const MOVE_CHANCE = 0.15
const TURN_CHANCE = 0.3
/** Ticks a worm survives outside soil (~8 s). */
const DRY_OUT = 480
/** Fertility added to soil the worm crawls through (castings). */
const CASTING_CHANCE = 0.3
/** Organic matter it eats turns into this fertile soil. */
const EATEN_FERTILITY = 80

const SOIL: ReadonlySet<string | null> = new Set(['soil', 'mud'])
const FOOD: ReadonlySet<string | null> = new Set(['litter', 'ash'])
const FALLS_THROUGH: ReadonlySet<string | null> = new Set(['air', 'water'])

export const worm: ElementDefinition = {
  id: 'worm',
  name: 'Worm',
  description: 'Burrows through soil, fertilizing it and turning dead leaves and ash into rich earth.',
  category: 'animals',
  matter: 'static',
  density: 13,
  color: { base: '#d98a8a', variation: 0.12 },
  icon: Worm,
  brushFill: 0.02,
  thermal: { conductivity: 0.1, above: { temp: 60, into: 'air' } },
  update(ctx) {
    if (!touches(ctx, SOIL)) {
      exposed(ctx)
      return true
    }
    ctx.setLife(0, 0, 0)
    if (ctx.random() < MOVE_CHANCE) crawl(ctx)
    return true
  },
}

function crawl(ctx: CellContext) {
  let heading = ctx.data(0, 0) & 3
  if (ctx.random() < TURN_CHANCE) heading = Math.floor(ctx.random() * 4)
  const dx = DX[heading]
  const dy = DY[heading]
  ctx.setData(0, 0, heading)

  const target = ctx.get(dx, dy)
  if (FOOD.has(target)) {
    ctx.set(dx, dy, 'soil', { data: EATEN_FERTILITY })
    return
  }
  // Only ever crawls through soil, so it stays underground.
  if (!SOIL.has(target)) return

  // The soil it pushes through ends up behind it, a little richer.
  ctx.swap(dx, dy)
  if (ctx.random() < CASTING_CHANCE && ctx.get(0, 0) === 'soil') ctx.setData(0, 0, Math.min(255, ctx.data(0, 0) + 1))
}

/** Out of the soil: fall, wriggle back in if possible, or dry out. */
function exposed(ctx: CellContext) {
  const dried = ctx.life(0, 0) + 1
  if (dried > DRY_OUT) return decompose(ctx, 20)
  ctx.setLife(0, 0, dried)

  if (trySwap(ctx, 0, 1, FALLS_THROUGH)) return
  const side = ctx.random() < 0.5 ? -1 : 1
  if (ctx.random() < 0.1 && SOIL.has(ctx.get(side, 1))) ctx.swap(side, 1)
}
