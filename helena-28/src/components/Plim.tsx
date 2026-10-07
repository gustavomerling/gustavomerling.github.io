import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import './Plim.css'

/*
 * Easter egg: aquela propaganda que aparece em todo streaming,
 * "Principia… plim, plom, plim… A marca número um recomendada por dermatologistas".
 *
 * Os nomes de classe evitam palavras que bloqueadores (Brave etc.) escondem.
 */

const DELAY_MS = 20_000 // aparece uma vez por carregamento (F5), 20s depois que a página abre
const DURATION_S = 15
const SKIP_AFTER_S = 5

// Os três "plim, plom, plim" em notas: aguda, grave, aguda
const NOTES = [1318.5, 987.8, 1568]

function chime() {
  try {
    const ctx = new AudioContext()
    NOTES.forEach((freq, i) => {
      const start = ctx.currentTime + i * 0.55
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.value = freq
      gain.gain.setValueAtTime(0.0001, start)
      gain.gain.exponentialRampToValueAtTime(0.09, start + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.5)
      osc.connect(gain).connect(ctx.destination)
      osc.start(start)
      osc.stop(start + 0.55)
    })
    setTimeout(() => ctx.close(), 2500)
  } catch {
    // sem áudio, segue só o visual
  }
}

/** Falso anúncio no canto inferior direito. Ativa quando `enabled` vira true */
export function Plim({ enabled }: { enabled: boolean }) {
  const [visible, setVisible] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const shown = useRef(false)

  // Agenda a (única) aparição
  useEffect(() => {
    if (!enabled || shown.current) return
    const id = setTimeout(() => {
      shown.current = true
      setVisible(true)
      // o som entra junto com o "plim" na tela, depois da marca
      setTimeout(chime, 900)
    }, DELAY_MS)
    return () => clearTimeout(id)
  }, [enabled])

  // Relógio do "anúncio" e fim automático
  useEffect(() => {
    if (!visible) return
    const tick = setInterval(() => setElapsed((t) => t + 1), 1000)
    const close = setTimeout(() => setVisible(false), DURATION_S * 1000)
    return () => {
      clearInterval(tick)
      clearTimeout(close)
    }
  }, [visible])

  const canSkip = elapsed >= SKIP_AFTER_S
  const remaining = Math.max(0, DURATION_S - elapsed)

  return (
    <AnimatePresence>
      {visible && (
        <motion.aside
          className="plim"
          aria-label="Easter egg"
          initial={{ opacity: 0, y: 60, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 40, scale: 0.95 }}
          transition={{ type: 'spring', stiffness: 220, damping: 22 }}
        >
          <div className="plim__top">
            <span className="plim__badge">Anúncio</span>
            <span className="plim__time">
              0:{String(remaining).padStart(2, '0')}
            </span>
          </div>

          <div className="plim__screen">
            {/* ordem do comercial: marca, plim-plom-plim, slogan */}
            <strong className="plim__brand">Principia</strong>
            <span className="plim__sound" style={{ animationDelay: '0.9s' }}>
              plim,
            </span>
            <span className="plim__sound" style={{ animationDelay: '1.45s' }}>
              plom,
            </span>
            <span className="plim__sound" style={{ animationDelay: '2s' }}>
              plim…
            </span>
            <p className="plim__claim">A marca número um recomendada por dermatologistas*</p>
            <small className="plim__fine">*segundo a propaganda que a Helena já sabe de cor</small>
          </div>

          <div className="plim__bar">
            <span style={{ width: `${(elapsed / DURATION_S) * 100}%` }} />
          </div>

          <button type="button" className="plim__skip" disabled={!canSkip} onClick={() => setVisible(false)}>
            {canSkip ? 'Pular ▸▏' : `Pular em ${SKIP_AFTER_S - elapsed}`}
          </button>
        </motion.aside>
      )}
    </AnimatePresence>
  )
}
