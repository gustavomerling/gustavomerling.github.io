import { FlameKindling } from 'lucide-react'
import type { ElementDefinition } from '../types.ts'

/** Molten rock: oozes, sets things on fire, and hardens into stone as it cools. */
export const lava: ElementDefinition = {
  id: 'lava',
  name: 'Lava',
  description: 'Molten rock. Burns what it touches, melts sand into glass, hardens into stone; water quenches it.',
  category: 'fire',
  matter: 'liquid',
  density: 22,
  color: { base: '#ff6a1a', variation: 0.2, emissive: 0.9 },
  icon: FlameKindling,
  movement: { spread: 2, viscosity: 0.75, sink: 0.4 },
  thermal: {
    conductivity: 0.35,
    initialTemp: 1200,
    insulation: 0.85,
    below: { temp: 650, into: 'stone', chance: 0.02 },
  },
  reactions: [
    { with: 'water', chance: 0.5, self: 'stone', other: 'steam' },
    { with: 'ice', chance: 0.5, other: 'water' },
  ],
}
