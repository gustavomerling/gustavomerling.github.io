import type { CellContext, CellInit } from '../../../engine/context.ts'
import { BOAT_LENGTH, boatPart, isBoatMiddle } from '../../materials/boat.ts'
import { BOAT_COST } from './craft.ts'
import { contains, ladderX, MAX_STAGE } from './house.ts'
import { createMind, upgradeMind, type Mind, type Point } from './mind.ts'

/** A human (or zombie) is a column of cells: feet (the cell that thinks), torso, head. */
export const HEIGHT = 3
/** Every cell of a human's or zombie's body (never something to stand on). */
const CREATURE_PARTS: ReadonlySet<string | null> = new Set([
  'human',
  'human_body',
  'human_torch',
  'human_head',
  'zombie',
  'zombie_body',
  'zombie_head',
])

/** Cells a human can walk through (kept intact underneath, like birds in trees). Trees never block it. */
const PASSABLE: ReadonlySet<string | null> = new Set([
  'air',
  'grass',
  'leaf',
  'wood',
  'fruit',
  'plant',
  'litter',
  'seed',
  'steam',
  'cloud',
  'water',
  // Houses and farms: walks in front of the back wall, climbs ladders, lies in bed.
  'backwall',
  'door',
  'ladder',
  'bed',
  'fence',
  'wheat',
  'wheat_ripe',
  'flower',
  'mushroom',
  'firefly',
])

/** House walls and windows: humans walk right through them, but stand on them as floors and roofs. */
const PLATFORM: ReadonlySet<string | null> = new Set(['plank', 'glass'])

/** Zombies only get through open, natural ground cover: houses, doors and fences stop them. */
const ZOMBIE_PASSABLE: ReadonlySet<string | null> = new Set([
  'air',
  'grass',
  'leaf',
  'wood',
  'fruit',
  'plant',
  'litter',
  'seed',
  'steam',
  'cloud',
  'water',
  'wheat',
  'wheat_ripe',
  'flower',
  'mushroom',
  'firefly',
])

/** How a kind of body moves: its cells, what it walks through, whether it climbs walls. */
export interface BodyKind {
  feet: string
  /** Torso cells (a human holding a torch has a glowing one). */
  torsos: ReadonlySet<string | null>
  torso: string
  head: string
  passable: ReadonlySet<string | null>
  /** Walked through sideways but stood on (house walls and floors, for humans). */
  platform: ReadonlySet<string | null>
  climbs: boolean
}

export const HUMAN: BodyKind = {
  feet: 'human',
  torsos: new Set(['human_body', 'human_torch']),
  torso: 'human_body',
  head: 'human_head',
  passable: PASSABLE,
  platform: PLATFORM,
  climbs: true,
}

export const ZOMBIE: BodyKind = {
  feet: 'zombie',
  torsos: new Set(['zombie_body']),
  torso: 'zombie_body',
  head: 'zombie_head',
  passable: ZOMBIE_PASSABLE,
  platform: new Set(),
  climbs: false,
}

/** Humans walk through this. */
export function isPassable(id: string | null): boolean {
  return PASSABLE.has(id)
}

/** Something to stand on (anything solid-ish that isn't fire or a body). */
export function isGround(id: string | null): boolean {
  return id !== null && !PASSABLE.has(id) && id !== 'fire' && !CREATURE_PARTS.has(id)
}

/** Dug by hand. */
const SOFT: ReadonlySet<string | null> = new Set(['soil', 'sand', 'mud', 'ash', 'snow'])
/** Dug with a pickaxe (stone goes into the inventory). */
const HARD: ReadonlySet<string | null> = new Set(['stone', 'ice'])
const SOFT_ACTIONS = 2
const HARD_ACTIONS = 16

/** Puddles up to this many cells it bails out of its way. */
const BAIL_POOL = 40

/** How far below its feet the water may be for it to launch its boat from the bank. */
const LAUNCH_DROP = 5

/** Ticks of wall grip after each climbing step: lasts until the next action (humans act every 5 ticks). */
const CLIMB_GRIP = 8

/**
 * The human's body for one tick. Works in absolute grid coordinates and translates to the
 * CellContext (which stays bound to where the feet were at the start of the tick).
 */
