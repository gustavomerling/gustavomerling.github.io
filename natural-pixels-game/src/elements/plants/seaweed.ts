import { Waves } from 'lucide-react'
import type { CellContext } from '../../engine/context.ts'
import type { ElementDefinition } from '../types.ts'

/*
 * Seaweed: green strands growing up from the bed of lakes, only ever under water. It lives in the
 * water rather than pushing it aside: each strand hides the water it grew in (it comes back
 * when the strand goes), and fish swim right through it. A strand out of the water (the lake
 * dried up), or no longer rooted on the bed, is gone. Strands slowly grow taller and spread
 * along the bed.
 *
 * Seaweed `data` = how far up the strand it is (1 = the root, on the bed).
 */

/** Strands grow this tall at most, and stop a cell short of the surface. */
const MAX_HEIGHT = 6
const GROW_CHANCE = 0.0015
/** Roots now and then spread to the bed next to them, while there's little seaweed around. */
const SPREAD_CHANCE = 0.0004
const CROWD = 6
const CROWD_RADIUS = 5

/** Wet: what a strand needs above it (water, more seaweed, or a fish swimming through). */
const WET: ReadonlySet<string | null> = new Set(['water', 'seaweed', 'fish'])
/** Not something to root on, or rest on. */
const LOOSE: ReadonlySet<string | null> = new Set([null, 'air', 'water', 'steam', 'cloud', 'smoke'])

export const seaweed: ElementDefinition = {
  id: 'seaweed',
  name: 'Seaweed',
  description: 'Grows up from lake beds, only under water. Fish swim right through it.',
  category: 'plants',
  matter: 'static',
  density: 12,
  color: { base: '#3f8f4f', variation: 0.3, alpha: 0.9 },
  icon: Waves,
  brushFill: 0.3,
  thermal: { conductivity: 0.2, above: { temp: 90, into: 'water' } },
  update(ctx) {
    // Out of the water, or adrift: gone (the water it hid comes back).
    if (!WET.has(ctx.get(0, -1)) || LOOSE.has(ctx.get(0, 1))) {
      ctx.reveal(0, 0)
      return
    }
    // (A fish that swam through took the water behind it: put back.)
    if (ctx.under(0, 0) === null) ctx.setBehind(0, 0, 'water')

    const height = Math.max(1, ctx.data(0, 0))
    if (height < MAX_HEIGHT && ctx.random() < GROW_CHANCE && ctx.get(0, -1) === 'water' && ctx.get(0, -2) === 'water') {
      ctx.cover(0, -1, 'seaweed', { data: height + 1 })
    }
    if (height === 1 && ctx.random() < SPREAD_CHANCE) spread(ctx)
  },
}

/** A new root on the bed beside this one (if there's water there and few strands around). */
function spread(ctx: CellContext) {
  const dx = ctx.random() < 0.5 ? -1 : 1
  if (ctx.get(dx, 0) !== 'water' || ctx.get(dx, -1) !== 'water' || LOOSE.has(ctx.get(dx, 1))) return
  let around = 0
  for (let dy = -CROWD_RADIUS; dy <= CROWD_RADIUS; dy++) {
    for (let x = -CROWD_RADIUS; x <= CROWD_RADIUS; x++) {
      if (ctx.get(x, dy) === 'seaweed' && ctx.data(x, dy) === 1 && ++around >= CROWD) return
    }
  }
  ctx.cover(dx, 0, 'seaweed', { data: 1 })
}
