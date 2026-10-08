import { useEffect, useImperativeHandle, useRef, type PointerEvent, type Ref } from 'react'
import { Sandbox, type SandboxSettings, type SandboxStats } from '../engine/Sandbox.ts'

/** Roughly how many cells the grid has; sets the "grain size" for the screen. */
const TARGET_CELLS = 72_000

export interface SandboxHandle {
  step: () => void
  clear: () => void
}

interface SandboxViewProps extends SandboxSettings {
  onStats: (stats: SandboxStats) => void
  ref?: Ref<SandboxHandle>
}

function gridSizeFor(width: number, height: number) {
  if (width <= 0 || height <= 0) return { width: 320, height: 180 }
  const cell = Math.sqrt((width * height) / TARGET_CELLS)
  return { width: Math.max(64, Math.round(width / cell)), height: Math.max(48, Math.round(height / cell)) }
}

/** Mounts the engine on a canvas and bridges React props and pointer events into it. */
export function SandboxView({ tool, brushRadius, paused, speed, onStats, ref }: SandboxViewProps) {
  const stageRef = useRef<HTMLDivElement>(null)
  const frameRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const sandboxRef = useRef<Sandbox | null>(null)
  const onStatsRef = useRef(onStats)

  useEffect(() => {
    onStatsRef.current = onStats
  }, [onStats])

  // Create the engine once; the grid size is fixed from the stage size at mount.
  useEffect(() => {
    const stage = stageRef.current
    const frame = frameRef.current
    const canvas = canvasRef.current
    if (!stage || !frame || !canvas) return

    const size = gridSizeFor(stage.clientWidth, stage.clientHeight)
    const sandbox = new Sandbox(canvas, size.width, size.height)
    sandbox.onStats = (stats) => onStatsRef.current(stats)
    sandboxRef.current = sandbox

    // Fit the canvas inside the stage, keeping the grid's aspect ratio.
    const fit = () => {
      const scale = Math.min(stage.clientWidth / size.width, stage.clientHeight / size.height)
      const width = size.width * scale
      const height = size.height * scale
      frame.style.width = `${width}px`
      frame.style.height = `${height}px`
    }
    fit()
    const observer = new ResizeObserver(fit)
    observer.observe(stage)

    sandbox.start()
    return () => {
      observer.disconnect()
      sandbox.destroy()
      sandboxRef.current = null
    }
  }, [])

  useEffect(() => {
    sandboxRef.current?.configure({ tool, brushRadius, paused, speed })
  }, [tool, brushRadius, paused, speed])

  useImperativeHandle(ref, () => ({
    step: () => sandboxRef.current?.step(),
    clear: () => sandboxRef.current?.clear(),
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
          ref={canvasRef}
          className="sandbox__canvas"
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
      </div>
    </div>
  )
}
