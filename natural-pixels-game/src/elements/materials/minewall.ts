import { Columns3, Pickaxe } from 'lucide-react'
import type { ElementDefinition } from '../types.ts'

/**
 * The dark stone at the back of a mine tunnel. Like a house's back wall, humans walk in front
 * of it and everything else treats it as solid, so the tunnel never caves in or floods.
 */
export const mineWall: ElementDefinition = {
  id: 'mine_wall',
  name: 'Mine Wall',
  description: 'The dark rock at the back of a mine tunnel. Humans walk in front of it; nothing else gets in.',
  category: 'materials',
  matter: 'static',
  density: 40,
  // Solid and dark: the supports (see minePost) give the gallery its rhythm.
  color: { base: '#25232a', variation: 0.04 },
  icon: Pickaxe,
  // Humans build it; not in the palette.
  hidden: true,
  thermal: { conductivity: 0.2 },
}

/**
 * A wooden post up the back of a mine gallery, every few columns (with a torch on it and a beam
 * across the ceiling above): like the mine wall, humans walk in front of it.
 */
export const minePost: ElementDefinition = {
  id: 'mine_post',
  name: 'Mine Post',
  description: 'A wooden post holding up a mine gallery. Humans walk in front of it.',
  category: 'materials',
  matter: 'static',
  density: 40,
  color: { base: '#7a5230', variation: 0.08 },
  icon: Columns3,
  hidden: true,
  thermal: { conductivity: 0.05 },
}
