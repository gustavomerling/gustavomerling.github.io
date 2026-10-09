import { EAR } from '../../../plants/wheat.ts'
import { isPassable, type Body } from '../body.ts'
import { halfWidth, MAX_STAGE } from '../house.ts'
import type { Mind, Point } from '../mind.ts'
import { avoided, findNearest, freeWater, groundBelow } from '../senses.ts'
import { DECOR_PARTS } from './decor.ts'
import { edible } from './food.ts'
import { approach, type Task } from './types.ts'
import { firstTime, practice, skillLevel } from '../skills.ts'

/*
 * The wheat field next to the house: a fenced strip of soil it plants with wheat seeds,
 * waters with its bucket and harvests for bread. Seeds come from cutting grass (like in
 * Minecraft) and from every harvest.
 */

/** Field width (columns), and how far past the biggest house it starts. */
const WIDTH = 8
const MIN_WIDTH = 5
const GAP = 3
/** How far out (past the house) it looks for flat soil. */
const SEARCH = 30
/** Planks for the two fence posts (2 cells tall each). */
const FENCE_PLANKS = 4
/** A harvest gives this much food and seed. */
const HARVEST_FOOD = 1
/** Farming experience per harvest. */
const HARVEST_XP = 2
const HARVEST_SEEDS = 2
/** Chance that cutting grass turns up a seed. */
const GRASS_SEED_CHANCE = 0.35
const SEED_SEARCH = 40
/** Soil drier than this needs watering. */
const DRY = 25

type Field = NonNullable<Mind['farm']>
type Job = 'harvest' | 'plant' | 'seeds' | 'fence' | 'fetch' | 'pour'
const JOBS: readonly Job[] = ['harvest', 'plant', 'seeds', 'fence', 'fetch', 'pour']

/** Never farmed over: what it has built (the yard's things, a workshop's floor). */
const BUILT: ReadonlySet<string | null> = new Set([...DECOR_PARTS, 'backwall', 'ladder', 'torch', 'mine_wall', 'mine_post', 'fence', 'lamp'])

/** Room for crops: soil at the house's ground level, nothing solid on it. */
function tillable(body: Body, x: number, ground: number): boolean {
  const above = body.get(x, ground - 1)
  return body.get(x, ground) === 'soil' && isPassable(above) && above !== 'water' && above !== 'wood' && !BUILT.has(above)
}

/** Picks a flat strip of soil beside the house (past where its biggest stage will reach). */
function findField(body: Body): Field | null {
  const home = body.mind.home
  if (!home) return null
  const reach = halfWidth(MAX_STAGE) + GAP
  for (const side of [1, -1]) {
    let run: number[] = []
    let runGround = -1
    for (let n = 0; n < SEARCH + WIDTH; n++) {
      const x = home.x + side * (reach + n)
      const ground = groundBelow(body, x, home.ground - 10, 20)
      const ok = ground !== null && tillable(body, x, ground) && !avoided(body.mind, x, ground) && (run.length === 0 || ground === runGround)
      if (ok) {
        if (run.length === 0) runGround = ground
        run.push(x)
        if (run.length === WIDTH) break
      } else {
        if (run.length >= MIN_WIDTH) break
        run = ground !== null && tillable(body, x, ground) ? [x] : []
        runGround = ground ?? -1
      }
    }
    if (run.length >= MIN_WIDTH) return { x0: Math.min(...run), x1: Math.max(...run), ground: runGround, fenced: false }
  }
  return null
}

function columns(field: Field): number[] {
  return Array.from({ length: field.x1 - field.x0 + 1 }, (_, i) => field.x0 + i)
}

/** The wheat stalk (bottom cell) in a column, if any. */
function stalk(body: Body, x: number, ground: number): string | null {
  const id = body.get(x, ground - 1)
  return id === 'wheat' || id === 'wheat_ripe' ? id : null
}

