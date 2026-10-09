import { ORE_TIER } from '../../../terrain/ore.ts'
import { isCreature, isGround, isPassable, type Body } from '../body.ts'
import { halfWidth, MAX_STAGE } from '../house.ts'
import type { Inventory, Mind, Point } from '../mind.ts'
import { groundBelow } from '../senses.ts'
import { approach, patienceFor, type Task } from './types.ts'
import { firstTime, knack, note, practice } from '../skills.ts'

/*
 * The mine, Minecraft-style: a snake of tunnel winding down to the ore. It never digs freely
 * through the rock (that would bring the ground above down): every cell it opens is part of
 *
 *   - a vertical shaft with a ladder in it, at most SNAKE_DOWN rows at a time, or
 *   - a horizontal gallery, at most SNAKE_SIDE columns at a time: 4 cells tall (room to walk
 *     and to step), dark mine wall at the back (solid to everything but people, so nothing
 *     caves in), a plank floor over gaps, and every third column a support: a wooden post up the
 *     back, a torch on it and a plank beam across the ceiling. Galleries are level: all the
 *     going down is done in shafts.
 *
 * Walking along its galleries it keeps them in order (tendMine), so older galleries end up
 * looking just like new ones. And while it's up top resting, skeletons may turn up down there
 * (spawnSkeleton).
 *
 * Beyond the house and its yard it picks the ore it wants most within reach (iron for tools,
 * coal for torches, then silver and gold) and winds towards it, one segment after another:
 * down while the ore is below its feet, across otherwise (ore above, it leaves). Having reached
 * one ore it aims at the next one near the end of the mine; ore right by the tunnel (its sides,
 * ceiling or floor) is dug out too — only the ore, its hole left as mine wall. Everything dug is
 * kept: stone, ores (with a good enough pickaxe, see ORE_TIER) and earth for the yard.
 *
 * Mining is hard work: it tires it out much faster than anything else (Mind.tired); worn out, it
 * climbs out and goes to bed, and only comes back down once it has some energy again.
 *
 * The plan lives in Mind.shaft; Body.mineRoute walks the human along the snake.
 */

/** How far from the middle of the house the mine starts: past the biggest house and its yard. */
export const ENTRANCE = halfWidth(MAX_STAGE) + 14
/** How far it looks for ore: sideways from the entrance, and down from the surface. */
const ORE_RANGE = 45
const MAX_DEPTH = 45
const MIN_DEPTH = 4
/** With no ore in sight it explores, going down to this depth first. */
const EXPLORE_DEPTH = 24
/** Once there, it looks for the next ore this far from the end of the mine. */
const NEXT_ORE_X = 25
const NEXT_ORE_Y = 12
/** The snake: down this many rows at most, then across this many columns at most. */
const SNAKE_DOWN = 5
const SNAKE_SIDE = 10
/** Two galleries are at least this many rows of rock apart (where they run over each other). */
const TUNNEL_SPACING = 2
/** Two shafts are at least this many columns apart. */
const SHAFT_SPACING = 15
/** The whole mine is this many segments at most. */
const MAX_SEGMENTS = 60
/** Rows dug out in each gallery column (a human is 3 tall; one more to step off a ladder's top). */
const CLEAR = 4
/**
 * Every this many columns a gallery has a support: a wooden post up the back wall, a torch on it
 * and a plank beam across the ceiling (the mine wall holds the ground up anyway: it's for looks).
 */
const SUPPORT_EVERY = 3
/** At most this many skeletons, bats and glowing mushrooms in a mine. */
const MAX_SKELETONS = 2
const MAX_BATS = 3
const MAX_SHROOMS = 8
/** Doesn't go mining with fewer planks than this (ladders and beams cost planks; the house comes first). */
const MIN_PLANKS = 12
/** Tiredness (0..100) each action of work down the mine adds (on top of the usual): worn out after ~40 s of it. */
const TIRING = 0.2
export const WORN_OUT = 100
/** It only goes down the mine this rested (at most this tired). */
const RESTED = 50
/** Actions per block: earth by hand, rock by pickaxe (each tier divides it). */
const SOFT_ACTIONS = 1
const ROCK_ACTIONS = 8
/** Earth it keeps for the yard, at most. */
const EARTH_STOCK = 20
/** Columns either side of the entrance that must be dry land too (no mine into a lake). */
const DRY_START = 3
/** It digs this many mines at most (one after another); each new one starts this much further out. */
const MAX_MINES = 4
const NEW_MINE_STEP = 30
/** Trips in a row that didn't get anything dug before it gives up on this mine. */
const MAX_FALSE_STARTS = 4
/** Plans saved by older versions get replanned. */
const PLAN_VERSION = 3

