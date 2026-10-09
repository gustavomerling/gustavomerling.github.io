import { ELEMENTS, EMPTY, elementIndex } from '../elements/registry.ts'
import type { Status, Thought } from '../elements/types.ts'
import { paintStroke } from './brush.ts'
import { Grid } from './grid.ts'
import { createRenderer, type RenderMode, type Renderer, type View } from './renderer/index.ts'
import { decodeScene, encodeScene } from './scene.ts'
import { Simulation } from './simulation.ts'
import { generateWorld } from './worldgen.ts'

const TICKS_PER_SECOND = 60
const STEP_MS = 1000 / TICKS_PER_SECOND
/** Cap on ticks per frame so a slow frame can't snowball into a freeze. */
const MAX_STEPS_PER_FRAME = 8
const STATS_INTERVAL_MS = 250
const THOUGHTS_INTERVAL_MS = 100
/** How far in the camera zooms. */
const MAX_ZOOM = 6
const LINES_INTERVAL_MS = 50
const EVENTS_INTERVAL_MS = 500
const MERCHANT = elementIndex('merchant_body')

/** Something special going on right now, for the banner over the canvas. */
export type WorldEvent = 'eclipse' | 'aurora' | 'meteors' | 'double-rainbow' | 'merchant'
/** Elements that think out loud (have a `thought` hook). */
const HUMAN = elementIndex('human')
const THINKERS = Uint8Array.from(ELEMENTS, (el) => (el.thought ? 1 : 0))
/** Elements with a status card (have a `status` hook). */
const PEOPLE = Uint8Array.from(ELEMENTS, (el) => (el.status ? 1 : 0))

export interface SandboxSettings {
  /** Element index painted by the primary button (EMPTY = eraser). */
  tool: number
  brushRadius: number
  paused: boolean
  /** Simulation speed multiplier (1 = 60 ticks/s). */
  speed: number
  /** Day/night cycle on; off = endless day. */
  dayCycle: boolean
  /** Daily rain on/off. */
  weather: boolean
  /** Light and shadow on (see renderer/lighting.ts); off = everything evenly lit. */
  lighting: boolean
}

export interface SandboxStats {
  fps: number
  particles: number
  /** Element and temperature under the cursor (null when off the canvas). */
  hover: { name: string; temp: number; detail?: string } | null
  /** Time of day 0..1 (0 = midnight, 0.5 = noon). */
  timeOfDay: number
  /** Cell count per element index (for sounds and the like). */
  counts: Uint32Array
  /** Everyone with a status card (humans), for the top bar. */
  people: Person[]
}

export interface Person {
  /** Stable while it lives (its memory key). */
  key: number
  status: Status
}

/** A fishing line, in grid coordinates (cell units, fractional): rod tip to where it meets the water. */
export interface FishingLine {
  key: number
  x1: number
  y1: number
  x2: number
  y2: number
}

/** A thought bubble anchored at a cell (grid coordinates of the thinking cell). */
export interface ThoughtBubble extends Thought {
  /** Stable while the thinker lives (its memory key). */
  key: number
  x: number
  y: number
}

/**
 * Facade the UI talks to: owns the grid, simulation, renderer and the frame loop.
 * React only pushes settings and pointer events in; it never runs per frame.
 */
export class Sandbox {
  readonly grid: Grid
  readonly sim: Simulation
  onStats?: (stats: SandboxStats) => void
  onThoughts?: (bubbles: ThoughtBubble[]) => void
  /** Fishing lines to draw over the canvas (vector, not cells). */
  onLines?: (lines: FishingLine[]) => void
  /** What special is going on (eclipse, aurora...), whenever that changes. */
  onEvents?: (events: WorldEvent[]) => void

  private renderer: Renderer | null = null
  /** The camera (see View): the whole world to start with. */
  private view: View = { x: 0, y: 0, zoom: 1 }
  /** Told whenever the camera moves (overlays follow it). */
  onView?: (view: View) => void
  private settings: SandboxSettings = { tool: EMPTY, brushRadius: 3, paused: false, speed: 1, dayCycle: true, weather: true, lighting: true }
  private pointer = { down: false, erase: false, inside: false, singlePlaced: false, x: 0, y: 0, lastX: 0, lastY: 0 }
  private size = { width: 0, height: 0 }

