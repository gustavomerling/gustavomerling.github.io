import { LeafyGreen } from 'lucide-react'
import { compost } from '../terrain/fertility.ts'
import type { ElementDefinition } from '../types.ts'

/** Old leaves fall as litter, drift down, and rot into the soil as fertility. */
export const litter: ElementDefinition = {
  id: 'litter',
  name: 'Dry Leaf',
  description: 'Fallen leaves. They rot into the soil and fertilize it. Very flammable.',
  category: 'plants',
  matter: 'powder',
  // Light: floats on water.
  density: 4,
  color: { base: '#b08a3e', variation: 0.22 },
  icon: LeafyGreen,
  movement: { slide: 0.4 },
  thermal: { conductivity: 0.05, burn: { at: 150, temp: 450, rate: 0.1 } },
  hidden: true,
  update(ctx) {
    compost(ctx, 0.002, 25)
  },
}
