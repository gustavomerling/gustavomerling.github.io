import { avoided } from '../senses.ts'
import { builtDecor } from './decor.ts'
import { approach, patienceFor, type Task } from './types.ts'

/*
 * Grilling fish at the campfire: each raw fish it caught becomes a proper meal (raw fish is
 * edible, but not very filling: see food.ts).
 */

/** Actions to grill one fish. */
const COOK_ACTIONS = 24
/** Cooks from anywhere this close to the fire. */
const BY_THE_FIRE = 3

export const cook: Task = {
  start(body) {
    const { mind } = body
    if (mind.inv.fish < 1) return false
    const fires = builtDecor(mind, 'campfire')
    if (!fires.length) return false
    const fire = fires[0]
    // (Couldn't get to it a moment ago: not again just yet.)
    if (avoided(mind, fire.x, fire.ground - 1)) return false
    mind.target = { x: fire.x, y: fire.ground - 1 }
    mind.patience = patienceFor(body, mind.target)
    mind.timer = 0
    return true
  },
  run(body) {
    const { mind } = body
    const t = mind.target
    if (!t) return 'failed'
    // Close enough to the fire (in front of it is fine: it walks past campfires).
    const near = Math.abs(body.x - t.x) <= BY_THE_FIRE && Math.abs(body.y - t.y) <= 1
    if (!near) {
      const status = approach(body)
      if (status !== 'arrived') return status
    }
    if (++mind.timer < COOK_ACTIONS) return 'running'
    mind.timer = 0
    mind.inv.fish--
    mind.inv.food++
    if (mind.inv.fish > 0) return 'running'
    mind.say = { text: 'Grilled fish!', ttl: 20 }
    return 'done'
  },
}
