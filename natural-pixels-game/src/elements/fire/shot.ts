import { Crosshair } from 'lucide-react'
import type { ElementDefinition } from '../types.ts'

/** The flash of a musket shot along its path: gone in a blink, harmless to the scenery. */
export const shot: ElementDefinition = {
  id: 'shot',
  name: 'Shot',
  description: 'A musket shot.',
  category: 'fire',
  matter: 'static',
  density: 0.1,
  color: { base: '#fff1a8', variation: 0.05, emissive: 1 },
  icon: Crosshair,
  hidden: true,
  lifetime: { min: 3, max: 5 },
}
