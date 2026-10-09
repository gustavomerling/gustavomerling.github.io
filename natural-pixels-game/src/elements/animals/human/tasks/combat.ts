import type { Body } from '../body.ts'
import { floorFeet, spotInside } from '../house.ts'
import type { Point } from '../mind.ts'
import { findNearest, reachableFromGround } from '../senses.ts'
import { inMine } from './shaft.ts'
import { approach, type Task } from './types.ts'
import { firstTime, knack, note, practice } from '../skills.ts'

/*
 * Zombies: face them (sword, musket or bare fists) or run home and wait behind the door.
 * Muskets need gunpowder, which it picks up wherever it lies (zombies drop some).
 */

/** How far it notices zombies, and chases them in a fight. */
export const THREAT_RANGE = 14
const CHASE_RANGE = 24
/** Melee: a swing every few actions; damage grows with the sword. */
const SWING_EVERY = 3
const FIST_DAMAGE = 10
const SWORD_DAMAGE = 15
/** Musket: range, reload time (actions) and damage per shot. */
const GUN_RANGE = 16
const RELOAD = 8
const SHOT_DAMAGE = 70
/** Gives up the fight (and runs home) when this hurt. */
const RETREAT_HEALTH = 30
/** A fight going nowhere this long (a zombie it can't get at): it gives up and leaves it be a while. */
const GIVE_UP = 400
export const LEAVE_BE = 300
/** Comes out of hiding after this many actions with no zombie around. */
const ALL_CLEAR = 60
/**
 * Hiding this long by day with a zombie still lurking outside (in the shade of a tree, say),
 * it's had enough: it plucks up some courage and comes out (to fight it, if armed and well).
 */
const FED_UP = 250
const FED_UP_COURAGE = 0.2
const DAYLIGHT = 0.5
const GUNPOWDER_SEARCH = 40

/**
 * The nearest monster (its feet) within `range`. Skeletons only count while it's down its mine
 * itself: up top, the ones in the galleries below are none of its business (through the rock).
 */
export function nearestZombie(body: Body, range: number): Point | null {
  const mine = body.mind.shaft
  const down = !!mine && inMine(mine, body.x, body.y)
  return findNearest(body, range, (x, y) => {
    const id = body.get(x, y)
    return id === 'zombie' || (id === 'skeleton' && down && !!mine && inMine(mine, x, y))
  })
}

/** Clear line of fire from its hands to the zombie: returns the cells in between, or null. */
function lineOfFire(body: Body, to: Point): Point[] | null {
  const from = { x: body.x, y: body.y - 1 }
  const steps = Math.max(Math.abs(to.x - from.x), Math.abs(to.y - 1 - from.y))
  const path: Point[] = []
  for (let n = 1; n < steps; n++) {
    const x = Math.round(from.x + ((to.x - from.x) * n) / steps)
    const y = Math.round(from.y + ((to.y - 1 - from.y) * n) / steps)
    const id = body.get(x, y)
    if (id === 'air' || id === 'shot') path.push({ x, y })
    else if (id !== 'leaf' && id !== 'grass' && id !== 'human_body' && id !== 'human_head') return null
  }
  return path
}

/** Bones a beaten skeleton leaves (for bone meal). */
const SKELETON_BONES = 2

function hit(body: Body, zombie: Point, damage: number) {
  const { mind } = body
  const id = body.get(zombie.x, zombie.y) ?? 'zombie'
  const foe = body.mindAt(zombie.x, zombie.y, id)
  if (!foe) return
  const alive = foe.health > 0
  // A seasoned fighter hits harder.
  foe.health -= damage * knack(mind, 'fighting')
  practice(mind, 'fighting', 1)
  if (!alive || foe.health > 0) return
  mind.wins = (mind.wins ?? 0) + 1
  firstTime(mind, id, id === 'skeleton' ? 'Beat my first skeleton, down in the mine!' : 'Beat my first zombie!', 'danger')
  if (mind.wins % 10 === 0) note(mind, `That's ${mind.wins} monsters beaten.`, 'danger')
  if (id === 'skeleton') {
    mind.inv.bone += SKELETON_BONES
    mind.say = { text: 'Bones!', ttl: 15 }
  }
}

/** Go after the nearest zombie: shoot it from afar with a loaded musket, or close in and swing. */
export const fight: Task = {
  start(body) {
    const zombie = nearestZombie(body, THREAT_RANGE)
    if (!zombie) return false
    body.mind.target = zombie
    body.mind.timer = 0
    body.mind.patience = 300
    return true
  },
  run(body) {
    const { mind } = body
    if (mind.health < RETREAT_HEALTH) return 'failed'
    const zombie = nearestZombie(body, CHASE_RANGE)
    if (!zombie) return 'done'
    mind.target = zombie
    mind.foe = body.get(zombie.x, zombie.y) ?? 'zombie'
    if (++mind.timer > GIVE_UP) {
      mind.leaveZombies = LEAVE_BE
      return 'failed'
    }

    const distance = Math.max(Math.abs(zombie.x - body.x), Math.abs(zombie.y - body.y))
    if (mind.tools.gun && mind.inv.gunpowder > 0 && distance <= GUN_RANGE) {
      const path = lineOfFire(body, zombie)
      if (path) {
        if (mind.timer % RELOAD !== 0) return 'running'
        for (const p of path) body.set(p.x, p.y, 'shot')
        mind.inv.gunpowder--
        hit(body, zombie, SHOT_DAMAGE)
        return 'running'
      }
    }

    // Within arm's reach (as far as `reaches` goes): swing.
    if (Math.abs(zombie.x - body.x) <= 1 && Math.abs(zombie.y - body.y) <= 3) {
      if (mind.timer % SWING_EVERY === 0) hit(body, zombie, FIST_DAMAGE + SWORD_DAMAGE * mind.tools.sword)
      return 'running'
    }
    const status = approach(body)
    return status === 'arrived' ? 'running' : status
  },
}

/** Run home and stay inside (behind the door) until the zombies are gone. */
export const hide: Task = {
  start(body) {
    const { mind } = body
    if (!mind.home) return false
    const spot = spotInside(mind.home, () => body.random())
    // Ground floor: the doors are right there to keep watch.
    mind.target = { x: spot.x, y: floorFeet(mind.home, 0) }
    mind.patience = 400
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
      mind.patience = FED_UP
    }
    if (body.light() > DAYLIGHT && --mind.patience <= 0) {
      mind.courage = Math.min(1, mind.courage + FED_UP_COURAGE)
      return 'done'
    }
    if (nearestZombie(body, THREAT_RANGE + 6)) mind.timer = 0
    return ++mind.timer >= ALL_CLEAR ? 'done' : 'running'
  },
}

/** Pick up gunpowder lying around (zombies drop it; so can the player). */
export const scavenge: Task = {
  start(body) {
    const powder = findNearest(
      body,
      GUNPOWDER_SEARCH,
      (x, y) => body.get(x, y) === 'gunpowder' && reachableFromGround(body, { x, y }),
    )
    if (!powder) return false
    body.mind.target = powder
    body.mind.patience = 200
    return true
  },
  run(body) {
    const { mind } = body
    if (!mind.target || body.get(mind.target.x, mind.target.y) !== 'gunpowder') return 'done'
    const status = approach(body)
    if (status !== 'arrived') return status
    body.set(mind.target.x, mind.target.y, 'air')
    mind.inv.gunpowder++
    // Grab the rest of the pile too.
    const more = findNearest(body, 3, (x, y) => body.get(x, y) === 'gunpowder')
    if (!more) return 'done'
    mind.target = more
    return 'running'
  },
}
