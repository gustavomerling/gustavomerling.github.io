import { useEffect, useState, type ReactNode } from 'react'
import { useReducedMotion } from 'motion/react'

type Sparkle = { id: number; x: number; y: number; size: number; color: string }

const COLORS = ['var(--pink-500)', 'var(--orange-500)', 'var(--white)', 'var(--pink-300)']
let nextId = 0

function makeSparkle(): Sparkle {
  return {
    id: nextId++,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: 10 + Math.random() * 16,
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
  }
}

/** Estrelinhas que nascem e somem em volta do conteúdo, sem parar */
export function Sparkles({ children, rate = 380 }: { children: ReactNode; rate?: number }) {
  const reduced = useReducedMotion()
  const [sparkles, setSparkles] = useState<Sparkle[]>([])

  useEffect(() => {
    if (reduced) return
    const id = setInterval(() => {
      setSparkles((list) => [...list.slice(-7), makeSparkle()])
    }, rate)
    return () => clearInterval(id)
  }, [reduced, rate])

  return (
    <span className="sparkles">
      {sparkles.map((s) => (
        <svg
          key={s.id}
          className="sparkles__star"
          width={s.size}
          height={s.size}
          viewBox="0 0 24 24"
          style={{ left: `${s.x}%`, top: `${s.y}%` }}
          aria-hidden
        >
          <path d="M12 2c.8 6 4 9.2 10 10-6 .8-9.2 4-10 10-.8-6-4-9.2-10-10 6-.8 9.2-4 10-10Z" fill={s.color} stroke="var(--ink)" strokeWidth={1.2} />
        </svg>
      ))}
      <span className="sparkles__content">{children}</span>
    </span>
  )
}
