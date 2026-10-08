import { useEffect, useRef } from 'react'

const COLORS = ['#c8a26b', '#8a5a3b', '#4aa8ff', '#7ad67f', '#e9d8a6']

interface Particle {
  x: number
  y: number
  r: number
  vy: number
  drift: number
  color: string
}

/** Decorative backdrop: soft grains of sand, soil, water and leaves drifting down. */
export function FallingParticles({ count = 90 }: { count?: number }) {
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

    const spawn = (y = Math.random() * height): Particle => ({
      x: Math.random() * width,
      y,
      r: 1 + Math.random() * 2.5,
      vy: 0.2 + Math.random() * 0.8,
      drift: Math.random() * Math.PI * 2,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
    })
    const particles = Array.from({ length: count }, () => spawn())

    let frame = 0
    const draw = (t: number) => {
      ctx.clearRect(0, 0, width, height)
      ctx.globalAlpha = 0.55
      for (const p of particles) {
        if (!reduceMotion) {
          p.y += p.vy
          p.x += Math.sin(t / 1400 + p.drift) * 0.25
          if (p.y - p.r > height) Object.assign(p, spawn(-10))
        }
        ctx.fillStyle = p.color
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.fill()
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
