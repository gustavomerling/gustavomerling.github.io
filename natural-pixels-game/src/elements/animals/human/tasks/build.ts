import { isGround, isPassable, type Body } from '../body.ts'
import { HOUSE_COST, LAMP_COST } from '../craft.ts'
import type { Mind } from '../mind.ts'
import { groundBelow } from '../senses.ts'
import type { Task } from './types.ts'

/*
 * The house, relative to its left edge (x) and ground row (y = 0 is the ground itself):
 *
 *        PPPPP          y -6  roof peak
 *      PPPPPPPPP        y -5  roof
 *       P  L  P         y -4  walls, lamp hanging inside
 *       P               y -3
 *       P     .         y -2  door on the right (open)
 *       P     .         y -1
 *       SSSSSSS         y  0  stone foundation
 */
interface Block {
  dx: number
  dy: number
  id: 'stone' | 'plank' | 'lamp'
}

const WIDTH = 7
const BLUEPRINT: readonly Block[] = [
  ...range(0, 6).map((dx) => ({ dx, dy: 0, id: 'stone' as const })),
  ...range(1, 4).map((up) => ({ dx: 0, dy: -up, id: 'plank' as const })),
  { dx: 6, dy: -4, id: 'plank' },
  ...range(-1, 7).map((dx) => ({ dx, dy: -5, id: 'plank' as const })),
  ...range(1, 5).map((dx) => ({ dx, dy: -6, id: 'plank' as const })),
  { dx: 3, dy: -4, id: 'lamp' },
]

function range(from: number, to: number): number[] {
  return Array.from({ length: to - from + 1 }, (_, i) => from + i)
}

/** Actions between placing two blocks. */
const PLACE_EVERY = 2
/** Works on the house from within this many cells of its middle. */
const WORK_RANGE = 3
/** How far left/right it looks for a flat building site. */
const SITE_SEARCH = 20

export function canAffordHouse(mind: Mind): boolean {
  return mind.inv.plank >= HOUSE_COST.plank && (mind.inv.stone >= HOUSE_COST.stone || mind.noStone)
}

const OWN_BODY: ReadonlySet<string | null> = new Set(['human', 'human_body', 'human_head'])
/** Walkable, but never built over: water, and trees (it doesn't wreck trees with walls). */
const KEEP_CLEAR: ReadonlySet<string | null> = new Set(['water', 'wood', 'fruit'])

/** A flat strip of ground with open space above for the whole house. */
function findSite(body: Body): { x: number; ground: number } | null {
  for (let n = 0; n <= SITE_SEARCH * 2; n++) {
    const offset = n % 2 ? (n + 1) / 2 : -n / 2
    const x0 = body.x + offset - 3
    const ground = groundBelow(body, x0, body.y - 4, 10)
    if (ground === null) continue

    let ok = true
    for (let dx = 0; dx < WIDTH && ok; dx++) {
      ok = groundBelow(body, x0 + dx, body.y - 4, 10) === ground && body.get(x0 + dx, ground) !== 'water'
    }
    for (let dy = 1; dy <= 6 && ok; dy++) {
      for (let dx = -1; dx <= WIDTH && ok; dx++) {
        const id = body.get(x0 + dx, ground - dy)
        ok = (isPassable(id) && !KEEP_CLEAR.has(id)) || OWN_BODY.has(id)
      }
    }
    if (ok) return { x: x0, ground }
  }
  return null
}

/** Places one block of the blueprint, paying for it from the inventory (skips what it can't). */
function place(body: Body, block: Block, x: number, y: number) {
  const { inv } = body.mind
  const id = body.get(x, y)
  if (block.id === 'stone') {
    if (inv.stone > 0 && isGround(id)) {
      body.set(x, y, 'stone')
      inv.stone--
    }
    return
  }
  if (!isPassable(id) || KEEP_CLEAR.has(id)) return
  if (block.id === 'plank' && inv.plank > 0) {
    body.set(x, y, 'plank')
    inv.plank--
  } else if (block.id === 'lamp' && inv.plank >= LAMP_COST.plank && inv.stone >= LAMP_COST.stone) {
    body.set(x, y, 'lamp')
    inv.plank -= LAMP_COST.plank
    inv.stone -= LAMP_COST.stone
  }
}

/** Find a flat site and build the house block by block, with what's in the inventory. */
export const build: Task = {
  start(body) {
    const { mind } = body
    if (!mind.site) {
      if (!canAffordHouse(mind)) return false
      const site = findSite(body)
      if (!site) return false
      mind.site = { ...site, step: 0 }
    }
    mind.target = { x: mind.site.x + 3, y: mind.site.ground - 1 }
    mind.patience = 600
    mind.timer = 0
    return true
  },
  run(body) {
    const { mind } = body
    const site = mind.site
    if (!site || !mind.target) return 'failed'

    // Work from inside the house (the blueprint never covers the inside).
    if (Math.abs(body.x - mind.target.x) > WORK_RANGE) {
      const result = body.walkTo(mind.target)
      mind.patience -= result === 'stuck' ? 5 : 1
      if (mind.patience > 0) return 'running'
      mind.site = null
      return 'failed'
    }

    if (++mind.timer % PLACE_EVERY !== 0) return 'running'
    const block = BLUEPRINT[site.step]
    place(body, block, site.x + block.dx, site.ground + block.dy)
    site.step++
    if (site.step < BLUEPRINT.length) return 'running'

    mind.home = { x: site.x, ground: site.ground }
    mind.site = null
    return 'done'
  },
}
