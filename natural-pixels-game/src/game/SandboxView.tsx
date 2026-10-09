import { useEffect, useImperativeHandle, useMemo, useRef, useState, type PointerEvent, type Ref } from 'react'
import { ELEMENTS, EMPTY } from '../elements/registry.ts'
import { Minus, Plus, Scan } from 'lucide-react'
import type { RenderMode, View } from '../engine/renderer/index.ts'
import { Sandbox, type FishingLine, type SandboxSettings, type SandboxStats, type ThoughtBubble, type WorldEvent } from '../engine/Sandbox.ts'
import '../styles/overlays.css'
import { FishingLines } from './FishingLines.tsx'
import { WorldEvents } from './WorldEvents.tsx'
import { ThoughtBubbles } from './ThoughtBubbles.tsx'

export interface SandboxHandle {
  step: () => void
  clear: () => void
  /** The live engine, for features like saving scenes. */
  readonly sandbox: Sandbox | null
}

interface SandboxViewProps extends SandboxSettings {
  /** Roughly how many cells the grid has (the "grain size"). Fixed at mount. */
  cellTarget: number
  renderMode: RenderMode
  /** Show what humans are thinking. */
  showThoughts: boolean
  onStats: (stats: SandboxStats) => void
  ref?: Ref<SandboxHandle>
}

/** Checked once: browsers without WebGL2 go straight to pixel mode. */
const SMOOTH_SUPPORTED = (() => {
  try {
    return document.createElement('canvas').getContext('webgl2') !== null
  } catch {
    return false
  }
})()

function gridSizeFor(width: number, height: number, cellTarget: number) {
  if (width <= 0 || height <= 0) return { width: 320, height: 180 }
  const cell = Math.sqrt((width * height) / cellTarget)
  return { width: Math.max(64, Math.round(width / cell)), height: Math.max(48, Math.round(height / cell)) }
}

/** Smallest the brush ring gets on screen, so a 1-cell brush stays visible. */
const MIN_RING_PX = 6
/** Browsers ignore cursor images bigger than this; past it, an HTML ring follows the pointer. */
const MAX_CURSOR_PX = 128
const RING_COLOR = '#ffffff'
const ERASE_COLOR = '#ff5252'

/**
 * The cursor: a ring the size of what the brush paints (red when erasing), as a CSS cursor
 * image, so the system draws it with no lag. A dark edge keeps it visible on any background.
 */
function brushCursor(ringPx: number, erase: boolean): string {
  const box = Math.ceil(ringPx) + 2
  const c = box / 2
  const r = ringPx / 2 - 0.75
  const color = erase ? ERASE_COLOR : RING_COLOR
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${box}" height="${box}">` +
    `<circle cx="${c}" cy="${c}" r="${r}" fill="none" stroke="rgba(0,0,0,0.55)" stroke-width="3"/>` +
    `<circle cx="${c}" cy="${c}" r="${r}" fill="none" stroke="${color}" stroke-width="1.5"/>` +
    `</svg>`
  const hot = Math.floor(c)
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}") ${hot} ${hot}, crosshair`
}

/** Zoom per wheel notch (exponential in the wheel's delta) and per button press. */
const WHEEL_ZOOM = 0.0015
const ZOOM_STEP = 1.5

