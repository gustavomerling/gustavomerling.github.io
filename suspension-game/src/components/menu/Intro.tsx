import { useEffect } from 'react'
import { Logo } from './Logo'

/** Abertura: logo animado, segue sozinho ou com qualquer tecla/clique. */
export function Intro({ onDone }: { onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 4200)
    const skip = () => onDone()
    window.addEventListener('keydown', skip)
    window.addEventListener('pointerdown', skip)
    return () => {
      clearTimeout(t)
      window.removeEventListener('keydown', skip)
      window.removeEventListener('pointerdown', skip)
    }
  }, [onDone])

  return (
    <div className="intro">
      <div className="intro-road">
        <div className="intro-car">
          <svg viewBox="-1.6 -1.1 3.2 1.8" width={160}>
            <polygon points="-1.2,-0.05 -0.9,-0.4 0.7,-0.4 1.2,-0.05 1.2,0.2 -1.2,0.2" fill="#e8553d" stroke="#0008" strokeWidth={0.04} />
            <polygon points="-0.4,-0.33 0.55,-0.33 0.85,-0.08 -0.4,-0.08" fill="#9fd8ff" />
            <g className="spin">
              <circle cx={-0.85} cy={0.3} r={0.32} fill="#222" />
              <circle cx={-0.85} cy={0.3} r={0.15} fill="#bbb" />
            </g>
            <g className="spin">
              <circle cx={0.85} cy={0.3} r={0.32} fill="#222" />
              <circle cx={0.85} cy={0.3} r={0.15} fill="#bbb" />
            </g>
          </svg>
        </div>
      </div>
      <Logo big />
      <p className="intro-sub">um sandbox de suspensões</p>
      <p className="intro-press">pressione qualquer tecla</p>
    </div>
  )
}
