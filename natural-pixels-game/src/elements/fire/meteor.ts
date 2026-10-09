import { Gem, Sparkles } from 'lucide-react'
import type { ElementDefinition } from '../types.ts'

/*
 * Meteors fall during a meteor shower (see engine/events.ts): a glowing rock streaking down at a
 * slant, leaving a puff of smoke behind. Where it lands it leaves a fallen star (a meteorite),
 * glowing faintly; into water it just fizzles out as steam. It never sets anything alight.
 *
 * Meteor `data`: bit 0 = heading right.
 */

/** What a meteor flies through (and leaves smoke in). */
const SKY: ReadonlySet<string | null> = new Set(['air', 'cloud', 'smoke', 'steam', 'lightning', 'bird', 'bat', 'firefly', 'bee', 'butterfly'])

export const meteor: ElementDefinition = {
  id: 'meteor',
  name: 'Meteor',
  description: 'A glowing rock falling from the sky in a meteor shower. Leaves a fallen star where it lands.',
  category: 'fire',
  matter: 'static',
  density: 60,
  color: { base: '#fff0c0', variation: 0.15, emissive: 1 },
  icon: Sparkles,
  hidden: true,
  thermal: { conductivity: 0 },
  update(ctx) {
    const dx = ctx.data(0, 0) & 1 ? 1 : -1
    const below = ctx.get(dx, 1)
    if (below === null) {
      ctx.set(0, 0, 'air')
      return
    }
    if (SKY.has(below)) {
      ctx.set(dx, 1, 'meteor', { data: ctx.data(0, 0) })
      ctx.set(0, 0, 'smoke')
      return
    }
    // Landed: in the water it fizzles, on anything else it's a fallen star now.
    ctx.set(0, 0, below === 'water' ? 'steam' : 'meteorite')
  },
}

/** A fallen star: a lump of space rock, faintly glowing. Humans pick it up (iron, sometimes gold). */
export const meteorite: ElementDefinition = {
  id: 'meteorite',
  name: 'Fallen Star',
  description: 'A meteorite from a meteor shower, still glowing faintly. Humans collect them (iron, sometimes gold).',
  category: 'terrain',
  matter: 'static',
  density: 70,
  color: { base: '#5a4f6b', variation: 0.3, emissive: 0.35 },
  icon: Gem,
  thermal: { conductivity: 0.4 },
}
