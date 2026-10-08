import { Bean } from 'lucide-react'
import { fertilityBoost } from '../terrain/fertility.ts'
import { GROW_TIP } from './plant.ts'
import type { ElementDefinition } from '../types.ts'

/** Soil moisture needed under a seed before it can sprout. */
const SPROUT_MOISTURE = 60
/** Water the seed takes from the soil to become a sprout. */
const SPROUT_COST = 30
const SPROUT_CHANCE = 0.02
/** Seeds in the most fertile soil sprout this many times faster (on top of 1×). */
const FERTILE_SPROUT_BOOST = 4
/** Seeds landing on soil work their way this many cells down into it. */
const BURROW_DEPTH = 2
const BURROW_CHANCE = 0.08

export const seed: ElementDefinition = {
  id: 'seed',
  name: 'Seed',
  description: 'Floats on water. Burrows into soil and sprouts when it gets wet.',
  category: 'plants',
  matter: 'powder',
  // Lighter than water, so seeds float until the puddle soaks in.
  density: 8,
  color: { base: '#d6b45a', variation: 0.1 },
  icon: Bean,
  movement: { slide: 0.6 },
  thermal: { conductivity: 0.05, burn: { at: 200, rate: 0.1 } },
  brushFill: 0.06,
  // `data` = how many cells the seed has already burrowed.
  update(ctx) {
    const depth = ctx.data(0, 0)
    if (depth < BURROW_DEPTH && ctx.get(0, 1) === 'soil') {
      if (ctx.random() < BURROW_CHANCE) {
        ctx.swap(0, 1)
        ctx.setData(0, 1, depth + 1)
      }
      return true
    }

    // Any touching soil counts, so buried seeds sprout when water seeps down to them.
    let best = -1
    let moisture = 0
    let fertility = 0
    for (let n = 0; n < NEIGHBORS.length; n++) {
      const [dx, dy] = NEIGHBORS[n]
      if (ctx.get(dx, dy) !== 'soil') continue
      fertility = Math.max(fertility, ctx.data(dx, dy))
      if (ctx.water(dx, dy) > moisture) {
        best = n
        moisture = ctx.water(dx, dy)
      }
    }
    const chance = SPROUT_CHANCE * fertilityBoost(fertility, FERTILE_SPROUT_BOOST)
    if (best < 0 || moisture < SPROUT_MOISTURE || ctx.random() >= chance) return

    const [dx, dy] = NEIGHBORS[best]
    ctx.setWater(dx, dy, moisture - SPROUT_COST)
    ctx.set(0, 0, 'plant', { water: SPROUT_COST, data: GROW_TIP | 1 })
  },
}

const NEIGHBORS = [
  [0, 1],
  [0, -1],
  [-1, 0],
  [1, 0],
] as const
