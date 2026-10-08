import { Droplet } from 'lucide-react'
import type { ElementDefinition } from '../types.ts'
import { MUD_WATER } from './soil.ts'

const SIDES = [
  [0, -1],
  [-1, 0],
  [1, 0],
  [0, 1],
] as const

/** Chance per tick that mud with no water around dries back into (wet) soil. */
const DRY_CHANCE = 0.0008

/** Waterlogged soil. Oozes slowly and dries back into soil, faster when heated. */
export const mud: ElementDefinition = {
  id: 'mud',
  name: 'Mud',
  description: 'Soaked soil that oozes slowly. Dries back into soil, faster with heat.',
  category: 'terrain',
  matter: 'liquid',
  density: 14,
  color: { base: '#5b3d29', variation: 0.1 },
  icon: Droplet,
  movement: { spread: 1, viscosity: 0.85, sink: 0.3 },
  thermal: { conductivity: 0.15, above: { temp: 70, into: 'soil', chance: 0.02 } },
  update(ctx) {
    if (ctx.random() >= DRY_CHANCE) return
    for (const [dx, dy] of SIDES) if (ctx.get(dx, dy) === 'water') return
    ctx.set(0, 0, 'soil', { water: MUD_WATER })
  },
}