const SOFT: ReadonlySet<string | null> = new Set(['soil', 'sand', 'mud', 'ash', 'snow'])
const ROCK: ReadonlySet<string | null> = new Set(['stone', 'ice', 'coal', 'iron_ore', 'silver_ore', 'gold_ore', 'sulfur_ore', 'saltpeter', 'amethyst'])
/** Walk-through things it never digs away: water, trees, buildings, crops. */
const KEEP: ReadonlySet<string | null> = new Set(['water', 'wood', 'fruit', 'backwall', 'door', 'bed', 'fence', 'wheat', 'wheat_ripe'])
/** Already part of the mine. */
const MINE: ReadonlySet<string | null> = new Set(['mine_wall', 'mine_post', 'torch', 'ladder'])

/** Gunpowder it likes to have: below this it goes after sulfur and saltpeter. */
const GUNPOWDER_STOCK = 6

/** Which inventory slot each ore goes into, and what it shouts when it finds one. */
const ORES: Readonly<Record<string, { item: keyof Inventory; name: string }>> = {
  coal: { item: 'coal', name: 'Coal' },
  iron_ore: { item: 'iron', name: 'Iron' },
  silver_ore: { item: 'silver', name: 'Silver' },
  gold_ore: { item: 'gold', name: 'Gold' },
  sulfur_ore: { item: 'sulfur', name: 'Sulfur' },
  saltpeter: { item: 'saltpeter', name: 'Saltpeter' },
  amethyst: { item: 'amethyst', name: 'Amethyst' },
}

/**
 * One stretch of the snake. Vertical: the ladder column `x`, rows `y` .. `y + n - 1`. Horizontal:
 * columns `x`, `x + dir`, ... (`n` of them), its floor (feet row) going from `y` to `floor`,
 * between `lo` and `hi`. `len` is how long it's meant to get.
 */
export interface Segment {
  kind: 'v' | 'h'
  x: number
  y: number
  dir: 1 | -1
  n: number
  len: number
  floor: number
  lo: number
  hi: number
}

export interface Shaft {
  /** The entrance column, and the feet row of someone standing at it. */
  x: number
  top: number
  segs: Segment[]
  /** The ore it's digging towards. */
  target: Point | null
  /** Ore it couldn't get to ("x,y"): not aimed at again. */
  skip?: string[]
  done: boolean
  /** Trips in a row that didn't get anything dug (can't reach it, say). */
  tries?: number
  v?: number
}

/** How much it wants each ore right now (0 = not worth a trip, or its pickaxe can't take it). */
function oreWant(mind: Mind, id: string | null): number {
  const { inv, tools } = mind
  if (!id || !(id in ORES) || tools.pickaxe < ORE_TIER[id]) return 0
  if (id === 'iron_ore') return tools.pickaxe < 3 || tools.sword < 3 ? 4 : 1
  if (id === 'coal') return inv.torch < 8 ? 3 : 1
  // Gunpowder for the musket: sulfur and saltpeter (and coal).
  if (id === 'sulfur_ore' || id === 'saltpeter') return inv.gunpowder < GUNPOWDER_STOCK ? 3 : 1
  return 2
}

