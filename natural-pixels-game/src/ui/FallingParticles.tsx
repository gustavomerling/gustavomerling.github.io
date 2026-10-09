import { useEffect, useRef } from 'react'

/** Pastel paper scraps (sage, peach, butter, rose, sky). */
const CONFETTI = ['#b9d4ad', '#f5c6a5', '#f3dd94', '#efbcc4', '#b9d8e6']
/** Leaves: fresh greens and one autumn tan. */
const LEAVES = ['#9cc48a', '#b6cf8d', '#dcb27e']

interface Particle {
  x: number
  y: number
  r: number
  vy: number
  drift: number
  angle: number
  spin: number
  leaf: boolean
  color: string
}

const pick = (colors: readonly string[]) => colors[Math.floor(Math.random() * colors.length)]

/** Decorative backdrop: paper confetti and little leaves fluttering down. */
export function FallingParticles({ count = 70 }: { count?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let width = 0
    let height = 0

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      width = canvas.clientWidth
      height = canvas.clientHeight
      canvas.width = width * dpr
      canvas.height = height * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()
    window.addEventListener('resize', resize)

    const spawn = (y = Math.random() * height): Particle => {
      const leaf = Math.random() < 0.35
      return {
        x: Math.random() * width,
        y,
        r: 2.5 + Math.random() * 3,
        vy: 0.25 + Math.random() * 0.55,
        drift: Math.random() * Math.PI * 2,
        angle: Math.random() * Math.PI * 2,
        spin: (Math.random() - 0.5) * 0.03,
        leaf,
        color: pick(leaf ? LEAVES : CONFETTI),
      }
    }
    const particles = Array.from({ length: count }, () => spawn())

    let frame = 0
    const draw = (t: number) => {
      ctx.clearRect(0, 0, width, height)
      ctx.globalAlpha = 0.85
      for (const p of particles) {
        if (!reduceMotion) {
          p.y += p.vy
          p.x += Math.sin(t / 1400 + p.drift) * 0.35
          p.angle += p.spin
          if (p.y - p.r * 2 > height) Object.assign(p, spawn(-12))
        }
        ctx.save()
        ctx.translate(p.x, p.y)
        ctx.rotate(p.angle)
        // Paper scraps flip as they fall: squash one axis back and forth.
        if (!reduceMotion) ctx.scale(Math.cos(t / 520 + p.drift), 1)
        ctx.fillStyle = p.color
        ctx.beginPath()
        if (p.leaf) ctx.ellipse(0, 0, p.r * 1.7, p.r * 0.8, 0, 0, Math.PI * 2)
        else ctx.rect(-p.r, -p.r * 0.65, p.r * 2, p.r * 1.3)
        ctx.fill()
        ctx.restore()
      }
      frame = requestAnimationFrame(draw)
    }
    frame = requestAnimationFrame(draw)

    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('resize', resize)
    }
  }, [count])

  return <canvas ref={canvasRef} className="falling-particles" aria-hidden />
}
