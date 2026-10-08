import { GlassWater } from 'lucide-react'
import type { ElementDefinition } from '../types.ts'

/** See-through solid. Sand melts into it; acid can't touch it. */
export const glass: ElementDefinition = {
  id: 'glass',
  name: 'Glass',
  description: 'Transparent solid. Made by melting sand (lava does it). Acid-proof.',
  category: 'materials',
  matter: 'static',
  density: 30,
  color: { base: '#cfeefa', variation: 0.03, alpha: 0.35 },
  icon: GlassWater,
  thermal: { conductivity: 0.2 },
}