/** The ore to dig towards around (x, y): the one wanted most, nearest first (depth counts double). */
function findOre(body: Body, x: number, y: number, top: number, rangeX: number, rangeY: number, skip: readonly string[] = []): Point | null {
  let best: Point | null = null
  let score = -Infinity
  for (let oy = Math.max(y - rangeY, top + MIN_DEPTH); oy <= Math.min(y + rangeY, top + MAX_DEPTH); oy++) {
    for (let dx = -rangeX; dx <= rangeX; dx++) {
      const want = oreWant(body.mind, body.get(x + dx, oy))
      if (!want || skip.includes(`${x + dx},${oy}`)) continue
      const s = want * 100 - Math.abs(dx) - Math.abs(oy - y) * 2
      if (s > score) {
        score = s
        best = { x: x + dx, y: oy }
      }
    }
  }
  return best
}

/** Dry land to start a mine on at column x: the ground row, or null (water, a lake bed...). */
function dryGround(body: Body, x: number, from: number): number | null {
  const ground = groundBelow(body, x, from, 40)
  if (ground === null) return null
  for (let y = ground - 3; y <= ground; y++) if (body.get(x, y) === 'water') return null
  return ground
}

/**
 * Plans the mine beyond the yard, on the side away from the farm (or the other, if that's wet).
 * A new mine (the old one finished, or blocked for good) starts further out, clear of the old ones.
 */
function plan(body: Body): Shaft | null {
  const { mind } = body
  const home = mind.home
  if (!home) return null
  const farmSide = mind.farm ? Math.sign((mind.farm.x0 + mind.farm.x1) / 2 - home.x) : 0
  const first: 1 | -1 = farmSide > 0 ? -1 : farmSide < 0 ? 1 : body.random() < 0.5 ? 1 : -1
  const old = mind.oldMines ?? []
  const spots: [number, 1 | -1][] = []
  for (let k = 0; k < MAX_MINES; k++) for (const side of [first, -first as 1 | -1]) spots.push([home.x + side * (ENTRANCE + k * NEW_MINE_STEP), side])
  for (const [x, side] of spots) {
    if (old.some((o) => Math.abs(o - x) < NEW_MINE_STEP)) continue
    const ground = dryGround(body, x, home.ground - 15)
    if (ground === null) continue
    let dry = true
    for (let k = -DRY_START; k <= DRY_START && dry; k++) dry = dryGround(body, x + k, ground - 10) !== null
    if (!dry) continue
    const top = ground - 1
    const mine: Shaft = { x, top, segs: [], target: null, done: false, tries: 0, v: PLAN_VERSION }
    mine.target = findOre(body, x, top + MIN_DEPTH, top, ORE_RANGE, MAX_DEPTH)
    // It always starts going down from the entrance.
    mine.segs.push(segment('v', x, top + 1, side, Math.min(SNAKE_DOWN, Math.max(MIN_DEPTH, (mine.target?.y ?? top + SNAKE_DOWN) - top))))
    return mine
  }
  return null
}

function segment(kind: 'v' | 'h', x: number, y: number, dir: 1 | -1, len: number): Segment {
  return { kind, x, y, dir, n: 0, len, floor: y, lo: y, hi: y }
}

/** Something it wants out of a mine: stone for the house, iron for tools, coal for torches. */
export function wantsMine(mind: Mind, stoneGoal: number): boolean {
  // (A finished mine: a new one, unless it has dug all the mines it's going to.)
  if (mind.shaft?.done && (mind.oldMines?.length ?? 0) >= MAX_MINES - 1) return false
  const { inv, tools } = mind
  return inv.stone < stoneGoal || tools.pickaxe < 3 || tools.sword < 3 || inv.torch < 4 || inv.gunpowder < 2
}

// ---------- The snake's geometry (also used by Body.mineRoute) ----------

/** Whether (x, y) — feet or a cell being dug — is in this segment (counting the next cell to dig). */
export function inSegment(s: Segment, x: number, y: number): boolean {
  if (s.kind === 'v') return x === s.x && y >= s.y - 1 && y <= s.y + s.n
  const k = (x - s.x) * s.dir
  return k >= 0 && k <= s.n && y >= s.lo - CLEAR && y <= s.hi + 1
}

/** The segment (x, y) is in (the last one, where they overlap), or -1 outside the mine. */
export function segmentAt(mine: Shaft, x: number, y: number): number {
  if (mine.v !== PLAN_VERSION) return -1
  for (let i = mine.segs.length - 1; i >= 0; i--) if (inSegment(mine.segs[i], x, y)) return i
  return -1
}

