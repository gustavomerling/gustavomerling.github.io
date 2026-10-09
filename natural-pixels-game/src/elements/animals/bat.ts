import { Moon } from 'lucide-react'
import type { ElementDefinition } from '../types.ts'

/*
 * Bats live down the mines: they flit about the dark galleries (in front of the mine wall,
 * like people) and now and then hang from the ceiling for a nap. They never leave the mine.
 * They turn up while its human is up top resting (see human/tasks/shaft.ts).
 *
 * Bat `life` = ticks left hanging.
 */
const FLIT_CHANCE = 0.5
const HANG_CHANCE = 0.004
const HANG_TICKS = 600

/** The inside of a gallery: what it flies through (keeping it where it is). */
const GALLERY: ReadonlySet<string | null> = new Set(['mine_wall', 'mine_post'])

export const bat: ElementDefinition = {
  id: 'bat',
  name: 'Bat',
  description: 'Flits about the dark galleries of mines and naps hanging from the ceiling.',
  category: 'animals',
  matter: 'static',
  density: 2,
  color: { base: '#4a3f52', variation: 0.12 },
  icon: Moon,
  hidden: true,
  thermal: { conductivity: 0.05, above: { temp: 60, into: 'air' } },
  update(ctx) {
    const hanging = ctx.life(0, 0)
    if (hanging > 0) {
      ctx.setLife(0, 0, hanging - 1)
      return true
    }
    // Right under the ceiling: a nap now and then.
    if (!GALLERY.has(ctx.get(0, -1)) && ctx.random() < HANG_CHANCE) {
      ctx.setLife(0, 0, HANG_TICKS)
      return true
    }
    if (ctx.random() >= FLIT_CHANCE) return true
    // Erratic: any direction, a little upwards on average.
    const dx = Math.floor(ctx.random() * 3) - 1
    const dy = ctx.random() < 0.45 ? -1 : ctx.random() < 0.6 ? 0 : 1
    if ((dx || dy) && GALLERY.has(ctx.get(dx, dy)) && !ctx.under(dx, dy)) {
      ctx.moveOver(dx, dy)
      // (Someone who walked through it took the wall behind it: the gallery gets it back.)
      if (ctx.get(0, 0) === 'air') ctx.set(0, 0, 'mine_wall')
    }
    return true
  },
}
