import { ArrowLeft, BookOpen, Flame, Fuel, HardHat, Settings, Sparkles, Star, type LucideIcon } from 'lucide-react'
import { useEffect, type ReactNode } from 'react'
import { MEDALS } from '../../game/medals'
import { POINTS } from '../../game/physics/Simulation'
import type { GameOptions } from '../../game/storage'
import { MedalIcon, WheelIcon } from '../ui/icons'

/** Moldura comum das telas secundárias (Esc volta). */
function Screen({ title, Icon, onBack, children, className = '' }: { title: string; Icon: LucideIcon; onBack: () => void; children: ReactNode; className?: string }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Backspace') onBack()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onBack])
  return (
    <div className="menu-screen">
      <div className={`menu-panel wide ${className}`}>
        <h2 className="screen-title">
          <Icon size={26} /> {title}
        </h2>
        {children}
        <button className="back" onClick={onBack}>
          <ArrowLeft size={16} /> Voltar (Esc)
        </button>
      </div>
    </div>
  )
}

export function HowTo({ onBack }: { onBack: () => void }) {
  const keys: [string, string][] = [
    ['↑ / W', 'Acelerar'],
    ['↓ / S', 'Frear (parado: ré)'],
    ['← → / A D', 'Inclinar o carro no ar e no chão'],
    ['Espaço', 'Freio de mão'],
    ['Shift', 'Nitro'],
    ['F', 'Desvirar o carro'],
    ['C', 'Voltar ao último checkpoint'],
    ['P / M', 'Pausa / som'],
    ['R / N / G', 'Reiniciar / nova pista / garagem'],
  ]
  return (
    <Screen title="Como jogar" Icon={BookOpen} onBack={onBack}>
      <div className="howto">
        <section>
          <h3>Controles</h3>
          <table>
            <tbody>
              {keys.map(([k, v]) => (
                <tr key={k}>
                  <td>
                    <kbd>{k}</kbd>
                  </td>
                  <td>{v}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="hint">Também funciona com controle de videogame (RT acelera, LT freia, A nitro, Y desvira, X checkpoint) e com toque no celular.</p>
        </section>
        <section>
          <h3>Garagem</h3>
          <ul>
            <li>Arraste peças da paleta para o carro. Pontos verdes mostram onde dá para encaixar.</li>
            <li>Suspensão: o topo prende no chassi ou numa ponta de eixo; roda ou eixo vão no cubo de baixo.</li>
            <li>Eixos são balancins (±80°) e aceitam mais suspensões nas pontas.</li>
            <li>Bandeiras encaixam na borda do chassi e envergam com o movimento.</li>
            <li>Q / E giram, Ctrl+D duplica, M espelha, T liga/desliga a tração da roda, Ctrl+Z desfaz.</li>
          </ul>
          <h3>Pista</h3>
          <ul>
            <li>
              <Fuel size={15} /> O combustível acaba: pegue os galões vermelhos.
            </li>
            <li>
              <HardHat size={15} /> Se o capacete do piloto bater no chão, a corrida acaba (dá para voltar ao checkpoint).
            </li>
            <li>
              <Star size={15} /> Estrela = {POINTS.star} pts · mortal = {POINTS.flip} pts · voo longo = {POINTS.airPerSecond} pts/s · 1 pt por metro.
            </li>
            <li>
              <Flame size={15} /> Faixas laranja dão turbo; plataformas vermelhas são trampolins.
            </li>
            {MEDALS.slice(1).map((m, i) => (
              <li key={m.name}>
                <MedalIcon level={i + 1} size={15} /> {m.name}: {m.rule}.
              </li>
            ))}
          </ul>
        </section>
      </div>
    </Screen>
  )
}

const OPTION_LABELS: { key: keyof GameOptions; label: string; hint: string }[] = [
  { key: 'sound', label: 'Som', hint: 'Motor e efeitos sonoros' },
  { key: 'fragile', label: 'Piloto frágil', hint: 'Capacete no chão encerra a corrida' },
  { key: 'fuel', label: 'Combustível', hint: 'Tanque esvazia; pegue galões na pista' },
  { key: 'ghost', label: 'Carro fantasma', hint: 'Mostra seu melhor percurso da sessão' },
  { key: 'particles', label: 'Partículas', hint: 'Poeira e lama saindo das rodas' },
]

export function OptionsScreen({ options, onChange, onBack }: { options: GameOptions; onChange: (o: GameOptions) => void; onBack: () => void }) {
  return (
    <Screen title="Opções" Icon={Settings} onBack={onBack}>
      <div className="options">
        {OPTION_LABELS.map((o) => (
          <label key={o.key} className="switch-row">
            <span>
              <b>{o.label}</b>
              <small>{o.hint}</small>
            </span>
            <input type="checkbox" className="switch" checked={options[o.key]} onChange={(e) => onChange({ ...options, [o.key]: e.target.checked })} />
          </label>
        ))}
      </div>
    </Screen>
  )
}

export function Credits({ onBack }: { onBack: () => void }) {
  const lines: [string, string][] = [
    ['Ideia, direção e testes', 'Gustavo Merling'],
    ['Programação', 'Claude (Anthropic)'],
    ['Motor de física', 'planck.js — port do Box2D de Erin Catto'],
    ['Feito com', 'React · Vite · TypeScript'],
    ['Sons', 'Sintetizados na hora com Web Audio'],
    ['Arte', 'SVG desenhado em código'],
  ]
  return (
    <Screen title="Créditos" Icon={Sparkles} onBack={onBack} className="credits-panel">
      <div className="credits">
        <div className="credits-roll">
          {lines.map(([role, name]) => (
            <div key={role} className="credit">
              <small>{role}</small>
              <b>{name}</b>
            </div>
          ))}
          <div className="credit thanks">
            Obrigado por jogar! <WheelIcon size={22} />
          </div>
        </div>
      </div>
    </Screen>
  )
}
