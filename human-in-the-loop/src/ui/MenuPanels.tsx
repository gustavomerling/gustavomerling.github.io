import { NPC_KINDS, NPC_KIND_LABELS, type NpcKind } from '../game/npc/types'
import { CONTROL_GROUPS, KEY_LABELS, type Binding } from './controls'

/** Opções de resolução (pixels por pixel CSS), até o máximo da tela. */
const maxRatio = Math.min(Math.max(window.devicePixelRatio, 1), 2)
export const RES_OPTIONS = [0.5, 0.75, 1, 1.5, 2].filter((r) => r <= maxRatio)

export const FOV_RANGE = { min: 60, max: 100, default: 70 }

function Keys({ b }: { b: Binding }) {
  return (
    <span className={b.alt ? 'keys alt' : 'keys'}>
      {b.keys.map((k, i) => (
        <kbd key={i} className={KEY_LABELS[k] ? 'wide' : undefined}>
          {KEY_LABELS[k] ?? k}
        </kbd>
      ))}
    </span>
  )
}

/** Folha de controles, gerada a partir de `CONTROL_GROUPS`. */
export function ControlsSheet() {
  return (
    <div className="controls-sheet">
      {CONTROL_GROUPS.map((g) => (
        <section key={g.id} className="controls-group">
          <h3>{g.title}</h3>
          <ul>
            {g.bindings.map((b, i) => (
              <li key={i}>
                <Keys b={b} />
                <span className="binding-action">
                  {b.action}
                  {b.note && <small>{b.note}</small>}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}

export interface SettingsProps {
  sensitivity: number
  pixelRatio: number
  onSensitivity: (v: number) => void
  onPixelRatio: (v: number) => void
  fov?: number
  onFov?: (v: number) => void
  /** Tipo do NPC; trocar reinicia a simulação. */
  npcKind?: NpcKind
  onNpcKind?: (k: NpcKind) => void
  /** Sangue: 0 desligado, 0.5 baixo, 1 normal, 2 alto. */
  blood?: number
  onBlood?: (v: number) => void
}

const BLOOD_OPTIONS: [number, string][] = [
  [0, 'Desligado'],
  [0.5, 'Baixo'],
  [1, 'Normal'],
  [2, 'Alto'],
]

/** Ajustes do jogador (sensibilidade, qualidade, campo de visão). */
export function SettingsForm(p: SettingsProps) {
  return (
    <div className="settings">
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
        <small className="range-ends">
          <span>lenta</span>
          <span>rápida</span>
        </small>
      </label>

      {p.fov !== undefined && p.onFov && (
        <label className="field">
          <span>
            Campo de visão <b>{Math.round(p.fov)}°</b>
          </span>
          <input
            type="range"
            min={FOV_RANGE.min}
            max={FOV_RANGE.max}
            step={1}
            value={p.fov}
            onChange={(e) => p.onFov?.(Number(e.target.value))}
          />
          <small className="range-ends">
            <span>{FOV_RANGE.min}°</span>
            <span>padrão {FOV_RANGE.default}°</span>
            <span>{FOV_RANGE.max}°</span>
          </small>
        </label>
      )}

      {p.npcKind && p.onNpcKind && (
        <div className="field">
          <span>Tipo de NPC</span>
          <div className="segmented" role="radiogroup" aria-label="Tipo de NPC">
            {NPC_KINDS.map((k) => (
              <button
                key={k}
                role="radio"
                aria-checked={k === p.npcKind}
                className={k === p.npcKind ? 'on' : undefined}
                onClick={() => p.onNpcKind?.(k)}
              >
                {NPC_KIND_LABELS[k]}
              </button>
            ))}
          </div>
          <small className="field-note">Trocar de tipo reinicia a simulação (R mantém o tipo).</small>
        </div>
      )}

      <div className="field">
        <span>Qualidade de render</span>
        <div className="segmented" role="radiogroup" aria-label="Qualidade de render">
          {RES_OPTIONS.map((r) => (
            <button
              key={r}
              role="radio"
              aria-checked={r === p.pixelRatio}
              className={r === p.pixelRatio ? 'on' : undefined}
              onClick={() => p.onPixelRatio(r)}
            >
              {Math.round(r * 100)}%
            </button>
          ))}
        </div>
        <small className="field-note">
          Pixels renderizados por pixel da tela. 100% é o padrão; abaixo disso fica mais leve em notebooks.
        </small>
      </div>

      {p.blood !== undefined && p.onBlood && (
        <div className="field">
          <span>Sangue</span>
          <div className="segmented" role="radiogroup" aria-label="Sangue">
            {BLOOD_OPTIONS.map(([v, label]) => (
              <button
                key={v}
                role="radio"
                aria-checked={v === p.blood}
                className={v === p.blood ? 'on' : undefined}
                onClick={() => p.onBlood?.(v)}
              >
                {label}
              </button>
            ))}
          </div>
          <small className="field-note">Respingos, poças e rastro. Desligado remove tudo e poupa processamento.</small>
        </div>
      )}
    </div>
  )
}

/** Texto do "Sobre". */
export function AboutPanel() {
  return (
    <div className="about">
      <p className="about-lead">
        Uma engine e sandbox de física em primeira pessoa. No centro dela, um único manequim de crash test
        controlado por <b>ragdoll ativo</b>.
      </p>
      <p>
        O NPC é um corpo físico com motores nas juntas, não uma animação gravada. A IA escolhe uma pose-alvo e os
        motores tentam alcançá-la; quem decide o resultado é a física. Por isso cada empurrão, tropeço, queda e
        tentativa de levantar sai diferente.
      </p>
      <p>
        Você é o humano no loop: empurre, atire, golpeie, construa obstáculos e observe como ele reage. Ferimentos
        são localizados (perna ferida manca, braço ferido fica pendurado) e sem gore.
      </p>
      <dl className="about-facts">
        <div>
          <dt>Sujeitos</dt>
          <dd>1 manequim por simulação</dd>
        </div>
        <div>
          <dt>Regra</dt>
          <dd>o NPC nunca usa armas</dd>
        </div>
        <div>
          <dt>Física</dt>
          <dd>Rapier · passo fixo de 60 Hz</dd>
        </div>
        <div>
          <dt>Render</dt>
          <dd>Three.js · React só no HUD</dd>
        </div>
      </dl>
    </div>
  )
}
