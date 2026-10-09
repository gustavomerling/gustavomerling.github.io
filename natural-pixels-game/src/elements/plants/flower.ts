import { Flower2 } from 'lucide-react'
import { hatchButterfly } from '../animals/butterfly.ts'
import type { ElementDefinition } from '../types.ts'

/** Wildflowers pop up in sunny grass. Bees love them (and multiply around them); butterflies come to them. */
export const flower: ElementDefinition = {
  id: 'flower',
  name: 'Flower',
  description: 'Wildflowers that pop up in sunny meadows. Bees visit them and multiply.',
  category: 'plants',
  matter: 'static',
  density: 20,
  color: { base: '#ff7eb6', variation: 0.25 },
  icon: Flower2,
  brushFill: 0.15,
  thermal: { conductivity: 0.05, burn: { at: 180, temp: 450, rate: 0.08 } },
  lifetime: { min: 6000, max: 14000 },
  update(ctx) {
    const below = ctx.get(0, 1)
    if (below !== 'grass' && below !== 'soil') ctx.set(0, 0, 'air')
    else if (ctx.light() > 0.6 && ctx.rain() < 0.1) hatchButterfly(ctx)
  },
}
