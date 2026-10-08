import type { CellContext, CellInit } from '../../../engine/context.ts'
import { BOAT_COST } from './craft.ts'
import type { Mind, Point } from './mind.ts'

/** A human is a column of cells: feet (the 'human' cell that thinks), torso, head. */
export const HEIGHT = 3
const PARTS = ['human', 'human_body', 'human_head'] as const

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
])

export function isPassable(id: string | null): boolean {
  return PASSABLE.has(id)
}

/** Something to stand on (anything solid-ish that isn't fire). */
export function isGround(id: string | null): boolean {
  return id !== null && !PASSABLE.has(id) && id !== 'fire' && !PARTS.includes(id as (typeof PARTS)[number])
}

/** Dug by hand. */
const SOFT: ReadonlySet<string | null> = new Set(['soil', 'sand', 'mud', 'ash', 'snow'])
/** Dug with a pickaxe (stone goes into the inventory). */
const HARD: ReadonlySet<string | null> = new Set(['stone', 'ice'])
const SOFT_ACTIONS = 2
const HARD_ACTIONS = 16

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
  /** How far the feet have moved this tick, relative to the context origin. */
  private ox = 0
  private oy = 0

  constructor(ctx: CellContext, mind: Mind) {
    this.ctx = ctx
    this.mind = mind
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

  /** What's at (x, y), looking through its own body to the cell it hides (water it swims in). */
  private behind(x: number, y: number) {
    const id = this.get(x, y)
    return PARTS.includes(id as (typeof PARTS)[number]) ? this.ctx.under(x - this.ctx.x, y - this.ctx.y) : id
  }

  /** Whether the body part `k` cells above the feet is in water. */
  wet(k: number): boolean {
    return this.behind(this.x, this.y - k) === 'water'
  }

  /** Standing on its boat. */
  riding(): boolean {
    return this.get(this.x, this.y + 1) === 'boat'
  }

  // ---------- Body parts ----------

  /** How many parts stand on the feet (0 = just feet, 2 = torso and head). */
  partCount(): number {
    if (this.get(this.x, this.y - 1) !== 'human_body') return 0
    return this.get(this.x, this.y - 2) === 'human_head' ? 2 : 1
  }

  /** Grows back a missing torso/head when there's room (right after being placed). */
  ensureParts() {
    const { x, y } = this
    if (this.get(x, y - 1) !== 'human_body') {
      if (isPassable(this.get(x, y - 1))) this.set(x, y - 1, 'human_body')
      return
    }
    if (this.get(x, y - 2) !== 'human_head' && isPassable(this.get(x, y - 2))) this.set(x, y - 2, 'human_head')
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
      if (!isPassable(this.get(tx, ty))) return false
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
    if (this.riding() && this.row(dir)) return true
    if (!this.mind.afloat && this.launch(dir)) return true
    if (this.mind.afloat === 'swim' && this.board()) return true
    if (this.move(dir, 0)) return true
    if (isPassable(this.get(this.x, this.y - HEIGHT)) && this.move(dir, -1)) return true
    // A wall: climb it (Minecraft-style ladders, without the ladder).
    if (isGround(this.get(this.x + dir, this.y)) || isGround(this.get(this.x + dir, this.y - 1))) {
      if (this.move(0, -1)) {
        this.mind.climb = CLIMB_GRIP
        return true
      }
    }
    return false
  }

  /** Rows one cell along the water's surface, boat and all. False at the shore (it steps off). */
  private row(dir: number): boolean {
    if (this.get(this.x + dir, this.y + 1) !== 'water' || !this.move(dir, 0)) return false
    // The boat stayed behind under where the feet were: bring it along.
    this.ctx.moveCell(this.ox - dir, this.oy + 1, this.ox, this.oy + 1)
    return true
  }

  /** Spends planks on a boat if it doesn't have one yet. False if it can't afford it. */
  private haveBoat(): boolean {
    const { tools, inv } = this.mind
    if (tools.boat) return true
    if (inv.plank < BOAT_COST.plank) return false
    inv.plank -= BOAT_COST.plank
    tools.boat = true
    return true
  }

  /**
   * At the shore with water ahead (level with its feet, or lower down the bank): puts its
   * boat on the surface and steps over it, dropping in if the water is lower. Without a
   * boat (or the planks for one) it just wades in and swims.
   */
  private launch(dir: number): boolean {
    const x = this.x + dir
    let surface: number | null = null
    for (let y = this.y; y <= this.y + LAUNCH_DROP; y++) {
      const id = this.get(x, y)
      if (id === 'water') {
        if (this.get(x, y - 1) !== 'water') surface = y
        break
      }
      if (y > this.y && !isPassable(id)) break
    }
    if (surface === null) return false
    const dy = surface === this.y ? -1 : 0
    if (!this.canMove(dir, dy) || !this.haveBoat()) return false
    this.set(x, surface, 'boat')
    this.move(dir, dy)
    return true
  }

  /** Swimming with its head out: climbs into its boat right here, on the surface. */
  private board(): boolean {
    if (!this.wet(1) || this.wet(2) || !this.canMove(0, -2) || !this.haveBoat()) return false
    this.move(0, -2)
    // The torso was at the surface: that water cell becomes the boat.
    this.set(this.x, this.y + 1, 'boat')
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

  /** Can work on this cell from where it stands (arm's reach). */
  reaches(p: Point): boolean {
    return Math.abs(p.x - this.x) <= 1 && p.y >= this.y - HEIGHT && p.y <= this.y + 1
  }

  /** Walks one step towards `p`, counting how long it's been stuck (Mind.stuck). */
  walkTo(p: Point): 'arrived' | 'moving' | 'stuck' {
    const result = this.walkStep(p)
    this.mind.stuck = result === 'stuck' ? this.mind.stuck + 1 : 0
    return result
  }

  private walkStep(p: Point): 'arrived' | 'moving' | 'stuck' {
    if (this.reaches(p)) return 'arrived'
    const dir = Math.sign(p.x - this.x)
    if (dir === 0) {
      // Straight above or below, out of reach: climb up if there's a wall alongside, otherwise stuck.
      const wall = isGround(this.get(this.x - 1, this.y)) || isGround(this.get(this.x + 1, this.y))
      if (p.y < this.y && wall && this.move(0, -1)) {
        this.mind.climb = CLIMB_GRIP
        return 'moving'
      }
      return 'stuck'
    }
    return this.step(dir) ? 'moving' : 'stuck'
  }
}
