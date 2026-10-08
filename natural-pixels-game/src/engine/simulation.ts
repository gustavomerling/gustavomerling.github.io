import { ELEMENTS, EMPTY, elementIndex } from '../elements/registry.ts'
import type { ElementDefinition, Matter } from '../elements/types.ts'
import { BEHAVIORS, type Behavior } from './behaviors/index.ts'
import { AMBIENT_TEMP } from './constants.ts'
import { SimulationContext } from './context.ts'
import type { Grid } from './grid.ts'
import { updateMoisture } from './moisture.ts'
import { createRandom } from './random.ts'
import { updateThermal } from './thermal.ts'

const FLUID_MATTER: ReadonlySet<Matter> = new Set(['empty', 'liquid', 'gas'])

/** Numeric id per moisture group name; 0 = no moisture. */
const MOISTURE_GROUPS = new Map<string, number>()
function moistureGroupOf(el: ElementDefinition): number {
  const group = el.moisture?.group
  if (!group) return 0
  if (!MOISTURE_GROUPS.has(group)) MOISTURE_GROUPS.set(group, MOISTURE_GROUPS.size + 1)
  return MOISTURE_GROUPS.get(group)!
}

/** Registry index for an optional id (missing = air). */
function indexOf(id: string | undefined): number {
  return id ? elementIndex(id) : EMPTY
}

/**
 * Advances the world one tick at a time. Element properties are flattened into
 * typed lookup tables up front so the hot loop never touches the definitions.
 */
export class Simulation {
  readonly grid: Grid
  readonly random = createRandom()
  tick = 0

  /** Per-element lookup tables, indexed by registry index. */
  readonly density = Float32Array.from(ELEMENTS, (el) => el.density)
  readonly fluid = Uint8Array.from(ELEMENTS, (el) => (FLUID_MATTER.has(el.matter) ? 1 : 0))
  readonly slide = Float32Array.from(ELEMENTS, (el) => el.movement?.slide ?? 1)
  readonly spread = Uint8Array.from(ELEMENTS, (el) => el.movement?.spread ?? 4)
  readonly sink = Float32Array.from(ELEMENTS, (el) => el.movement?.sink ?? 1)
  readonly rise = Float32Array.from(ELEMENTS, (el) => el.movement?.rise ?? 1)
  readonly drift = Float32Array.from(ELEMENTS, (el) => el.movement?.drift ?? 0.3)
  readonly capacity = Uint8Array.from(ELEMENTS, (el) => el.moisture?.capacity ?? 0)
  readonly moistureGroup = Uint8Array.from(ELEMENTS, moistureGroupOf)
  readonly moistureFlow = Float32Array.from(ELEMENTS, (el) => el.moisture?.flow ?? 0.5)
  readonly risesUp = Uint8Array.from(ELEMENTS, (el) => (el.moisture?.bias === 'up' ? 1 : 0))
  readonly absorbs = Uint8Array.from(ELEMENTS, (el) => indexOf(el.moisture?.absorbs))
  readonly conductivity = Float32Array.from(ELEMENTS, (el) => el.thermal?.conductivity ?? 0.1)
  readonly initialTemp = Float32Array.from(ELEMENTS, (el) => el.thermal?.initialTemp ?? AMBIENT_TEMP)
  readonly heatSource = Float32Array.from(ELEMENTS, (el) => el.thermal?.source ?? 0)
  readonly aboveTemp = Float32Array.from(ELEMENTS, (el) => el.thermal?.above?.temp ?? Infinity)
  readonly aboveInto = Uint8Array.from(ELEMENTS, (el) => indexOf(el.thermal?.above?.into))
  readonly aboveChance = Float32Array.from(ELEMENTS, (el) => el.thermal?.above?.chance ?? 1)
  readonly belowTemp = Float32Array.from(ELEMENTS, (el) => el.thermal?.below?.temp ?? -Infinity)
  readonly belowInto = Uint8Array.from(ELEMENTS, (el) => indexOf(el.thermal?.below?.into))
  readonly belowChance = Float32Array.from(ELEMENTS, (el) => el.thermal?.below?.chance ?? 1)
  readonly burnAt = Float32Array.from(ELEMENTS, (el) => el.thermal?.burn?.at ?? 0)
  readonly burnTemp = Float32Array.from(ELEMENTS, (el) => el.thermal?.burn?.temp ?? 600)
  readonly burnRate = Float32Array.from(ELEMENTS, (el) => el.thermal?.burn?.rate ?? 0)
  readonly burnInto = Uint8Array.from(ELEMENTS, (el) => indexOf(el.thermal?.burn?.into))
  readonly lifeMin = Uint16Array.from(ELEMENTS, (el) => el.lifetime?.min ?? 0)
  readonly lifeMax = Uint16Array.from(ELEMENTS, (el) => el.lifetime?.max ?? 0)
  readonly lifeInto = Uint8Array.from(ELEMENTS, (el) => indexOf(el.lifetime?.into))
  private readonly behaviors: (Behavior | undefined)[] = ELEMENTS.map((el) => BEHAVIORS[el.matter])
  private readonly updates = ELEMENTS.map((el) => el.update)
  private readonly ctx = new SimulationContext(this)

