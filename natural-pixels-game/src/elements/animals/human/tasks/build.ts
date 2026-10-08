import { isGround, isPassable, type Body } from '../body.ts'
import { blueprint, halfWidth, MAX_STAGE, type Block, type House, type HouseBlock } from '../house.ts'
import type { Mind, Point } from '../mind.ts'
import { groundBelow } from '../senses.ts'
import type { Task } from './types.ts'

/** Actions between placing two blocks. */
const PLACE_EVERY = 2
/** Works on the house from within this many cells of its middle. */
const WORK_RANGE = 3
/** How far left/right it looks for a flat building site. */
const SITE_SEARCH = 20

/** What each block costs (the back wall and glass are free). */
const COST: Record<HouseBlock, { plank: number; stone: number }> = {
  stone: { plank: 0, stone: 1 },
  plank: { plank: 1, stone: 0 },
  ladder: { plank: 1, stone: 0 },
  bed: { plank: 1, stone: 0 },
  lamp: { plank: 1, stone: 1 },
  backwall: { plank: 0, stone: 0 },
  glass: { plank: 0, stone: 0 },
  door: { plank: 1, stone: 0 },
}

/** Materials a house is made of: an older stage's blocks get rebuilt over. */
const HOUSE_PARTS: ReadonlySet<string | null> = new Set(['plank', 'backwall', 'ladder', 'lamp', 'bed', 'glass', 'door'])
const PEOPLE: ReadonlySet<string | null> = new Set(['human', 'human_body', 'human_head'])
/** Walkable, but never built over: water, and trees (it chops trees in the way instead). */
const KEEP_CLEAR: ReadonlySet<string | null> = new Set(['water', 'wood', 'fruit'])
/** Loose ground it digs away to make room (building into a hillside). */
const DIGGABLE: ReadonlySet<string | null> = new Set(['soil', 'sand', 'mud', 'ash', 'snow'])

export interface Plan {
  plank: number
  stone: number
  /** Something in the way that can't be built over (null = all clear). */
  blocked: boolean
  /** A tree trunk in the way, which it could chop down. */
  tree: Point | null
}

/** What it would take to build `house` from what's standing there now. */
export function planHouse(body: Body, house: House): Plan {
  const plan: Plan = { plank: 0, stone: 0, blocked: false, tree: null }
  for (const block of blueprint(house)) {
    const id = body.get(block.x, block.y)
    if (id === block.id) continue
    if (!fits(body, block, id)) {
      plan.blocked = true
      if (id === 'wood' && !plan.tree) plan.tree = { x: block.x, y: block.y }
      continue
    }
    plan.plank += COST[block.id].plank - (id === 'plank' ? 1 : 0)
    plan.stone += COST[block.id].stone
  }
  return plan
}

/** Whether `block` can go where `id` is now. */
function fits(body: Body, block: Block, id: string | null): boolean {
  if (id === null) return false
  if (block.id === 'stone') return isGround(id) ? !KEEP_CLEAR.has(id) : isGround(body.get(block.x, block.y + 1))
  if (HOUSE_PARTS.has(id) || PEOPLE.has(id) || DIGGABLE.has(id)) return true
  return isPassable(id) && !KEEP_CLEAR.has(id)
}

/** Affordable: missing stone can be made up for with planks (a wooden foundation). */
export function canAfford(mind: Mind, plan: Plan): boolean {
  const stoneShort = Math.max(0, plan.stone - mind.inv.stone)
  return !plan.blocked && mind.inv.plank >= plan.plank + stoneShort
}

/** The next stage of its house (or a first house right here), or null if it's as big as it gets. */
export function nextHouse(body: Body): House | null {
  const { home } = body.mind
  if (!home) return null
  return home.stage >= MAX_STAGE ? null : { ...home, stage: home.stage + 1 }
}

/** A flat strip of ground with open space above for a first house. */
function findSite(body: Body): House | null {
  const half = halfWidth(1)
  for (let n = 0; n <= SITE_SEARCH * 2; n++) {
    const offset = n % 2 ? (n + 1) / 2 : -n / 2
    const x = body.x + offset
    const ground = groundBelow(body, x, body.y - 4, 10)
    if (ground === null) continue
    let flat = true
    for (let dx = -half; dx <= half && flat; dx++) {
      flat = groundBelow(body, x + dx, body.y - 4, 10) === ground && body.get(x + dx, ground) !== 'water'
    }
    if (!flat) continue
    const house = { x, ground, stage: 1 }
    const plan = planHouse(body, house)
    if (canAfford(body.mind, plan)) return house
  }
  return null
}

/** Places one block, paying for it from the inventory (skips what it can't afford or fit). */
function place(body: Body, block: Block) {
  const { inv } = body.mind
  const { x, y } = block
  const id = body.get(x, y)
  if (id === block.id || !fits(body, block, id)) return
  let kind = block.id
  let cost = COST[kind]
  // Out of stone: a plank foundation will do (and a lamp hung on planks).
  if (cost.stone > inv.stone) {
    if (kind === 'stone') kind = 'plank'
    cost = { plank: cost.plank + cost.stone, stone: 0 }
  }
  const refund = id === 'plank' ? 1 : 0
  if (inv.plank + refund < cost.plank) return
  inv.plank += refund - cost.plank
  inv.stone -= cost.stone

  // Someone standing right there: the block goes behind them (back wall, ladder, bed, door).
  if (PEOPLE.has(id)) {
    if (isPassable(block.id)) body.setBehind(x, y, block.id)
    return
  }
  body.set(x, y, kind)
}

/**
 * Build the house block by block with what's in the inventory: a first house on a flat site,
 * or the next, bigger stage over the current one.
 */
export const build: Task = {
  start(body) {
    const { mind } = body
    if (!mind.site) {
      const house = mind.home ? nextHouse(body) : findSite(body)
      if (!house || !canAfford(mind, planHouse(body, house))) return false
      mind.site = { ...house, step: 0 }
    }
    mind.target = { x: mind.site.x, y: mind.site.ground - 1 }
    mind.patience = 600
    mind.timer = 0
    return true
  },
  run(body) {
    const { mind } = body
    const site = mind.site
    if (!site || !mind.target) return 'failed'

    // Work from inside the house.
    if (Math.abs(body.x - mind.target.x) > WORK_RANGE || Math.abs(body.y - mind.target.y) > 1) {
      const result = body.walkTo(mind.target)
      mind.patience -= result === 'stuck' ? 5 : 1
      if (mind.patience > 0) return 'running'
      mind.site = null
      return 'failed'
    }

    if (++mind.timer % PLACE_EVERY !== 0) return 'running'
    const blocks = blueprint(site)
    // Skip blocks that are already right, so finished parts don't cost time.
    while (site.step < blocks.length && body.get(blocks[site.step].x, blocks[site.step].y) === blocks[site.step].id) site.step++
    if (site.step < blocks.length) {
      place(body, blocks[site.step])
      site.step++
      if (site.step < blocks.length) return 'running'
    }

    mind.home = { x: site.x, ground: site.ground, stage: site.stage }
    mind.site = null
    return 'done'
  },
}
