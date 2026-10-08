import { Hourglass } from 'lucide-react'
import type { ElementDefinition } from '../types.ts'

export const sand: ElementDefinition = {
  id: 'sand',
  name: 'Sand',
  description: 'Loose grains that pile up and sink in water.',
  category: 'terrain',
  matter: 'powder',
  density: 16,
  color: { base: '#e2c27d', variation: 0.09 },
  icon: Hourglass,
  movement: { slide: 1, sink: 0.5 },
  thermal: { conductivity: 0.15 },
}
