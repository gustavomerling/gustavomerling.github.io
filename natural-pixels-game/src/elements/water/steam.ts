import { CloudFog } from 'lucide-react'
import type { ElementDefinition } from '../types.ts'

export const steam: ElementDefinition = {
  id: 'steam',
  name: 'Steam',
  description: 'Boiled water. Rises fast and gathers into clouds after about 10 seconds.',
  category: 'water',
  matter: 'gas',
  // Lighter than air: bubbles up through water and floats away.
  density: 0.5,
  color: { base: '#e6edf5', variation: 0.05, alpha: 0.55 },
  icon: CloudFog,
  movement: { rise: 0.9, drift: 0.4, sink: 0.5 },
  brushFill: 0.3,
  thermal: { conductivity: 0.05, initialTemp: 100 },
  lifetime: { min: 540, max: 720, into: 'cloud' },
}
