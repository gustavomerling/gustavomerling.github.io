import { Waves } from 'lucide-react'
import type { ElementDefinition } from '../types.ts'

/*
 * An artesian spring: water under pressure deep down. It pushes water up the shaft above it,
 * topping it up as fast as it's taken, but only as far up as the shaft is walled in on both
 * sides — so a well fills to its rim and no further (see the human's tasks/well.ts). Rubbish
 * that falls into a lined well (dry leaves, seeds, sand, earth...) gets washed out: the water
 * takes its place, so the well always fills up.
 */

/** How far up it can push water. */
const MAX_RISE = 24
/** Chance per tick of pushing up one more cell of water. */
const FLOW = 0.08

/** A well's lining: only between these does it wash rubbish out (never through plain ground). */
const LINING: ReadonlySet<string | null> = new Set(['stone', 'plank', 'metal', 'glass', 'mine_wall'])
/** Loose stuff that falls into a well and gets washed out of it. */
const RUBBISH: ReadonlySet<string | null> = new Set([
  'litter',
  'leaf',
  'seed',
  'fruit',
  'flower',
  'grass',
  'plant',
  'mushroom',
  'sand',
  'soil',
  'mud',
  'ash',
  'snow',
  'gunpowder',
  'smoke',
  'egg',
  'stone',
  'coal',
])

/** Walled in: something the water can't run off through. */
function wall(id: string | null): boolean {
  return id !== null && id !== 'air' && id !== 'water' && id !== 'steam' && id !== 'cloud'
}

export const spring: ElementDefinition = {
  id: 'spring',
  name: 'Artesian Spring',
  description: 'Water under pressure: it fills the walled shaft above it right up to the top, and refills it.',
  category: 'water',
  matter: 'static',
  density: 40,
  color: { base: '#3f6f9a', variation: 0.1 },
  icon: Waves,
  // Humans build it; not in the palette.
  hidden: true,
  thermal: { conductivity: 0.2 },
  update(ctx) {
    if (ctx.random() >= FLOW) return
    for (let k = 1; k <= MAX_RISE; k++) {
      const id = ctx.get(0, -k)
      if (id === 'water') continue
      if (id === 'air' && wall(ctx.get(-1, -k)) && wall(ctx.get(1, -k))) ctx.set(0, -k, 'water')
      // Rubbish in the shaft (lined on both sides): washed out, water in its place.
      else if (RUBBISH.has(id) && LINING.has(ctx.get(-1, -k)) && LINING.has(ctx.get(1, -k))) ctx.set(0, -k, 'water')
      return
    }
  },
}
