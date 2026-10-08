import { Umbrella } from 'lucide-react'
import type { ElementDefinition } from '../types.ts'

/** Mushrooms sprout on damp soil in the shade of trees. Humans pick them to eat. */
export const mushroom: ElementDefinition = {
  id: 'mushroom',
  name: 'Mushroom',
  description: 'Sprouts on damp soil in the shade of trees. Humans pick them to eat.',
  category: 'plants',
  matter: 'static',
  density: 20,
  color: { base: '#d8643f', variation: 0.2 },
  icon: Umbrella,
  brushFill: 0.1,
  thermal: { conductivity: 0.05, burn: { at: 200, temp: 400, rate: 0.05 } },
  lifetime: { min: 5000, max: 10000, into: 'litter' },
  update(ctx) {
    if (ctx.get(0, 1) !== 'soil') ctx.set(0, 0, 'air')
  },
}