/** Whether (x, y) is down in this mine. */
export function inMine(mine: Shaft, x: number, y: number): boolean {
  return segmentAt(mine, x, y) >= 0
}

/** Where someone stands at the far end of a segment (its last column or rung). */
export function segmentEnd(s: Segment): Point {
  if (s.kind === 'v') return { x: s.x, y: s.n ? s.y + s.n - 1 : s.y - 1 }
  return { x: s.x + s.dir * Math.max(0, s.n - 1), y: s.n ? s.floor : s.y }
}

/** Where someone comes into a segment from the one before it. */
export function segmentStart(s: Segment): Point {
  return s.kind === 'v' ? { x: s.x, y: s.y - 1 } : { x: s.x - s.dir, y: s.y }
}

// ---------- Planning ----------

/** The next cell to work on: the next rung of a shaft, or the next column of a gallery (its feet row). */
function nextWork(mine: Shaft): Point {
  const s = mine.segs[mine.segs.length - 1]
  if (s.kind === 'v') return { x: s.x, y: s.y + s.n }
  // Galleries are level: all the going down is done in shafts.
  return { x: s.x + s.dir * s.n, y: s.y }
}

/** Columns from x to the nearest shaft of the mine (other than `except`). */
function shaftDistance(mine: Shaft, x: number, except: Segment): number {
  let best = Infinity
  for (const g of mine.segs) if (g.kind === 'v' && g !== except) best = Math.min(best, Math.abs(g.x - x))
  return best
}

/**
 * A gallery with its feet at row `floor` over columns `x0`..`x1`: how many rows of rock it would
 * leave to the galleries it runs over or under (Infinity if none), and the floor row it'd need
 * to be at to keep TUNNEL_SPACING below all of them.
 */
function galleryGap(mine: Shaft, x0: number, x1: number, floor: number, except?: Segment) {
  let gap = Infinity
  let deepEnough = floor
  const [a, b] = x0 < x1 ? [x0, x1] : [x1, x0]
  for (const g of mine.segs) {
    if (g.kind !== 'h' || g === except || g.n === 0) continue
    const g0 = g.x
    const g1 = g.x + g.dir * (g.n - 1)
    if (Math.max(g0, g1) < a || Math.min(g0, g1) > b) continue
    const rows = floor - CLEAR + 1 > g.hi ? floor - CLEAR - g.hi : g.lo - CLEAR + 1 > floor ? g.lo - CLEAR - floor : -1
    gap = Math.min(gap, rows)
    deepEnough = Math.max(deepEnough, g.hi + CLEAR + TUNNEL_SPACING)
  }
  return { gap, deepEnough }
}

/**
 * The last segment is as long as planned: lay out the next one, towards the target. Down a
 * shaft while the ore is well below, across otherwise — keeping SHAFT_SPACING between shafts
 * (on along the gallery first if a new one would be too close) and TUNNEL_SPACING between
 * galleries (down first if a new one would run too close over or under an old one).
 */
