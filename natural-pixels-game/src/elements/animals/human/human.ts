import { PersonStanding } from 'lucide-react'
import type { ElementDefinition, ElementThermal } from '../../types.ts'
import { Body } from './body.ts'
import { think } from './brain.ts'
import { bedSpot } from './house.ts'
import { createMind, describeMind, statusOf, upgradeMind } from './mind.ts'
import { thoughtOf } from './thought.ts'

/** Humans act this often (ticks): ~12 actions per second. */
const ACTION_TICKS = 5
/** Hunger points gained per tick awake / asleep (≈ 7 min from full to starving). */
const HUNGER_AWAKE = 1 / 240
const HUNGER_ASLEEP = 1 / 600
/** Health regained per tick while not starving (~1 per 3 s; faster asleep). */
const HEAL_AWAKE = 1 / 180
const HEAL_ASLEEP = 1 / 40
/** Out after dark (not under its own roof): it carries a torch. */
const TORCH_DARK = 0.35
const INDOORS: ReadonlySet<string | null> = new Set(['backwall', 'ladder', 'bed', 'door'])

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
    if (mind.hunger < 80) mind.health = Math.min(100, mind.health + (mind.asleep ? HEAL_ASLEEP : HEAL_AWAKE))
    if (mind.health <= 0) {
      knockedOut(body)
      return true
    }
    // A torch when out in the dark.
    const outside = !INDOORS.has(ctx.under(0, 0)) && !INDOORS.has(ctx.under(0, -1))
    body.setTorso(ctx.light() < TORCH_DARK && !mind.asleep && outside ? 'human_torch' : 'human_body')

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
  status(ctx) {
    return statusOf(upgradeMind(ctx.memory(createMind)))
  },
  thought(ctx) {
    const mind = upgradeMind(ctx.memory(createMind))
    return { ...thoughtOf(mind, ctx.rain(), ctx.light()), name: mind.name }
  },
}

/**
 * Beaten (by zombies): like in Minecraft, it wakes up back in its bed with full health.
 * Without a home, that's the end of it.
 */
function knockedOut(body: Body) {
  const { mind, ctx } = body
  const home = mind.home
  const key = ctx.life(0, 0)
  if (home) {
    const bed = bedSpot(home)
    const dx = bed.x - ctx.x
    const dy = bed.y - ctx.y
    if (ctx.get(dx, dy) === 'bed') {
      ctx.cover(dx, dy, 'human')
      ctx.setLife(dx, dy, key)
      body.vanish()
      Object.assign(mind, { health: 100, task: 'idle', target: null, asleep: false, say: { text: 'Ouch… home, safe', ttl: 40 } })
      return
    }
  }
  body.vanish()
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
    // Lost its feet: gone, giving back whatever it stood in front of.
    if (ctx.get(0, 1) !== 'human') ctx.reveal(0, 0)
    return true
  },
}

/** Torso holding a torch: lights up the night around a human out after dark. */
export const humanTorch: ElementDefinition = {
  ...humanBody,
  id: 'human_torch',
  color: { base: '#ffb24a', variation: 0.06, emissive: 0.9 },
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
    const below = ctx.get(0, 1)
    if (below !== 'human_body' && below !== 'human_torch') ctx.reveal(0, 0)
    return true
  },
}
