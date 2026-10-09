import { WATER_CELL_UNITS } from '../../../../engine/constants.ts'
import { SOIL_CAPACITY } from '../../../terrain/soil.ts'
import { MAX_FERTILITY } from '../../../terrain/fertility.ts'
import { WOOD_TREE } from '../../../plants/wood.ts'
import type { Body } from '../body.ts'
import { halfWidth, MAX_STAGE } from '../house.ts'
import type { Point } from '../mind.ts'
import { findNearest, freeWater, groundBelow } from '../senses.ts'
import { approach, type Task } from './types.ts'

/** No trees this close to the middle of the house: the biggest house, its yard and some room. */
export const TREE_FREE = halfWidth(MAX_STAGE) + 14
/** Saplings are planted this far (min..max cells) from home, with room to grow. */
const PLANT_MIN = TREE_FREE
const PLANT_MAX = TREE_FREE + 20
const TREE_SPACING = 3
const MAX_SAPLINGS = 10
/** Soil drier than this around a sapling needs watering. */
const DRY = 80

const GROWING: ReadonlySet<string | null> = new Set(['wood', 'plant', 'seed', 'leaf'])

function roomToGrow(body: Body, x: number, ground: number): boolean {
  for (let dx = -TREE_SPACING; dx <= TREE_SPACING; dx++) {
    for (let dy = 1; dy <= 8; dy++) if (GROWING.has(body.get(x + dx, ground - dy))) return false
  }
  return true
}

/** Plant one of its seeds in open soil near home (or near itself if homeless). */
export const plant: Task = {
  start(body) {
    const { mind } = body
    if (mind.inv.seed <= 0 || mind.saplings.length >= MAX_SAPLINGS) return false
    const centre = mind.home ? mind.home.x : body.x
    for (let tries = 0; tries < 12; tries++) {
      const side = body.random() < 0.5 ? -1 : 1
      const x = centre + side * (PLANT_MIN + Math.floor(body.random() * (PLANT_MAX - PLANT_MIN)))
      const ground = groundBelow(body, x, body.y - 8, 16)
      if (ground === null || body.get(x, ground) !== 'soil' || body.get(x, ground - 1) !== 'air') continue
      if (!roomToGrow(body, x, ground)) continue
      mind.target = { x, y: ground - 1 }
      mind.patience = 200
      return true
    }
    return false
  },
  run(body) {
    const { mind } = body
    const status = approach(body)
    if (status !== 'arrived') return status
    if (!mind.target) return 'failed'
    const { x, y } = mind.target
    if (body.get(x, y) !== 'air' || body.get(x, y + 1) !== 'soil') return 'failed'
    body.set(x, y, 'seed')
    mind.inv.seed--
    mind.saplings.push({ x, y })
    return 'done'
  },
}

/** A planted spot is done once it has grown into a tree (or died off). */
function stillGrowing(body: Body, s: Point): boolean {
  let alive = false
  for (let dy = -12; dy <= 3; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const id = body.get(s.x + dx, s.y + dy)
      if (id === 'wood' && body.data(s.x + dx, s.y + dy) & WOOD_TREE) return false
      if (id === 'seed' || id === 'plant') alive = true
    }
  }
  return alive
}

function soilMoisture(body: Body, s: Point): number {
  let best = 0
  for (let dy = 1; dy <= 4; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (body.get(s.x + dx, s.y + dy) === 'soil') best = Math.max(best, body.water(s.x + dx, s.y + dy))
    }
  }
  return best
}

const FETCH = 0
const POUR = 1
/** Rows of soil under a sapling that bone meal enriches. */
const BONE_MEAL_DEPTH = 3
/** A bucketful: this many cells of water (6×6), scooped from the source and poured around the sapling. */
const BUCKETFUL = 36
/** Pours within this many columns either side of the sapling, this many rows deep. */
const POUR_REACH = 3
const POUR_DEPTH = 4