function planNext(mine: Shaft) {
  const last = mine.segs[mine.segs.length - 1]
  if (last.n < last.len) return
  if (mine.segs.length >= MAX_SEGMENTS) {
    mine.done = true
    return
  }
  const end = segmentEnd(last)
  const t = mine.target
  const across = (dir: 1 | -1, cols: number) => {
    if (last.kind === 'h' && last.dir === dir) last.len += cols
    else mine.segs.push(segment('h', end.x + dir, end.y, dir, cols))
  }
  const down = (rows: number) => {
    // The same shaft just goes on; a new one only far enough from the others.
    if (last.kind === 'v') {
      last.len += rows
      return
    }
    const near = shaftDistance(mine, end.x, last)
    if (near < SHAFT_SPACING) across(last.dir, Math.min(SNAKE_SIDE, SHAFT_SPACING - near))
    else mine.segs.push(segment('v', end.x, end.y + 1, last.dir, rows))
  }
  /** Across towards `dir`, if it keeps clear of the other galleries; else down first, or `fallback`. */
  const acrossOrDown = (dir: 1 | -1, cols: number, fallback: () => void) => {
    const extending = last.kind === 'h' && last.dir === dir ? last : undefined
    const { gap, deepEnough } = galleryGap(mine, end.x + dir, end.x + dir * cols, end.y, extending)
    if (gap >= TUNNEL_SPACING) across(dir, cols)
    else if (deepEnough > end.y) down(Math.min(SNAKE_DOWN, deepEnough - end.y))
    else fallback()
  }

  if (t && t.y > end.y) {
    // Below its feet: down (to that very row, so the gallery runs right through it).
    down(Math.min(SNAKE_DOWN, t.y - end.y))
  } else if (t && t.y < end.y - CLEAR) {
    // Above the gallery: the snake only goes down, so that one's not worth it.
    ;(mine.skip ??= []).push(`${t.x},${t.y}`)
    mine.target = null
  } else if (t) {
    // Within the gallery's height: across, towards it — unless that would run too close over an
    // old gallery and the ore isn't any lower: then it's not worth it.
    const dir: 1 | -1 = t.x > end.x ? 1 : t.x < end.x ? -1 : last.dir
    const cols = Math.max(1, Math.min(SNAKE_SIDE, Math.abs(t.x - end.x)))
    acrossOrDown(dir, cols, () => {
      ;(mine.skip ??= []).push(`${t.x},${t.y}`)
      mine.target = null
    })
  } else if (end.y < mine.top + EXPLORE_DEPTH) {
    // Nothing in sight: down, then out along the rock.
    down(SNAKE_DOWN)
  } else acrossOrDown(last.dir, SNAKE_SIDE, () => (mine.done = true))
}

/** Picks what to dig towards: the next ore near the end of the mine. */
function retarget(body: Body, mine: Shaft) {
  const t = mine.target
  if (t && oreWant(body.mind, body.get(t.x, t.y))) return
  mine.target = null
  const skip = mine.skip ?? []
  const end = segmentEnd(mine.segs[mine.segs.length - 1])
  mine.target = findOre(body, end.x, end.y, mine.top, NEXT_ORE_X, NEXT_ORE_Y, skip)
}

// ---------- The task ----------

export const shaft: Task = {
  start(body) {
    const { mind } = body
    if (!mind.home || mind.tools.pickaxe === 0 || mind.inv.plank < MIN_PLANKS) return false
    if ((mind.tired ?? 0) > RESTED) return false
    if (mind.shaft && mind.shaft.v !== PLAN_VERSION) mind.shaft = null
    // Done with this mine (dug out, or blocked for good): a new one, further out.
    if (mind.shaft?.done && (mind.oldMines?.length ?? 0) < MAX_MINES - 1) {
      ;(mind.oldMines ??= []).push(mind.shaft.x)
      mind.shaft = null
      mind.mineSeg = -1
    }
    if (!mind.shaft) {
      mind.shaft = plan(body)
      if (mind.shaft) note(mind, mind.oldMines?.length ? 'That mine is done: started a new one further out.' : 'Started digging a mine.', 'mine')
    }
    const mine = mind.shaft
    if (!mine || mine.done) return false
    if ((mine.tries = (mine.tries ?? 0) + 1) > MAX_FALSE_STARTS) {
      mine.done = true
      return false
    }
    retarget(body, mine)
    planNext(mine)
    if (mine.done) return false
    mind.target = nextWork(mine)
    mind.patience = patienceFor(body, mind.target) + 100
    mind.work = 0
    mind.timer = 0
    return true
  },
  run(body) {
    const { mind } = body
    const mine = mind.shaft
    if (!mine || mine.done || !mind.target) return 'failed'
    const status = approach(body)
    if (status !== 'arrived') return status
    // Worn out: that's enough for today (it heads home to bed, see brain.ts).
    mind.tired = Math.min(WORN_OUT, (mind.tired ?? 0) + TIRING)
    if (mind.tired >= WORN_OUT) {
      mind.say = { text: 'Phew, tired…', ttl: 20 }
      firstTime(mind, 'tired', 'Mined until I could barely stand. Time for a rest.', 'mine')
      return 'done'
    }
    const s = mine.segs[mine.segs.length - 1]
    const result = s.kind === 'v' ? sink(body, mine, s) : extend(body, mine, s)
    if (result !== 'next') return result
    mine.tries = 0
    retarget(body, mine)
    planNext(mine)
    if (mine.done) return 'done'
    mind.target = nextWork(mine)
    mind.patience = patienceFor(body, mind.target) + 100
    return 'running'
  },
}

