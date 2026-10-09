import { Sparkles } from 'lucide-react'
import type { ElementDefinition } from '../types.ts'

/*
 * Glowing mushrooms: a soft blue-green light in the dark. They sprout on the floors of old mine
 * galleries (see human/tasks/shaft.ts) and in any dark, damp corner they're painted in. Humans
 * walk past them; they wither if what they grow on goes.
 */
export const glowShroom: ElementDefinition = {
  id: 'glow_shroom',
  name: 'Glow Mushroom',
  description: 'A little mushroom that glows softly in the dark. Sprouts on the floors of old mines.',
  category: 'plants',
  matter: 'static',
  density: 15,
  color: { base: '#7fe3d2', variation: 0.2, emissive: 0.7 },
  icon: Sparkles,
  brushFill: 0.05,
  thermal: { conductivity: 0.05, burn: { at: 160, temp: 400, rate: 0.1 } },
  update(ctx) {
    const below = ctx.get(0, 1)
    if (below === null || below === 'air' || below === 'water') ctx.set(0, 0, ctx.under(0, 0) ?? 'air')
  },
}
