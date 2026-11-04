import { useEffect, useRef, useState } from 'react'
import { LogoMark } from './Logo'

/** Duração da abertura (ms) e do fade de saída. */
const DURATION = 2600
const FADE = 450

const BOOT_LINES = ['carregando física (rapier)', 'calibrando motores das juntas', 'manequim 01 · pronto']

/**
 * Abertura curta: marca, nome e linhas de "boot" do laboratório.
 * Qualquer tecla ou clique pula. Mostrada uma vez por carregamento da página.
 */
export function Intro({ onDone }: { onDone: () => void }) {
  const [leaving, setLeaving] = useState(false)
  const done = useRef(onDone)
  done.current = onDone

  useEffect(() => {
    let finishId = 0
    const leave = () => {
      if (finishId) return
      setLeaving(true)
      finishId = window.setTimeout(() => done.current(), FADE)
    }
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    const autoId = window.setTimeout(leave, reduce ? 900 : DURATION)
    const skip = () => leave()
    window.addEventListener('keydown', skip)
    window.addEventListener('pointerdown', skip)
    return () => {
      clearTimeout(autoId)
      clearTimeout(finishId)
      window.removeEventListener('keydown', skip)
      window.removeEventListener('pointerdown', skip)
    }
  }, [])

  return (
    <div className={leaving ? 'intro leaving' : 'intro'} aria-hidden>
      <div className="intro-grid" />
      <div className="intro-center">
        <LogoMark size={120} className="intro-mark" />
        <div className="intro-title">
          <span className="intro-word w1">Human</span>
          <span className="intro-word w2">in the</span>
          <span className="intro-word w3">Loop</span>
        </div>
        <ul className="intro-boot">
          {BOOT_LINES.map((l, i) => (
            <li key={l} style={{ animationDelay: `${1.0 + i * 0.35}s` }}>
              <span>{l}</span>
              <b>ok</b>
            </li>
          ))}
        </ul>
      </div>
      <div className="intro-skip">qualquer tecla para pular</div>
      <div className="hazard-strip intro-strip" />
    </div>
  )
}
