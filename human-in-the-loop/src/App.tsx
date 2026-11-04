import { useEffect, useRef, useState } from 'react'
import { createGame, type Game, type GameStats } from './game/Game'

const SENS_KEY = 'hitl.sensitivity'
const RES_KEY = 'hitl.pixelRatio'

function loadNumber(key: string, fallback: number): number {
  try {
    const v = Number(localStorage.getItem(key))
    return v > 0 ? v : fallback
  } catch {
    return fallback
  }
}

function saveNumber(key: string, value: number) {
  try {
    localStorage.setItem(key, String(value))
  } catch {
    // Sem storage (aba privada etc.): só não lembra o valor.
  }
}

/** Opções de resolução (pixels por pixel CSS), até o máximo da tela. */
const maxRatio = Math.min(Math.max(window.devicePixelRatio, 1), 2)
const RES_OPTIONS = [0.5, 0.75, 1, 1.5, 2].filter((r) => r <= maxRatio)

/**
 * React cuida só da camada de UI (HUD, menus). A cena 3D e a física rodam
 * fora do ciclo de render do React, num loop imperativo próprio.
 */
export default function App() {
  const hostRef = useRef<HTMLDivElement>(null)
  const gameRef = useRef<Game | undefined>(undefined)
  const [ready, setReady] = useState(false)
  const [locked, setLocked] = useState(false)
  const [sensitivity, setSensitivity] = useState(() => loadNumber(SENS_KEY, 1))
  const [pixelRatio, setPixelRatio] = useState(() => {
    const saved = loadNumber(RES_KEY, 1)
    return RES_OPTIONS.includes(saved) ? saved : 1
  })
  const [stats, setStats] = useState<GameStats | null>(null)

  useEffect(() => {
    const host = hostRef.current
    if (!host) return
    let cancelled = false
    createGame(host, { onLockChange: setLocked, onStats: setStats }).then((g) => {
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
    saveNumber(SENS_KEY, sensitivity)
  }, [sensitivity, ready])

  useEffect(() => {
    gameRef.current?.setPixelRatio(pixelRatio)
    saveNumber(RES_KEY, pixelRatio)
  }, [pixelRatio, ready])

  return (
    <>
      <div ref={hostRef} className="viewport" />
      {locked && <div className="crosshair" />}
      {stats && (
        <div className="stats">
          {Math.round(stats.fps)} FPS · física {stats.physicsMs.toFixed(1)} ms · render {stats.renderMs.toFixed(1)} ms
        </div>
      )}
      {!locked && (
        <div className="pause" onClick={() => gameRef.current?.lock()}>
          <div className="pause-card" onClick={(e) => e.stopPropagation()}>
            <h1>Human in the Loop</h1>
            <p className="step">Passo 3 · corpo do jogador</p>
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
            <label className="field">
              <span>Resolução</span>
              <select value={pixelRatio} onChange={(e) => setPixelRatio(Number(e.target.value))}>
                {RES_OPTIONS.map((r) => (
                  <option key={r} value={r}>
                    {Math.round(r * 100)}%{r === 1 ? ' (padrão)' : ''}
                  </option>
                ))}
              </select>
            </label>
            <ul className="hint">
              <li>WASD: andar · Shift: correr</li>
              <li>Espaço: pular · C: agachar</li>
              <li>R: voltar ao início · Esc: soltar o mouse</li>
            </ul>
          </div>
        </div>
      )}
    </>
  )
}
