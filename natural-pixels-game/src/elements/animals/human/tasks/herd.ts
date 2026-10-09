import { MILK_FULL } from '../../livestock.ts'
import type { Body } from '../body.ts'
import type { Point } from '../mind.ts'
import { findNearest } from '../senses.ts'
import { firstTime, note, practice } from '../skills.ts'
import { builtDecor, type Decor } from './decor.ts'
import { approach, patienceFor, type Task } from './types.ts'

/*
 * Looking after the animals, once it has a pen (see decor.ts): it shears the woolly sheep in the
 * pen, milks the cows that are full, and while the pen has room it goes out to find a wild sheep
 * or cow and carries it home (picks it up, walks back, sets it down inside the fence).
 */

/** Animals a pen holds (more are born in it, but it stops bringing them in). */
const PEN_CAP = 4
/** How far it goes looking for a wild one. */
const SEARCH = 90
/** Wool per shearing. */
const WOOL = 2
/** Inside the pen: this many columns either side of its middle. */
const PEN_INSIDE = 5

const SHEAR = 0
const MILK = 1
const FETCH = 2
const CARRY = 3

const LIVESTOCK: ReadonlySet<string | null> = new Set(['sheep', 'sheep_shorn', 'cow'])

/** Whether (x, y) is inside the pen's fence (at animal height). */
function inPen(pen: Decor, x: number, y: number): boolean {
  return Math.abs(x - pen.x) <= PEN_INSIDE && y <= pen.ground - 1 && y >= pen.ground - 3
}

/** The animals in the pen right now. */
function penned(body: Body, pen: Decor): Point[] {
  const found: Point[] = []
  for (let dx = -PEN_INSIDE; dx <= PEN_INSIDE; dx++) {
    for (let y = pen.ground - 3; y <= pen.ground - 1; y++) if (LIVESTOCK.has(body.get(pen.x + dx, y))) found.push({ x: pen.x + dx, y })
  }
  return found
}

/** What it says it's doing (thought bubble). */
export function herdLabel(phase: number, carrying: string | null | undefined): string {
  if (phase === SHEAR) return 'Shearing a sheep'
  if (phase === MILK) return 'Milking the cow'
  const animal = carrying === 'cow' ? 'a cow' : 'a sheep'
  return phase === CARRY ? `Carrying ${animal} to the pen` : 'Looking for animals for the pen'
}

export const herd: Task = {
  start(body) {
    const { mind } = body
    const pen = builtDecor(mind, 'pen')[0]
    if (!pen) return false
    mind.timer = 0
    // Something already picked up (it was interrupted on the way): home with it.
    if (mind.carrying) {
      mind.phase = CARRY
      mind.target = { x: pen.x, y: pen.ground - 1 }
      mind.patience = patienceFor(body, mind.target)
      return true
    }
    const animals = penned(body, pen)
    const sheep = animals.find((p) => body.get(p.x, p.y) === 'sheep')
    const cow = animals.find((p) => body.get(p.x, p.y) === 'cow' && body.data(p.x, p.y) >= MILK_FULL)
    if (sheep || cow) {
      mind.phase = sheep ? SHEAR : MILK
      mind.target = (sheep ?? cow)!
      mind.patience = patienceFor(body, mind.target)
      return true
    }
    if (animals.length >= PEN_CAP) return false
    const wild = findNearest(body, SEARCH, (x, y) => LIVESTOCK.has(body.get(x, y)) && !inPen(pen, x, y))
    if (!wild) return false
    mind.phase = FETCH
    mind.target = wild
    mind.patience = patienceFor(body, wild)
    return true
  },
  run(body) {
    const { mind } = body
    const pen = builtDecor(mind, 'pen')[0]
    if (!pen || !mind.target) return 'failed'
    const t = mind.target

    if (mind.phase === FETCH) {
      // It wanders: keep track of it.
      if (!LIVESTOCK.has(body.get(t.x, t.y))) {
        const moved = lookAround(body, t)
        if (!moved) return 'failed'
        mind.target = moved
      }
      const status = approach(body)
      if (status !== 'arrived') return status
      const id = body.get(mind.target.x, mind.target.y)
      if (!LIVESTOCK.has(id)) return 'running'
      body.reveal(mind.target.x, mind.target.y)
      mind.carrying = id === 'sheep_shorn' ? 'sheep' : id
      mind.phase = CARRY
      mind.target = { x: pen.x, y: pen.ground - 1 }
      mind.patience = patienceFor(body, mind.target)
      mind.say = { text: id === 'cow' ? 'Come on, cow!' : 'Come on, little sheep!', ttl: 20 }
      return 'running'
    }

    if (mind.phase === CARRY) {
      const near = Math.abs(body.x - pen.x) <= PEN_INSIDE && Math.abs(body.y - (pen.ground - 1)) <= 1
      if (!near) {
        const status = approach(body)
        if (status !== 'arrived') return status
      }
      // Set it down in the pen, somewhere free.
      for (let dx = 0; dx <= PEN_INSIDE - 1; dx++) {
        for (const x of [pen.x - dx, pen.x + dx]) {
          const y = pen.ground - 1
          if (body.get(x, y) !== 'air' && body.get(x, y) !== 'grass') continue
          body.set(x, y, mind.carrying ?? 'sheep')
          const animal = mind.carrying === 'cow' ? 'a cow' : 'a sheep'
          note(mind, `Brought ${animal} home to the pen.`, 'nature')
          mind.carrying = null
          practice(mind, 'farming', 2)
          return 'done'
        }
      }
      return 'running'
    }

    const status = approach(body)
    if (status !== 'arrived') return status
    const id = body.get(t.x, t.y)
    if (mind.phase === SHEAR) {
      if (id !== 'sheep') return 'done'
      if (++mind.timer < 8) return 'running'
      body.retype(t.x, t.y, 'sheep_shorn')
      body.setData(t.x, t.y, 0)
      mind.inv.wool += WOOL
      practice(mind, 'farming', 1)
      firstTime(mind, 'wool', 'Sheared my first sheep: soft wool!', 'nature')
      mind.say = { text: 'Wool!', ttl: 15 }
      return 'done'
    }
    if (id !== 'cow' || body.data(t.x, t.y) < MILK_FULL) return 'done'
    if (++mind.timer < 8) return 'running'
    body.setData(t.x, t.y, 0)
    mind.inv.food++
    practice(mind, 'farming', 1)
    firstTime(mind, 'milk', 'Milked the cow: fresh milk!', 'nature')
    mind.say = { text: 'Fresh milk!', ttl: 15 }
    return 'done'
  },
}

/** The animal it was after, a few cells from where it last saw it. */
function lookAround(body: Body, at: Point): Point | null {
  for (let r = 1; r <= 4; r++) {
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) if (LIVESTOCK.has(body.get(at.x + dx, at.y + dy))) return { x: at.x + dx, y: at.y + dy }
    }
  }
  return null
}
