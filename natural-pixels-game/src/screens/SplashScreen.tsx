import { Sprout } from 'lucide-react'
import { useCallback } from 'react'
import type { Navigate } from '../app/screens.ts'
import { FallingParticles } from '../ui/FallingParticles.tsx'
import { useKey } from '../ui/useKey.ts'

export function SplashScreen({ onNavigate }: { onNavigate: Navigate }) {
  const start = useCallback(() => onNavigate('menu'), [onNavigate])
  useKey(start)

  return (
    <main className="screen splash" onClick={start}>
      <FallingParticles />
      <div className="splash__content">
        <Sprout className="splash__icon" size={56} strokeWidth={1.8} aria-hidden />
        <h1 className="title">
          Natural <span className="title__accent">Pixels</span>
        </h1>
        <p className="subtitle">A tiny world of elements</p>
        <p className="splash__hint">Click or press any key to start</p>
      </div>
    </main>
  )
}
