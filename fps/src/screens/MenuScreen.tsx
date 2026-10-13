import { useState } from 'react'
import type { CSSProperties } from 'react'
import { CONTROL_HELP, type ControlId } from '../engine/controls.ts'
import {
  ArrowBigUp,
  ArrowLeft,
  BookOpen,
  Flashlight,
  ChevronsUp,
  Footprints,
  Gem,
  Layers,
  Lightbulb,
  Lock,
  Move,
  Mouse,
  Pause,
  Play,
  RotateCcw,
  Settings,
  Sparkles,
  Timer,
  Trophy,
  TriangleAlert,
  Volume2,
  type LucideIcon,
} from 'lucide-react'
import { formatTime, loadProgress } from '../app/storage.ts'
import { SettingsPanel } from '../components/SettingsPanel.tsx'
import { LEVELS } from '../engine/levels/index.ts'
import type { GameSettings } from '../engine/settings.ts'

type View = 'home' | 'levels' | 'help' | 'settings'

const CONTROL_ICONS: Record<ControlId, LucideIcon> = {
  move: Move,
  look: Mouse,
  run: Footprints,
  jump: ChevronsUp,
  restart: RotateCcw,
  lantern: Flashlight,
  mute: Volume2,
  pause: Pause,
}

const TIPS: [string, LucideIcon][] = [
  ['Cada nível traz uma novidade. As setas azuis no chão mostram o caminho.', Lightbulb],
  ['No ar, a sombra azul embaixo de você mostra onde vai cair.', ChevronsUp],
  ['Dá para pular logo depois de sair da beirada, e o pulo apertado antes de pousar também vale.', Footprints],
  ['Salto amarelo é longo: segure Shift para correr antes de pular.', Footprints],
  ['As plataformas de metal se movem e te carregam: espere o momento certo.', Timer],
  ['Os blocos listrados de vermelho são perigosos. Tocar neles te devolve ao início do nível.', TriangleAlert],
  ['Trampolins verdes te jogam para o alto. No ar, use WASD para mirar o pouso.', ArrowBigUp],
  ['Lajes rachadas caem logo depois que você pisa. Não pare em cima delas.', TriangleAlert],
  ['Plataformas de energia ligam e desligam, e piscam antes de sumir. As azuis e as rosas se revezam.', Sparkles],
  ['A lanterna (F) ajuda a enxergar nos cantos escuros.', Flashlight],
  ['O cristal verde no topo da torre é a chegada. Comece do Nível 1 para valer recorde.', Gem],
]

function entrance(index: number) {
  return { '--delay': `${index * 70 + 80}ms` } as CSSProperties
}

export function MenuScreen({
  settings,
  onSettingsChange,
  onPlay,
}: {
  settings: GameSettings
  onSettingsChange: (settings: GameSettings) => void
  onPlay: (level: number) => void
}) {
  const [view, setView] = useState<View>('home')
  const [progress] = useState(loadProgress)

  const back = (
    <button className="menu__button menu__back" onClick={() => setView('home')}>
      <ArrowLeft size={18} aria-hidden />
      Voltar
    </button>
  )

  if (view === 'levels') {
    return (
      <div className="menu">
        <div className="menu__panel">
          <p className="menu__eyebrow">Treino</p>
          <h1 className="menu__title menu__title--small">Escolher nível</h1>
          <p className="menu__subtitle">Os níveis que você já alcançou ficam liberados para treinar.</p>

          <ul className="levels">
            {LEVELS.map((level, index) => {
              const open = index <= progress.unlocked
              return (
                <li key={level.id} className="menu__item" style={entrance(index)}>
                  <button className="level-card" disabled={!open} onClick={() => onPlay(index)}>
                    <span className="level-card__number">{index + 1}</span>
                    <span className="level-card__text">
                      <span className="level-card__name">{level.name}</span>
                      <span className="level-card__tagline">{open ? level.tagline : 'Bloqueado'}</span>
                    </span>
                    {open ? <Play size={16} aria-hidden /> : <Lock size={16} aria-hidden />}
                  </button>
                </li>
              )
            })}
          </ul>
          {back}
        </div>
      </div>
    )
  }

  if (view === 'settings') {
    return (
      <div className="menu">
        <div className="menu__panel">
          <p className="menu__eyebrow">Ajustes</p>
          <h1 className="menu__title menu__title--small">Configurações</h1>
          <SettingsPanel settings={settings} onChange={onSettingsChange} />
          {back}
        </div>
      </div>
    )
  }

  if (view === 'help') {
    return (
      <div className="menu">
        <div className="menu__panel">
          <p className="menu__eyebrow">Como jogar</p>
          <h1 className="menu__title menu__title--small">Instruções</h1>

          <h2 className="menu__section">Controles</h2>
          <ul className="menu__controls">
            {CONTROL_HELP.map(({ id, keys, action }) => {
              const Icon = CONTROL_ICONS[id]
              return (
                <li key={id}>
                  <span className="menu__control-label">
                    <Icon className="menu__icon" size={18} aria-hidden />
                    <span className="menu__action">{action}</span>
                  </span>
                  <kbd className="menu__key">{keys}</kbd>
                </li>
              )
            })}
          </ul>

          <h2 className="menu__section">Dicas</h2>
          <ul className="menu__tips">
            {TIPS.map(([tip, Icon]) => (
              <li key={tip}>
                <Icon className="menu__icon" size={18} aria-hidden />
                <span>{tip}</span>
              </li>
            ))}
          </ul>

          {back}
        </div>
      </div>
    )
  }

  return (
    <div className="menu menu--home">
      <div className="menu__skyline" aria-hidden>
        {Array.from({ length: LEVELS.length }, (_, i) => (
          <span key={i} style={{ '--i': i } as CSSProperties} />
        ))}
      </div>
      <div className="menu__panel">
        <p className="menu__eyebrow">Plataforma em primeira pessoa</p>
        <h1 className="menu__title">Parkour</h1>
        <p className="menu__subtitle">
          Escale {LEVELS.length} níveis empilhados até o cristal no topo da torre. Quanto menos quedas, melhor.
        </p>

        {progress.bestTime !== null && (
          <div className="menu__record">
            <Trophy size={18} aria-hidden />
            Recorde <b>{formatTime(progress.bestTime)}</b>
            {progress.bestFalls !== null && (
              <span>
                · {progress.bestFalls} {progress.bestFalls === 1 ? 'queda' : 'quedas'}
              </span>
            )}
          </div>
        )}

        <div className="menu__buttons">
          <button className="menu__play menu__item" style={entrance(0)} onClick={() => onPlay(0)}>
            <Play size={20} aria-hidden />
            Jogar
          </button>
          <button className="menu__button menu__item" style={entrance(1)} onClick={() => setView('levels')}>
            <Layers size={18} aria-hidden />
            Escolher nível
          </button>
          <div className="menu__split">
            <button className="menu__button menu__item" style={entrance(2)} onClick={() => setView('help')}>
              <BookOpen size={18} aria-hidden />
              Instruções
            </button>
            <button className="menu__button menu__item" style={entrance(3)} onClick={() => setView('settings')}>
              <Settings size={18} aria-hidden />
              Ajustes
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
