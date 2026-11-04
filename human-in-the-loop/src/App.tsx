import { useEffect, useRef, useState } from 'react'
import { createGame, type Game } from './game/Game'

const SENS_KEY = 'hitl.sensitivity'

function loadSensitivity(): number {
  try {
    const v = Number(localStorage.getItem(SENS_KEY))
    return v > 0 ? v : 1
  } catch {
    return 1
  }
}

/**
 * React cuida só da camada de UI (HUD, menus). A cena 3D e a física rodam
 * fora do ciclo de render do React, num loop imperativo próprio.
 */
export default function App() {
  const hostRef = useRef<HTMLDivElement>(null)
  const gameRef = useRef<Game | undefined>(undefined)
  const [ready, setReady] = useState(false)
  const [locked, setLocked] = useState(false)
  const [sensitivity, setSensitivity] = useState(loadSensitivity)

  useEffect(() => {
    const host = hostRef.current
    if (!host) return
    let cancelled = false
    createGame(host, { onLockChange: setLocked }).then((g) => {
      if (cancelled) return g.dispose()
      gameRef.current = g
      setReady(true)
    })
    return () => {
      cancelled = true
      gameRef.current?.dispose()
      gameRef.current = undefined
    }
  }, [])

  useEffect(() => {
    gameRef.current?.setSensitivity(sensitivity)
    try {
      localStorage.setItem(SENS_KEY, String(sensitivity))
    } catch {
      // Sem storage (aba privada etc.): só não lembra o valor.
    }
  }, [sensitivity, ready])

  return (
    <>
      <div ref={hostRef} className="viewport" />
      {locked && <div className="crosshair" />}
      {!locked && (
        <div className="pause" onClick={() => gameRef.current?.lock()}>
          <div className="pause-card" onClick={(e) => e.stopPropagation()}>
            <h1>Human in the Loop</h1>
            <p className="step">Passo 2 · câmera em primeira pessoa</p>
            <button className="play" disabled={!ready} onClick={() => gameRef.current?.lock()}>
              {ready ? 'Clique para entrar' : 'Carregando física…'}
            </button>
            <label className="field">
              <span>
                Sensibilidade do mouse <b>{sensitivity.toFixed(2)}</b>
              </span>
              <input
                type="range"
                min={0.2}
                max={3}
                step={0.05}
                value={sensitivity}
                onChange={(e) => setSensitivity(Number(e.target.value))}
              />
            </label>
            <p className="hint">Mouse: olhar · Esc: soltar o mouse</p>
          </div>
        </div>
      )}
    </>
  )
}
