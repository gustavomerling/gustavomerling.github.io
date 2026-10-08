import { BrickWall } from 'lucide-react'
import type { ElementDefinition } from '../types.ts'

/**
 * The inside wall of a house: fills it in so it isn't see-through. Humans walk in front of it
 * (it's behind them); everything else treats it as solid, so rain and sand stay out.
 */
export const backwall: ElementDefinition = {
  id: 'backwall',
  name: 'Back Wall',
  description: 'The inside wall of a house. Humans walk in front of it; rain and sand stay out.',
  category: 'materials',
  matter: 'static',
  density: 25,
  color: { base: '#6e4b2f', variation: 0.06 },
  icon: BrickWall,
  thermal: { conductivity: 0.05, burn: { at: 260, temp: 650, rate: 0.006, into: 'ash' } },
}
