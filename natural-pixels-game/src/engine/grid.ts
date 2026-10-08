import { AMBIENT_TEMP } from './constants.ts'

/** What's hidden underneath a cell that something passed over (see `Grid.moveOver`). */
export interface UnderLayer {
  readonly type: Uint8Array
  readonly temp: Float32Array
  readonly water: Uint8Array
  readonly data: Uint8Array
  readonly life: Uint16Array
  readonly shade: Uint8Array
}

/**
 * World state as Structure-of-Arrays. Cell `(x, y)` lives at index `y * width + x`.
 * New per-cell attributes (temperature, moisture, lifetime...) get their own array here.
 */
export class Grid {
  readonly width: number
  readonly height: number
  readonly size: number
  /** Registry index of the element in each cell (0 = air). */
  readonly type: Uint8Array
  /** Temperature in °C. */
  readonly temp: Float32Array
  /** Moisture units held by the cell (soil, plants). */
  readonly water: Uint8Array
  /** Free per-element state (growth stage, flags...). Meaning is up to each element. */
  readonly data: Uint8Array
  /** Free per-element countdown in ticks (activity timers, lifetimes). */
  readonly life: Uint16Array
  /** Fixed per-cell color variation, so materials look organic instead of flat. */
  readonly shade: Uint8Array
  /** Tick in which the cell last moved; stops a cell from moving twice in one tick. */
  readonly stamp: Uint32Array
  /** Cells covered by something passing over them (a bird inside a tree crown). */
  readonly under: UnderLayer

  constructor(width: number, height: number) {
    this.width = width
    this.height = height
    this.size = width * height
    this.type = new Uint8Array(this.size)
    this.temp = new Float32Array(this.size).fill(AMBIENT_TEMP)
    this.water = new Uint8Array(this.size)
    this.data = new Uint8Array(this.size)
    this.life = new Uint16Array(this.size)
    this.shade = new Uint8Array(this.size)
    this.stamp = new Uint32Array(this.size)
    this.under = {
      type: new Uint8Array(this.size),
      temp: new Float32Array(this.size),
      water: new Uint8Array(this.size),
      data: new Uint8Array(this.size),
      life: new Uint16Array(this.size),
      shade: new Uint8Array(this.size),
    }
  }

  inBounds(x: number, y: number): boolean {
    return x >= 0 && x < this.width && y >= 0 && y < this.height
  }

  clear() {
    this.type.fill(0)
    this.temp.fill(AMBIENT_TEMP)
    this.water.fill(0)
    this.data.fill(0)
    this.life.fill(0)
    this.stamp.fill(0)
    this.under.type.fill(0)
  }

  /** Puts `type` in a cell with fresh state (whatever was hidden underneath is gone too). */
  place(i: number, type: number, water = 0, data = 0, temp = AMBIENT_TEMP) {
    this.type[i] = type
    this.temp[i] = temp
    this.water[i] = water
    this.data[i] = data
    this.life[i] = 0
    this.under.type[i] = 0
  }

  /**
   * Moves the cell at `from` over `to` without disturbing it: what was at `to` is kept
   * underneath the mover, and `from` gets back whatever the mover was covering.
   */
  moveOver(from: number, to: number) {
    const { under } = this
    // Keep the target safe underneath (air too: it's what comes back when we leave).
    const t = this.type[to]
    const h = this.temp[to]
    const w = this.water[to]
    const d = this.data[to]
    const l = this.life[to]
    const s = this.shade[to]

    this.type[to] = this.type[from]
    this.temp[to] = this.temp[from]
    this.water[to] = this.water[from]
    this.data[to] = this.data[from]
    this.life[to] = this.life[from]
    this.shade[to] = this.shade[from]

    this.type[from] = under.type[from]
    this.temp[from] = under.type[from] === 0 ? AMBIENT_TEMP : under.temp[from]
    this.water[from] = under.water[from]
    this.data[from] = under.data[from]
    this.life[from] = under.life[from]
    this.shade[from] = under.shade[from]
    under.type[from] = 0

    under.type[to] = t
    under.temp[to] = h
    under.water[to] = w
    under.data[to] = d
    under.life[to] = l
    under.shade[to] = s
  }

  countParticles(): number {
    let count = 0
    for (let i = 0; i < this.size; i++) if (this.type[i] !== 0) count++
    return count
  }
}
