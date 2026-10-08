import { Fish } from 'lucide-react'
import type { CellContext } from '../../engine/context.ts'
import type { ElementDefinition } from '../types.ts'
import { decompose, touches, trySwap } from './shared.ts'

/*
 * Fish `data` = heading (0 left, 1 right).
 * Fish `life` = ticks spent out of water.
 */
const RIGHT = 1
const SWIM_CHANCE = 0.3
const TURN_CHANCE = 0.01
/** Ticks a fish survives out of water (~5 s). */
const OUT_OF_WATER = 300
const FLOP_CHANCE = 0.05

const WATER: ReadonlySet<string | null> = new Set(['water'])
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
    if (!touches(ctx, WATER)) {
      stranded(ctx)
      return true
    }
    ctx.setLife(0, 0, 0)
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

  // Fish only ever move through water.
  if (trySwap(ctx, dx, dy, WATER)) return
  if (dy !== 0 && trySwap(ctx, dx, 0, WATER)) return
  ctx.setData(0, 0, data ^ RIGHT)
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
