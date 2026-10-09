import { WOOD_TREE } from '../elements/plants/wood.ts'
import { ELEMENTS, EMPTY, elementIndex } from '../elements/registry.ts'
import type { Simulation } from './simulation.ts'

/*
 * Trees hold together like one piece. A trunk or branch that no longer touches anything firm
 * (ground, stone, a building...), not even diagonally through the rest of its wood, comes down
 * as a whole, with the leaves and fruit hanging from it, one cell per tick, until it lands on
 * something that holds it.
 *
 * Leaves hold on through the wood or through other leaves that do (8 directions): a leaf with
 * no such chain back to any wood dries up and drops as a dry leaf.
 */

const WOOD = elementIndex('wood')
const LEAF = elementIndex('leaf')
const FRUIT = elementIndex('fruit')
const LITTER = elementIndex('litter')

/** Ticks between looks for loose trees (falling ones move every tick). */
const SCAN_EVERY = 10
/** Leaves and fruit dragged down with one tree, at most. */
const MAX_CROWN = 1500
/** Ticks between looks for leaves that lost their tree. */
const LEAF_SCAN_EVERY = 30
/** Share of loose leaves that drop at each look (so they fall over a few seconds, not at once). */
const LEAF_DROP = 0.4

/** Firm enough to hold a tree up: ground, rock, ice, buildings. Not plants, animals, fluids or fire. */
const HOLDS = Uint8Array.from(ELEMENTS, (el) => {
  if (el.category === 'terrain' || el.category === 'materials') return 1
  if (el.category === 'water' || el.category === 'chemistry') return el.matter === 'static' || el.matter === 'powder' ? 1 : 0
  return 0
})

/** A falling tree goes through these (gases and liquids give way). */
const GIVES_WAY = Uint8Array.from(ELEMENTS, (el, i) =>
  el.matter === 'empty' || el.matter === 'gas' || (el.matter === 'liquid' && !HOLDS[i]) ? 1 : 0,
)

/** Low plants and loose bits a falling trunk crushes on its way down. */
const CRUSHED = Uint8Array.from(ELEMENTS, (el) =>
  ['grass', 'flower', 'litter', 'seed', 'mushroom', 'firefly', 'wheat', 'wheat_ripe', 'plant'].includes(el.id) ? 1 : 0,
)

const NEIGHBOURS = [
  [-1, -1],
  [0, -1],
  [1, -1],
  [-1, 0],
  [1, 0],
  [-1, 1],
  [0, 1],
  [1, 1],
] as const

/** One loose tree: its wood cells and the leaves/fruit hanging from it. */
interface Fall {
  wood: number[]
  crown: number[]
}

export class TreeFall {
  private falling: Fall[] = []
  /** Detection pass each cell was last seen in (no allocation per scan). */
  private seen = new Uint32Array(0)
  private pass = 0

  step(sim: Simulation) {
    if (sim.tick % SCAN_EVERY === 0) this.scan(sim)
    if (sim.tick % LEAF_SCAN_EVERY === 5) this.looseLeaves(sim)
    this.falling = this.falling.filter((fall) => this.drop(sim, fall))
  }

  /** Tree wood at cell `i`, even if someone is passing through it right now. */
  private isTreeWood(sim: Simulation, i: number): boolean {
    const { type, data, under } = sim.grid
    if (type[i] === WOOD) return (data[i] & WOOD_TREE) !== 0
    return under.type[i] === WOOD && (under.data[i] & WOOD_TREE) !== 0
  }

  /** Something next to cell `i` (in 8 directions) holds the tree up. */
  private held(sim: Simulation, i: number): boolean {
    const { width, height, type, data } = sim.grid
    const x = i % width
    const y = (i - x) / width
    for (const [dx, dy] of NEIGHBOURS) {
      const nx = x + dx
      const ny = y + dy
      // The edges of the world count as firm.
      if (nx < 0 || ny < 0 || nx >= width || ny >= height) return true
      const n = ny * width + nx
      const t = type[n]
      if (HOLDS[t]) return true
      // Painted (dead) wood is a solid beam.
      if (t === WOOD && !(data[n] & WOOD_TREE)) return true
    }
    return false
  }

  /** Leaf or fruit at cell `i` (or hidden under a bird passing through the crown). */
  private isFoliage(sim: Simulation, i: number): boolean {
    const { type, under } = sim.grid
    return type[i] === LEAF || type[i] === FRUIT || under.type[i] === LEAF || under.type[i] === FRUIT
  }

  /** Drops leaves that no chain of leaves connects to any wood. */
  private looseLeaves(sim: Simulation) {
    const { grid } = sim
    const { size, width, height, type, under } = grid
    if (this.seen.length !== size) {
      this.seen = new Uint32Array(size)
      this.pass = 0
    }
    const pass = ++this.pass
    const stack: number[] = []
    let leaves = 0
    for (let i = 0; i < size; i++) {
      if (type[i] === LEAF) leaves++
      if (type[i] === WOOD || under.type[i] === WOOD) {
        this.seen[i] = pass
        stack.push(i)
      }
    }
    if (leaves === 0) return
    while (stack.length > 0) {
      const i = stack.pop()!
      const x = i % width
      const y = (i - x) / width
      for (const [dx, dy] of NEIGHBOURS) {
        const nx = x + dx
        const ny = y + dy
        if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue
        const n = ny * width + nx
        if (this.seen[n] === pass || !this.isFoliage(sim, n)) continue
        this.seen[n] = pass
        stack.push(n)
      }
    }
    for (let i = 0; i < size; i++) {
      if (type[i] === LEAF && this.seen[i] !== pass && sim.random() < LEAF_DROP) grid.place(i, LITTER, 0, 0, grid.temp[i])
    }
  }

