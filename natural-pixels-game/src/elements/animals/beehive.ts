import { Hexagon } from 'lucide-react'
import type { ElementDefinition } from '../types.ts'

/*
 * A wild beehive hanging under a tree crown. It fills up with honey through the day (`data`,
 * 0..255) and sends out bees to the flowers, a few at a time. Humans harvest the honey when the
 * hive is full (see human/tasks/food.ts) — and sometimes get stung. A hive whose tree is gone
 * falls apart.
 */

/** Honey per tick by day (full in a minute or two). */
const HONEY_CHANCE = 0.05
export const HONEY_FULL = 220
/** Sends out a bee now and then, while there are fewer than this around. */
const BEE_CHANCE = 0.002
const SWARM = 4
const SWARM_RADIUS = 6

/** What it hangs from (a bee flying through the trunk hides it, but it's still there). */
const TREE: ReadonlySet<string | null> = new Set(['leaf', 'wood', 'bee'])

export const beehive: ElementDefinition = {
  id: 'beehive',
  name: 'Beehive',
  description: 'Hangs under a tree crown, fills up with honey and sends bees out to the flowers.',
  category: 'animals',
  matter: 'static',
  density: 20,
  color: { base: '#d9a03a', variation: 0.18 },
  icon: Hexagon,
  thermal: { conductivity: 0.05, burn: { at: 200, temp: 500, rate: 0.03, into: 'ash' } },
  update(ctx) {
    if (!TREE.has(ctx.get(0, -1)) && !TREE.has(ctx.get(-1, 0)) && !TREE.has(ctx.get(1, 0))) {
      ctx.set(0, 0, 'litter')
      return true
    }
    if (ctx.light() < 0.4) return true
    const honey = ctx.data(0, 0)
    if (honey < 255 && ctx.random() < HONEY_CHANCE) ctx.setData(0, 0, honey + 1)
    if (ctx.random() < BEE_CHANCE && ctx.get(0, 1) === 'air') {
      let bees = 0
      for (let dy = -SWARM_RADIUS; dy <= SWARM_RADIUS; dy++) {
        for (let dx = -SWARM_RADIUS; dx <= SWARM_RADIUS; dx++) if (ctx.get(dx, dy) === 'bee' && ++bees >= SWARM) return true
      }
      ctx.set(0, 1, 'bee')
    }
    return true
  },
}
