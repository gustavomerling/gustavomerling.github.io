import { Flame } from 'lucide-react'
import type { ElementDefinition } from '../types.ts'

/** A torch on the wall: lights up mines and dark places. Humans make them from coal and planks. */
export const torch: ElementDefinition = {
  id: 'torch',
  name: 'Torch',
  description: 'Lights up mines and the night. Humans make them from coal and a plank and walk right past them.',
  category: 'materials',
  matter: 'static',
  density: 20,
  color: { base: '#ffb347', variation: 0.08, emissive: 1 },
  icon: Flame,
  // Humans build it; not in the palette.
  hidden: true,
  thermal: { conductivity: 0.05 },
}
