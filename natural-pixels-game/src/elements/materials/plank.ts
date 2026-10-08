import { Hammer } from 'lucide-react'
import type { ElementDefinition } from '../types.ts'

/** Worked wood for building. Humans craft it from logs. */
export const plank: ElementDefinition = {
  id: 'plank',
  name: 'Plank',
  description: 'Sawn wood for building. Humans craft it from logs. Burns into ash.',
  category: 'materials',
  matter: 'static',
  density: 25,
  color: { base: '#c08a52', variation: 0.08 },
  icon: Hammer,
  thermal: { conductivity: 0.05, burn: { at: 260, temp: 650, rate: 0.006, into: 'ash' } },
}
