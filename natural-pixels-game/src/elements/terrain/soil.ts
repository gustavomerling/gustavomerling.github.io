import { Shovel } from 'lucide-react'
import type { ElementDefinition } from '../types.ts'

export const soil: ElementDefinition = {
  id: 'soil',
  name: 'Soil',
  description: 'Heavy earth that soaks up water. Seeds sprout in wet soil.',
  category: 'terrain',
  matter: 'powder',
  density: 15,
  color: { base: '#8a5a3b', wet: '#4a2e1d', variation: 0.12 },
  icon: Shovel,
  movement: { slide: 0.15, sink: 0.35 },
  thermal: { conductivity: 0.1 },
  // Two water cells saturate one soil cell; extra water pools on top.
  moisture: { capacity: 200, group: 'soil', absorbs: 'water', flow: 0.5, bias: 'down' },
}
