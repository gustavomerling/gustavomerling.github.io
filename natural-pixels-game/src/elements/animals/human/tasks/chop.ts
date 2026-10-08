import { FRUIT_ATTACHED } from '../../../plants/fruit.ts'
import { WOOD_TREE } from '../../../plants/wood.ts'
import type { Body } from '../body.ts'
import type { Point } from '../mind.ts'
import { ANYWHERE, findNearest } from '../senses.ts'
import { approach, patienceFor, type Task } from './types.ts'

/** Actions to fell a tree by hand; each axe tier divides it. */
const CHOP_ACTIONS = 30
/** Trunk cells per log. */
const CELLS_PER_LOG = 3
/** Biggest tree it can fell in one go (cells). */
const MAX_TREE = 3000
/** Share of leaves that drop as litter (the rest just vanish). */
const LEAF_LITTER = 0.35

const TREE_PARTS: ReadonlySet<string | null> = new Set(['wood', 'leaf', 'plant', 'fruit'])

/** Trees with a trunk at least this tall are grown-up: settled humans leave younger ones be. */
const MATURE_HEIGHT = 10

function isTrunk(body: Body, x: number, y: number) {
  return body.get(x, y) === 'wood' && (body.data(x, y) & WOOD_TREE) !== 0
}

/** Base of the trunk that `p` is part of. */
function baseOf(body: Body, p: Point): Point {
  const base = { ...p }
  while (isTrunk(body, base.x, base.y + 1)) base.y++
  return base
}

/** Trunk height above its base (following a trunk that leans a little). */
function trunkHeight(body: Body, base: Point): number {
  let { x, y } = base
  let height = 1
  while (height < MATURE_HEIGHT) {
    const next = [0, -1, 1].map((dx) => x + dx).find((nx) => isTrunk(body, nx, y - 1))
    if (next === undefined) break
    x = next
    y--
    height++
  }
  return height
}

/** Gets ready to fell the tree whose trunk includes `p`. */
export function chopAt(body: Body, p: Point): boolean {
  if (!isTrunk(body, p.x, p.y)) return false
  const base = baseOf(body, p)
  body.mind.target = base
  body.mind.patience = patienceFor(body, base)
  body.mind.timer = 0
  return true
}

/**
 * Find the nearest tree (anywhere in the world), chop at its base, and the whole tree comes
 * down. Replants if it has seeds. Once it has a home, it only fells grown-up trees.
 */
export const chop: Task = {
  start(body) {
    const grownOnly = body.mind.home !== null
    const trunk = findNearest(
      body,
      ANYWHERE,
      (x, y) => isTrunk(body, x, y) && !isTrunk(body, x, y + 1) && (!grownOnly || trunkHeight(body, { x, y }) >= MATURE_HEIGHT),
    )
    return trunk !== null && chopAt(body, trunk)
  },
  run(body) {
    const { mind } = body
    if (!mind.target || !isTrunk(body, mind.target.x, mind.target.y)) return 'failed'
    const status = approach(body)
    if (status !== 'arrived') return status
    if (++mind.timer < Math.ceil(CHOP_ACTIONS / (1 + mind.tools.axe))) return 'running'
    fell(body, mind.target)
    return 'done'
  },
}

/** The tree comes down: logs for the trunk, leaves fall as litter, fruit drops, seeds kept. */
function fell(body: Body, base: Point) {
  const { mind } = body
  const seen = new Set<string>()
  const queue: Point[] = [base]
  let trunkCells = 0

  while (queue.length > 0 && seen.size < MAX_TREE) {
    const p = queue.pop()!
    const key = `${p.x},${p.y}`
    if (seen.has(key)) continue
    seen.add(key)
    const id = body.get(p.x, p.y)
    if (!TREE_PARTS.has(id)) continue
    // Painted wood isn't part of the tree.
    if (id === 'wood' && !(body.data(p.x, p.y) & WOOD_TREE)) continue

    if (id === 'wood') {
      trunkCells++
      body.set(p.x, p.y, 'air')
    } else if (id === 'leaf') {
      body.set(p.x, p.y, body.random() < LEAF_LITTER ? 'litter' : 'air')
    } else if (id === 'fruit') {
      body.setData(p.x, p.y, body.data(p.x, p.y) & ~FRUIT_ATTACHED)
      continue
    } else {
      body.set(p.x, p.y, 'air')
    }
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (dx || dy) queue.push({ x: p.x + dx, y: p.y + dy })
  }

  mind.inv.log += Math.max(1, Math.ceil(trunkCells / CELLS_PER_LOG))
  mind.inv.seed += 1 + (body.random() < 0.5 ? 1 : 0)

  // Sustainable forestry: replant right where the tree stood.
  if (mind.inv.seed > 0 && body.get(base.x, base.y + 1) === 'soil' && body.get(base.x, base.y) === 'air') {
    body.set(base.x, base.y, 'seed')
    mind.inv.seed--
    if (mind.saplings.length < 10) mind.saplings.push({ ...base })
  }
}
