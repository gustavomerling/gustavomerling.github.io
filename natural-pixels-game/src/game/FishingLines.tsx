import type { View } from '../engine/renderer/index.ts'
import type { FishingLine } from '../engine/Sandbox.ts'

interface FishingLinesProps {
  lines: readonly FishingLine[]
  /** Grid size: the SVG works in cell units, stretched over the canvas. */
  gridWidth: number
  gridHeight: number
  /** The camera: the SVG shows the same part of the world as the canvas. */
  view: View
}

/** How much a line sags (cells per cell of length, at most MAX_SAG). */
const SAG = 0.2
const MAX_SAG = 3

/** Fishing lines drawn as real vector lines (a hair-thin curve with a bobber), over the canvas. */
export function FishingLines({ lines, gridWidth, gridHeight, view }: FishingLinesProps) {
  const box = `${view.x * gridWidth} ${view.y * gridHeight} ${gridWidth / view.zoom} ${gridHeight / view.zoom}`
  return (
    <svg className="fishing-lines" viewBox={box} preserveAspectRatio="none" aria-hidden>
      {lines.map(({ key, x1, y1, x2, y2 }) => {
        const length = Math.hypot(x2 - x1, y2 - y1)
        const cx = (x1 + x2) / 2
        const cy = Math.max(y1, y2) + Math.min(MAX_SAG, length * SAG)
        return (
          <g key={key}>
            <path d={`M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`} className="fishing-lines__line" vectorEffect="non-scaling-stroke" />
            <ellipse cx={x2} cy={y2 - 0.15} rx={0.35} ry={0.3} className="fishing-lines__bobber" />
          </g>
        )
      })}
    </svg>
  )
}
