import { ELEMENTS, EMPTY } from '../elements/registry.ts'
import { paintStroke } from './brush.ts'
import { Grid } from './grid.ts'
import { createRenderer, type RenderMode, type Renderer } from './renderer/index.ts'
import { decodeScene, encodeScene } from './scene.ts'
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
  /** Day/night cycle on; off = endless day. */
  dayCycle: boolean
}

export interface SandboxStats {
  fps: number
  particles: number
  /** Element and temperature under the cursor (null when off the canvas). */
  hover: { name: string; temp: number } | null
  /** Time of day 0..1 (0 = midnight, 0.5 = noon). */
  timeOfDay: number
  /** Cell count per element index (for sounds and the like). */
  counts: Uint32Array
}

/**
 * Facade the UI talks to: owns the grid, simulation, renderer and the frame loop.
 * React only pushes settings and pointer events in; it never runs per frame.
 */
export class Sandbox {
  readonly grid: Grid
  readonly sim: Simulation
  onStats?: (stats: SandboxStats) => void

  private renderer: Renderer | null = null
  private settings: SandboxSettings = { tool: EMPTY, brushRadius: 3, paused: false, speed: 1, dayCycle: true }
  private pointer = { down: false, erase: false, inside: false, x: 0, y: 0, lastX: 0, lastY: 0 }
  private size = { width: 0, height: 0 }

  private frameId = 0
  private lastTime = 0
  private accumulator = 0
  private statsFrames = 0
  private statsTime = 0
  private readonly counts = new Uint32Array(ELEMENTS.length)

  constructor(width: number, height: number) {
    this.grid = new Grid(width, height)
    this.sim = new Simulation(this.grid)
  }

  /**
   * Draws into `canvas` with the given mode, replacing any previous renderer.
   * Throws if the mode isn't supported (smooth needs WebGL2).
   */
  attach(canvas: HTMLCanvasElement, mode: RenderMode) {
    this.renderer?.destroy()
    this.renderer = null
    this.renderer = createRenderer(canvas, this.grid, mode)
    if (this.size.width > 0) this.renderer.resize(this.size.width, this.size.height)
  }

  /** Displayed canvas size in CSS pixels. */
  resize(cssWidth: number, cssHeight: number) {
    this.size = { width: cssWidth, height: cssHeight }
    this.renderer?.resize(cssWidth, cssHeight)
    this.render(performance.now())
  }

  configure(settings: Partial<SandboxSettings>) {
    this.settings = { ...this.settings, ...settings }
    this.sim.dayCycle = this.settings.dayCycle
  }

  start() {
    this.lastTime = this.statsTime = performance.now()
    this.frameId = requestAnimationFrame(this.frame)
  }

  destroy() {
    cancelAnimationFrame(this.frameId)
    this.renderer?.destroy()
    this.renderer = null
  }

  /** Advances exactly one tick (used by the Step button while paused). */
  step() {
    this.sim.step()
    this.render(performance.now())
  }

  clear() {
    this.grid.clear()
    this.render(performance.now())
  }

  /** The whole world as a compressed scene file. */
  exportScene(): Promise<Blob> {
    return encodeScene(this.grid, this.sim.timeOfDay)
  }

  /** Replaces the world with a scene file (throws if it isn't one). */
  async importScene(blob: Blob) {
    const timeOfDay = await decodeScene(blob, this.grid)
    this.sim.setTimeOfDay(timeOfDay)
    this.render(performance.now())
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

    this.render(now)
    this.reportStats(now)
    this.frameId = requestAnimationFrame(this.frame)
  }

  private render(now: number) {
    const { sim } = this
    this.renderer?.render({ time: now / 1000, light: sim.daylight, sun: sim.sunPosition() })
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

    const { counts } = this
    const { type, size } = this.grid
    counts.fill(0)
    for (let i = 0; i < size; i++) counts[type[i]]++

    this.onStats?.({
      fps: Math.round((this.statsFrames * 1000) / elapsed),
      particles: size - counts[EMPTY],
      hover: this.probe(),
      timeOfDay: this.sim.timeOfDay,
      counts,
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