  private frameId = 0
  private lastTime = 0
  private accumulator = 0
  private statsFrames = 0
  private statsTime = 0
  private thoughtsTime = 0
  private linesTime = 0
  private lineCount = 0
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

  get camera(): View {
    return this.view
  }

  /** Where in the world (cells) a point of the frame is: `fx`, `fy` = 0..1 across and down the frame. */
  toWorld(fx: number, fy: number) {
    const { x, y, zoom } = this.view
    return { x: (x + fx / zoom) * this.grid.width, y: (y + fy / zoom) * this.grid.height }
  }

  /** Zooms by `factor` keeping the world point under (`fx`, `fy`) of the frame where it is. */
  zoomAt(fx: number, fy: number, factor: number) {
    const { x, y, zoom } = this.view
    const next = Math.min(MAX_ZOOM, Math.max(1, zoom * factor))
    this.setView(x + fx / zoom - fx / next, y + fy / zoom - fy / next, next)
  }

  /** Moves the camera by a share of the frame (dragging the world along). */
  pan(dfx: number, dfy: number) {
    const { x, y, zoom } = this.view
    this.setView(x - dfx / zoom, y - dfy / zoom, zoom)
  }

  /** The whole world in view again. */
  resetView() {
    this.setView(0, 0, 1)
  }

  private setView(x: number, y: number, zoom: number) {
    const span = 1 / zoom
    this.view = { x: Math.min(1 - span, Math.max(0, x)), y: Math.min(1 - span, Math.max(0, y)), zoom }
    this.onView?.(this.view)
    this.render(performance.now())
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
    this.sim.weather.enabled = this.settings.weather
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
    this.sim.resetMemory()
    this.sim.weather.reset()
    this.sim.events.reset()
    this.render(performance.now())
  }

  /** Replaces the world with a new semi-random landscape (see worldgen.ts). */
  generate() {
    generateWorld(this.grid, this.sim.random)
    this.sim.resetMemory()
    this.sim.weather.reset()
    this.sim.events.reset()
    this.render(performance.now())
  }

  /** The whole world as a compressed scene file. */
  exportScene(): Promise<Blob> {
    return encodeScene(this.grid, { timeOfDay: this.sim.timeOfDay, memory: [...this.sim.memory] })
  }

  /** Replaces the world with a scene file (throws if it isn't one). */
  async importScene(blob: Blob) {
    const { timeOfDay, memory } = await decodeScene(blob, this.grid)
    this.sim.setTimeOfDay(timeOfDay)
    this.sim.resetMemory(memory)
    this.sim.weather.reset()
    this.sim.events.reset()
    this.render(performance.now())
  }

  /** Pointer coordinates are in grid cells. `erase` paints air regardless of the tool. */
  pointerDown(x: number, y: number, erase = false) {
    this.pointer = { down: true, erase, inside: true, singlePlaced: false, x, y, lastX: x, lastY: y }
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
    this.reportThoughts(now)
    this.reportLines(now)
    this.reportEvents(now)
    this.frameId = requestAnimationFrame(this.frame)
  }

  private render(now: number) {
    const { sim } = this
    const { overcast, flash, rainbow, doubleRainbow } = sim.weather
    const { eclipse, aurora, meteors } = sim.events
    this.renderer?.render({
      time: now / 1000,
      light: sim.daylight,
      sun: sim.sunPosition(),
      overcast,
      flash,
      rainbow,
      doubleRainbow,
      eclipse,
      aurora,
      meteors,
      lighting: this.settings.lighting,
      view: this.view,
    })
  }

  /** Called every frame while held, so holding still keeps pouring. */
  private paint() {
    const p = this.pointer
    const type = p.erase ? EMPTY : this.settings.tool

    // Single-placement elements (humans): one per click, only into empty space.
    if (ELEMENTS[type].brushSingle) {
      const x = Math.floor(p.x)
      const y = Math.floor(p.y)
      if (!p.singlePlaced && this.grid.inBounds(x, y) && this.grid.type[y * this.grid.width + x] === EMPTY) {
        this.grid.place(y * this.grid.width + x, type)
        p.singlePlaced = true
      }
      return
    }
    paintStroke(this.grid, p.lastX, p.lastY, p.x, p.y, this.settings.brushRadius, type, this.sim.random)
    p.lastX = p.x
    p.lastY = p.y
  }

