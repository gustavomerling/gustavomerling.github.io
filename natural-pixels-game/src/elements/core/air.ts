import { Wind } from 'lucide-react'
import type { ElementDefinition } from '../types.ts'

/** The empty cell. Always registry index 0. */
export const air: ElementDefinition = {
  id: 'air',
  name: 'Air',
  description: 'Empty space.',
  category: 'core',
  matter: 'empty',
  density: 1,
  color: { base: '#000000', alpha: 0 },
  icon: Wind,
  hidden: true,
}