/** Mounts the engine on a canvas and bridges React props and pointer events into it. */
export function SandboxView({ tool, brushRadius, paused, speed, dayCycle, weather, lighting, cellTarget, renderMode, showThoughts, onStats, ref }: SandboxViewProps) {
  const stageRef = useRef<HTMLDivElement>(null)
  const frameRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const sandboxRef = useRef<Sandbox | null>(null)
  const onStatsRef = useRef(onStats)
  const cellTargetRef = useRef(cellTarget)
  // Smooth graphics may be unsupported (or its shader may fail): stick to pixel mode then.
  const [smoothFailed, setSmoothFailed] = useState(!SMOOTH_SUPPORTED)
  const mode: RenderMode = smoothFailed ? 'pixel' : renderMode
  const [bubbles, setBubbles] = useState<readonly ThoughtBubble[]>([])
  const [lines, setLines] = useState<readonly FishingLine[]>([])
  const [grid, setGrid] = useState({ width: 1, height: 1 })
  const [view, setView] = useState<View>({ x: 0, y: 0, zoom: 1 })
  const [events, setEvents] = useState<readonly WorldEvent[]>([])
  /** Dragging the camera around (middle button, or Shift + drag): the last pointer position. */
  const panRef = useRef<{ x: number; y: number } | null>(null)
  /** On-screen size of one cell (px). */
  const [cellPx, setCellPx] = useState(1)
  /** Erasing with the right mouse button right now. */
  const [rightErase, setRightErase] = useState(false)
  const ringRef = useRef<HTMLDivElement>(null)
  // Humans and other one-per-click elements place a single cell.
  const ringCells = ELEMENTS[tool]?.brushSingle ? 1 : 2 * brushRadius + 1
  const ringPx = Math.max(MIN_RING_PX, cellPx * view.zoom * ringCells)
  const erase = tool === EMPTY || rightErase
  // Small enough for a real cursor (no lag); otherwise the HTML ring stands in.
  const bigRing = ringPx > MAX_CURSOR_PX - 2
  const cursor = useMemo(() => (bigRing ? 'none' : brushCursor(ringPx, erase)), [bigRing, ringPx, erase])

  useEffect(() => {
    onStatsRef.current = onStats
  }, [onStats])

  // Create the engine once; the grid size is fixed from the stage size at mount.
  useEffect(() => {
    const stage = stageRef.current
    const frame = frameRef.current
    if (!stage || !frame) return

    const size = gridSizeFor(stage.clientWidth, stage.clientHeight, cellTargetRef.current)
    const sandbox = new Sandbox(size.width, size.height)
    // Every game starts in a freshly rolled world (Scene → Random world rolls another).
    sandbox.generate()
    sandbox.onStats = (stats) => onStatsRef.current(stats)
    sandbox.onLines = setLines
    sandbox.onView = setView
    sandbox.onEvents = setEvents
    sandboxRef.current = sandbox
    // The grid size is only known once the stage is measured, right here.
    // oxlint-disable-next-line react/set-state-in-effect
    setGrid(size)

    // Fit the canvas inside the stage, keeping the grid's aspect ratio.
    const fit = () => {
      const scale = Math.min(stage.clientWidth / size.width, stage.clientHeight / size.height)
      const width = size.width * scale
      const height = size.height * scale
      frame.style.width = `${width}px`
      frame.style.height = `${height}px`
      setCellPx(scale)
      sandbox.resize(width, height)
    }
    const observer = new ResizeObserver(fit)
    observer.observe(stage)
    fit()

    sandbox.start()
    return () => {
      observer.disconnect()
      sandbox.destroy()
      sandboxRef.current = null
    }
  }, [])

  // (Re)attach a renderer whenever the mode changes. The canvas is keyed by mode, so each
  // mode gets a fresh element (a canvas can't switch between WebGL and 2D).
  useEffect(() => {
    const sandbox = sandboxRef.current
    const canvas = canvasRef.current
    if (!sandbox || !canvas) return
    try {
      sandbox.attach(canvas, mode)
    } catch (error) {
      console.warn('Smooth graphics unavailable, falling back to pixel mode.', error)
      // Reacting to the GPU refusing the shader: remount a fresh canvas in pixel mode.
      // oxlint-disable-next-line react/set-state-in-effect
      setSmoothFailed(true)
    }
  }, [mode])

  useEffect(() => {
    const sandbox = sandboxRef.current
    if (!sandbox) return
    sandbox.onThoughts = showThoughts ? setBubbles : undefined
  }, [showThoughts])

  useEffect(() => {
    sandboxRef.current?.configure({ tool, brushRadius, paused, speed, dayCycle, weather, lighting })
  }, [tool, brushRadius, paused, speed, dayCycle, weather, lighting])

  /** Moves the HTML ring (only used for brushes too big for a cursor image). */
  const moveRing = (e: PointerEvent<HTMLCanvasElement>) => {
    const ring = ringRef.current
    if (!ring || !bigRing || e.pointerType === 'touch') return
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left - ringPx / 2
    const y = e.clientY - rect.top - ringPx / 2
    ring.style.transform = `translate(${x}px, ${y}px)`
    ring.style.opacity = '1'
  }

  const hideRing = () => {
    if (ringRef.current) ringRef.current.style.opacity = '0'
  }

  useImperativeHandle(ref, () => ({
    step: () => sandboxRef.current?.step(),
    clear: () => sandboxRef.current?.clear(),
    get sandbox() {
      return sandboxRef.current
    },
  }))

  /** Where in the frame (0..1 across and down) a pointer is. */
  const inFrame = (clientX: number, clientY: number) => {
    const rect = frameRef.current!.getBoundingClientRect()
    return { fx: (clientX - rect.left) / rect.width, fy: (clientY - rect.top) / rect.height }
  }

  const toGrid = (e: PointerEvent<HTMLCanvasElement>) => {
    const sandbox = sandboxRef.current
    if (!sandbox || !frameRef.current) return null
    const { fx, fy } = inFrame(e.clientX, e.clientY)
    return sandbox.toWorld(fx, fy)
  }

  // The mouse wheel zooms in and out around the pointer (a non-passive listener, to keep the page still).
  useEffect(() => {
    const frame = frameRef.current
    if (!frame) return
    const onWheel = (e: WheelEvent) => {
      const sandbox = sandboxRef.current
      if (!sandbox) return
      e.preventDefault()
      const { fx, fy } = inFrame(e.clientX, e.clientY)
      sandbox.zoomAt(fx, fy, Math.exp(-e.deltaY * WHEEL_ZOOM))
    }
    frame.addEventListener('wheel', onWheel, { passive: false })
    return () => frame.removeEventListener('wheel', onWheel)
  }, [])

  /** Zoom buttons: in or out around the middle of the view. */
  const zoomBy = (factor: number) => sandboxRef.current?.zoomAt(0.5, 0.5, factor)

  return (
    <div className="sandbox" ref={stageRef}>
      <div className="sandbox__frame" ref={frameRef}>
        <canvas
          key={mode}
          ref={canvasRef}
          className={`sandbox__canvas sandbox__canvas--${mode}`}
          style={{ cursor }}
          onContextMenu={(e) => e.preventDefault()}
          onPointerDown={(e) => {
            // Middle button (or Shift + drag) moves the camera instead of painting.
            if (e.button === 1 || (e.shiftKey && view.zoom > 1)) {
              e.preventDefault()
              e.currentTarget.setPointerCapture(e.pointerId)
              panRef.current = { x: e.clientX, y: e.clientY }
              return
            }
            const p = toGrid(e)
            if (!p) return
            moveRing(e)
            // Right-click erases: the ring turns red while it does.
            if (e.button === 2) setRightErase(true)
            e.currentTarget.setPointerCapture(e.pointerId)
            sandboxRef.current?.pointerDown(p.x, p.y, e.button === 2)
          }}
          onPointerMove={(e) => {
            const pan = panRef.current
            if (pan) {
              const rect = frameRef.current!.getBoundingClientRect()
              sandboxRef.current?.pan((e.clientX - pan.x) / rect.width, (e.clientY - pan.y) / rect.height)
              panRef.current = { x: e.clientX, y: e.clientY }
              return
            }
            moveRing(e)
            const p = toGrid(e)
            if (p) sandboxRef.current?.pointerMove(p.x, p.y)
          }}
          onPointerUp={() => {
            panRef.current = null
            setRightErase(false)
            sandboxRef.current?.pointerUp()
          }}
          onPointerLeave={() => {
            hideRing()
            sandboxRef.current?.pointerLeave()
          }}
          onPointerCancel={() => {
            panRef.current = null
            setRightErase(false)
            sandboxRef.current?.pointerUp()
          }}
        />
        {lines.length > 0 && <FishingLines lines={lines} gridWidth={grid.width} gridHeight={grid.height} view={view} />}
        {showThoughts && bubbles.length > 0 && (
          <ThoughtBubbles bubbles={bubbles} gridWidth={grid.width} gridHeight={grid.height} view={view} />
        )}
        <WorldEvents events={events} />
        <div className="zoom-controls" role="group" aria-label="Zoom">
          <button type="button" className="zoom-controls__button" onClick={() => zoomBy(ZOOM_STEP)} aria-label="Zoom in" title="Zoom in (mouse wheel)">
            <Plus size={16} aria-hidden />
          </button>
          <button type="button" className="zoom-controls__button" onClick={() => zoomBy(1 / ZOOM_STEP)} disabled={view.zoom <= 1} aria-label="Zoom out" title="Zoom out (mouse wheel)">
            <Minus size={16} aria-hidden />
          </button>
          <button type="button" className="zoom-controls__button" onClick={() => sandboxRef.current?.resetView()} disabled={view.zoom <= 1} aria-label="Show the whole world" title="Whole world">
            <Scan size={16} aria-hidden />
          </button>
          <span className="zoom-controls__level">{view.zoom.toFixed(1)}×</span>
        </div>
        {bigRing && (
          <div
            ref={ringRef}
            className={`sandbox__brush${erase ? ' sandbox__brush--erase' : ''}`}
            style={{ width: ringPx, height: ringPx }}
            aria-hidden
          />
        )}
      </div>
    </div>
  )
}
