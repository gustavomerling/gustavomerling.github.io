import { useEffect, useImperativeHandle, useRef, useState, type PointerEvent, type Ref } from 'react'
import type { RenderMode } from '../engine/renderer/index.ts'
import { Sandbox, type SandboxSettings, type SandboxStats, type ThoughtBubble } from '../engine/Sandbox.ts'
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

/** Mounts the engine on a canvas and bridges React props and pointer events into it. */
export function SandboxView({ tool, brushRadius, paused, speed, dayCycle, weather, cellTarget, renderMode, showThoughts, onStats, ref }: SandboxViewProps) {
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
  const [grid, setGrid] = useState({ width: 1, height: 1 })

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
    sandbox.onStats = (stats) => onStatsRef.current(stats)
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
    sandboxRef.current?.configure({ tool, brushRadius, paused, speed, dayCycle, weather })
  }, [tool, brushRadius, paused, speed, dayCycle, weather])

  useImperativeHandle(ref, () => ({
    step: () => sandboxRef.current?.step(),
    clear: () => sandboxRef.current?.clear(),
    get sandbox() {
      return sandboxRef.current
    },
  }))

  const toGrid = (e: PointerEvent<HTMLCanvasElement>) => {
    const sandbox = sandboxRef.current
    const rect = e.currentTarget.getBoundingClientRect()
    if (!sandbox) return null
    return {
      x: ((e.clientX - rect.left) / rect.width) * sandbox.grid.width,
      y: ((e.clientY - rect.top) / rect.height) * sandbox.grid.height,
    }
  }

  return (
    <div className="sandbox" ref={stageRef}>
      <div className="sandbox__frame" ref={frameRef}>
        <canvas
          key={mode}
          ref={canvasRef}
          className={`sandbox__canvas sandbox__canvas--${mode}`}
          onContextMenu={(e) => e.preventDefault()}
          onPointerDown={(e) => {
            const p = toGrid(e)
            if (!p) return
            e.currentTarget.setPointerCapture(e.pointerId)
            sandboxRef.current?.pointerDown(p.x, p.y, e.button === 2)
          }}
          onPointerMove={(e) => {
            const p = toGrid(e)
            if (p) sandboxRef.current?.pointerMove(p.x, p.y)
          }}
          onPointerUp={() => sandboxRef.current?.pointerUp()}
          onPointerLeave={() => sandboxRef.current?.pointerLeave()}
          onPointerCancel={() => sandboxRef.current?.pointerUp()}
        />
        {showThoughts && bubbles.length > 0 && (
          <ThoughtBubbles bubbles={bubbles} gridWidth={grid.width} gridHeight={grid.height} />
        )}
      </div>
    </div>
  )
}
