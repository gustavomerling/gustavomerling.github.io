import { Fence } from 'lucide-react'
import type { ElementDefinition } from '../types.ts'

/** Wooden fence: keeps rabbits out of fields. Humans step right through their own gates. */
export const fence: ElementDefinition = {
  id: 'fence',
  name: 'Fence',
  description: 'Keeps rabbits out of the fields. Humans walk through it like a gate.',
  category: 'materials',
  matter: 'static',
  density: 25,
  color: { base: '#a8794a', variation: 0.06 },
  icon: Fence,
  thermal: { conductivity: 0.05, burn: { at: 260, temp: 650, rate: 0.006, into: 'ash' } },
}
