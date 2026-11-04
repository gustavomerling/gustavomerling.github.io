import { useState } from 'react'
import { AboutPanel, ControlsSheet, SettingsForm, type SettingsProps } from './MenuPanels'
import { MenuLayout, type NavItem } from './MenuLayout'
import { GAME_MODES, MODE_LABELS, type GameMode } from '../game/arena/Arena'

const MODE_TEXT: Record<GameMode, string> = {
  sandbox:
    'Um manequim de crash test com ragdoll ativo, uma sala de testes e você. Ele anda, corre, se esquiva da mira, procura cobertura e se protege. Empurre, atire, arremesse caixas, amarre e construa: tudo é física. Pela porta atrás de você, um exemplar de cada tipo de sala da masmorra.',
  zombie:
    'Uma masmorra de salas ligadas por portas. Zumbis aparecem quando você entra numa sala: só morrem com tiro na cabeça. Colete munição, armas e kits de vida pelo caminho; você tem vida limitada. Limpe a sala final e pise no alçapão para escapar.',
  swat:
    'A mesma masmorra, agora com agentes armados. Eles procuram cobertura, miram e atiram. Colete munição, armas e kits de vida; você tem vida limitada. Limpe a sala final e pise no alçapão para escapar.',
}

type Tab = 'home' | 'controls' | 'settings' | 'about'

const TITLES: Record<Tab, string> = {
  home: 'Simulação',
  controls: 'Controles',
  settings: 'Ajustes',
  about: 'Sobre',
}

interface Props extends SettingsProps {
  ready: boolean
  onPlay: () => void
  mode: GameMode
  onMode: (m: GameMode) => void
}

/** Tela inicial, antes de capturar o mouse pela primeira vez. A cena roda atrás. */
export function MainMenu(p: Props) {
  const [tab, setTab] = useState<Tab>('home')
  const nav: NavItem[] = [
    {
      id: 'play',
      label: p.ready ? `Jogar: ${MODE_LABELS[p.mode]}` : 'Carregando…',
      primary: true,
      disabled: !p.ready,
      onClick: p.onPlay,
    },
    { id: 'controls', label: 'Controles' },
    { id: 'settings', label: 'Ajustes' },
    { id: 'about', label: 'Sobre' },
  ]

  return (
    <MenuLayout
      variant="main"
      nav={nav}
      tab={tab}
      onTab={(id) => setTab(id as Tab)}
      title={TITLES[tab]}
      tag={tab === 'home' ? MODE_LABELS[p.mode].toLowerCase() : undefined}
      footer={
        <>
          <span className={p.ready ? 'status-dot ok' : 'status-dot'} />
          {p.ready ? 'física pronta · 60 Hz' : 'inicializando física…'}
        </>
      }
    >
      {tab === 'home' && <Home ready={p.ready} mode={p.mode} onMode={p.onMode} onControls={() => setTab('controls')} />}
      {tab === 'controls' && <ControlsSheet />}
      {tab === 'settings' && <SettingsForm {...p} />}
      {tab === 'about' && <AboutPanel />}
    </MenuLayout>
  )
}

function Home({
  ready,
  mode,
  onMode,
  onControls,
}: {
  ready: boolean
  mode: GameMode
  onMode: (m: GameMode) => void
  onControls: () => void
}) {
  return (
    <div className="home">
      <div className="field">
        <span>Modo</span>
        <div className="segmented" role="radiogroup" aria-label="Modo de jogo">
          {GAME_MODES.map((m) => (
            <button key={m} role="radio" aria-checked={m === mode} className={m === mode ? 'on' : undefined} onClick={() => onMode(m)}>
              {MODE_LABELS[m]}
            </button>
          ))}
        </div>
      </div>
      <p className="about-lead">{MODE_TEXT[mode]}</p>
      <ul className="home-quick">
        <li>
          <span className="keys">
            <kbd>W</kbd>
            <kbd>A</kbd>
            <kbd>S</kbd>
            <kbd>D</kbd>
          </span>
          andar
        </li>
        <li>
          <span className="keys">
            <kbd className="wide">Botão esq.</kbd>
          </span>
          atirar / golpear
        </li>
        <li>
          <span className="keys">
            <kbd>F</kbd>
            <kbd>G</kbd>
          </span>
          empurrar o NPC
        </li>
        <li>
          <span className="keys">
            <kbd className="wide">Botão dir.</kbd>
          </span>
          agarrar (mãos) / mirar
        </li>
        <li>
          <span className="keys">
            <kbd>Q</kbd>
          </span>
          menu de spawn
        </li>
      </ul>
      <button className="link-button" onClick={onControls}>
        Ver todos os controles →
      </button>
      <p className="home-note">
        {ready
          ? 'Ao iniciar, o navegador captura o mouse. Esc solta e abre a pausa.'
          : 'Preparando a física (WASM). Leva só um instante.'}
      </p>
    </div>
  )
}