/** Scoops up to a bucketful of water connected to `from` (the top of the pond first). Returns how much. */
function scoop(body: Body, from: Point): number {
  const seen = new Set<string>()
  const queue: Point[] = [from]
  let got = 0
  while (queue.length && got < BUCKETFUL) {
    // Shallowest first, so the pond's surface goes down evenly.
    queue.sort((a, b) => a.y - b.y)
    const p = queue.shift()!
    const key = `${p.x},${p.y}`
    if (seen.has(key) || body.get(p.x, p.y) !== 'water') continue
    seen.add(key)
    body.set(p.x, p.y, 'air')
    got++
    queue.push({ x: p.x - 1, y: p.y }, { x: p.x + 1, y: p.y }, { x: p.x, y: p.y + 1 }, { x: p.x, y: p.y - 1 })
  }
  return got
}

/**
 * Pours the bucket out around the sapling: it soaks straight into the soil there (the cells
 * nearest the sapling first, each up to what soil can hold), so none of it runs off to flood
 * the yard. Returns how much it poured (what the soil couldn't take runs off and is lost).
 */
function pour(body: Body, at: Point, amount: number): number {
  const soil: Point[] = []
  for (let dy = 1; dy <= POUR_DEPTH; dy++) {
    for (let dx = -POUR_REACH; dx <= POUR_REACH; dx++) if (body.get(at.x + dx, at.y + dy) === 'soil') soil.push({ x: at.x + dx, y: at.y + dy })
  }
  soil.sort((a, b) => Math.abs(a.x - at.x) + Math.abs(a.y - at.y) - (Math.abs(b.x - at.x) + Math.abs(b.y - at.y)))
  let poured = 0
  // A cell of water at a time, round the soil cells, until the bucket's empty or they're full.
  for (let full = false; amount > 0 && !full; ) {
    full = true
    for (const p of soil) {
      if (amount <= 0) break
      const wet = body.water(p.x, p.y)
      if (wet + WATER_CELL_UNITS > SOIL_CAPACITY) continue
      body.setWater(p.x, p.y, wet + WATER_CELL_UNITS)
      amount--
      poured++
      full = false
    }
  }
  return poured
}

/** Bone meal (a bone, ground up) worked into the soil around a sapling: as rich as soil gets. */
function boneMeal(body: Body, at: Point) {
  for (let dy = 1; dy <= BONE_MEAL_DEPTH; dy++) {
    for (let dx = -1; dx <= 1; dx++) if (body.get(at.x + dx, at.y + dy) === 'soil') body.setData(at.x + dx, at.y + dy, MAX_FERTILITY)
  }
  body.mind.inv.bone--
  body.mind.say = { text: 'Bone meal!', ttl: 15 }
}

/** Fill the bucket at the nearest water, carry it to a thirsty sapling and pour it all around it (bone meal too, if it has a bone). */
export const water: Task = {
  start(body) {
    const { mind } = body
    if (!mind.tools.bucket) return false
    mind.saplings = mind.saplings.filter((s) => stillGrowing(body, s))
    const thirsty = mind.saplings.find((s) => soilMoisture(body, s) < DRY)
    if (!thirsty) return false
    mind.target = { ...thirsty }
    mind.phase = mind.inv.water ? POUR : FETCH
    mind.patience = 300
    return true
  },
  run(body) {
    const { mind } = body
    if (!mind.target) return 'failed'

    if (mind.phase === FETCH) {
      const source = findNearest(body, 40, (x, y) => freeWater(body, x, y))
      if (!source) return 'failed'
      const result = body.walkTo(source)
      if (result !== 'arrived') {
        mind.patience -= result === 'stuck' ? 5 : 1
        return mind.patience > 0 ? 'running' : 'failed'
      }
      mind.inv.water = scoop(body, source)
      mind.phase = POUR
      return 'running'
    }

    const status = approach(body)
    if (status !== 'arrived') return status
    // (No soil there that could take any: it keeps the water for next time.)
    if (pour(body, mind.target, mind.inv.water) === 0) return 'failed'
    mind.inv.water = 0
    if (mind.inv.bone > 0) boneMeal(body, mind.target)
    return 'done'
  },
}
