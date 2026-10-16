import { useEffect, useRef } from 'react'
import { drawCursor } from '../game/engine/drawCursor'
import { drawEnemy } from '../game/enemies/helpers'
import type { Enemy, EnemyDef } from '../game/types'

export interface PreviewOptions {
  zoom: number
  /** walk in a circle so facing/animation can be checked */
  walk?: boolean
  hitbox?: boolean
  /** draw the player pointer at the same scale for size reference */
  compare?: boolean
  /** increments trigger a hit flash */
  flashKey?: number
}

interface Props extends PreviewOptions {
  def: EnemyDef
  width: number
  height: number
  background?: string
  /** scale down to the container width, keeping aspect ratio */
  fluid?: boolean
}

function makeDummy(def: EnemyDef): Enemy {
  return { uid: 7, def, x: 0, y: 0, vx: 1, vy: 0, hp: def.hp, maxHp: def.hp, flash: 0, age: 0, angle: 0, data: {} }
}

/** Renders an enemy's real draw() on its own animated canvas — same code the game uses. */
export function EnemyPreview({ def, width, height, zoom, walk, hitbox, compare, flashKey = 0, background, fluid }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const dummyRef = useRef<Enemy>(makeDummy(def))
  const optsRef = useRef({ zoom, walk, hitbox, compare, background })
  optsRef.current = { zoom, walk, hitbox, compare, background }

  useEffect(() => {
    dummyRef.current = makeDummy(def)
  }, [def])

  useEffect(() => {
    if (flashKey > 0) dummyRef.current.flash = 0.15
  }, [flashKey])

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    const dpr = window.devicePixelRatio || 1
    canvas.width = width * dpr
    canvas.height = height * dpr
    let raf = 0
    let last = performance.now()
    const start = last

    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      const t = (now - start) / 1000
      const o = optsRef.current
      const e = dummyRef.current
      e.age += dt
      e.flash = Math.max(0, e.flash - dt)

      let cx = width / 2
      const cy = height / 2
      if (o.compare) cx = width / 2 + 14 * o.zoom
      if (o.walk) {
        const r = Math.min(width, height) * 0.22
        const a = t * 1.2
        e.vx = -Math.sin(a)
        e.vy = Math.cos(a)
        e.angle = Math.atan2(e.vy, e.vx)
        cx += Math.cos(a) * r
      } else {
        e.angle = 0
        e.vx = 1
      }

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.imageSmoothingEnabled = false
      ctx.clearRect(0, 0, width, height)
      if (o.background) {
        ctx.fillStyle = o.background
        ctx.fillRect(0, 0, width, height)
      }

      if (o.compare) drawCursor(ctx, width / 2 - 20 * o.zoom, cy, -Math.PI / 4, 1.4 * o.zoom)

      ctx.save()
      ctx.translate(cx, cy)
      ctx.scale(o.zoom, o.zoom)
      if (o.hitbox) {
        ctx.save()
        ctx.strokeStyle = '#ff00ff'
        ctx.lineWidth = 1 / o.zoom
        ctx.setLineDash([3 / o.zoom, 2 / o.zoom])
        ctx.beginPath()
        ctx.arc(0, 0, def.radius, 0, Math.PI * 2)
        ctx.stroke()
        ctx.restore()
      }
      drawEnemy(ctx, e, t)
      ctx.restore()
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [def, width, height])

  const style = fluid ? { width: '100%', maxWidth: width, height: 'auto' } : { width, height }
  return <canvas ref={canvasRef} style={style} aria-label={def.name} />
}
