import { Leaf } from 'lucide-react'
import type { CellContext } from '../../engine/context.ts'
import { FRUIT_ATTACHED } from './fruit.ts'
import { TISSUE_GROUP } from './tissue.ts'
import type { ElementDefinition } from '../types.ts'

/*
 * Leaf `data` layout:
 *   bit 7     CROWN      – part of a tree crown (can bear fruit). Side leaves on stems aren't.
 *   bit 6     POLLINATED – a bee visited it: fruits much more often
 *   bits 0-5  how many more generations of leaves it can still spawn
 * Leaf `life` = age in ticks (counts up). Old leaves fall as litter.
 */
const CROWN = 0x80
export const POLLINATED = 0x40
const BUDGET_MASK = 0x3f
const CROWN_SIZE = 5
/** Data for the first leaf of a fresh crown. */
export const CROWN_LEAF = CROWN | CROWN_SIZE

const CAPACITY = 160
/** Water spent to grow one more leaf. */
const GROW_COST = 25
const GROW_CHANCE = 0.08
/** Water spent to grow a fruit, and how rare fruiting is per crown leaf per tick. */
const FRUIT_COST = 60
const FRUIT_CHANCE = 0.0001
/** Pollinated leaves fruit this many times more often. */
const POLLEN_BOOST = 15
/** No new fruit if another one is this close (keeps fruit spread out). */
const FRUIT_SPACING = 3
/** Leaves older than this (ticks, ~1 min) may dry up and fall. */
const OLD_AGE = 3600
const FALL_CHANCE = 0.0004
const MAX_AGE = 0xffff

export const leaf: ElementDefinition = {
  id: 'leaf',
  name: 'Leaf',
  description: 'Foliage. The crown keeps spreading while sap reaches it, and bears fruit.',
  category: 'plants',
  matter: 'static',
  density: 20,
  color: { base: '#3fa34d', variation: 0.18 },
  icon: Leaf,
  // Leaves drink rain and watering too; sap then spreads through the whole tree.
  moisture: { capacity: CAPACITY, group: TISSUE_GROUP, absorbs: 'water', flow: 0.6, bias: 'up' },
  thermal: { conductivity: 0.05, burn: { at: 220, temp: 550, rate: 0.03 } },
  hidden: true,
  update(ctx) {
    // Old leaves dry up and fall; the crown regrows from the trunk top (see wood.ts).
    const age = ctx.life(0, 0)
    if (age < MAX_AGE) ctx.setLife(0, 0, age + 1)
    if (age > OLD_AGE && ctx.random() < FALL_CHANCE) {
      ctx.set(0, 0, 'litter')
      return
    }

    const data = ctx.data(0, 0)
    if (data & CROWN) bearFruit(ctx, (data & POLLINATED) !== 0)

    const budget = data & BUDGET_MASK
    const water = ctx.water(0, 0)
    if (budget === 0 || water < GROW_COST || ctx.random() >= GROW_CHANCE) return

    // Spread sideways and up more than down, for a rounded canopy.
    const dx = ctx.random() < 0.5 ? -1 : 1
    const r = ctx.random()
    const dy = r < 0.4 ? -1 : r < 0.85 ? 0 : 1
    const ox = r < 0.15 ? 0 : dx
    if (ctx.get(ox, dy) !== 'air') return

    ctx.set(ox, dy, 'leaf', { water: GROW_COST >> 1, data: (data & CROWN) | (budget - 1) })
    ctx.setWater(0, 0, water - GROW_COST)
  },
}

/** A well-watered crown leaf occasionally hangs a fruit below itself. */
function bearFruit(ctx: CellContext, pollinated: boolean) {
  const water = ctx.water(0, 0)
  const chance = pollinated ? FRUIT_CHANCE * POLLEN_BOOST : FRUIT_CHANCE
  if (water < FRUIT_COST || ctx.random() >= chance) return
  if (ctx.get(0, 1) !== 'air') return

  for (let dy = -FRUIT_SPACING; dy <= FRUIT_SPACING; dy++) {
    for (let dx = -FRUIT_SPACING; dx <= FRUIT_SPACING; dx++) {
      if (ctx.get(dx, dy) === 'fruit') return
    }
  }

  ctx.set(0, 1, 'fruit', { data: FRUIT_ATTACHED })
  ctx.setWater(0, 0, water - FRUIT_COST)
}
