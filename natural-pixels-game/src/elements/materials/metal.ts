import { Anvil } from 'lucide-react'
import type { ElementDefinition } from '../types.ts'

export const metal: ElementDefinition = {
  id: 'metal',
  name: 'Metal',
  description: 'Solid, stays where you put it and conducts heat very well. Build a pot!',
  category: 'materials',
  matter: 'static',
  density: 50,
  color: { base: '#9aa4b2', variation: 0.05 },
  icon: Anvil,
  thermal: { conductivity: 0.9 },
}