  private reportStats(now: number) {
    this.statsFrames++
    const elapsed = now - this.statsTime
    if (elapsed < STATS_INTERVAL_MS) return

    const { counts } = this
    const { type, size, width, life } = this.grid
    counts.fill(0)
    const people: Person[] = []
    for (let i = 0; i < size; i++) {
      const t = type[i]
      counts[t]++
      if (!PEOPLE[t]) continue
      const status = this.sim.statusAt(i % width, Math.floor(i / width))
      if (status) people.push({ key: life[i], status })
    }
    people.sort((a, b) => a.key - b.key)

    this.onStats?.({
      fps: Math.round((this.statsFrames * 1000) / elapsed),
      particles: size - counts[EMPTY],
      hover: this.probe(),
      timeOfDay: this.sim.timeOfDay,
      counts,
      people,
    })
    this.statsFrames = 0
    this.statsTime = now
  }

  /** Humans fishing right now: a line from the rod (up and out from the hands) to the water. */
  private eventsTime = 0
  private eventsKey = ''

  private reportEvents(now: number) {
    if (!this.onEvents || now - this.eventsTime < EVENTS_INTERVAL_MS) return
    this.eventsTime = now
    const { events, weather } = this.sim
    const list: WorldEvent[] = []
    if (events.eclipse > 0.2) list.push('eclipse')
    if (events.aurora > 0.2) list.push('aurora')
    if (events.meteors > 0.2) list.push('meteors')
    if (weather.doubleRainbow && weather.rainbow > 0.2) list.push('double-rainbow')
    if (this.grid.type.includes(MERCHANT)) list.push('merchant')
    const key = list.join()
    if (key === this.eventsKey) return
    this.eventsKey = key
    this.onEvents(list)
  }

  private reportLines(now: number) {
    if (!this.onLines || now - this.linesTime < LINES_INTERVAL_MS) return
    this.linesTime = now
    const { type, life, width, size } = this.grid
    const lines: FishingLine[] = []
    for (let i = 0; i < size; i++) {
      if (type[i] !== HUMAN) continue
      const mind = this.sim.memory.get(life[i]) as { task?: string; phase?: number; cast?: { x: number; y: number } | null } | undefined
      if (!mind?.cast || mind.task !== 'fish' || mind.phase !== 1) continue
      const x = i % width
      const y = (i - x) / width
      const side = Math.sign(mind.cast.x - x) || 1
      lines.push({ key: life[i], x1: x + 0.5 + side * 1.2, y1: y - 2.6, x2: mind.cast.x + 0.5, y2: mind.cast.y })
    }
    // Only tell the UI when there's something (or something stopped).
    if (lines.length || this.lineCount) this.onLines(lines)
    this.lineCount = lines.length
  }

  private reportThoughts(now: number) {
    if (!this.onThoughts || now - this.thoughtsTime < THOUGHTS_INTERVAL_MS) return
    this.thoughtsTime = now
    const { type, life, width, size } = this.grid
    const bubbles: ThoughtBubble[] = []
    for (let i = 0; i < size; i++) {
      if (!THINKERS[type[i]]) continue
      const x = i % width
      const y = (i - x) / width
      const thought = this.sim.thoughtAt(x, y)
      if (thought) bubbles.push({ ...thought, key: life[i], x, y })
    }
    this.onThoughts(bubbles)
  }

  private probe(): SandboxStats['hover'] {
    const { pointer, grid } = this
    const x = Math.floor(pointer.x)
    const y = Math.floor(pointer.y)
    if (!pointer.inside || !grid.inBounds(x, y)) return null
    const i = y * grid.width + x
    // Parts of a body (a human's head) show their main cell's details.
    const part = ELEMENTS[grid.type[i]].partOf
    const my = part ? Math.min(grid.height - 1, y + part.below) : y
    const main = my * grid.width + x
    return {
      name: ELEMENTS[grid.type[main]].name,
      temp: grid.temp[i],
      detail: this.sim.describeCell(x, my),
    }
  }
}
