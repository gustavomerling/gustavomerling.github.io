import { Cloud } from 'lucide-react'
import type { ElementDefinition } from '../types.ts'

/** Each cloud cell is one water cell's worth of steam, so it rains exactly one drop back. */
export const cloud: ElementDefinition = {
  id: 'cloud',
  name: 'Cloud',
  description: 'Drifts slowly across the sky and rains back down.',
  category: 'water',
  matter: 'gas',
  density: 0.6,
  color: { base: '#cfd8e3', variation: 0.08, alpha: 0.8 },
  icon: Cloud,
  movement: { rise: 0.05, drift: 0.12 },
  thermal: { conductivity: 0.02 },
  lifetime: { min: 300, max: 900, into: 'water' },
  hidden: true,
}
