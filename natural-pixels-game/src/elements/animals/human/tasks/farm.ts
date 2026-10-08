import { WOOD_TREE } from '../../../plants/wood.ts'
import type { Body } from '../body.ts'
import type { Point } from '../mind.ts'
import { findNearest, groundBelow } from '../senses.ts'
import { approach, type Task } from './types.ts'

/** Saplings are planted this far (min..max cells) from home, with room to grow. */
const PLANT_MIN = 5
const PLANT_MAX = 22
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
    const centre = mind.home ? mind.home.x + 3 : body.x
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

/** Fill the bucket at the nearest water, carry it to a thirsty sapling and pour it. */
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
      const source = findNearest(body, 40, (x, y) => body.get(x, y) === 'water')
      if (!source) return 'failed'
      const result = body.walkTo(source)
      if (result !== 'arrived') {
        mind.patience -= result === 'stuck' ? 5 : 1
        return mind.patience > 0 ? 'running' : 'failed'
      }
      body.set(source.x, source.y, 'air')
      mind.inv.water = 1
      mind.phase = POUR
      return 'running'
    }

    const status = approach(body)
    if (status !== 'arrived') return status
    const { x, y } = mind.target
    for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1]] as const) {
      if (body.get(x + dx, y + dy) !== 'air') continue
      body.set(x + dx, y + dy, 'water')
      mind.inv.water = 0
      return 'done'
    }
    return 'failed'
  },
}
