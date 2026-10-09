import type { Body } from '../body.ts'
import { spotInside } from '../house.ts'
import type { Point, RelaxSpot } from '../mind.ts'
import { builtDecor, LOOKOUT, type DecorKind } from './decor.ts'
import { approach, type Task } from './types.ts'
import { visit } from '../village.ts'
import { firstTime } from '../skills.ts'

/** Actions it spends at each spot (~2–7 s); a while longer when it's raining outside. */
const STAY_MIN = 25
const STAY_MAX = 90
const WALKING = 0
const CLIMBING = 1
const STAYING = 2
const COMING_DOWN = 3
/** Chances of spending the time out in the yard instead (dry weather only): by the campfire
 *  (much likelier as it gets dark), in the workshop, or up the watchtower (by day). */
const CAMPFIRE = 0.15
const CAMPFIRE_EVENING = 0.6
const EVENING = 0.55
const WORKSHOP = 0.25
const BENCH = 0.25
const TOWER = 0.2
/** Up the tower at night to look at the stars. */
const STARGAZE = 0.3
const DAY = 0.6
const NIGHT = 0.3
/** Chance of going to see a neighbour instead. */
const VISIT = 0.15
/** Ticks of grip after each rung (like Body's climbing). */
const GRIP = 8

/** Somewhere in the yard to spend some time, or null (then it stays in). */
function outdoors(body: Body): { kind: RelaxSpot; at: Point } | null {
  const { mind } = body
  if (body.rain() > 0.2) return null
  const light = body.light()
  // Now and then, a visit to a neighbour (by day).
  if (light > DAY && body.random() < VISIT) {
    const friend = visit(mind, () => body.random())
    if (friend) {
      mind.visiting = friend.name
      return { kind: 'visit', at: { x: friend.x, y: friend.y } }
    }
  }
  const pick = (kind: DecorKind, chance: number) => {
    const all = builtDecor(mind, kind)
    return all.length && body.random() < chance ? all[Math.floor(body.random() * all.length)] : null
  }
  const fire = pick('campfire', light < EVENING ? CAMPFIRE_EVENING : CAMPFIRE)
  if (fire) return { kind: 'campfire', at: { x: fire.x + (body.random() < 0.5 ? -3 : 3), y: fire.ground - 1 } }
  const bench = light > NIGHT ? pick('bench', BENCH) : null
  if (bench) return { kind: 'bench', at: { x: bench.x, y: bench.ground - 1 } }
  const shop = pick('workshop', WORKSHOP)
  if (shop) return { kind: 'workshop', at: { x: shop.x + 1, y: shop.ground - 1 } }
  const tower = light > DAY ? pick('tower', TOWER) : light < NIGHT ? pick('tower', STARGAZE) : null
  if (tower) return { kind: 'tower', at: { x: tower.x, y: tower.ground - 1 } }
  return null
}

/** What there is to do at a spot at home: read by the bookshelf, tea at the table, the potted plant, the window. */
function homeActivity(body: Body, at: Point): RelaxSpot | null {
  for (let dy = 0; dy <= 2; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const id = body.get(at.x + dx, at.y - dy)
      if (id === 'bookshelf') return 'book'
      if (id === 'table' || id === 'chair') return 'tea'
      if (id === 'flowerpot') return 'plant'
      if (id === 'back_window' && dy > 0) return 'window'
    }
  }
  return null
}

/**
 * Spend some time at home: walk to a spot on one of the floors and hang out there. Or, in
 * dry weather, out in the yard: by the campfire, in the workshop, or up the watchtower
 * keeping watch (it climbs the ladder to the lookout, and back down when it's done).
 */
export const relax: Task = {
  start(body) {
    const { mind } = body
    if (!mind.home) return false
    const out = outdoors(body)
    mind.target = out?.at ?? spotInside(mind.home, () => body.random())
    mind.relaxAt = out?.kind ?? homeActivity(body, mind.target)
    mind.patience = 250
    mind.phase = WALKING
    mind.timer = 0
    return true
  },
  run(body) {
    const { mind } = body
    const tower = mind.relaxAt === 'tower'
    if (mind.relaxAt === 'visit' && mind.phase === STAYING && mind.timer === 0) firstTime(mind, `visit:${mind.visiting}`, `Went to visit ${mind.visiting}.`, 'friend')
    const outside = mind.relaxAt && mind.relaxAt !== 'book' && mind.relaxAt !== 'tea' && mind.relaxAt !== 'plant' && mind.relaxAt !== 'window'
    if (mind.phase === WALKING) {
      const status = approach(body)
      if (status !== 'arrived') return status
      mind.phase = tower ? CLIMBING : STAYING
      // From here on, patience is how long it stays.
      mind.patience = STAY_MIN + Math.floor(body.random() * (STAY_MAX - STAY_MIN))
    }
    if (mind.phase === CLIMBING && mind.target) {
      // To the foot of the ladder, then up to the lookout.
      if (body.x !== mind.target.x) return body.step(Math.sign(mind.target.x - body.x)) ? 'running' : 'done'
      if (body.y > mind.target.y + 1 - LOOKOUT) {
        if (!body.move(0, -1)) return 'done'
        mind.climb = GRIP
        return 'running'
      }
      mind.phase = STAYING
      // Keeping watch is worth a while longer.
      mind.patience *= 2
    }
    if (mind.phase === COMING_DOWN && mind.target) {
      if (body.y >= mind.target.y || !body.move(0, 1)) return 'done'
      return 'running'
    }
    // Rain keeps it in; otherwise, once it's had enough, off it goes.
    if (body.rain() > 0.2 && !outside) mind.timer = Math.min(mind.timer, mind.patience - 10)
    if (++mind.timer < mind.patience) return 'running'
    if (tower) {
      mind.phase = COMING_DOWN
      return 'running'
    }
    return 'done'
  },
}
