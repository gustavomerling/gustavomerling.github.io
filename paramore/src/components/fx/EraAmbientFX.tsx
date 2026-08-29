import { useMemo } from 'react'
import { motion } from 'framer-motion'

interface EraAmbientFXProps {
  particleCount?: number
  density?: 'low' | 'medium' | 'high'
  spotlight?: boolean
}

export default function EraAmbientFX({
  particleCount = 18,
  density = 'medium',
  spotlight = true,
}: EraAmbientFXProps) {
  const count = density === 'low' ? 10 : density === 'high' ? 28 : particleCount

  const particles = useMemo(() => {
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      size: Math.random() * 4 + 2,
      x: Math.random() * 100,
      y: Math.random() * 100,
      duration: Math.random() * 8 + 6,
      delay: Math.random() * 5,
      opacity: Math.random() * 0.45 + 0.15,
    }))
  }, [count])

  return (
    <div
      className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
      aria-hidden="true"
    >
      {/* Luz ambiente com gradiente dinâmico baseado na cor de destaque da era */}
      {spotlight && (
        <>
          <div
            className="absolute -top-32 left-1/2 h-[450px] w-[750px] -translate-x-1/2 rounded-full opacity-60 blur-3xl"
            style={{
              background:
                'radial-gradient(ellipse 60% 50% at 50% 30%, var(--color-accent-subtle), transparent 80%)',
            }}
          />
          <div
            className="absolute -bottom-24 right-0 h-96 w-96 rounded-full opacity-40 blur-3xl"
            style={{
              background:
                'radial-gradient(circle at center, var(--color-accent-glow), transparent 70%)',
            }}
          />
        </>
      )}

      {/* Partículas flutuantes com brilho estilo stage dust/faíscas */}
      {particles.map((p) => (
        <motion.span
          key={p.id}
          className="absolute rounded-full"
          style={{
            width: p.size,
            height: p.size,
            left: `${p.x}%`,
            top: `${p.y}%`,
            backgroundColor: 'var(--color-accent)',
            boxShadow: '0 0 10px var(--color-accent-glow)',
            opacity: p.opacity,
          }}
          animate={{
            y: [0, -35, 10, 0],
            x: [0, 15, -15, 0],
            opacity: [p.opacity * 0.4, p.opacity, p.opacity * 0.2, p.opacity * 0.4],
            scale: [1, 1.4, 0.8, 1],
          }}
          transition={{
            duration: p.duration,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: p.delay,
          }}
        />
      ))}
    </div>
  )
}
