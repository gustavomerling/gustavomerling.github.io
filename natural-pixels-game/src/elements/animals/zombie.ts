import { Skull } from 'lucide-react'
import type { CellContext } from '../../engine/context.ts'
import type { ElementDefinition, ElementThermal } from '../types.ts'
import { Body, ZOMBIE } from './human/body.ts'
import { createMind, upgradeMind, type Mind } from './human/mind.ts'
import { findNearest } from './human/senses.ts'

/*
 * Zombies: a few rise from the dark ground at night and shamble after humans. Doors, walls
 * and fences stop them; sunlight on open ground burns them up. Killed ones sometimes drop
 * gunpowder, which humans collect to make muskets. A 3-cell column like a human (see
 * human/body.ts), slower than one.
 */

/** Zombies act this often (ticks): slower than humans (5). */
const ACTION_TICKS = 9
/** How far it smells a human. */
const SIGHT = 40
/** Swings every few actions, for this much damage. */
const HIT_EVERY = 4
const HIT_DAMAGE = 12
/** Burns in daylight brighter than this, under open sky. */
const SUNLIGHT = 0.5
const GUNPOWDER_DROP = 0.5

const MORTAL: ElementThermal = { conductivity: 0.1, above: { temp: 70, into: 'ash' } }
/** Lets the sun through: nothing overhead but sky. */
const SKY: ReadonlySet<string | null> = new Set(['air', 'cloud', 'steam', 'water', 'firefly', 'bird', 'bee', 'lightning'])

export function zombieMind(ctx: CellContext): Mind {
  return upgradeMind(ctx.memory(createMind))
}

export const zombie: ElementDefinition = {
  id: 'zombie',
  name: 'Zombie',
  description: 'Rises at night and chases humans. Burns up in the sun. Doors keep it out.',
  category: 'animals',
  matter: 'static',
  density: 15,
  color: { base: '#3e6b35', variation: 0.08 },
  icon: Skull,
  brushSingle: true,
  thermal: MORTAL,
  update(ctx) {
    const mind = zombieMind(ctx)
    const body = new Body(ctx, mind, ZOMBIE)
    body.ensureParts()

    if (mind.health <= 0) {
      fallen(body)
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
    return `health ${Math.max(0, Math.round(zombieMind(ctx).health))}%`
  },
}

export const zombieBody: ElementDefinition = {
  id: 'zombie_body',
  name: 'Zombie',
  description: 'A zombie.',
  category: 'animals',
  matter: 'static',
  density: 15,
  color: { base: '#4a5f8a', variation: 0.08 },
  icon: Skull,
  hidden: true,
  partOf: { below: 1 },
  thermal: MORTAL,
  update(ctx) {
    if (ctx.get(0, 1) !== 'zombie') ctx.reveal(0, 0)
    return true
  },
}

export const zombieHead: ElementDefinition = {
  id: 'zombie_head',
  name: 'Zombie',
  description: 'A zombie.',
  category: 'animals',
  matter: 'static',
  density: 15,
  color: { base: '#6fae57', variation: 0.1 },
  icon: Skull,
  hidden: true,
  partOf: { below: 2 },
  thermal: MORTAL,
  update(ctx) {
    if (ctx.get(0, 1) !== 'zombie_body') ctx.reveal(0, 0)
    return true
  },
}

export function underSky(body: Body): boolean {
  for (let y = body.y - 3; y >= 0; y--) if (!SKY.has(body.get(body.x, y))) return false
  return true
}

/** Goes up in flames in the sunlight. */
export function burn(body: Body) {
  const { x, y } = body
  body.vanish()
  for (let k = 0; k < 3; k++) if (body.get(x, y - k) === 'air') body.set(x, y - k, 'fire')
}

/** Beaten by a human: crumbles, sometimes leaving some gunpowder behind. */
function fallen(body: Body) {
  const { x, y } = body
  body.vanish()
  if (body.get(x, y) === 'air') body.set(x, y, body.random() < GUNPOWDER_DROP ? 'gunpowder' : 'litter')
}

/** Shamble towards the nearest human and hit it; otherwise wander. */
export function hunt(body: Body) {
  const { mind } = body
  const prey = findNearest(body, SIGHT, (x, y) => body.get(x, y) === 'human')
  if (!prey) {
    if (body.random() < 0.05) mind.dir = mind.dir === 1 ? -1 : 1
    if (body.random() < 0.5 && !body.step(mind.dir)) mind.dir = mind.dir === 1 ? -1 : 1
    return
  }
  if (Math.abs(prey.x - body.x) <= 1 && Math.abs(prey.y - body.y) <= 2) {
    if (++mind.timer % HIT_EVERY !== 0) return
    const victim = body.mindAt(prey.x, prey.y)
    if (!victim) return
    victim.health -= HIT_DAMAGE
    victim.hurt = 12
    return
  }
  mind.dir = prey.x > body.x ? 1 : -1
  body.walkTo(prey)
}
