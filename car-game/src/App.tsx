import { useEffect, useRef, useState } from 'react'
import { PHYSICS_HZ, startScene, type SimStats } from './game/scene'
import { visual } from './game/visual'

// Ordem das rodas em vehicle.ts: 0 e 1 dianteiras (0 no lado direito do carro), 2 e 3 traseiras
const WHEEL_NAMES = ['FD', 'FE', 'TD', 'TE']

export default function App() {
  const mountRef = useRef<HTMLDivElement>(null)
  const [stats, setStats] = useState<SimStats | null>(null)
  const [showDebug, setShowDebug] = useState(true)
  const [showVisual, setShowVisual] = useState(false)
  // Só para re-renderizar o painel quando um ajuste muda (os valores vivem em visual)
  const [, setVisualTick] = useState(0)

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
      if (e.key === 'F4') {
        e.preventDefault()
        setShowVisual((v) => !v)
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
        Arraste para girar a câmera · F3 = debug · F4 = ajustes visuais
        <br />
        WASD ou setas dirigem · Espaço = freio de mão · Q/E = marcha · B = ABS · C = câmera · R = reiniciar
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
          <div className="section">Motor</div>
          <div>
            Marcha <strong>{stats.engine.gear}</strong> · rotação <strong>{Math.round(stats.engine.rpm)} rpm</strong>
          </div>
          <div>
            Torque na roda traseira <strong>{Math.round(stats.engine.torque)} N·m</strong>
          </div>
          <div>
            ABS <strong>{stats.abs ? 'ligado' : 'desligado'}</strong>
          </div>
          <div>
            Direção <strong>{stats.steerDeg.toFixed(1)}°</strong>
          </div>
          <div className="section">Chassi</div>
          <div>
            Altura <strong>{stats.chassisY.toFixed(2)} m</strong>
          </div>
          <div>
            Velocidade <strong>{stats.chassisSpeed.toFixed(2)} m/s</strong>
          </div>
          <div>
            Arfagem <strong>{stats.pitchDeg.toFixed(1)}°</strong> (+ nariz para cima) · Rolagem{' '}
            <strong>{stats.rollDeg.toFixed(1)}°</strong> (+ esquerda para cima)
          </div>
          <div className="section">Suspensão e carga</div>
          {stats.wheels.map((w, i) => (
            <div key={i}>
              {WHEEL_NAMES[i]}{' '}
              <strong>{w.suspensionLength.toFixed(2)} m</strong> · carga <strong>{Math.round(w.load)} N</strong>{' '}
              {w.inContact ? '' : '(no ar)'}
            </div>
          ))}
          <div className="section">Pneus</div>
          {stats.wheels.map((w, i) => (
            <div key={i}>
              {WHEEL_NAMES[i]}{' '}
              slip <strong>{(w.slipRatio * 100).toFixed(0)}%</strong> · ângulo{' '}
              <strong>{w.slipAngleDeg.toFixed(1)}°</strong>
            </div>
          ))}
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
      {showVisual && (
        <div className="visual-panel">
          <div className="section">Ajustes visuais</div>
          <label>
            Sol (intensidade) <strong>{visual.sunIntensity.toFixed(1)}</strong>
            <input
              type="range"
              min={0}
              max={4}
              step={0.1}
              value={visual.sunIntensity}
              onChange={(e) => {
                visual.sunIntensity = Number(e.target.value)
                setVisualTick((t) => t + 1)
              }}
            />
          </label>
          <label>
            Sol (altura) <strong>{visual.sunElevationDeg}°</strong>
            <input
              type="range"
              min={10}
              max={85}
              step={1}
              value={visual.sunElevationDeg}
              onChange={(e) => {
                visual.sunElevationDeg = Number(e.target.value)
                setVisualTick((t) => t + 1)
              }}
            />
          </label>
          <label>
            Exposição <strong>{visual.exposure.toFixed(2)}</strong>
            <input
              type="range"
              min={0.4}
              max={1.8}
              step={0.05}
              value={visual.exposure}
              onChange={(e) => {
                visual.exposure = Number(e.target.value)
                setVisualTick((t) => t + 1)
              }}
            />
          </label>
          <label className="check">
            <input
              type="checkbox"
              checked={visual.bloom}
              onChange={(e) => {
                visual.bloom = e.target.checked
                setVisualTick((t) => t + 1)
              }}
            />
            Brilho (bloom)
          </label>
          <label>
            Força do brilho <strong>{visual.bloomStrength.toFixed(2)}</strong>
            <input
              type="range"
              min={0}
              max={1.5}
              step={0.05}
              value={visual.bloomStrength}
              onChange={(e) => {
                visual.bloomStrength = Number(e.target.value)
                setVisualTick((t) => t + 1)
              }}
            />
          </label>
        </div>
      )}
    </>
  )
}