export class Body {
  readonly ctx: CellContext
  readonly mind: Mind
  readonly kind: BodyKind
  /** Where `walkTo` is heading this action (boats are only for getting across to it). */
  private goal: Point | null = null
  /** How far the feet have moved this tick, relative to the context origin. */
  private ox = 0
  private oy = 0

  constructor(ctx: CellContext, mind: Mind, kind: BodyKind = HUMAN) {
    this.ctx = ctx
    this.mind = mind
    this.kind = kind
  }

  /** This body walks through `id`. */
  passes(id: string | null): boolean {
    return this.kind.passable.has(id)
  }

  /** Feet position (absolute). */
  get x() {
    return this.ctx.x + this.ox
  }

  get y() {
    return this.ctx.y + this.oy
  }

  random() {
    return this.ctx.random()
  }

  light() {
    return this.ctx.light()
  }

  // ---------- Absolute-coordinate world access ----------

  get(x: number, y: number) {
    return this.ctx.get(x - this.ctx.x, y - this.ctx.y)
  }

  set(x: number, y: number, id: string, init?: CellInit) {
    this.ctx.set(x - this.ctx.x, y - this.ctx.y, id, init)
  }

  data(x: number, y: number) {
    return this.ctx.data(x - this.ctx.x, y - this.ctx.y)
  }

  setData(x: number, y: number, value: number) {
    this.ctx.setData(x - this.ctx.x, y - this.ctx.y, value)
  }

  water(x: number, y: number) {
    return this.ctx.water(x - this.ctx.x, y - this.ctx.y)
  }

  /** Puts `id` over the cell at (x, y), keeping what was there underneath. */
  cover(x: number, y: number, id: string) {
    this.ctx.cover(x - this.ctx.x, y - this.ctx.y, id)
  }

  /** Puts `id` behind whoever stands at (x, y) (building the back wall around people). */
  setBehind(x: number, y: number, id: string) {
    this.ctx.setBehind(x - this.ctx.x, y - this.ctx.y, id)
  }

  /** The mind of another human (or zombie) whose feet are at (x, y). */
  mindAt(x: number, y: number, feet = 'human'): Mind | null {
    if (this.get(x, y) !== feet) return null
    const mind = this.ctx.memoryAt(x - this.ctx.x, y - this.ctx.y, createMind)
    return mind && upgradeMind(mind)
  }

  rain() {
    return this.ctx.rain()
  }

  /** What's at (x, y), looking through its own body to the cell it hides (water it swims in). */
  private behind(x: number, y: number) {
    const id = this.get(x, y)
    return CREATURE_PARTS.has(id) ? this.ctx.under(x - this.ctx.x, y - this.ctx.y) : id
  }

  /** Whether the body part `k` cells above the feet is in water. */
  wet(k: number): boolean {
    return this.behind(this.x, this.y - k) === 'water'
  }

  /** Standing in the middle of its boat. */
  riding(): boolean {
    return this.get(this.x, this.y + 1) === 'boat' && isBoatMiddle(this.data(this.x, this.y + 1))
  }

  // ---------- Body parts ----------

  /** How many parts stand on the feet (0 = just feet, 2 = torso and head). */
  partCount(): number {
    if (!this.kind.torsos.has(this.get(this.x, this.y - 1))) return 0
    return this.get(this.x, this.y - 2) === this.kind.head ? 2 : 1
  }

  /** Grows back a missing torso/head when there's room (right after being placed). */
  ensureParts() {
    const { x, y } = this
    // Parts cover what's there (a back wall stays behind them).
    const { torso, torsos, head } = this.kind
    if (!torsos.has(this.get(x, y - 1))) {
      if (this.passes(this.get(x, y - 1))) this.cover(x, y - 1, torso)
      return
    }
    if (this.get(x, y - 2) !== head && this.passes(this.get(x, y - 2))) this.cover(x, y - 2, head)
  }

  /** Swaps the torso for another kind (lighting a torch), keeping what's behind it. */
  setTorso(id: string) {
    const { x, y } = this
    if (this.kind.torsos.has(this.get(x, y - 1)) && this.get(x, y - 1) !== id) {
      this.ctx.retype(x - this.ctx.x, y - 1 - this.ctx.y, id)
    }
  }

