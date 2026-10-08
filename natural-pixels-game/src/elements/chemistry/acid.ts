import { FlaskConical } from 'lucide-react'
import type { ElementDefinition, Reaction } from '../types.ts'

/** Everything acid eats through. Glass and metal resist it, so they make good containers. */
const DISSOLVES = [
  'soil',
  'sand',
  'stone',
  'mud',
  'ash',
  'ice',
  'wood',
  'plank',
  'plant',
  'leaf',
  'grass',
  'litter',
  'fruit',
  'seed',
  'worm',
  'fish',
  'bird',
  'bee',
  'gunpowder',
]

export const acid: ElementDefinition = {
  id: 'acid',
  name: 'Acid',
  description: 'Eats through almost anything and wears out doing it. Glass and metal resist it.',
  category: 'chemistry',
  matter: 'liquid',
  density: 11,
  color: { base: '#9be15d', variation: 0.08, alpha: 0.85, emissive: 0.15 },
  icon: FlaskConical,
  movement: { spread: 4 },
  thermal: { conductivity: 0.3 },
  reactions: DISSOLVES.map<Reaction>((id) => ({ with: id, chance: 0.05, other: 'air', self: 'air', selfChance: 0.25 })),
}
