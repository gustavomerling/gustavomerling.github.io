import type { DebugState } from '../game/Game'
import { POSE_IDS, POSES, type PoseId } from '../game/npc/poses'

/** Opções de resolução (pixels por pixel CSS), até o máximo da tela. */
const maxRatio = Math.min(Math.max(window.devicePixelRatio, 1), 2)
export const RES_OPTIONS = [0.5, 0.75, 1, 1.5, 2].filter((r) => r <= maxRatio)

interface Props {
  ready: boolean
  sensitivity: number
  pixelRatio: number
  debug: DebugState
  onPlay: () => void
  onSensitivity: (v: number) => void
  onPixelRatio: (v: number) => void
  onDebug: (patch: Partial<DebugState>) => void
  onStep: () => void
  onReset: () => void
  built: number
  onClearBuilt: () => void
}

export function PauseMenu(p: Props) {
  return (
    <div className="pause" onClick={p.onPlay}>
      <div className="pause-card" onClick={(e) => e.stopPropagation()}>
        <h1>Human in the Loop</h1>
        <p className="step">Passo 8 · motores do NPC</p>
        <button className="play" disabled={!p.ready} onClick={p.onPlay}>
          {p.ready ? 'Clique para entrar' : 'Carregando física…'}
        </button>

        <label className="field">
          <span>
            Sensibilidade do mouse <b>{p.sensitivity.toFixed(2)}</b>
          </span>
          <input
            type="range"
            min={0.2}
            max={3}
            step={0.05}
            value={p.sensitivity}
            onChange={(e) => p.onSensitivity(Number(e.target.value))}
          />
        </label>
        <label className="field">
          <span>Resolução</span>
          <select value={p.pixelRatio} onChange={(e) => p.onPixelRatio(Number(e.target.value))}>
            {RES_OPTIONS.map((r) => (
              <option key={r} value={r}>
                {Math.round(r * 100)}%{r === 1 ? ' (padrão)' : ''}
              </option>
            ))}
          </select>
        </label>

        <fieldset className="debug-box">
          <legend>Debug</legend>
          <label className="check">
            <input type="checkbox" checked={p.debug.panel} onChange={(e) => p.onDebug({ panel: e.target.checked })} />
            Painel durante o jogo <kbd>`</kbd>
          </label>
          <label className="check">
            <input
              type="checkbox"
              checked={p.debug.colliders}
              onChange={(e) => p.onDebug({ colliders: e.target.checked })}
            />
            Mostrar colisores <kbd>V</kbd>
          </label>
          <label className="check">
            <input type="checkbox" checked={p.debug.paused} onChange={(e) => p.onDebug({ paused: e.target.checked })} />
            Pausar física <kbd>P</kbd>
          </label>
          <label className="field">
            <span>
              Força do NPC <b>{Math.round(p.debug.npcStrength * 100)}%</b>
            </span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={p.debug.npcStrength}
              onChange={(e) => p.onDebug({ npcStrength: Number(e.target.value) })}
            />
            <small className="range-ends">
              <span>mole</span>
              <span>
                <kbd>[</kbd> <kbd>]</kbd>
              </span>
              <span>estátua</span>
            </small>
          </label>
          <label className="field">
            <span>
              Pose-alvo <kbd>N</kbd>
            </span>
            <select value={p.debug.npcPose} onChange={(e) => p.onDebug({ npcPose: e.target.value as PoseId })}>
              {POSE_IDS.map((id) => (
                <option key={id} value={id}>
                  {POSES[id].label}
                </option>
              ))}
            </select>
          </label>
          <div className="buttons">
            <button disabled={!p.debug.paused} onClick={p.onStep}>
              Avançar 1 passo <kbd>.</kbd>
            </button>
            <button onClick={p.onReset}>
              Resetar cena <kbd>R</kbd>
            </button>
          </div>
        </fieldset>

        <div className="buttons">
          <button disabled={p.built === 0} onClick={p.onClearBuilt}>
            Remover construções ({p.built})
          </button>
        </div>

        <ul className="hint">
          <li>WASD: andar · Shift: correr · Espaço: pular · C: agachar</li>
          <li>B: modo construção · T: soltar o NPC à sua frente</li>
          <li>Esc: soltar o mouse · P, V e . funcionam com o painel aberto</li>
        </ul>
      </div>
    </div>
  )
}