  /** Another human right in the way, level with it: they squeeze past (swap places). */
  private passBy(dir: number): boolean {
    const { x, y } = this
    const parts = this.partCount()
    if (this.get(x + dir, y) !== 'human') return false
    for (let k = 1; k <= parts; k++) if (!HUMAN.torsos.has(this.get(x + dir, y - k)) && this.get(x + dir, y - k) !== HUMAN.head) return false
    for (let k = 0; k <= parts; k++) this.ctx.swapCells(this.ox, this.oy - k, this.ox + dir, this.oy - k)
    this.ox += dir
    return true
  }

  /** Someone else on the ladder right above or below: they trade places. */
  private passVertically(dir: number): boolean {
    const { x, y } = this
    const parts = this.partCount()
    if (parts !== 2) return false
    // Their feet: right above our head, or 3 below our feet.
    const feet = dir < 0 ? y - 3 : y + 3
    if (this.get(x, feet) !== 'human' || !HUMAN.torsos.has(this.get(x, feet - 1)) || this.get(x, feet - 2) !== HUMAN.head) return false
    for (let k = 0; k <= 2; k++) this.ctx.swapCells(this.ox, this.oy - k, this.ox, this.oy + (feet - y) - k)
    this.oy += feet - y
    return true
  }

  /** Takes the whole body out of the world, giving back whatever it was standing in. */
  vanish() {
    const parts = this.partCount()
    for (let k = parts; k >= 0; k--) this.ctx.reveal(this.ox, this.oy - k)
  }

  // ---------- Movement ----------

  /** Whether the whole body fits after moving by (dx, dy). */
  canMove(dx: number, dy: number): boolean {
    const parts = this.partCount()
    for (let k = 0; k <= parts; k++) {
      const tx = this.x + dx
      const ty = this.y + dy - k
      // Cells the body itself occupies don't block a vertical move.
      if (dx === 0 && ty <= this.y && ty >= this.y - parts) continue
      const id = this.get(tx, ty)
      // Sideways, house walls let humans through; up or down they're floors and ceilings.
      if (!this.passes(id) && !(dy === 0 && this.kind.platform.has(id))) return false
    }
    return true
  }

  /** Moves the whole column by (dx, dy). Returns false if it doesn't fit. */
  move(dx: number, dy: number): boolean {
    if (!this.canMove(dx, dy)) return false
    const parts = this.partCount()
    // Moving down: feet first. Moving up: head first. Sideways: any order.
    for (let n = 0; n <= parts; n++) {
      const k = dy > 0 ? n : parts - n
      this.ctx.moveCell(this.ox, this.oy - k, this.ox + dx, this.oy + dy - k)
    }
    this.ox += dx
    this.oy += dy
    return true
  }

  /**
   * Gravity and water, once per tick. Falls if nothing is underfoot (unless gripping a wall).
   * In water it can't walk the bottom: it floats with its head out, rising when the head goes
   * under and sinking until the torso is in. Returns true if it moved.
   */
  fall(): boolean {
    const { mind } = this
    mind.afloat = this.riding() ? 'boat' : this.wet(0) || this.wet(1) ? 'swim' : null
    if (mind.climb > 0) {
      mind.climb--
      return false
    }
    // Holding on to a ladder.
    if (this.behind(this.x, this.y) === 'ladder') return false
    if (mind.afloat === 'swim') {
      if (this.wet(this.partCount())) return this.move(0, -1)
      if (this.wet(1)) return false
    }
    if (isGround(this.get(this.x, this.y + 1))) return false
    return this.move(0, 1)
  }

  standing(): boolean {
    return isGround(this.get(this.x, this.y + 1))
  }

