import { useState } from 'react'
import type { DebugState } from '../game/Game'
import { POSE_IDS, POSES, type PoseId } from '../game/npc/poses'
import { ControlsSheet, SettingsForm } from './MenuPanels'
import { MenuLayout, type NavItem } from './MenuLayout'

export { RES_OPTIONS } from './MenuPanels'

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
  fov?: number
  onFov?: (v: number) => void
  /** Volta para a tela inicial. */
  onMainMenu?: () => void
}

type Tab = 'lab' | 'controls' | 'settings'

const TITLES: Record<Tab, string> = { lab: 'Laboratório', controls: 'Controles', settings: 'Ajustes' }

/** Pausa (mouse solto depois de já ter entrado). Clicar fora do quadro volta ao jogo. */
export function PauseMenu(p: Props) {
  const [tab, setTab] = useState<Tab>('lab')
  const nav: NavItem[] = [
    { id: 'play', label: p.ready ? 'Continuar' : 'Carregando física…', primary: true, disabled: !p.ready, onClick: p.onPlay },
    { id: 'lab', label: 'Laboratório' },
    { id: 'controls', label: 'Controles' },
    { id: 'settings', label: 'Ajustes' },
  ]
  if (p.onMainMenu) nav.push({ id: 'menu', label: 'Menu inicial', onClick: p.onMainMenu })

  return (
    <MenuLayout
      variant="pause"
      nav={nav}
      tab={tab}
      onTab={(id) => setTab(id as Tab)}
      title={TITLES[tab]}
      tag={tab === 'lab' && p.debug.paused ? 'física pausada' : undefined}
      onBackdrop={p.onPlay}
      footer="clique fora do quadro para voltar"
    >
      {tab === 'lab' && <Lab {...p} />}
      {tab === 'controls' && <ControlsSheet />}
      {tab === 'settings' && <SettingsForm {...p} />}
    </MenuLayout>
  )
}

function Check({ on, label, k, onChange }: { on: boolean; label: string; k: string; onChange: (v: boolean) => void }) {
  return (
    <label className="check">
      <input type="checkbox" checked={on} onChange={(e) => onChange(e.target.checked)} />
      <span>{label}</span>
      <kbd>{k}</kbd>
    </label>
  )
}

function Lab(p: Props) {
  return (
    <div className="lab">
      <div className="lab-actions">
        <button onClick={p.onReset}>
          Resetar cena <kbd>R</kbd>
        </button>
        <button disabled={p.built === 0} onClick={p.onClearBuilt}>
          Remover construções <span className="count">{p.built}</span>
        </button>
      </div>

      <div className="lab-columns">
        <fieldset className="lab-box">
          <legend>Física e visualização</legend>
          <Check on={p.debug.panel} label="Painel durante o jogo" k="`" onChange={(panel) => p.onDebug({ panel })} />
          <Check on={p.debug.colliders} label="Mostrar colisores" k="V" onChange={(colliders) => p.onDebug({ colliders })} />
          <Check on={p.debug.paused} label="Pausar física" k="P" onChange={(paused) => p.onDebug({ paused })} />
          <div className="buttons">
            <button disabled={!p.debug.paused} onClick={p.onStep}>
              Avançar 1 passo <kbd>.</kbd>
            </button>
          </div>
        </fieldset>

        <fieldset className="lab-box">
          <legend>Manequim (NPC)</legend>
          <label className="field">
            <span>
              Força dos motores <b>{Math.round(p.debug.npcStrength * 100)}%</b>
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
          <Check on={p.debug.npcBalance} label="Equilíbrio" k="K" onChange={(npcBalance) => p.onDebug({ npcBalance })} />
          <Check
            on={p.debug.npcAutoGetUp}
            label="Levantar sozinho"
            k="L"
            onChange={(npcAutoGetUp) => p.onDebug({ npcAutoGetUp })}
          />
          <Check on={p.debug.npcLook} label="Olhar para o jogador" k="O" onChange={(npcLook) => p.onDebug({ npcLook })} />
          <Check on={p.debug.npcAi} label="IA (ver, esquivar, fugir, cobertura)" k="I" onChange={(npcAi) => p.onDebug({ npcAi })} />
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
        </fieldset>
      </div>
    </div>
  )
}
