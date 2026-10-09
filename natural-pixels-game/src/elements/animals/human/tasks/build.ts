import { isGround, isPassable, type Body } from '../body.ts'
import { blueprint, halfWidth, MAX_STAGE, type Block, type House, type HouseBlock } from '../house.ts'
import type { Mind, Point } from '../mind.ts'
import { groundBelow } from '../senses.ts'
import { DECOR_PARTS, demolishDecor } from './decor.ts'
import type { Task } from './types.ts'
import { knack, note, practice } from '../skills.ts'

/**
 * Every stage takes about this many actions to build (~12 s), however big: bigger stages get
 * more blocks laid per action.
 */
const BUILD_ACTIONS = 150
/** Building experience per block laid. */
const BUILD_XP = 0.15
/** Works on the house from within this many cells of its middle. */
const WORK_RANGE = 3
/** How far left/right it looks for a flat building site (much further when moving house). */
const SITE_SEARCH = 30
const MOVE_SEARCH = 90
/** Dips in the foundation up to this deep get filled in (bottom up) before the stone goes on. */
const FOUNDATION_FILL = 4
/** Waits this many actions for someone to step off a foundation spot (or a dip to fill), then skips it. */
const MAX_WAIT = 80

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
  back_window: { plank: 0, stone: 0 },
  painting: { plank: 1, stone: 0 },
  table: { plank: 1, stone: 0 },
  chair: { plank: 1, stone: 0 },
  bookshelf: { plank: 2, stone: 0 },
  flowerpot: { plank: 0, stone: 0 },
}

/** Materials a house is made of: an older stage's blocks get rebuilt over. */
const HOUSE_PARTS: ReadonlySet<string | null> = new Set([
  'plank',
  'backwall',
  'ladder',
  'lamp',
  'bed',
  'glass',
  'door',
  'back_window',
  'painting',
  'table',
  'chair',
  'bookshelf',
  'flowerpot',
])
const PEOPLE: ReadonlySet<string | null> = new Set(['human', 'human_body', 'human_head'])
/** Walkable, but never built over: water, and trees (it chops trees in the way instead). */
const KEEP_CLEAR: ReadonlySet<string | null> = new Set(['water', 'wood', 'fruit'])
/** Never builds a house where any of this is (water, trees, or someone's farm, yard, house or mine). */
const NOT_ON: ReadonlySet<string | null> = new Set([
  'water',
  'wood',
  'mine_wall',
  'mine_post',
  'fence',
  'wheat',
  'wheat_ripe',
  'plank',
  'backwall',
  'door',
  'ladder',
  'spring',
  ...DECOR_PARTS,
])
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
    // A dip under the foundation gets filled in too.
    if (block.id === 'stone' && !isGround(id) && !PEOPLE.has(id)) plan.stone += fillBottom(body, block.x, block.y)! - block.y
  }
  return plan
}

/**
 * The bottom of the open space under a foundation spot (the spot itself when there's ground right
 * below it), or null if the dip is deeper than FOUNDATION_FILL (or holds water).
 */
function fillBottom(body: Body, x: number, y: number): number | null {
  for (let k = 0; k < FOUNDATION_FILL; k++) {
    const id = body.get(x, y + k)
    if (id === null || KEEP_CLEAR.has(id) || PEOPLE.has(id)) return null
    if (isGround(body.get(x, y + k + 1))) return y + k
  }
  return null
}