  /** One step sideways: row the boat, launch it at the shore, walk, step up a ledge, or climb a wall. */
  step(dir: number): boolean {
    const human = this.kind === HUMAN
    if (human && this.riding()) return this.row(dir) || this.disembark(dir)
    if (human && !this.mind.afloat && this.crossing() && (this.boardMoored(dir) || this.launch(dir))) return true
    if (human && this.mind.afloat === 'swim' && this.crossing() && this.board()) return true
    if (this.move(dir, 0)) return true
    if (human && this.passBy(dir)) return true
    if (this.passes(this.get(this.x, this.y - HEIGHT)) && this.move(dir, -1)) return true
    // A wall: climb it (Minecraft-style ladders, without the ladder). Never a house wall.
    const wall = (id: string | null) => isGround(id) && !this.kind.platform.has(id)
    if (this.kind.climbs && (wall(this.get(this.x + dir, this.y)) || wall(this.get(this.x + dir, this.y - 1)))) {
      if (this.move(0, -1)) {
        this.mind.climb = CLIMB_GRIP
        return true
      }
    }
    return false
  }

  /**
   * Heading somewhere across the water: a boat is worth it. Not when strolling, or when the
   * water itself is the goal (filling the bucket, fishing).
   */
  private crossing(): boolean {
    const { goal } = this
    if (!goal || this.get(goal.x, goal.y) === 'water') return false
    return Math.abs(goal.x - this.x) > BOAT_LENGTH + 1
  }

  /** Moves a cell between absolute positions (boat parts). */
  private shift(x1: number, y1: number, x2: number, y2: number) {
    const { ctx } = this
    ctx.moveCell(x1 - ctx.x, y1 - ctx.y, x2 - ctx.x, y2 - ctx.y)
  }

  /** Open water surface at (x, y): water with no water above it. */
  private surfaceAt(x: number, y: number): boolean {
    return this.get(x, y) === 'water' && this.get(x, y - 1) !== 'water'
  }

  /** Room for a raised end of the boat (open air, not water). */
  private airAt(x: number, y: number): boolean {
    const id = this.get(x, y)
    return id !== 'water' && isPassable(id)
  }

  /** Builds the boat centred under feet that will stand at (cx, surface - 1). */
  private placeBoat(cx: number, surface: number) {
    const reach = BOAT_LENGTH >> 1
    for (let k = -reach; k <= reach; k++) {
      this.ctx.cover(cx + k - this.ctx.x, surface - this.ctx.y, 'boat', { data: boatPart(k) })
    }
    for (const k of [-reach, reach]) {
      this.ctx.cover(cx + k - this.ctx.x, surface - 1 - this.ctx.y, 'boat', { data: boatPart(k, true) })
    }
  }

  /** Rows one cell along the water's surface, boat and all. False when the bow hits the shore. */
  private row(dir: number): boolean {
    const { x, y } = this
    const reach = BOAT_LENGTH >> 1
    const bow = x + dir * (reach + 1)
    if (!this.surfaceAt(bow, y + 1) || !this.airAt(bow, y) || !this.canMove(dir, 0)) return false
    // Front to back, so each part moves into the space the one ahead just left.
    this.shift(x + dir * reach, y, bow, y)
    for (let k = reach; k >= -reach; k--) this.shift(x + dir * k, y + 1, x + dir * (k + 1), y + 1)
    this.move(dir, 0)
    this.shift(x - dir * reach, y, x - dir * (reach - 1), y)
    return true
  }

  /** The bow touched the shore: hop over it onto dry land. The boat stays moored on the water. */
  private disembark(dir: number): boolean {
    for (let reach = (BOAT_LENGTH >> 1) + 1; reach <= BOAT_LENGTH; reach++) {
      const hop = dir * reach
      const x = this.x + hop
      for (const dy of [0, -1, 1, -2, 2, -3, 3]) {
        if (isGround(this.get(x, this.y + dy + 1)) && this.canMove(hop, dy)) return this.move(hop, dy)
      }
    }
    return false
  }

  /** Spends the planks for a new boat. False if it can't afford one. */
  private buildBoat(): boolean {
    const { tools, inv } = this.mind
    if (inv.plank < BOAT_COST.plank) return false
    inv.plank -= BOAT_COST.plank
    tools.boat = true
    return true
  }