/** One action on the next rung of a shaft: dig it out and put a ladder in it. */
function sink(body: Body, mine: Shaft, s: Segment): 'running' | 'next' | 'done' {
  const x = s.x
  const y = s.y + s.n
  const id = body.get(x, y)
  if (id === 'ladder') {
    s.n++
    return 'next'
  }
  // Fell into the rung it was digging: the ladder goes in behind it.
  if (isCreature(id)) {
    if (body.x !== x || body.y !== y) return 'running'
    if (body.mind.inv.plank < 1) return 'done'
    body.setBehind(x, y, 'ladder')
    body.mind.inv.plank--
    s.n++
    return 'next'
  }
  if (id === null || id === 'lava' || KEEP.has(id)) return blocked(mine, s)
  // Ore in the shaft's sides first (dug from above; the hole is left as mine wall).
  for (const dx of [-1, 1]) if (digOre(body, x + dx, y)) return 'running'
  // Then the rung itself, with the ladder straight in (before it can fall into the hole).
  if (id === 'plank') {
    // The gallery's plank floor (over a gap) gives way to the ladder; the plank's kept.
    body.mind.inv.plank++
  } else if (!isPassable(id)) {
    const swing = breakBlock(body, x, y, id)
    if (swing === 'blocked') return blocked(mine, s)
    if (swing === 'working') return 'running'
  }
  if (!placeBlock(body, x, y, 'ladder')) return 'done'
  s.n++
  return 'next'
}

/** One action on the next gallery column: clear it out, then ceiling, floor and a torch. */
function extend(body: Body, mine: Shaft, s: Segment): 'running' | 'next' | 'done' {
  const { mind } = body
  const { x, y: feet } = mind.target!
  if ((x - s.x) * s.dir !== s.n) return 'next'
  // Standing in the very column it's about to dig (the gallery turned back over itself): step back.
  if (body.x === x) {
    body.step(-s.dir)
    return 'running'
  }

  // The whole column comes down at once: as many swings as its hardest block takes.
  const column: { y: number; id: string | null }[] = []
  let cost = 0
  for (let y = feet - CLEAR + 1; y <= feet; y++) {
    const id = body.get(x, y)
    // (A plank there is an older gallery's beam or floor: it stays.)
    if (MINE.has(id) || id === 'plank') continue
    if (isCreature(id)) return 'running'
    if (!isPassable(id) || KEEP.has(id)) {
      const swings = blockCost(mind, id)
      if (swings === null) return blocked(mine, s)
      cost = Math.max(cost, swings)
    }
    column.push({ y, id })
  }
  if (column.length) {
    if (++mind.work < cost) return 'running'
    mind.work = 0
    for (const { y, id } of column) {
      if (!isPassable(id)) keep(mind, id)
      body.set(x, y, 'mine_wall')
    }
    return 'running'
  }
  // Ore in the ceiling or under the floor: dug out too.
  const ceiling = feet - CLEAR
  if (digOre(body, x, ceiling) || digOre(body, x, feet + 1)) return 'running'
  const roof = body.get(x, ceiling)
  if (isSupport(s, x) && roof !== null && roof !== 'plank' && roof !== 'wood' && !isCreature(roof)) {
    return placeBlock(body, x, ceiling, 'plank') ? 'running' : 'done'
  }
  const floor = body.get(x, feet + 1)
  if (!isGround(floor) && floor !== 'ladder') {
    if (floor === 'water' || floor === 'lava') return blocked(mine, s)
    return placeBlock(body, x, feet + 1, 'plank') ? 'running' : 'done'
  }
  dress(body, s, x)
  s.n++
  s.floor = feet
  s.lo = Math.min(s.lo, feet)
  s.hi = Math.max(s.hi, feet)
  return 'next'
}

