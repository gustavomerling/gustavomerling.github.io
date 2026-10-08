import { Sailboat } from 'lucide-react'
import type { ElementDefinition } from '../types.ts'

/**
 * A human's rowing boat: one cell on the water's surface, carried along by the human
 * standing on it (see human/body.ts). Left behind, it's packed away (turns back to water,
 * the cell it displaced).
 */
export const boat: ElementDefinition = {
  id: 'boat',
  name: 'Boat',
  description: 'A little wooden boat a human made to cross the water.',
  category: 'materials',
  matter: 'static',
  density: 8,
  color: { base: '#8a5a32', variation: 0.06 },
  icon: Sailboat,
  hidden: true,
  thermal: { conductivity: 0.05, burn: { at: 260, temp: 650, rate: 0.006, into: 'ash' } },
  update(ctx) {
    if (ctx.get(0, -1) !== 'human') ctx.set(0, 0, 'water')
    return true
  },
}