  /** A moored boat just ahead (its middle within a few cells, by the bank): hop in. */
  private boardMoored(dir: number): boolean {
    const reach = BOAT_LENGTH >> 1
    for (let n = 1; n <= reach + 2; n++) {
      const x = this.x + dir * n
      for (let y = this.y; y <= this.y + LAUNCH_DROP; y++) {
        if (this.get(x, y) !== 'boat' || !isBoatMiddle(this.data(x, y))) continue
        const dy = y - 1 - this.y
        return this.canMove(x - this.x, dy) && this.move(x - this.x, dy)
      }
    }
    return false
  }

  /**
   * At the shore with open water ahead (level with its feet, or lower down the bank) and
   * room for the whole boat: puts the boat on the water and hops into the middle of it.
   * Without a boat (or the planks for one) it just wades in and swims.
   */
  private launch(dir: number): boolean {
    let surface: number | null = null
    for (let y = this.y; y <= this.y + LAUNCH_DROP; y++) {
      const id = this.get(this.x + dir, y)
      if (id === 'water') {
        if (this.surfaceAt(this.x + dir, y)) surface = y
        break
      }
      if (y > this.y && !isPassable(id)) break
    }
    if (surface === null) return false
    const reach = BOAT_LENGTH >> 1
    const cx = this.x + dir * (reach + 1)
    for (let k = -reach; k <= reach; k++) if (!this.surfaceAt(cx + k, surface)) return false
    if (!this.airAt(cx - reach, surface - 1) || !this.airAt(cx + reach, surface - 1)) return false
    const dy = surface - 1 - this.y
    if (!this.canMove(cx - this.x, dy) || !this.buildBoat()) return false
    this.placeBoat(cx, surface)
    return this.move(cx - this.x, dy)
  }

  /** Swimming with its head out: climbs into its boat right here, on the surface. */
  private board(): boolean {
    const { x } = this
    const surface = this.y - 1
    const reach = BOAT_LENGTH >> 1
    if (!this.wet(1) || this.wet(2) || !this.canMove(0, -2)) return false
    for (let k = -reach; k <= reach; k++) if (k !== 0 && !this.surfaceAt(x + k, surface)) return false
    if (!this.airAt(x - reach, surface - 1) || !this.airAt(x + reach, surface - 1) || !this.buildBoat()) return false
    this.move(0, -2)
    this.placeBoat(x, surface)
    return true
  }

  /**
   * Digs out one block: soft ground by hand, stone and ice with a pickaxe. Never breaks
   * built things (planks, glass, metal). Takes a few actions; mined stone is kept.
   */
  dig(x: number, y: number): 'dug' | 'working' | 'blocked' {
    const id = this.get(x, y)
    if (isPassable(id)) return 'dug'
    const { mind } = this
    // Never digs under (or into) its own house, now or as big as it will get.
    if (mind.home && contains({ ...mind.home, stage: MAX_STAGE }, x, y, 0)) return 'blocked'
    let cost: number
    if (SOFT.has(id)) cost = SOFT_ACTIONS
    else if (HARD.has(id) && mind.tools.pickaxe > 0) cost = Math.ceil(HARD_ACTIONS / mind.tools.pickaxe)
    else return 'blocked'
    if (++mind.work < cost) return 'working'
    mind.work = 0
    this.set(x, y, 'air')
    if (id === 'stone') mind.inv.stone++
    return 'dug'
  }

  /**
   * Stuck on the way to `p`: dig through whatever is in the way (the block ahead, or the
   * ceiling/floor when the target is straight above/below). Returns false if it can't.
   */
  tunnel(p: Point): boolean {
    const dir = Math.sign(p.x - this.x)
    if (this.bail(dir || this.mind.dir)) return true
    const { x, y } = this
    const cells: [number, number][] =
      dir !== 0
        ? [[x + dir, y - 2], [x + dir, y - 1], [x + dir, y], [x, y - HEIGHT]]
        : p.y < y
          ? [[x, y - HEIGHT]]
          : [[x, y + 1]]
    for (const [cx, cy] of cells) {
      if (isPassable(this.get(cx, cy))) continue
      return this.dig(cx, cy) !== 'blocked'
    }
    return false
  }