  /** Finds trees (connected tree wood, 8 directions) that nothing holds up and starts them falling. */
  private scan(sim: Simulation) {
    const { grid } = sim
    const { size } = grid
    if (this.seen.length !== size) {
      this.seen = new Uint32Array(size)
      this.pass = 0
    }
    const pass = ++this.pass
    // Cells already falling aren't looked at again.
    for (const fall of this.falling) for (const i of fall.wood) this.seen[i] = pass
    for (let i = 0; i < size; i++) {
      if (this.seen[i] === pass || !this.isTreeWood(sim, i)) continue
      const wood = this.flood(sim, i, pass)
      if (wood) this.falling.push({ wood, crown: this.crownOf(sim, wood, pass) })
    }
  }

  /** Collects the piece of wood around `start`; null if something holds it up. */
  private flood(sim: Simulation, start: number, pass: number): number[] | null {
    const { width, height } = sim.grid
    const wood: number[] = []
    const stack = [start]
    this.seen[start] = pass
    let held = false
    while (stack.length > 0) {
      const i = stack.pop()!
      wood.push(i)
      if (!held && this.held(sim, i)) held = true
      const x = i % width
      const y = (i - x) / width
      for (const [dx, dy] of NEIGHBOURS) {
        const nx = x + dx
        const ny = y + dy
        if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue
        const n = ny * width + nx
        if (this.seen[n] === pass || !this.isTreeWood(sim, n)) continue
        this.seen[n] = pass
        stack.push(n)
      }
    }
    return held ? null : wood
  }

  /** Leaves and fruit hanging from this wood (not the ones that belong to another tree). */
  private crownOf(sim: Simulation, wood: number[], pass: number): number[] {
    const { width, height, type } = sim.grid
    const crown: number[] = []
    const stack = [...wood]
    const ours = new Set(wood)
    while (stack.length > 0 && crown.length < MAX_CROWN) {
      const i = stack.pop()!
      const x = i % width
      const y = (i - x) / width
      for (const [dx, dy] of NEIGHBOURS) {
        const nx = x + dx
        const ny = y + dy
        if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue
        const n = ny * width + nx
        if (this.seen[n] === pass || (type[n] !== LEAF && type[n] !== FRUIT)) continue
        this.seen[n] = pass
        if (this.nearOtherWood(sim, n, ours)) continue
        crown.push(n)
        stack.push(n)
      }
    }
    return crown
  }

  /** Leaf touching wood of a tree that isn't this one. */
  private nearOtherWood(sim: Simulation, i: number, ours: Set<number>): boolean {
    const { width, height } = sim.grid
    const x = i % width
    const y = (i - x) / width
    for (const [dx, dy] of NEIGHBOURS) {
      const nx = x + dx
      const ny = y + dy
      if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue
      const n = ny * width + nx
      if (!ours.has(n) && this.isTreeWood(sim, n)) return true
    }
    return false
  }

  /** Moves a falling tree down one cell. False once it has landed (or fallen apart). */
  private drop(sim: Simulation, fall: Fall): boolean {
    const { grid } = sim
    const { width, size, type, under } = grid
    // Burnt, chopped or eaten meanwhile: forget about it (the next scan finds what's left).
    if (fall.wood.some((i) => type[i] !== WOOD)) return false
    fall.crown = fall.crown.filter((i) => type[i] === LEAF || type[i] === FRUIT)
    // Something passing through it (a bird in the leaves, a human in the trunk): wait.
    if (fall.wood.some((i) => under.type[i] !== EMPTY) || fall.crown.some((i) => under.type[i] !== EMPTY)) return true
    if (fall.wood.some((i) => this.held(sim, i))) return false

    const all = new Set([...fall.wood, ...fall.crown])
    const free = (i: number) => {
      const below = i + width
      if (below >= size) return false
      if (all.has(below)) return true
      const t = type[below]
      return (GIVES_WAY[t] === 1 || CRUSHED[t] === 1) && under.type[below] === EMPTY
    }
    if (!fall.wood.every(free)) return false
    // Leaves that catch on something stay behind as dry leaves.
    fall.crown = fall.crown.filter((i) => {
      if (free(i)) return true
      grid.place(i, LITTER, 0, 0, grid.temp[i])
      all.delete(i)
      return false
    })

    // Bottom-up, so every cell moves into space that's already been cleared.
    const cells = [...fall.wood, ...fall.crown].sort((a, b) => b - a)
    for (const i of cells) {
      const below = i + width
      if (!all.has(below) && CRUSHED[type[below]]) grid.place(below, EMPTY)
      sim.swap(i, below)
    }
    fall.wood = fall.wood.map((i) => i + width)
    fall.crown = fall.crown.map((i) => i + width)
    return true
  }
}
