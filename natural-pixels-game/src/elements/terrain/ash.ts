import { Haze } from 'lucide-react'
import type { ElementDefinition } from '../types.ts'
import { compost } from './fertility.ts'

export const ash: ElementDefinition = {
  id: 'ash',
  name: 'Ash',
  description: 'What is left after fire. Mixes into soil and fertilizes it; floats on water.',
  category: 'terrain',
  matter: 'powder',
  density: 6,
  color: { base: '#7b7b7b', variation: 0.15 },
  icon: Haze,
  movement: { slide: 0.7 },
  thermal: { conductivity: 0.05 },
  update(ctx) {
    compost(ctx, 0.01, 60)
  },
}
