import { useEffect, useRef, useState } from 'react'
import { PHYSICS_HZ, startScene, type SimStats } from './game/scene'

export default function App() {
  const mountRef = useRef<HTMLDivElement>(null)
  const [stats, setStats] = useState<SimStats | null>(null)
  const [showDebug, setShowDebug] = useState(true)

  useEffect(() => {
    if (!mountRef.current) return
    return startScene(mountRef.current, setStats)
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'F3') {
        e.preventDefault()
        setShowDebug((v) => !v)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const input = stats?.input
  const pct = (v: number) => `${Math.round(v * 100)}%`

  return (
    <>
      <div className="viewport" ref={mountRef} />
      <div className="hud">
        <strong>Car Game</strong> · hello world
        <br />
        Arraste para girar a câmera · F3 = painel de debug
        <br />
        WASD ou setas dirigem · Espaço = freio de mão · R = reiniciar
      </div>
      {showDebug && stats && (
        <div className="debug">
          <div>
            FPS <strong>{stats.fps.toFixed(0)}</strong>
          </div>
          <div>
            Física <strong>{PHYSICS_HZ} Hz</strong> (passo fixo)
          </div>
          <div>
            Passos neste quadro <strong>{stats.stepsLastFrame}</strong>
          </div>
          <div>
            Acumulador <strong>{stats.accumulatorMs.toFixed(1)} ms</strong>
          </div>
          <div>
            Tempo simulado <strong>{stats.simTime.toFixed(2)} s</strong>
          </div>
          {stats.clamped && <div className="warn">quadro longo cortado</div>}
          <div className="section">Chassi</div>
          <div>
            Altura <strong>{stats.chassisY.toFixed(2)} m</strong>
          </div>
          <div>
            Velocidade <strong>{stats.chassisSpeed.toFixed(2)} m/s</strong>
          </div>
          {input && (
            <>
              <div className="section">Entrada</div>
              <div>
                Acelerador <strong>{pct(input.throttle)}</strong>
              </div>
              <div>
                Freio <strong>{pct(input.brake)}</strong>
              </div>
              <div>
                Direção <strong>{input.steer > 0 ? 'direita' : input.steer < 0 ? 'esquerda' : 'centro'}</strong>{' '}
                ({input.steer.toFixed(0)})
              </div>
              <div>
                Freio de mão <strong>{input.handbrake ? 'sim' : 'não'}</strong>
              </div>
            </>
          )}
        </div>
      )}
    </>
  )
}