  /**
   * Water in the way (a rain puddle filling a dip): scoop a cell of it and dump it behind.
   * Only for small puddles; lakes it swims or rows across instead.
   */
  bail(dir: number): boolean {
    if (this.kind !== HUMAN) return false
    const { x, y } = this
    const spots: Point[] = [
      { x: x + dir, y },
      { x: x + dir, y: y + 1 },
      { x: x + dir, y: y - 1 },
      { x: x + dir, y: y + 2 },
      { x, y: y + 1 },
    ]
    for (const spot of spots) {
      if (this.get(spot.x, spot.y) !== 'water' || this.poolSize(spot, BAIL_POOL) > BAIL_POOL) continue
      for (const back of [3, 2, 4]) {
        const drop = { x: x - dir * back, y: y - 2 }
        if (this.get(drop.x, drop.y) !== 'air') continue
        this.set(spot.x, spot.y, 'air')
        this.set(drop.x, drop.y, 'water')
        return true
      }
    }
    return false
  }

  /** Cells of water connected to `start`, counting up to `limit` + 1. */
  private poolSize(start: Point, limit: number): number {
    const seen = new Set<number>()
    const queue = [start]
    while (queue.length > 0 && seen.size <= limit) {
      const p = queue.pop()!
      const key = p.y * 65536 + p.x
      if (seen.has(key) || this.get(p.x, p.y) !== 'water') continue
      seen.add(key)
      queue.push({ x: p.x + 1, y: p.y }, { x: p.x - 1, y: p.y }, { x: p.x, y: p.y + 1 }, { x: p.x, y: p.y - 1 })
    }
    return seen.size
  }

  /** Can work on this cell from where it stands (arm's reach). */
  reaches(p: Point): boolean {
    return Math.abs(p.x - this.x) <= 1 && p.y >= this.y - HEIGHT && p.y <= this.y + 1
  }

  /** Walks one step towards `p`, counting how long it's been stuck (Mind.stuck). */
  walkTo(p: Point): 'arrived' | 'moving' | 'stuck' {
    this.goal = p
    const result = this.walkStep(p)
    this.goal = null
    this.mind.stuck = result === 'stuck' ? this.mind.stuck + 1 : 0
    return result
  }

  private walkStep(p: Point): 'arrived' | 'moving' | 'stuck' {
    if (this.reaches(p)) return 'arrived'
    const ladder = this.ladderRoute(p)
    if (ladder) return ladder
    const dir = Math.sign(p.x - this.x)
    if (dir === 0) {
      // Straight above or below, out of reach: climb up if there's a wall alongside, otherwise stuck.
      const solid = (id: string | null) => isGround(id) && !this.kind.platform.has(id)
      const wall = solid(this.get(this.x - 1, this.y)) || solid(this.get(this.x + 1, this.y))
      if (p.y < this.y && wall && this.kind.climbs && this.move(0, -1)) {
        this.mind.climb = CLIMB_GRIP
        return 'moving'
      }
      // Up on a roof or floor with the goal below: walk off the edge.
      if (p.y > this.y + 1 && this.kind.platform.has(this.get(this.x, this.y + 1))) {
        return this.step(this.mind.dir) || this.step((this.mind.dir = this.mind.dir === 1 ? -1 : 1)) ? 'moving' : 'stuck'
      }
      return 'stuck'
    }
    return this.step(dir) ? 'moving' : 'stuck'
  }

  /**
   * Going to another floor of its house: walk to the ladder, then climb up or down it.
   * Null when the ladder doesn't help (same floor, off the ladder's ends, no ladder).
   */
  private ladderRoute(p: Point): 'moving' | 'stuck' | null {
    const up = p.y < this.y - 1
    const down = p.y > this.y + 1
    const house = this.mind.home
    if ((!up && !down) || !house || house.stage < 2) return null
    if (!contains(house, p.x, p.y, 0) && !contains(house, this.x, this.y, 0)) return null
    const lx = ladderX(house)
    if (this.x !== lx) return this.step(Math.sign(lx - this.x)) ? 'moving' : 'stuck'
    if (up && (this.move(0, -1) || this.passVertically(-1))) {
      this.mind.climb = CLIMB_GRIP
      return 'moving'
    }
    if (down && (this.move(0, 1) || this.passVertically(1))) return 'moving'
    return null
  }
}
