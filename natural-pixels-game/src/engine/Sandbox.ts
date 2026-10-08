import { ELEMENTS, EMPTY } from '../elements/registry.ts'
import { paintStroke } from './brush.ts'
import { Grid } from './grid.ts'
import { Canvas2DRenderer } from './renderer/canvas2d.ts'
import { Simulation } from './simulation.ts'

const TICKS_PER_SECOND = 60
const STEP_MS = 1000 / TICKS_PER_SECOND
/** Cap on ticks per frame so a slow frame can't snowball into a freeze. */
const MAX_STEPS_PER_FRAME = 8
const STATS_INTERVAL_MS = 250

export interface SandboxSettings {
  /** Element index painted by the primary button (EMPTY = eraser). */
  tool: number
  brushRadius: number
  paused: boolean
  /** Simulation speed multiplier (1 = 60 ticks/s). */
  speed: number
}

export interface SandboxStats {
  fps: number
  particles: number
  /** Element and temperature under the cursor (null when off the canvas). */
  hover: { name: string; temp: number } | null
}

/**
 * Facade the UI talks to: owns the grid, simulation, renderer and the frame loop.
 * React only pushes settings and pointer events in; it never runs per frame.
 */
export class Sandbox {
  readonly grid: Grid
  onStats?: (stats: SandboxStats) => void

  private readonly sim: Simulation
  private readonly renderer: Canvas2DRenderer
  private settings: SandboxSettings = { tool: EMPTY, brushRadius: 3, paused: false, speed: 1 }
  private pointer = { down: false, erase: false, inside: false, x: 0, y: 0, lastX: 0, lastY: 0 }

  private frameId = 0
  private lastTime = 0
  private accumulator = 0
  private statsFrames = 0
  private statsTime = 0

  constructor(canvas: HTMLCanvasElement, width: number, height: number) {
    this.grid = new Grid(width, height)
    this.sim = new Simulation(this.grid)
    this.renderer = new Canvas2DRenderer(canvas, this.grid)
  }

  configure(settings: Partial<SandboxSettings>) {
    this.settings = { ...this.settings, ...settings }
  }

  start() {
    this.lastTime = this.statsTime = performance.now()
    this.frameId = requestAnimationFrame(this.frame)
  }

  destroy() {
    cancelAnimationFrame(this.frameId)
  }

  /** Advances exactly one tick (used by the Step button while paused). */
  step() {
    this.sim.step()
    this.renderer.render()
  }

  clear() {
    this.grid.clear()
    this.renderer.render()
  }

  /** Pointer coordinates are in grid cells. `erase` paints air regardless of the tool. */
  pointerDown(x: number, y: number, erase = false) {
    this.pointer = { down: true, erase, inside: true, x, y, lastX: x, lastY: y }
  }

  pointerMove(x: number, y: number) {
    this.pointer.x = x
    this.pointer.y = y
    this.pointer.inside = true
  }

  pointerLeave() {
    this.pointer.inside = false
  }

  pointerUp() {
    this.pointer.down = false
  }

  private frame = (now: number) => {
    const elapsed = Math.min(now - this.lastTime, 100)
    this.lastTime = now

    if (this.pointer.down) this.paint()

    if (!this.settings.paused) {
      this.accumulator += elapsed * this.settings.speed
      let steps = 0
      while (this.accumulator >= STEP_MS && steps < MAX_STEPS_PER_FRAME) {
        this.sim.step()
        this.accumulator -= STEP_MS
        steps++
      }
      if (steps === MAX_STEPS_PER_FRAME) this.accumulator = 0
    }

    this.renderer.render()
    this.reportStats(now)
    this.frameId = requestAnimationFrame(this.frame)
  }

  /** Called every frame while held, so holding still keeps pouring. */
  private paint() {
    const p = this.pointer
    const type = p.erase ? EMPTY : this.settings.tool
    paintStroke(this.grid, p.lastX, p.lastY, p.x, p.y, this.settings.brushRadius, type, this.sim.random)
    p.lastX = p.x
    p.lastY = p.y
  }

  private reportStats(now: number) {
    this.statsFrames++
    const elapsed = now - this.statsTime
    if (elapsed < STATS_INTERVAL_MS) return
    this.onStats?.({
      fps: Math.round((this.statsFrames * 1000) / elapsed),
      particles: this.grid.countParticles(),
      hover: this.probe(),
    })
    this.statsFrames = 0
    this.statsTime = now
  }

  private probe(): SandboxStats['hover'] {
    const { pointer, grid } = this
    const x = Math.floor(pointer.x)
    const y = Math.floor(pointer.y)
    if (!pointer.inside || !grid.inBounds(x, y)) return null
    const i = y * grid.width + x
    return { name: ELEMENTS[grid.type[i]].name, temp: grid.temp[i] }
  }
}