/** Every SUPPORT_EVERY-th column of a gallery is a support (a post, a torch and a beam over it). */
function isSupport(s: Segment, x: number): boolean {
  return ((x - s.x) * s.dir + 1) % SUPPORT_EVERY === 0
}

/**
 * Puts a gallery column in order: a support column gets its wooden post up the back with a torch
 * on it (if it has one to spare); any other column is plain dark wall (an older gallery's torch
 * out of line comes down, and is kept). Cells someone's standing in are left for later.
 */
function dress(body: Body, s: Segment, x: number) {
  const { mind } = body
  const support = isSupport(s, x)
  for (let y = s.y - CLEAR + 1; y <= s.y; y++) {
    const id = body.get(x, y)
    // (Air in a gallery is a hole in its back wall: patched up too.)
    if (id !== 'mine_wall' && id !== 'mine_post' && id !== 'torch' && id !== 'air') continue
    let want = support ? 'mine_post' : 'mine_wall'
    if (support && y === s.y - 2 && (id === 'torch' || mind.inv.torch > 0)) want = 'torch'
    if (id === want) continue
    if (id === 'torch') mind.inv.torch++
    if (want === 'torch') mind.inv.torch--
    body.set(x, y, want)
  }
}

/**
 * Down the mine (whatever it's doing there), it keeps the gallery it's walking along in order
 * (see dress): a post, a torch and a ceiling beam every SUPPORT_EVERY columns, plain dark wall in
 * between, so older galleries end up looking just like new ones. Called once per action.
 */
export function tendMine(body: Body) {
  const { mind } = body
  const mine = mind.shaft
  if (!mine?.segs) return
  const i = segmentAt(mine, body.x, body.y)
  const s = mine.segs[i]
  if (!s || s.kind !== 'h' || body.y !== s.y) return
  for (const x of [body.x - 1, body.x, body.x + 1]) {
    const k = (x - s.x) * s.dir
    if (k < 0 || k >= s.n) continue
    dress(body, s, x)
    // The ceiling beam over a support (rock or bare mine wall up there: a plank goes in).
    const ceiling = s.y - CLEAR
    const roof = body.get(x, ceiling)
    if (isSupport(s, x) && (roof === 'mine_wall' || SOFT.has(roof) || ROCK.has(roof)) && mind.inv.plank > MIN_PLANKS) {
      body.set(x, ceiling, 'plank')
      mind.inv.plank--
    }
  }
}

/** Its galleries long enough for things to turn up in. */
function galleries(mine: Shaft): Segment[] {
  return mine.v === PLAN_VERSION ? mine.segs.filter((s) => s.kind === 'h' && s.n >= 4) : []
}

/** How many `id` there are in these galleries (anywhere in their height). */
function countIn(body: Body, list: Segment[], id: string): number {
  let n = 0
  for (const g of list) {
    for (let k = 0; k < g.n; k++) for (let y = g.y - CLEAR + 1; y <= g.y; y++) if (body.get(g.x + g.dir * k, y) === id) n++
  }
  return n
}

/** A random column of one of these galleries (not at either end). */
function someColumn(body: Body, list: Segment[]): { g: Segment; x: number } {
  const g = list[Math.floor(body.random() * list.length)]
  return { g, x: g.x + g.dir * (1 + Math.floor(body.random() * (g.n - 2))) }
}

/**
 * Up top resting, now and then a skeleton turns up somewhere in its mine's galleries (out of
 * sight, never more than a couple at a time).
 */
export function spawnSkeleton(body: Body) {
  const mine = body.mind.shaft
  const list = mine ? galleries(mine) : []
  if (!list.length || countIn(body, list, 'skeleton') >= MAX_SKELETONS) return
  const { g, x } = someColumn(body, list)
  for (let k = 0; k < 3; k++) if (body.get(x, g.y - k) !== 'mine_wall') return
  body.cover(x, g.y, 'skeleton')
}

/** Bats move into the dark galleries (a few at most). */
export function spawnBat(body: Body) {
  const mine = body.mind.shaft
  const list = mine ? galleries(mine) : []
  if (!list.length || countIn(body, list, 'bat') >= MAX_BATS) return
  const { g, x } = someColumn(body, list)
  const y = g.y - CLEAR + 1
  if (body.get(x, y) === 'mine_wall') body.cover(x, y, 'bat')
}