/** What needs doing in the field right now, and where (only harvesting when it's hungry). */
function nextJob(body: Body, field: Field, hungry: boolean): { job: Job; at: Point } | null {
  const { mind } = body
  const { ground } = field
  // Spots it recently failed to reach are left alone for a while.
  const cols = columns(field).filter((x) => !avoided(mind, x, ground - 1))
  const ripe = cols.find((x) => stalk(body, x, ground) === 'wheat_ripe')
  if (ripe !== undefined) return { job: 'harvest', at: { x: ripe, y: ground - 1 } }
  if (hungry) return null

  const empty = cols.find((x) => !stalk(body, x, ground) && tillable(body, x, ground))
  if (empty !== undefined && mind.inv.grain > 0) return { job: 'plant', at: { x: empty, y: ground - 1 } }

  if (!field.fenced && mind.inv.plank >= FENCE_PLANKS && cols.length > 0) return { job: 'fence', at: { x: cols[0], y: ground - 1 } }

  const dry = cols.find((x) => stalk(body, x, ground) === 'wheat' && body.water(x, ground) < DRY)
  if (dry !== undefined && mind.tools.bucket && body.rain() < 0.1) {
    return { job: mind.inv.water ? 'pour' : 'fetch', at: { x: dry, y: ground - 1 } }
  }

  if (empty !== undefined && mind.inv.grain === 0) {
    const grass = findNearest(body, SEED_SEARCH, (x, y) => body.get(x, y) === 'grass' && body.get(x, y + 1) === 'soil')
    if (grass) return { job: 'seeds', at: grass }
  }
  return null
}

/** Sets a fence post (2 cells tall) at column x, if there's room. */
function post(body: Body, x: number, ground: number) {
  for (const y of [ground - 1, ground - 2]) if (body.get(x, y) === 'air' || body.get(x, y) === 'grass') body.set(x, y, 'fence')
}

/** Tend the wheat field: harvest, plant, fence it, water it, or go find seeds in the grass. */
export const field: Task = {
  start(body) {
    const { mind } = body
    if (!mind.home) return false
    // A field it can't get to any more: pick another spot.
    const farm = mind.farm
    if (farm && avoided(mind, (farm.x0 + farm.x1) >> 1, farm.ground - 1)) mind.farm = null
    if (!mind.farm) {
      mind.farm = findField(body)
      if (mind.farm) firstTime(mind, 'farm', 'Started a wheat field.', 'home')
    }
    if (!mind.farm) return false
    const next = nextJob(body, mind.farm, mind.hunger >= 60 && edible(mind) === 0)
    if (!next) return false
    mind.target = next.at
    mind.phase = JOBS.indexOf(next.job)
    mind.patience = 250
    mind.timer = 0
    return true
  },
  run(body) {
    const { mind } = body
    const farm = mind.farm
    if (!farm || !mind.target) return 'failed'
    const job = JOBS[mind.phase]

    if (job === 'fetch') {
      const source = findNearest(body, 40, (x, y) => freeWater(body, x, y))
      if (!source) return 'failed'
      const result = body.walkTo(source)
      if (result !== 'arrived') {
        mind.patience -= result === 'stuck' ? 5 : 1
        return mind.patience > 0 ? 'running' : 'failed'
      }
      body.set(source.x, source.y, 'air')
      mind.inv.water = 1
      mind.phase = JOBS.indexOf('pour')
      return 'running'
    }

    const status = approach(body)
    if (status !== 'arrived') return status
    const { x, y } = mind.target

    switch (job) {
      case 'harvest':
        if (body.get(x, y) !== 'wheat_ripe') return 'failed'
        body.set(x, y, 'air')
        if (body.get(x, y - 1) === 'wheat_ripe' && body.data(x, y - 1) & EAR) body.set(x, y - 1, 'air')
        // A seasoned farmer gets more out of every harvest.
        mind.inv.food += HARVEST_FOOD + (skillLevel(mind, 'farming') >= 3 ? 1 : 0)
        practice(mind, 'farming', HARVEST_XP)
        firstTime(mind, 'harvest', 'First wheat harvest!', 'nature')
        mind.inv.grain += HARVEST_SEEDS
        // Sow again right away.
        if (tillable(body, x, farm.ground)) {
          body.set(x, y, 'wheat')
          mind.inv.grain--
        }
        return 'done'
      case 'plant':
        if (!tillable(body, x, farm.ground) || mind.inv.grain <= 0) return 'failed'
        body.set(x, y, 'wheat')
        mind.inv.grain--
        return 'done'
      case 'seeds':
        if (body.get(x, y) !== 'grass') return 'failed'
        body.set(x, y, 'air')
        if (body.random() < GRASS_SEED_CHANCE) mind.inv.grain++
        return 'done'
      case 'fence':
        post(body, farm.x0 - 1, farm.ground)
        post(body, farm.x1 + 1, farm.ground)
        mind.inv.plank -= FENCE_PLANKS
        farm.fenced = true
        return 'done'
      case 'pour':
        for (const [dx, dy] of [[0, -1], [-1, -1], [1, -1]] as const) {
          if (body.get(x + dx, y + dy) !== 'air') continue
          body.set(x + dx, y + dy, 'water')
          mind.inv.water = 0
          return 'done'
        }
        return 'failed'
    }
    return 'failed'
  },
}
