import { Hexagon } from 'lucide-react'
import type { ElementDefinition } from '../types.ts'

/** Bedrock-like solid. Humans mine it (with a pickaxe); lava cools into it. */
export const stone: ElementDefinition = {
  id: 'stone',
  name: 'Stone',
  description: 'Hard rock that stays put. Mined with a pickaxe; melts into lava when extremely hot.',
  category: 'terrain',
  matter: 'static',
  density: 40,
  color: { base: '#8a8d91', variation: 0.12 },
  icon: Hexagon,
  thermal: { conductivity: 0.25, above: { temp: 1100, into: 'lava', chance: 0.005 } },
}
