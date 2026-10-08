import { Hexagon } from 'lucide-react'
import type { ElementDefinition } from '../types.ts'

/** Heavy rock: falls straight down like a block (no sliding) and stacks. Humans mine it; lava cools into it. */
export const stone: ElementDefinition = {
  id: 'stone',
  name: 'Stone',
  description: 'Heavy rock blocks that fall and stack. Mined with a pickaxe; melts into lava when extremely hot.',
  category: 'terrain',
  matter: 'powder',
  // Blocks don't slide off each other: they stack in columns and fall when undermined.
  movement: { slide: 0 },
  brushFill: 1,
  density: 40,
  color: { base: '#8a8d91', variation: 0.12 },
  icon: Hexagon,
  thermal: { conductivity: 0.25, above: { temp: 1100, into: 'lava', chance: 0.005 } },
}