/** A glowing mushroom sprouts on a gallery floor (between the supports). */
export function sproutShroom(body: Body) {
  const mine = body.mind.shaft
  const list = mine ? galleries(mine) : []
  if (!list.length || countIn(body, list, 'glow_shroom') >= MAX_SHROOMS) return
  const { g, x } = someColumn(body, list)
  if (isSupport(g, x) || body.get(x, g.y) !== 'mine_wall' || !isGround(body.get(x, g.y + 1))) return
  body.cover(x, g.y, 'glow_shroom')
}

/**
 * A wanted ore right next to the tunnel (its sides, ceiling or floor): one swing at it. Only the
 * ore comes out; its hole is left as mine wall, so nothing around it moves. False if there's none.
 */
function digOre(body: Body, x: number, y: number): boolean {
  const id = body.get(x, y)
  if (!oreWant(body.mind, id)) return false
  const swing = breakBlock(body, x, y, id)
  if (swing === 'broken') body.set(x, y, 'mine_wall')
  return swing !== 'blocked'
}

/** Hit something it can't dig through (water, a building...): this stretch ends where it got to. */
function blocked(mine: Shaft, s: Segment): 'next' | 'done' {
  if (s.n === 0 && mine.segs.length === 1) {
    mine.done = true
    return 'done'
  }
  if (s.n === 0) mine.segs.pop()
  else s.len = s.n
  // Not this ore again (it'd only lead here).
  const t = mine.target
  if (t) (mine.skip ??= []).push(`${t.x},${t.y}`)
  if (mine.skip && mine.skip.length > 40) mine.skip.shift()
  mine.target = null
  // Try another way next time; a mine that keeps hitting walls ends.
  if (mine.segs.length >= MAX_SEGMENTS - 1) mine.done = true
  return 'next'
}

/** Pays a plank for a ladder or a plank and puts it there. False if it has none. */
function placeBlock(body: Body, x: number, y: number, id: 'plank' | 'ladder'): boolean {
  const { mind } = body
  if (mind.inv.plank < 1) {
    mind.want = 'wood'
    return false
  }
  body.set(x, y, id)
  mind.inv.plank--
  return true
}

/** Swings it takes to break a block of earth or rock (null: it can't). */
function blockCost(mind: Mind, id: string | null): number | null {
  if (SOFT.has(id)) return SOFT_ACTIONS
  // (A practised miner breaks rock quicker.)
  if (ROCK.has(id)) return Math.ceil(ROCK_ACTIONS / (mind.tools.pickaxe * knack(mind, 'mining')))
  return null
}

/** One swing at a block of earth or rock; once it breaks, whatever was in it is kept. */
function breakBlock(body: Body, x: number, y: number, id: string | null): 'working' | 'broken' | 'blocked' {
  const { mind } = body
  const cost = blockCost(mind, id)
  if (cost === null) return 'blocked'
  if (++mind.work < cost) return 'working'
  mind.work = 0
  body.set(x, y, 'air')
  keep(mind, id)
  return 'broken'
}

/** What a broken block gives: stone, ore (with a good enough pickaxe), earth for the yard. */
function keep(mind: Mind, id: string | null) {
  const { inv } = mind
  if (id && ROCK.has(id)) practice(mind, 'mining', 1)
  const ore = id ? ORES[id] : undefined
  if (ore) {
    // Too weak a pickaxe just breaks it.
    if (mind.tools.pickaxe >= ORE_TIER[id!]) {
      inv[ore.item]++
      mind.say = { text: `${ore.name}!`, ttl: 12 }
      firstTime(mind, `ore:${id}`, `Found ${ore.name.toLowerCase()} down the mine!`, id === 'gold_ore' || id === 'silver_ore' || id === 'amethyst' ? 'treasure' : 'mine')
    }
  } else if (id === 'stone') inv.stone++
  else if (SOFT.has(id) && inv.earth < EARTH_STOCK) inv.earth++
}
