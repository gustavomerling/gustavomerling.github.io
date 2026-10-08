import { Cherry } from 'lucide-react'
import type { CellContext } from '../../engine/context.ts'
import type { ElementDefinition } from '../types.ts'

/*
 * Fruit `data` layout:
 *   bit 7     FRUIT_ATTACHED – hanging from a tree (doesn't fall)
 *   bits 0-6  age while lying around; at ROT_AGE it rots into a seed
 */
export const FRUIT_ATTACHED = 0x80
const AGE_MASK = 0x7f
const ROT_AGE = 100
const ROT_CHANCE = 0.03

export const fruit: ElementDefinition = {
  id: 'fruit',
  name: 'Fruit',
  description: 'Grows on trees. Birds love it; fallen fruit rots into a seed.',
  category: 'plants',
  matter: 'powder',
  // Lighter than water: fallen fruit floats.
  density: 9,
  color: { base: '#e5484d', variation: 0.12 },
  icon: Cherry,
  movement: { slide: 0.3 },
  brushFill: 0.05,
  update(ctx) {
    const data = ctx.data(0, 0)

    if (data & FRUIT_ATTACHED) {
      if (hasBranch(ctx)) return true
      // Lost its branch (eaten leaf, trunk grew through it...): let it drop.
      ctx.setData(0, 0, data & ~FRUIT_ATTACHED)
      return
    }

    // Only fruit resting on something rots; falling fruit keeps falling.
    if (ctx.get(0, 1) === 'air' || ctx.random() >= ROT_CHANCE) return
    const age = (data & AGE_MASK) + 1
    if (age >= ROT_AGE) ctx.set(0, 0, 'seed')
    else ctx.setData(0, 0, age)
  },
}

/** A leaf, branch or stem touching the fruit (also counts if a bird is perched over it). */
function hasBranch(ctx: CellContext): boolean {
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (isBranch(ctx.get(dx, dy)) || isBranch(ctx.under(dx, dy))) return true
    }
  }
  return false
}

function isBranch(id: string | null): boolean {
  return id === 'leaf' || id === 'wood' || id === 'plant'
}
