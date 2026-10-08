import { PersonStanding } from 'lucide-react'
import type { ElementDefinition, ElementThermal } from '../../types.ts'
import { Body } from './body.ts'
import { think } from './brain.ts'
import { createMind, describeMind, upgradeMind } from './mind.ts'
import { thoughtOf } from './thought.ts'

/** Humans act this often (ticks): ~12 actions per second. */
const ACTION_TICKS = 5
/** Hunger points gained per tick awake / asleep (≈ 7 min from full to starving). */
const HUNGER_AWAKE = 1 / 240
const HUNGER_ASLEEP = 1 / 600

/** Fire and lava are deadly. */
const MORTAL: ElementThermal = { conductivity: 0.1, above: { temp: 70, into: 'ash' } }

/**
 * A human: a 3-cell column (this cell is the feet and does the thinking; torso and head
 * follow it). Lives a Minecraft-style life — see brain.ts.
 */
export const human: ElementDefinition = {
  id: 'human',
  name: 'Human',
  description: 'Lives a life: picks fruit, fishes, chops trees, mines, crafts tools, builds a house and plants trees.',
  category: 'animals',
  matter: 'static',
  density: 15,
  color: { base: '#3c5a8a', variation: 0.08 },
  icon: PersonStanding,
  brushSingle: true,
  thermal: MORTAL,
  update(ctx) {
    const mind = upgradeMind(ctx.memory(createMind))
    const body = new Body(ctx, mind)
    body.ensureParts()
    mind.hunger = Math.min(100, mind.hunger + (mind.asleep ? HUNGER_ASLEEP : HUNGER_AWAKE))

    if (body.fall()) {
      mind.asleep = false
      return true
    }
    if (mind.cooldown > 0) {
      mind.cooldown--
      return true
    }
    mind.cooldown = ACTION_TICKS
    think(body)
    return true
  },
  describe(ctx) {
    return describeMind(upgradeMind(ctx.memory(createMind)))
  },
  thought(ctx) {
    return thoughtOf(upgradeMind(ctx.memory(createMind)))
  },
}

/** Torso: follows the feet; vanishes if it loses them. */
export const humanBody: ElementDefinition = {
  id: 'human_body',
  name: 'Human',
  description: 'A human.',
  category: 'animals',
  matter: 'static',
  density: 15,
  color: { base: '#d9534f', variation: 0.08 },
  icon: PersonStanding,
  hidden: true,
  partOf: { below: 1 },
  thermal: MORTAL,
  update(ctx) {
    if (ctx.get(0, 1) !== 'human') ctx.set(0, 0, 'air')
    return true
  },
}

/** Head: sits on the torso; vanishes if it loses it. */
export const humanHead: ElementDefinition = {
  id: 'human_head',
  name: 'Human',
  description: 'A human.',
  category: 'animals',
  matter: 'static',
  density: 15,
  color: { base: '#f1c27d', variation: 0.1 },
  icon: PersonStanding,
  hidden: true,
  partOf: { below: 2 },
  thermal: MORTAL,
  update(ctx) {
    if (ctx.get(0, 1) !== 'human_body') ctx.set(0, 0, 'air')
    return true
  },
}
