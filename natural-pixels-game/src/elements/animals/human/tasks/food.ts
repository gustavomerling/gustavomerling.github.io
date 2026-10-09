import { HONEY_FULL } from '../../beehive.ts'
import type { Body } from '../body.ts'
import type { Mind } from '../mind.ts'
import { findNearest, freeWater, reachableFromGround } from '../senses.ts'
import { approach, type Task } from './types.ts'
import { firstTime, knack, practice } from '../skills.ts'
import { note } from '../skills.ts'
import { pierEnd } from './decor.ts'

/** How much one food item satisfies (hunger points); raw fish a lot less. */
const MEAL = 35
const RAW_MEAL = 28
/** Honey from a full hive is worth this much food; harvesting it, it sometimes gets stung. */
const HONEY_FOOD = 2
const STING_CHANCE = 0.3
const STING = 5
/** How far it looks for fruit or fishing water. */
const SEARCH = 70

export function eat(mind: Mind) {
  if (mind.inv.food > 0) {
    mind.inv.food--
    mind.hunger = Math.max(0, mind.hunger - MEAL)
  } else if (mind.inv.fish > 0) {
    mind.inv.fish--
    mind.hunger = Math.max(0, mind.hunger - RAW_MEAL)
  }
}

/** Everything it could eat right now (food and raw fish). */
export function edible(mind: Mind): number {
  return mind.inv.food + mind.inv.fish
}

const PICKABLE: ReadonlySet<string | null> = new Set(['fruit', 'mushroom', 'egg'])

/** Something to pick at (x, y): fruit, a mushroom, an egg, a hive full of honey, a fallen star. */
function pickable(body: Body, x: number, y: number): boolean {
  const id = body.get(x, y)
  return PICKABLE.has(id) || id === 'meteorite' || (id === 'beehive' && body.data(x, y) >= HONEY_FULL)
}

/**
 * Pick a fruit (keeping its seed for replanting), a mushroom or an egg within reach of the
 * ground; or the honey out of a full beehive (mind.phase 1), stings and all.
 */
export const forage: Task = {
  start(body) {
    const fruit = findNearest(body, SEARCH, (x, y) => pickable(body, x, y) && reachableFromGround(body, { x, y }))
    if (!fruit) return false
    body.mind.target = fruit
    body.mind.patience = 150
    body.mind.phase = body.get(fruit.x, fruit.y) === 'beehive' ? 1 : 0
    return true
  },
  run(body) {
    const { mind } = body
    if (!mind.target || !pickable(body, mind.target.x, mind.target.y)) return 'failed'
    const picked = body.get(mind.target.x, mind.target.y)
    const status = approach(body)
    if (status !== 'arrived') return status
    if (picked === 'beehive') {
      // The hive stays (it fills up again); the honey's food.
      body.setData(mind.target.x, mind.target.y, 0)
      mind.inv.food += HONEY_FOOD
      if (body.random() < STING_CHANCE) {
        mind.health -= STING
        mind.hurt = 12
        mind.say = { text: 'Ouch, bees!', ttl: 20 }
      } else mind.say = { text: 'Honey!', ttl: 15 }
      firstTime(mind, 'honey', 'Collected honey from a wild beehive.', 'nature')
      return 'done'
    }
    body.set(mind.target.x, mind.target.y, 'air')
    if (picked === 'meteorite') {
      // Space rock: iron, and sometimes a little gold.
      mind.inv.iron += 2
      const gold = body.random() < 0.3
      if (gold) mind.inv.gold++
      note(mind, gold ? 'Found a fallen star: iron and a nugget of gold!' : 'Found a fallen star: good iron!', 'treasure')
      mind.say = { text: 'A fallen star!', ttl: 25 }
      return 'done'
    }
    mind.inv.food++
    if (picked === 'fruit') mind.inv.seed++
    return 'done'
  },
}

/** Fishing: walk to the water's edge and wait for a bite from a fish nearby. */
const BITE_CHANCE = 0.1
/** With a pier, it fishes from the end of it this often. */
const FROM_PIER = 0.7
/** Chance a bite is treasure rather than a fish (from the bank, from a pier). */
const TREASURE = 0.04
const TREASURE_PIER = 0.12
/** Messages in bottles. */
const MESSAGES = [
  'If you find this, the fishing here is great.',
  'I buried my gold under the tallest tree. Or was it the second tallest?',
  'Greetings from across the lake!',
  'Day 40 on this island. Still no coconuts.',
  'Remember to water your saplings.',
  'The skeletons fear the light.',
  'Whoever reads this: have a lovely day.',
  'Look up on a clear night: the stars fall sometimes.',
]
/** Fishing experience per fish. */
const FISH_XP = 3
const FISHING_RANGE = 12
/** It casts from the bank this far from the water it's heading for. */
const CAST = 4
/** Gives up after this many actions without a bite. */
const MAX_WAIT = 60

