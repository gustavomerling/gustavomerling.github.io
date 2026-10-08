import { Flame } from 'lucide-react'
import type { ElementDefinition } from '../types.ts'

const SIDES = [
  [0, -1],
  [-1, 0],
  [1, 0],
  [0, 1],
] as const

export const fire: ElementDefinition = {
  id: 'fire',
  name: 'Fire',
  description: 'Short-lived flames that rise and heat whatever they touch. Burns dry plants and wood.',
  category: 'fire',
  matter: 'energy',
  density: 0.3,
  color: { base: '#ff8a2b', variation: 0.3 },
  icon: Flame,
  brushFill: 0.5,
  thermal: { conductivity: 0.15, source: 800 },
  lifetime: { min: 20, max: 45 },
  update(ctx) {
    // Water puts flames out (the water itself still gets heated by conduction).
    for (const [dx, dy] of SIDES) {
      if (ctx.get(dx, dy) === 'water') {
        ctx.set(0, 0, 'air')
        return
      }
    }
  },
}
