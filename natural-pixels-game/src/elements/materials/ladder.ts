import { Rows3 } from 'lucide-react'
import type { ElementDefinition } from '../types.ts'
import { soakPuddles } from './soak.ts'

/** Humans climb ladders up and down (to the upper floors of their house). Solid to everything else. */
export const ladder: ElementDefinition = {
  id: 'ladder',
  name: 'Ladder',
  description: 'Humans climb it up and down, like in their houses. Solid to everything else.',
  category: 'materials',
  matter: 'static',
  density: 25,
  // Rungs: every other row lighter.
  color: { base: '#a8743f', variation: 0.3, stripes: true },
  icon: Rows3,
  // Humans build it; not in the palette.
  hidden: true,
  thermal: { conductivity: 0.05, burn: { at: 260, temp: 650, rate: 0.006, into: 'ash' } },
  // Puddles against it soak in (see soak.ts).
  update: soakPuddles,
}
