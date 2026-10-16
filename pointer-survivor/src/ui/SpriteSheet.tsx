import { useEffect, useRef } from 'react'
import { spriteSize, type SpriteDef } from '../game/sprites'

/** One frame blown up with a pixel grid, for design review. */
function FrameCanvas({ rows, palette, cell }: { rows: string[]; palette: Record<string, string>; cell: number }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const w = rows[0].length
  const h = rows.length

  useEffect(() => {
    const ctx = ref.current?.getContext('2d')
    if (!ctx) return
    const dpr = window.devicePixelRatio || 1
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    // transparency checkerboard
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        ctx.fillStyle = (x + y) % 2 === 0 ? '#ffffff' : '#e4e4e4'
        ctx.fillRect(x * cell, y * cell, cell, cell)
        const color = palette[rows[y][x]]
        if (color && rows[y][x] !== '.') {
          ctx.fillStyle = color
          ctx.fillRect(x * cell, y * cell, cell, cell)
        }
      }
    }
    ctx.strokeStyle = 'rgba(0,0,0,0.12)'
    ctx.lineWidth = 1
    ctx.beginPath()
    for (let x = 1; x < w; x++) {
      ctx.moveTo(x * cell + 0.5, 0)
      ctx.lineTo(x * cell + 0.5, h * cell)
    }
    for (let y = 1; y < h; y++) {
      ctx.moveTo(0, y * cell + 0.5)
      ctx.lineTo(w * cell, y * cell + 0.5)
    }
    ctx.stroke()
  }, [rows, palette, cell, w, h])

  const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1
  return (
    <canvas
      ref={ref}
      width={w * cell * dpr}
      height={h * cell * dpr}
      style={{ width: w * cell, height: h * cell, display: 'block', boxShadow: 'var(--bevel-thin-in)' }}
    />
  )
}

export function SpriteSheet({ sprite }: { sprite: SpriteDef }) {
  const { width, height } = spriteSize(sprite)
  // keep big sprites from blowing up the layout
  const cell = Math.max(3, Math.min(8, Math.floor(120 / Math.max(width, height))))
  return (
    <div className="sprite-sheet">
      <div className="sprite-frames">
        {sprite.frames.map((rows, i) => (
          <figure key={i}>
            <FrameCanvas rows={rows} palette={sprite.palette} cell={cell} />
            <figcaption>Frame {i + 1}</figcaption>
          </figure>
        ))}
      </div>
      <div className="sprite-palette">
        {Object.entries(sprite.palette).map(([key, color]) => (
          <span key={key} title={color}>
            <i style={{ background: color }} />
            <code>{key}</code> {color}
          </span>
        ))}
      </div>
      <div className="sprite-meta">
        {width}×{height} px · {sprite.frames.length} frame(s) · {sprite.fps ?? 4} fps · {sprite.pixel ?? 2} units/px
        {sprite.flip === false ? ' · no mirroring' : ''}
      </div>
    </div>
  )
}
