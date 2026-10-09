import { Bone } from 'lucide-react'
import type { CellContext } from '../../engine/context.ts'
import type { ElementDefinition, ElementThermal } from '../types.ts'
import { Body, SKELETON } from './human/body.ts'
import { createMind, upgradeMind, type Mind } from './human/mind.ts'
import { burn, hunt, underSky } from './zombie.ts'

/*
 * Skeletons: they turn up in the dark galleries of a human's mine while it's up top resting
 * (see human/brain.ts), and go for it when it comes back down. They walk the galleries (in
 * front of the mine wall) but never climb the ladders; humans fight them like zombies. Like
 * zombies, they crumble in the sun. A 3-cell column like a human (see human/body.ts).
 */

/** Skeletons act this often (ticks): a little quicker than zombies (9). */
const ACTION_TICKS = 8
const SUNLIGHT = 0.5

const BONES: ElementThermal = { conductivity: 0.1, above: { temp: 120, into: 'ash' } }

export function skeletonMind(ctx: CellContext): Mind {
  return upgradeMind(ctx.memory(createMind))
}

export const skeleton: ElementDefinition = {
  id: 'skeleton',
  name: 'Skeleton',
  description: 'Lurks in the dark galleries of mines and goes for humans. Crumbles in the sun.',
  category: 'animals',
  matter: 'static',
  density: 15,
  color: { base: '#d8d4c8', variation: 0.08 },
  icon: Bone,
  brushSingle: true,
  thermal: BONES,
  update(ctx) {
    const mind = skeletonMind(ctx)
    const body = new Body(ctx, mind, SKELETON)
    body.ensureParts()

    if (mind.health <= 0) {
      // Beaten: it falls apart.
      body.vanish()
      return true
    }
    if (ctx.light() > SUNLIGHT && underSky(body)) {
      burn(body)
      return true
    }
    if (body.fall()) return true
    if (mind.cooldown > 0) {
      mind.cooldown--
      return true
    }
    mind.cooldown = ACTION_TICKS
    hunt(body)
    return true
  },
  describe(ctx) {
    return `health ${Math.max(0, Math.round(skeletonMind(ctx).health))}%`
  },
}

export const skeletonBody: ElementDefinition = {
  id: 'skeleton_body',
  name: 'Skeleton',
  description: 'A skeleton.',
  category: 'animals',
  matter: 'static',
  density: 15,
  color: { base: '#bdb8aa', variation: 0.15 },
  icon: Bone,
  hidden: true,
  partOf: { below: 1 },
  thermal: BONES,
  update(ctx) {
    if (ctx.get(0, 1) !== 'skeleton') ctx.reveal(0, 0)
    return true
  },
}

export const skeletonHead: ElementDefinition = {
  id: 'skeleton_head',
  name: 'Skeleton',
  description: 'A skeleton.',
  category: 'animals',
  matter: 'static',
  density: 15,
  color: { base: '#ece8dc', variation: 0.06 },
  icon: Bone,
  hidden: true,
  partOf: { below: 2 },
  thermal: BONES,
  update(ctx) {
    if (ctx.get(0, 1) !== 'skeleton_body') ctx.reveal(0, 0)
    return true
  },
}
