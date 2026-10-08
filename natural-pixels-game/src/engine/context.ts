import { ELEMENTS, EMPTY, elementIndex } from '../elements/registry.ts'
import { AMBIENT_TEMP } from './constants.ts'
import type { Simulation } from './simulation.ts'

export interface CellInit {
  water?: number
  data?: number
  /** °C; defaults to the element's initial temperature. */
  temp?: number
}

/**
 * The API element `update` hooks get. Everything is relative to the current cell:
 * `(0, 0)` is the cell itself, `(0, 1)` the one below, `(-1, -1)` up-left.
 * Elements never touch the grid arrays directly.
 */
export interface CellContext {
  readonly x: number
  readonly y: number
  random(): number
  /** Element id at the offset, or `null` outside the world. */
  get(dx: number, dy: number): string | null
  /** Replaces the cell at the offset (fresh water/data unless given). */
  set(dx: number, dy: number, id: string, init?: CellInit): void
  /** Swaps the current cell with the one at the offset, state included. */
  swap(dx: number, dy: number): void
  /**
   * Moves the current cell over the one at the offset without disturbing it: the target
   * is kept underneath and comes back when the mover leaves (birds flying through leaves).
   */
  moveOver(dx: number, dy: number): void
  /** Id of what's hidden underneath the cell at the offset, or `null` if nothing is. */
  under(dx: number, dy: number): string | null
  water(dx: number, dy: number): number
  setWater(dx: number, dy: number, value: number): void
  data(dx: number, dy: number): number
  setData(dx: number, dy: number, value: number): void
  /** Temperature in °C. */
  temp(dx: number, dy: number): number
  setTemp(dx: number, dy: number, value: number): void
  /** Per-cell countdown (0..65535), free for each element to use as a timer (not with `lifetime`). */
  life(dx: number, dy: number): number
  setLife(dx: number, dy: number, value: number): void
}

/** Single reusable context the simulation re-binds to each cell (no per-cell allocation). */
export class SimulationContext implements CellContext {
  x = 0
  y = 0
  private readonly sim: Simulation

  constructor(sim: Simulation) {
    this.sim = sim
  }

  bind(x: number, y: number) {
    this.x = x
    this.y = y
  }

  random(): number {
    return this.sim.random()
  }

  get(dx: number, dy: number): string | null {
    const i = this.index(dx, dy)
    return i < 0 ? null : ELEMENTS[this.sim.grid.type[i]].id
  }

  set(dx: number, dy: number, id: string, init: CellInit = {}) {
    const i = this.index(dx, dy)
    if (i < 0) return
    const { grid } = this.sim
    const t = elementIndex(id)
    grid.place(i, t, clampByte(init.water ?? 0), clampByte(init.data ?? 0), init.temp ?? this.sim.initialTemp[t])
    // New cells wait for the next tick, so growth can't chain within one tick.
    grid.stamp[i] = this.sim.tick
  }

  swap(dx: number, dy: number) {
    const j = this.index(dx, dy)
    if (j >= 0) this.sim.swap(this.index(0, 0), j)
  }

  moveOver(dx: number, dy: number) {
    const j = this.index(dx, dy)
    if (j >= 0) this.sim.moveOver(this.index(0, 0), j)
  }

  under(dx: number, dy: number): string | null {
    const i = this.index(dx, dy)
    const t = i < 0 ? 0 : this.sim.grid.under.type[i]
    return t === 0 ? null : ELEMENTS[t].id
  }

  water(dx: number, dy: number): number {
    const i = this.index(dx, dy)
    return i < 0 ? 0 : this.sim.grid.water[i]
  }

  setWater(dx: number, dy: number, value: number) {
    const i = this.index(dx, dy)
    if (i >= 0) this.sim.grid.water[i] = clampByte(value)
  }

  data(dx: number, dy: number): number {
    const i = this.index(dx, dy)
    return i < 0 ? 0 : this.sim.grid.data[i]
  }

  setData(dx: number, dy: number, value: number) {
    const i = this.index(dx, dy)
    if (i >= 0) this.sim.grid.data[i] = clampByte(value)
  }

  temp(dx: number, dy: number): number {
    const i = this.index(dx, dy)
    return i < 0 ? AMBIENT_TEMP : this.sim.grid.temp[i]
  }

  setTemp(dx: number, dy: number, value: number) {
    const i = this.index(dx, dy)
    if (i >= 0 && this.sim.grid.type[i] !== EMPTY) this.sim.grid.temp[i] = value
  }

  life(dx: number, dy: number): number {
    const i = this.index(dx, dy)
    return i < 0 ? 0 : this.sim.grid.life[i]
  }

  setLife(dx: number, dy: number, value: number) {
    const i = this.index(dx, dy)
    if (i >= 0) this.sim.grid.life[i] = Math.max(0, Math.min(0xffff, value | 0))
  }

  private index(dx: number, dy: number): number {
    const x = this.x + dx
    const y = this.y + dy
    const { grid } = this.sim
    return grid.inBounds(x, y) ? y * grid.width + x : -1
  }
}

function clampByte(value: number): number {
  return value < 0 ? 0 : value > 255 ? 255 : value | 0
}
