import { Flame } from 'lucide-react'
import type { ElementDefinition } from '../types.ts'

/** Direct flame contact heats what it touches this much per tick... */
const FLAME_HEAT = 25
/** ...up to this temperature (enough to light oil, wood and leaves; conduction does the rest). */
const FLAME_HEAT_MAX = 300

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
    for (const [dx, dy] of SIDES) {
      const id = ctx.get(dx, dy)
      // Water puts flames out (the water itself still gets heated by conduction).
      if (id === 'water') {
        ctx.set(0, 0, 'air')
        return
      }
      if (id === null || id === 'air' || id === 'fire') continue
      // Licking flames: a brief touch is enough to light things up.
      const temp = ctx.temp(dx, dy)
      if (temp < FLAME_HEAT_MAX) ctx.setTemp(dx, dy, Math.min(FLAME_HEAT_MAX, temp + FLAME_HEAT))
    }
  },
}