/** Whether `block` can go where `id` is now. */
export function fits(body: Body, block: Block, id: string | null): boolean {
  if (id === null) return false
  if (block.id === 'stone') {
    if (isGround(id)) return !KEEP_CLEAR.has(id)
    // Someone standing there will step off; a shallow dip gets filled.
    return PEOPLE.has(id) || (!KEEP_CLEAR.has(id) && fillBottom(body, block.x, block.y) !== null)
  }
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

/**
 * A building site for a house of `stage`: flat ground (as wide as a two-room house, at least),
 * with no water or trees anywhere the house could ever grow into. Nearest first. With `strict`
 * off (a first house, when nothing better is around) it only needs to be flat under the house.
 */
export function findSite(body: Body, stage = 1, range = SITE_SEARCH, strict = true): House | null {
  const flatHalf = halfWidth(strict ? Math.max(stage, 2) : stage)
  const clearHalf = halfWidth(MAX_STAGE) + 1
  for (let n = 0; n <= range * 2; n++) {
    const offset = n % 2 ? (n + 1) / 2 : -n / 2
    const x = body.x + offset
    const ground = groundBelow(body, x, body.y - 6, 14)
    if (ground === null) continue
    let ok = true
    for (let dx = -flatHalf; dx <= flatHalf && ok; dx++) {
      ok = groundBelow(body, x + dx, ground - 6, 12) === ground && body.get(x + dx, ground) !== 'water'
    }
    for (let dx = -clearHalf; dx <= clearHalf && ok && strict; dx++) {
      for (let dy = -3; dy <= 1 && ok; dy++) {
        const id = body.get(x + dx, ground + dy)
        ok = !NOT_ON.has(id)
      }
    }
    if (!ok) continue
    const house = { x, ground, stage }
    const plan = planHouse(body, house)
    if (!plan.blocked) return house
  }
  return null
}

/** Somewhere better to live: a flat, clear site for the next stage of its house (far and wide). */
export function newSite(body: Body): House | null {
  const { home } = body.mind
  if (!home || home.stage >= MAX_STAGE) return null
  return findSite(body, home.stage + 1, MOVE_SEARCH)
}

/**
 * Places one block, paying for it from the inventory (skips what it can't afford or fit).
 * Returns false when that spot isn't done yet: someone's standing on the foundation, or the
 * dip under it is still being filled in.
 */
function place(body: Body, block: Block): boolean {
  const { inv } = body.mind
  const { x } = block
  let { y } = block
  const id = body.get(x, y)
  if (id === block.id || !fits(body, block, id)) return true
  let done = true
  if (block.id === 'stone' && !isGround(id)) {
    if (PEOPLE.has(id)) return false
    // Fill the dip from the bottom up; the foundation stone goes on last.
    y = fillBottom(body, x, y) ?? y
    done = y === block.y
  }
  let kind = block.id
  let cost = COST[kind]
  // Out of stone: a plank foundation will do (and a lamp hung on planks).
  if (cost.stone > inv.stone) {
    if (kind === 'stone') kind = 'plank'
    cost = { plank: cost.plank + cost.stone, stone: 0 }
  }
  const refund = id === 'plank' ? 1 : 0
  if (inv.plank + refund < cost.plank) return true
  inv.plank += refund - cost.plank
  inv.stone -= cost.stone

  // Someone standing right there: the block goes behind them (back wall, ladder, bed, door).
  if (PEOPLE.has(id)) {
    if (isPassable(block.id)) body.setBehind(x, y, block.id)
    return true
  }
  body.set(x, y, kind)
  return done
}

/** Takes a house down, keeping what it was made of. Blocks someone is standing in stay. */
function demolish(body: Body, house: House) {
  const { inv } = body.mind
  for (const block of blueprint(house)) {
    if (body.get(block.x, block.y) !== block.id) continue
    body.set(block.x, block.y, 'air')
    inv.plank += COST[block.id].plank
    inv.stone += COST[block.id].stone
  }
}

/**
 * Build the house block by block with what's in the inventory: a first house on a flat site,
 * or the next, bigger stage over the current one.
 */
export const build: Task = {
  start(body) {
    const { mind } = body
    if (!mind.site) {
      // A first house: an ideal site if there's one around, otherwise any flat one.
      const house = mind.home ? nextHouse(body) : (findSite(body) ?? findSite(body, 1, SITE_SEARCH, false))
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

    const blocks = blueprint(site)
    // Blocks it gets to lay this action: a steady share of what this stage needs doing (counted
    // once; parts already standing from the last stage don't count), fractions adding up.
    site.todo ??= blocks.filter((b) => body.get(b.x, b.y) !== b.id).length
    // (A practised builder lays blocks quicker.)
    const rate = (Math.max(1, site.todo) / BUILD_ACTIONS) * knack(mind, 'building')
    // (Waiting on a spot doesn't bank a burst for later.)
    site.credit = Math.min((site.credit ?? 0) + rate, rate + 1)
    for (; site.credit >= 1; site.credit--) {
      // Skip blocks that are already right (they don't count as work).
      while (site.step < blocks.length && body.get(blocks[site.step].x, blocks[site.step].y) === blocks[site.step].id) site.step++
      if (site.step >= blocks.length) break
      // A spot that isn't done yet (a dip being filled, someone in the way) is tried again next
      // action, but not forever.
      if (!place(body, blocks[site.step]) && ++mind.timer <= MAX_WAIT) break
      site.step++
      mind.timer = 0
      practice(mind, 'building', BUILD_XP)
    }
    if (site.step < blocks.length) return 'running'

    // Moved house: the old one is taken down (its materials kept), and a new farm and mine
    // go next to the new house.
    const old = mind.home
    mind.home = { x: site.x, ground: site.ground, stage: site.stage }
    mind.site = null
    mind.blockedChecks = 0
    const moved = !!old && (old.x !== site.x || old.ground !== site.ground)
    if (!old) note(mind, 'Built my very first house!', 'home')
    else if (moved) note(mind, `Moved to a new, bigger house (stage ${site.stage}).`, 'home')
    else note(mind, site.stage === MAX_STAGE ? 'My house is as big as it gets now!' : `Made my house bigger (stage ${site.stage}).`, 'home')
    if (moved && old) {
      demolish(body, old)
      demolishDecor(body)
      mind.farm = null
      mind.shaft = null
    }
    return 'done'
  },
}
