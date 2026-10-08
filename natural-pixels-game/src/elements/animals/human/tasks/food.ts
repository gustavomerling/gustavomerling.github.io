import type { Mind } from '../mind.ts'
import { findNearest, reachableFromGround } from '../senses.ts'
import { approach, type Task } from './types.ts'

/** How much one food item satisfies (hunger points). */
const MEAL = 35
/** How far it looks for fruit or fishing water. */
const SEARCH = 70

export function eat(mind: Mind) {
  if (mind.inv.food <= 0) return
  mind.inv.food--
  mind.hunger = Math.max(0, mind.hunger - MEAL)
}

/** Pick a fruit within reach of the ground. Keeps the seed for replanting. */
export const forage: Task = {
  start(body) {
    const fruit = findNearest(
      body,
      SEARCH,
      (x, y) => body.get(x, y) === 'fruit' && reachableFromGround(body, { x, y }),
    )
    if (!fruit) return false
    body.mind.target = fruit
    body.mind.patience = 150
    return true
  },
  run(body) {
    const { mind } = body
    if (!mind.target || body.get(mind.target.x, mind.target.y) !== 'fruit') return 'failed'
    const status = approach(body)
    if (status !== 'arrived') return status
    body.set(mind.target.x, mind.target.y, 'air')
    mind.inv.food++
    mind.inv.seed++
    return 'done'
  },
}

/** Fishing: walk to the water's edge and wait for a bite from a fish nearby. */
const BITE_CHANCE = 0.1
const FISHING_RANGE = 12
/** Gives up after this many actions without a bite. */
const MAX_WAIT = 60

export const fish: Task = {
  start(body) {
    const water = findNearest(body, SEARCH, (x, y) => body.get(x, y) === 'water' && body.get(x, y - 1) === 'air')
    if (!water) return false
    const { mind } = body
    mind.target = water
    mind.patience = 250
    mind.phase = 0
    mind.timer = 0
    return true
  },
  run(body) {
    const { mind } = body
    if (mind.phase === 0) {
      const status = approach(body)
      if (status !== 'arrived') return status
      mind.phase = 1
    }
    if (++mind.timer > MAX_WAIT) return 'failed'
    if (body.random() >= BITE_CHANCE) return 'running'
    const catchable = findNearest(body, FISHING_RANGE, (x, y) => body.get(x, y) === 'fish')
    if (!catchable) return 'running'
    body.set(catchable.x, catchable.y, 'water')
    mind.inv.food++
    return 'done'
  },
}
