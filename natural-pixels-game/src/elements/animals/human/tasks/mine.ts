import { isGround, isPassable, type Body } from '../body.ts'
import type { Point } from '../mind.ts'
import { ANYWHERE, exposed, findNearest, isHome } from '../senses.ts'
import { approach, patienceFor, type Task } from './types.ts'

/** Actions to break one stone; each pickaxe tier divides it. */
const STONE_ACTIONS = 16
/** Stops mining after carrying this much stone. */
const STONE_BATCH = 12
/** Once settled, it only goes this far for exposed stone (its mine supplies the rest). */
const SETTLED_RANGE = 50
/** Gives up digging for stone after this many steps down. */
const MAX_STEPS = 14

const MINE_STONE = 0
const DIG_STAIRS = 1

/** Open to the air (not just to water: it can't mine underwater, nor through its mine's walls). */
function dry(body: Body, x: number, y: number) {
  const id = body.get(x, y)
  return id !== 'water' && id !== 'mine_wall' && id !== 'mine_post' && id !== 'torch' && isPassable(id)
}

/** Built things (houses, walls, someone else's home...): the stone under them holds them up. */
const BUILT: ReadonlySet<string | null> = new Set(['plank', 'backwall', 'door', 'bed', 'ladder', 'fence', 'glass', 'lamp', 'statue', 'gold_statue', 'furnace', 'tiki_pole', 'campfire'])

/** Holding something up: a building on it, or stone (a foundation, a well's lining) next to built things. */
function holdsUp(body: Body, x: number, y: number): boolean {
  if (BUILT.has(body.get(x, y - 1))) return true
  // Laid stone sits right against what it was laid for (a well's lining, a foundation's fill).
  return BUILT.has(body.get(x - 1, y)) || BUILT.has(body.get(x + 1, y)) || body.get(x, y - 1) === 'spring' || body.get(x, y + 1) === 'spring'
}

/**
 * Stone it can mine from the side, standing on solid ground next to it — never from above
 * (that would be digging a pit straight down with no way back up: deep stone is what its
 * mine, with its ladders and galleries, is for).
 */
function exposedStone(body: Body, x: number, y: number) {
  if (body.get(x, y) !== 'stone' || !exposed(body, { x, y }) || isHome(body.mind, x, y) || holdsUp(body, x, y)) return false
  const side = (sx: number) => dry(body, sx, y) && dry(body, sx, y - 1) && isGround(body.get(sx, y + 1))
  return side(x - 1) || side(x + 1)
}

/** Next stone right next to the last one (level with it or above, never below), to keep a vein going. */
function nextInVein(body: Body, from: Point): Point | null {
  for (let dy = -1; dy <= 0; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if ((dx || dy) && exposedStone(body, from.x + dx, from.y + dy)) return { x: from.x + dx, y: from.y + dy }
    }
  }
  return null
}

/**
 * Mine stone with a pickaxe, going wherever the nearest stone it can get at from the side is
 * (a cliff, a boulder, a cave wall). Without a home, if there's none at all, it digs a
 * staircase down looking for some (never straight down: loose soil would cave in on top) and
 * remembers if there's none. Settled, deeper stone comes from its mine (tasks/shaft.ts).
 */
export const mine: Task = {
  start(body) {
    const { mind } = body
    if (mind.tools.pickaxe === 0) return false
    const stone = findNearest(body, mind.home ? SETTLED_RANGE : ANYWHERE, (x, y) => exposedStone(body, x, y))
    mind.timer = 0
    mind.patience = 200
    if (stone) {
      mind.target = stone
      mind.patience = patienceFor(body, stone)
      mind.phase = MINE_STONE
      return true
    }
    // Settled humans don't dig for stone: they mine what they can see (or build with planks).
    if (mind.noStone || mind.home) return false
    mind.target = null
    mind.phase = DIG_STAIRS
    mind.dug = 0
    return true
  },
  run(body) {
    const { mind } = body
    if (mind.phase === DIG_STAIRS) return digStairs(body)

    if (!mind.target || body.get(mind.target.x, mind.target.y) !== 'stone') return 'failed'
    const status = approach(body)
    if (status !== 'arrived') return status
    if (++mind.timer < Math.ceil(STONE_ACTIONS / mind.tools.pickaxe)) return 'running'

    body.set(mind.target.x, mind.target.y, 'air')
    mind.inv.stone++
    mind.timer = 0
    if (mind.inv.stone >= STONE_BATCH) return 'done'
    mind.target = nextInVein(body, mind.target)
    return mind.target ? 'running' : 'done'
  },
}

/** One step of a staircase going down in the current direction: clear it, then step in. */
function digStairs(body: Body) {
  const { mind } = body
  const dir = mind.dir
  const stepX = body.x + dir
  const stepY = body.y + 1

  if (body.get(stepX, stepY) === 'stone') {
    // Hit rock: mine it like any other stone from here on.
    mind.target = { x: stepX, y: stepY }
    mind.phase = MINE_STONE
    return 'running'
  }
  if (mind.dug >= MAX_STEPS) {
    mind.noStone = true
    return 'failed'
  }

  // Clear headroom and the step itself, one block per action.
  for (let y = body.y - 2; y <= stepY; y++) {
    if (isPassable(body.get(stepX, y))) continue
    if (body.dig(stepX, y) === 'blocked') {
      // Something unbreakable (water, metal, a house): try the other way next time.
      mind.dir = dir === 1 ? -1 : 1
      return 'failed'
    }
    return 'running'
  }

  // Step onto the cleared spot; gravity takes it one level down.
  if (body.move(dir, 0)) mind.dug++
  return 'running'
}
