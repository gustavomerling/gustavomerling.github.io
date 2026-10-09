import { DoorOpen } from 'lucide-react'
import type { ElementDefinition } from '../types.ts'
import { soakPuddles } from './soak.ts'

/** A wooden door: humans walk through it, zombies (and everything else) can't. */
export const door: ElementDefinition = {
  id: 'door',
  name: 'Door',
  description: 'Humans walk through it; zombies, water and sand stay out.',
  category: 'materials',
  matter: 'static',
  density: 25,
  color: { base: '#8f5f36', variation: 0.04 },
  icon: DoorOpen,
  // Humans build it; not in the palette.
  hidden: true,
  thermal: { conductivity: 0.05, burn: { at: 260, temp: 650, rate: 0.006, into: 'ash' } },
  // Puddles against it soak in (see soak.ts).
  update: soakPuddles,
}