  constructor(grid: Grid) {
    this.grid = grid
  }

  step() {
    const { width, height, type, stamp } = this.grid
    const tick = ++this.tick
    // Alternate horizontal scan direction every tick so nothing drifts to one side.
    const leftToRight = (tick & 1) === 0

    // Bottom-up: falling cells move into rows that were already processed.
    for (let y = height - 1; y >= 0; y--) {
      const row = y * width
      for (let n = 0; n < width; n++) {
        const x = leftToRight ? n : width - 1 - n
        const i = row + x
        const t = type[i]
        if (t === EMPTY || stamp[i] === tick) continue

        if (this.lifeMax[t] > 0 && this.age(i, t)) continue
        if (this.capacity[t] > 0) updateMoisture(this, x, y, i, t)

        const update = this.updates[t]
        if (update) {
          this.ctx.bind(x, y)
          if (update(this.ctx) === true || type[i] !== t) continue
        }

        this.behaviors[t]?.(this, x, y, i, t)
      }
    }

    updateThermal(this)
  }

  /**
   * Counts down `lifetime` elements. A fresh cell (life 0) draws its lifetime first.
   * Returns true when the cell expired and was transformed.
   */
  private age(i: number, t: number): boolean {
    const { life } = this.grid
    const left = life[i]
    if (left === 0) {
      const min = this.lifeMin[t]
      life[i] = min + Math.floor(this.random() * (this.lifeMax[t] - min + 1)) + 1
      return false
    }
    if (left > 1) {
      life[i] = left - 1
      return false
    }
    this.transform(i, this.lifeInto[t])
    return true
  }

  /** Turns cell `i` into element `into`, keeping its temperature (air resets to ambient). */
  transform(i: number, into: number) {
    const { grid } = this
    grid.place(i, into, 0, 0, into === EMPTY ? AMBIENT_TEMP : grid.temp[i])
    grid.stamp[i] = this.tick
  }

  /**
   * Whether element `t` may move into cell `to`. Air and fluids can be displaced:
   * moving down needs a lighter target, moving up needs a heavier one.
   */
  canEnter(t: number, to: number, dy: number): boolean {
    const target = this.grid.type[to]
    if (target === EMPTY) return true
    if (!this.fluid[target] || target === t) return false
    return dy < 0 ? this.density[target] > this.density[t] : this.density[target] < this.density[t]
  }

  /** Tries to move the cell at `from` to `(tx, ty)`. Returns true if it moved. */
  tryMove(from: number, t: number, tx: number, ty: number, dy: number): boolean {
    const { grid } = this
    if (!grid.inBounds(tx, ty)) return false
    const to = ty * grid.width + tx
    if (!this.canEnter(t, to, dy)) return false
    // Pushing through another fluid is slower than falling through air.
    if (grid.type[to] !== EMPTY && this.random() >= this.sink[t]) return false
    this.swap(from, to)
    return true
  }

  /** Moves `from` over `to`, keeping `to` hidden underneath (see `Grid.moveOver`). */
  moveOver(from: number, to: number) {
    this.grid.moveOver(from, to)
    this.grid.stamp[from] = this.grid.stamp[to] = this.tick
  }

  /** Swaps two cells with all their state (a wet soil grain stays wet as it falls). */
  swap(a: number, b: number) {
    const { type, temp, water, data, life, shade, stamp } = this.grid
    swapIn(type, a, b)
    swapIn(temp, a, b)
    swapIn(water, a, b)
    swapIn(data, a, b)
    swapIn(life, a, b)
    swapIn(shade, a, b)
    stamp[a] = stamp[b] = this.tick
  }
}

function swapIn(array: Uint8Array | Uint16Array | Float32Array, a: number, b: number) {
  const v = array[a]
  array[a] = array[b]
  array[b] = v
}
