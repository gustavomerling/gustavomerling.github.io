import { LeafyGreen } from 'lucide-react'
import { MAX_ALGAE } from '../water/water.ts'
import { compost, MAX_FERTILITY } from '../terrain/fertility.ts'
import type { ElementDefinition } from '../types.ts'

/** Chance per tick that a dry leaf touching water rots away in it. */
const ROT_IN_WATER = 0.01
/** Algae a rotting leaf adds to the water it touches (see water.ts). */
const ALGAE = 70
/** A dry leaf is gone within a minute: it starts crumbling after ~40 s (ticks, `life` counts up). */
const CRUMBLE_AFTER = 2400
const CRUMBLE_CHANCE = 1 / 600
/** What it leaves in the soil under it when it crumbles. */
const CRUMBLE_FERTILITY = 15

/**
 * Old leaves fall as litter, drift down, and rot into the soil as fertility. In water they
 * rot away and turn it green. Either way, none lasts much more than a minute.
 */
export const litter: ElementDefinition = {
  id: 'litter',
  name: 'Dry Leaf',
  description: 'Fallen leaves. They rot into the soil and fertilize it. Very flammable.',
  category: 'plants',
  matter: 'powder',
  // Light: floats on water.
  density: 4,
  color: { base: '#b08a3e', variation: 0.22 },
  icon: LeafyGreen,
  movement: { slide: 0.4 },
  thermal: { conductivity: 0.05, burn: { at: 150, temp: 450, rate: 0.1 } },
  hidden: true,
  update(ctx) {
    const age = ctx.life(0, 0) + 1
    ctx.setLife(0, 0, age)
    if (age > CRUMBLE_AFTER && ctx.random() < CRUMBLE_CHANCE * (age - CRUMBLE_AFTER) / 60) {
      if (ctx.get(0, 1) === 'soil') ctx.setData(0, 1, Math.min(MAX_FERTILITY, ctx.data(0, 1) + CRUMBLE_FERTILITY))
      ctx.set(0, 0, 'air')
      return
    }
    if (ctx.random() < ROT_IN_WATER) {
      for (const [dx, dy] of [[0, 1], [-1, 0], [1, 0], [0, -1]] as const) {
        if (ctx.get(dx, dy) !== 'water') continue
        ctx.setData(dx, dy, Math.min(MAX_ALGAE, ctx.data(dx, dy) + ALGAE))
        ctx.set(0, 0, 'air')
        return
      }
    }
    compost(ctx, 0.002, 25)
  },
}
