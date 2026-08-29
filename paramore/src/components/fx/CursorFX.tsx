import { useEffect, useState } from 'react'
import {
  motion,
  useMotionTemplate,
  useMotionValue,
  useSpring,
} from 'framer-motion'

export default function CursorFX() {
  const [enabled] = useState(() => {
    if (typeof window === 'undefined') return false
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false
    return window.matchMedia('(hover: hover) and (pointer: fine)').matches
  })
  const [hovering, setHovering] = useState(false)
  const [suppressed, setSuppressed] = useState(false)

  const x = useMotionValue(-100)
  const y = useMotionValue(-100)
  const ringX = useSpring(x, { stiffness: 260, damping: 24, mass: 0.5 })
  const ringY = useSpring(y, { stiffness: 260, damping: 24, mass: 0.5 })
  const glowX = useSpring(x, { stiffness: 90, damping: 22 })
  const glowY = useSpring(y, { stiffness: 90, damping: 22 })

  const spotlight = useMotionTemplate`radial-gradient(300px circle at ${glowX}px ${glowY}px, var(--color-accent-subtle), transparent 72%)`

  useEffect(() => {
    const onCursor = (e: Event) => {
      setSuppressed((e as CustomEvent<boolean>).detail === true)
    }
    window.addEventListener('pb:cursor', onCursor)
    return () => window.removeEventListener('pb:cursor', onCursor)
  }, [])

  useEffect(() => {
    const root = document.documentElement
    if (enabled && !suppressed) root.classList.add('pb-cursor-none')
    else root.classList.remove('pb-cursor-none')
    return () => root.classList.remove('pb-cursor-none')
  }, [enabled, suppressed])

  useEffect(() => {
    const move = (e: MouseEvent) => {
      x.set(e.clientX)
      y.set(e.clientY)
    }
    const over = (e: Event) => {
      const t = e.target as Element | null
      setHovering(
        Boolean(
          t?.closest?.(
            'a, button, [role="button"], input, select, textarea, label, summary',
          ),
        ),
      )
    }

    window.addEventListener('mousemove', move, { passive: true })
    window.addEventListener('mouseover', over, { passive: true })
    return () => {
      window.removeEventListener('mousemove', move)
      window.removeEventListener('mouseover', over)
    }
  }, [x, y])

  if (!enabled || suppressed) return null

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-[2000]">
      <motion.div className="absolute inset-0" style={{ background: spotlight, opacity: 0.55 }} />
      <motion.div style={{ x: ringX, y: ringY }} className="absolute left-0 top-0">
        <motion.div
          animate={{ scale: hovering ? 1.7 : 1, opacity: hovering ? 0.25 : 0.6 }}
          transition={{ duration: 0.2 }}
          className="-ml-4 -mt-4 size-8 rounded-full border border-accent"
        />
      </motion.div>
      <motion.div style={{ x, y }} className="absolute left-0 top-0">
        <div className="-ml-1 -mt-1 size-2 rounded-full bg-accent shadow-glow" />
      </motion.div>
    </div>
  )
}