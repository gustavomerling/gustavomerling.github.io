import { Shell } from 'lucide-react'
import type { ElementDefinition } from '../types.ts'

/*
 * Snails come out of the grass when it rains and crawl slowly over the ground (and up small
 * steps); once it's dry and sunny again they go back into hiding.
 *
 * Snail `data`: bit 0 = heading right.
 */
const RIGHT = 1

const CRAWL_CHANCE = 0.012
const TURN_CHANCE = 0.05
/** Dry and sunny: chance per tick it hides away again. */
const HIDE_CHANCE = 0.0005

/** It crawls through these (keeping them where they are). */
const OPEN: ReadonlySet<string | null> = new Set(['air', 'grass', 'flower', 'litter', 'seed'])

export const snail: ElementDefinition = {
  id: 'snail',
  name: 'Snail',
  description: 'Comes out of the grass when it rains and crawls slowly about.',
  category: 'animals',
  matter: 'static',
  density: 8,
  color: { base: '#b98a5e', variation: 0.15 },
  icon: Shell,
  brushFill: 0.01,
  thermal: { conductivity: 0.1, above: { temp: 70, into: 'ash' } },
  update(ctx) {
    if (ctx.rain() < 0.05 && ctx.light() > 0.5 && ctx.random() < HIDE_CHANCE) {
      ctx.set(0, 0, ctx.under(0, 0) ?? 'air')
      return true
    }
    const below = ctx.get(0, 1)
    if (below === 'air' || below === 'water') {
      ctx.moveOver(0, 1)
      return true
    }
    if (ctx.random() >= CRAWL_CHANCE) return true
    let data = ctx.data(0, 0)
    if (ctx.random() < TURN_CHANCE) data ^= RIGHT
    const dx = data & RIGHT ? 1 : -1
    if (OPEN.has(ctx.get(dx, 0)) && ctx.get(dx, 1) !== 'water' && !ctx.under(dx, 0)) ctx.moveOver(dx, 0)
    else if (OPEN.has(ctx.get(dx, -1)) && OPEN.has(ctx.get(0, -1)) && !ctx.under(dx, -1)) ctx.moveOver(dx, -1)
    else data ^= RIGHT
    ctx.setData(0, 0, data)
    return true
  },
}