export const fish: Task = {
  start(body) {
    const { mind } = body
    // Its pier: out to the end of it, mostly.
    const pier = pierEnd(mind)
    if (pier && body.get(pier.water.x, pier.water.y) === 'water' && body.random() < FROM_PIER) {
      mind.target = pier.stand
      mind.cast = null
      mind.patience = 250
      mind.phase = 0
      mind.timer = 0
      mind.fishingFrom = pier.water
      return true
    }
    mind.fishingFrom = null
    const water = findNearest(body, SEARCH, (x, y) => freeWater(body, x, y) && body.get(x, y - 1) === 'air')
    if (!water) return false
    mind.target = water
    mind.patience = 250
    mind.phase = 0
    mind.timer = 0
    return true
  },
  run(body) {
    const { mind } = body
    if (mind.phase === 0) {
      // Out on its boat it can fish right from there.
      const fromBoat = body.riding() && mind.target && Math.abs(mind.target.x - body.x) <= FISHING_RANGE
      // On dry ground near enough: cast from the bank rather than wading in.
      const t = mind.target
      const fromBank = !mind.fishingFrom && !mind.afloat && body.standing() && t && Math.abs(t.x - body.x) <= CAST && Math.abs(t.y - body.y) <= CAST
      const status = fromBoat || fromBank ? 'arrived' : approach(body)
      if (status !== 'arrived') return status
      // No fish anywhere near: no point waiting here.
      if (!findNearest(body, FISHING_RANGE, (x, y) => body.get(x, y) === 'fish')) return 'failed'
      mind.phase = 1
    }
    if (++mind.timer > MAX_WAIT) return 'failed'
    // The line goes out to the water's surface (drawn by the UI, see Sandbox.onLines).
    const line = mind.fishingFrom ?? mind.target
    if (line) mind.cast = { x: line.x, y: line.y }
    if (body.random() >= BITE_CHANCE * knack(mind, 'fishing')) return 'running'
    const catchable = findNearest(body, FISHING_RANGE, (x, y) => body.get(x, y) === 'fish')
    if (!catchable) return 'running'
    // Now and then something else is on the hook (more often off the end of a pier).
    if (body.random() < (mind.fishingFrom ? TREASURE_PIER : TREASURE) * knack(mind, 'fishing')) {
      treasure(body)
      return 'done'
    }
    body.set(catchable.x, catchable.y, 'water')
    // Raw: it grills it at the campfire if it has one (see cook.ts), or eats it as it is.
    mind.inv.fish++
    practice(mind, 'fishing', FISH_XP)
    firstTime(mind, 'fish', 'Caught my first fish!', 'nature')
    // A seasoned angler now and then lands two.
    if (body.random() < (knack(mind, 'fishing') - 1) / 2) {
      mind.inv.fish++
      mind.say = { text: 'Two at once!', ttl: 15 }
    }
    return 'done'
  },
}

/** Something other than a fish on the hook: a little chest, a bottle with a message, an old boot. */
function treasure(body: Body) {
  const { mind } = body
  const r = body.random()
  if (r < 0.45) {
    const gold = 1 + Math.floor(body.random() * 3)
    const silver = Math.floor(body.random() * 3)
    const amethyst = body.random() < 0.3 ? 1 : 0
    mind.inv.gold += gold
    mind.inv.silver += silver
    mind.inv.amethyst += amethyst
    const loot = [`${gold} gold`, silver ? `${silver} silver` : '', amethyst ? 'an amethyst' : ''].filter(Boolean).join(', ')
    note(mind, `Fished up a little chest! Inside: ${loot}.`, 'treasure')
    mind.say = { text: 'Treasure!', ttl: 30 }
  } else if (r < 0.8) {
    const message = MESSAGES[Math.floor(body.random() * MESSAGES.length)]
    note(mind, `Fished up a bottle with a message: "${message}"`, 'treasure')
    mind.say = { text: 'A message in a bottle!', ttl: 30 }
  } else {
    note(mind, 'Fished up an old boot. Ha!', 'event')
    mind.say = { text: 'An old boot…', ttl: 20 }
  }
  practice(mind, 'fishing', 2)
}
