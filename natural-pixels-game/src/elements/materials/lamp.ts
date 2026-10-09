import { Lamp } from 'lucide-react'
import type { ElementDefinition } from '../types.ts'

/** A light that glows at night without any heat. */
export const lamp: ElementDefinition = {
  id: 'lamp',
  name: 'Lamp',
  description: 'Glows warmly and lights up the night. Gives off no heat.',
  category: 'materials',
  matter: 'static',
  density: 25,
  color: { base: '#ffe08a', variation: 0.05, emissive: 1 },
  icon: Lamp,
  // Humans build it; not in the palette.
  hidden: true,
  thermal: { conductivity: 0.05 },
}
