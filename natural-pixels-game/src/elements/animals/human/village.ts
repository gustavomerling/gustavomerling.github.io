import type { Body } from './body.ts'
import { halfWidth, MAX_STAGE } from './house.ts'
import { randomName, type Inventory, type Mind } from './mind.ts'
import { ANYWHERE, findNearest, groundBelow } from './senses.ts'
import { note } from './skills.ts'

/*
 * A village grows: once a human's house is well along, now and then a traveller comes to live
 * nearby (a new human, with a few things in its bag, who builds its own house a fair way off).
 * Neighbours greet each other, trade what one has plenty of and the other is short of, and visit
 * each other's houses in their free time.
 */

/** Its house this big before anyone comes to live nearby; at most this many people in the world. */
const NEIGHBOUR_STAGE = 3
const MAX_PEOPLE = 3
/** Chance per action of a traveller turning up (once the house is big enough): every few minutes. */
const ARRIVAL_CHANCE = 0.0004
/** How far from its house the newcomer settles. */
const NEIGHBOUR_DISTANCE = 70
/** What a newcomer carries: enough for a first house (planks make up for missing stone) and some food. */
const NEWCOMER_BAG: Partial<Inventory> = { plank: 48, food: 6, seed: 2 }
/** Travellers arrive in the morning (a whole day ahead to build before dark). */
const MORNING = 0.9

/** Goods neighbours swap: with this many more than the other has, it gives some away. */
const GOODS: readonly (keyof Inventory)[] = ['food', 'fish', 'plank', 'stone', 'coal', 'iron', 'torch', 'wool', 'seed', 'grain', 'gunpowder']
const SURPLUS = 8
const GIFT = 3

/** Everyone (their feet) in the world. */
function people(body: Body): number {
  let n = 0
  findNearest(body, ANYWHERE, (x, y) => {
    if (body.get(x, y) === 'human') n++
    return false
  })
  return n
}

/** Now and then, a traveller arrives to live nearby (a new human some way off). */
export function welcomeNeighbour(body: Body) {
  const { mind } = body
  if (!mind.home || mind.home.stage < NEIGHBOUR_STAGE || body.light() < MORNING || body.random() >= ARRIVAL_CHANCE) return
  if (people(body) >= MAX_PEOPLE) return
  for (const side of body.random() < 0.5 ? [1, -1] : [-1, 1]) {
    const x = mind.home.x + side * NEIGHBOUR_DISTANCE
    const ground = groundBelow(body, x, mind.home.ground - 25, 50)
    if (ground === null || body.get(x, ground) === 'water') continue
    const y = ground - 1
    if (body.get(x, y) !== 'air' || body.get(x, y - 1) !== 'air' || body.get(x, y - 2) !== 'air') continue
    body.set(x, y, 'human')
    const newcomer = body.mindAt(x, y)
    if (!newcomer) return
    do newcomer.name = randomName(() => body.random())
    while (newcomer.name === mind.name)
    for (const [item, n] of Object.entries(NEWCOMER_BAG) as [keyof Inventory, number][]) newcomer.inv[item] = n
    newcomer.tools.sword = 1
    newcomer.today = mind.today
    note(newcomer, `Arrived in a new land, near ${mind.name}'s house. Time to build my own!`, 'friend')
    note(mind, `A traveller, ${newcomer.name}, came to live nearby!`, 'friend')
    mind.say = { text: `Welcome, ${newcomer.name}!`, ttl: 30 }
    return
  }
}

/**
 * Meeting a neighbour: it remembers where they live, and they swap what one has plenty of. Not
 * with the travelling merchant (who trades on its own terms), and nothing at all before it has a
 * house of its own; building materials only once its own house is as big as it gets.
 */
export function meet(mind: Mind, friend: Mind) {
  if (mind.role === 'merchant' || friend.role === 'merchant') return
  if (friend.name && friend.home) (mind.friends ??= {})[friend.name] = { x: friend.home.x, ground: friend.home.ground, half: halfWidth(friend.home.stage) }
  if (!mind.home) return
  for (const item of GOODS) {
    if ((item === 'plank' || item === 'stone') && mind.home.stage < MAX_STAGE) continue
    if (mind.inv[item] < friend.inv[item] + SURPLUS) continue
    const n = Math.min(GIFT, mind.inv[item] - friend.inv[item] - SURPLUS + GIFT)
    mind.inv[item] -= n
    friend.inv[item] += n
    const what = item === 'fish' ? 'fish' : item
    note(mind, `Gave ${friend.name || 'my neighbour'} ${n} ${what}.`, 'friend')
    note(friend, `${mind.name || 'My neighbour'} gave me ${n} ${what}. Thanks!`, 'friend')
    mind.say = { text: `Here, have some ${what}!`, ttl: 30 }
    return
  }
}

/** A neighbour's house to go and visit, now and then (null: nobody to visit). */
export function visit(mind: Mind, random: () => number): { name: string; x: number; y: number } | null {
  const names = Object.keys(mind.friends ?? {})
  if (!names.length) return null
  const name = names[Math.floor(random() * names.length)]
  const home = mind.friends![name]
  // Outside their door (doors are on both sides of a bigger house).
  const side = random() < 0.5 ? -1 : 1
  return { name, x: home.x + side * (home.half + 2), y: home.ground - 1 }
}
