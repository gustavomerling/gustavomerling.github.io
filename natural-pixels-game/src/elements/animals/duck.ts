import { Bird } from 'lucide-react'
import type { ElementDefinition } from '../types.ts'

/*
 * Ducks float on lakes, paddling slowly back and forth along the surface; on dry land they
 * waddle about. They sit right on top of the water (in the air above it), so they ride the
 * surface up and down as the lake fills and dries.
 *
 * Duck `data`: bit 0 = heading right.
 */
const RIGHT = 1

const PADDLE_CHANCE = 0.03
const WADDLE_CHANCE = 0.02
const TURN_CHANCE = 0.02

/** It waddles through these (keeping them where they are). */
const OPEN: ReadonlySet<string | null> = new Set(['air', 'grass', 'flower', 'litter', 'seed'])

export const duck: ElementDefinition = {
  id: 'duck',
  name: 'Duck',
  description: 'Floats on lakes and paddles about; waddles on land.',
  category: 'animals',
  matter: 'static',
  density: 10,
  color: { base: '#f2ecd8', variation: 0.08 },
  icon: Bird,
  brushFill: 0.01,
  thermal: { conductivity: 0.1, above: { temp: 70, into: 'ash' } },
  update(ctx) {
    // Under water (the lake rose, or it was dropped in): bob back up to the surface.
    if (ctx.under(0, 0) === 'water') {
      if (ctx.get(0, -1) === 'water' || ctx.get(0, -1) === 'air') ctx.moveOver(0, -1)
      return true
    }
    const below = ctx.get(0, 1)
    // Nothing to sit on: down it goes (onto the water, or the ground).
    if (below === 'air') {
      ctx.moveOver(0, 1)
      return true
    }
    let data = ctx.data(0, 0)
    if (ctx.random() < TURN_CHANCE) data ^= RIGHT
    const dx = data & RIGHT ? 1 : -1
    if (below === 'water') {
      // Paddling along the surface: open water ahead (level, or a ripple lower).
      if (ctx.random() < PADDLE_CHANCE) {
        if (ctx.get(dx, 0) === 'air' && ctx.get(dx, 1) === 'water') ctx.moveOver(dx, 0)
        else if (ctx.get(dx, 0) === 'air' && ctx.get(dx, 1) === 'air' && ctx.get(dx, 2) === 'water') ctx.moveOver(dx, 1)
        else data ^= RIGHT
      }
    } else if (ctx.random() < WADDLE_CHANCE) {
      if (OPEN.has(ctx.get(dx, 0))) ctx.moveOver(dx, 0)
      else if (OPEN.has(ctx.get(dx, -1)) && OPEN.has(ctx.get(0, -1))) ctx.moveOver(dx, -1)
      else data ^= RIGHT
    }
    ctx.setData(0, 0, data)
    return true
  },
}
