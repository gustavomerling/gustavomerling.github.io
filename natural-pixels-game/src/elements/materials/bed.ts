import { Bed } from 'lucide-react'
import type { ElementDefinition } from '../types.ts'

/** A bed in a human's house: where it sleeps at night. */
export const bed: ElementDefinition = {
  id: 'bed',
  name: 'Bed',
  description: 'A cosy bed. Humans sleep in theirs at night.',
  category: 'materials',
  matter: 'static',
  density: 25,
  color: { base: '#d9534f', variation: 0.05 },
  icon: Bed,
  hidden: true,
  thermal: { conductivity: 0.05, burn: { at: 220, temp: 600, rate: 0.02, into: 'ash' } },
}
