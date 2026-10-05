import {
  Dices,
  Flag,
  Flame,
  Fuel,
  MapPin,
  Package,
  Pause,
  Play,
  RotateCcw,
  Ruler,
  Star,
  Timer,
  Trophy,
  Undo2,
  Volume2,
  VolumeX,
  Wrench,
  Zap,
  type LucideIcon,
} from 'lucide-react'
import type { ReactNode } from 'react'
import { MEDALS } from '../../game/medals'
import type { SimSnapshot } from '../../game/physics/Simulation'
import type { TrackRecord } from '../../game/storage'
import { DIFFICULTIES, type Terrain } from '../../game/terrain/generate'
import { MEDAL_COLORS, MedalIcon } from '../ui/icons'
import { Minimap } from './Minimap'

// evita que o botão ganhe foco (senão o espaço/freio "clica" nele)
const noFocus = (e: React.MouseEvent) => e.preventDefault()

export const formatTime = (t: number) => {
  const m = Math.floor(t / 60)
  const s = t - m * 60
  return `${m}:${s.toFixed(2).padStart(5, '0')}`
}

export interface Toast {
  id: number
  text: string
  points?: number
  color: string
  t0: number
  icon: 'fuel' | 'checkpoint' | 'boost' | 'jump' | 'trick'
}

const TOAST_ICONS: Record<Toast['icon'], LucideIcon> = { fuel: Fuel, checkpoint: Flag, boost: Flame, jump: Zap, trick: Star }

interface Props {
  snap: SimSnapshot
  terrain: Terrain
  record: TrackRecord
  medal: number
  paused: boolean
  muted: boolean
  toasts: Toast[]
  ghostX: number | null
  showKeys: boolean
  onBack: () => void
  onReset: () => void
  onNewTrack: () => void
  onPause: () => void
  onMute: () => void
  onRightCar: () => void
  onRespawn: () => void
}

/** Ícone dentro de um círculo colorido: a peça básica de todo o HUD. */
function Badge({ Icon, color, size = 26, fill = false }: { Icon: LucideIcon; color: string; size?: number; fill?: boolean }) {
  return (
    <span className="badge" style={{ width: size, height: size, background: `${color}26`, color }}>
      <Icon size={Math.round(size * 0.55)} strokeWidth={2.4} fill={fill ? color : 'none'} />
    </span>
  )
}

function Stat({ Icon, color, value, label }: { Icon: LucideIcon; color: string; value: ReactNode; label: string }) {
  return (
    <div className="stat">
      <Badge Icon={Icon} color={color} />
      <span className="stat-text">
        <b>{value}</b>
        <small>{label}</small>
      </span>
    </div>
  )
}

function HudButton({ Icon, title, onClick }: { Icon: LucideIcon; title: string; onClick: () => void }) {
  return (
    <button className="hud-btn" onMouseDown={noFocus} onClick={onClick} title={title} aria-label={title}>
      <Icon size={18} strokeWidth={2.3} />
    </button>
  )
}

function Meter({ Icon, color, label, value }: { Icon: LucideIcon; color: string; label: string; value: number }) {
  const low = value < 0.2
  return (
    <div className={low ? 'meter low' : 'meter'} style={{ '--meter': low ? '#ff5252' : color } as React.CSSProperties}>
      <Badge Icon={Icon} color={low ? '#ff5252' : color} size={30} />
      <div className="meter-body">
        <div className="meter-head">
          <span>{label}</span>
          <b>{Math.round(value * 100)}%</b>
        </div>
        <div className="meter-track">
          <div className="meter-fill" style={{ width: `${value * 100}%` }} />
        </div>
      </div>
    </div>
  )
}

/** Velocímetro analógico com marcações e leitura digital. */
function Speedometer({ speed }: { speed: number }) {
  const kmh = Math.abs(speed * 3.6)
  const max = 120
  const start = 140 // graus (0 = direita, sentido horário)
  const sweep = 260
  const ang = (v: number) => ((start + (Math.min(v, max) / max) * sweep) * Math.PI) / 180
  const pt = (v: number, r: number) => [Math.cos(ang(v)) * r, Math.sin(ang(v)) * r]
  const arc = (from: number, to: number, r: number) => {
    const [x1, y1] = pt(from, r)
    const [x2, y2] = pt(to, r)
    const large = ((to - from) / max) * sweep > 180 ? 1 : 0
    return `M${x1} ${y1}A${r} ${r} 0 ${large} 1 ${x2} ${y2}`
  }
  const [nx, ny] = pt(kmh, 34)
  const hot = kmh > 80
  return (
    <div className="speedo">
      <svg viewBox="-60 -56 120 100" aria-hidden>
        <path d={arc(0, max, 50)} stroke="#ffffff1c" strokeWidth={7} fill="none" strokeLinecap="round" />
        <path d={arc(80, max, 50)} stroke="#ff525255" strokeWidth={7} fill="none" strokeLinecap="round" />
        {kmh > 0.5 && <path d={arc(0, kmh, 50)} stroke={hot ? '#ff6b4a' : '#ffd23f'} strokeWidth={7} fill="none" strokeLinecap="round" />}
        {Array.from({ length: 13 }, (_, i) => {
          const v = i * 10
          const [x1, y1] = pt(v, 41)
          const [x2, y2] = pt(v, i % 2 ? 38 : 35)
          return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#ffffff66" strokeWidth={i % 2 ? 1 : 2} />
        })}
        {[0, 40, 80, 120].map((v) => {
          const [x, y] = pt(v, 28)
          return (
            <text key={v} x={x} y={y + 3} textAnchor="middle" fontSize={8} fill="#ffffff88">
              {v}
            </text>
          )
        })}
        <line x1={0} y1={0} x2={nx} y2={ny} stroke="#fff" strokeWidth={3} strokeLinecap="round" />
        <circle r={5} fill="#fff" />
        <circle r={2} fill="#ff6b3d" />
      </svg>
      <div className="speedo-read">
        <b>{kmh.toFixed(0)}</b>
        <small>km/h</small>
      </div>
    </div>
  )
}

/** Cartão das telas de pausa / fim de corrida. */
function EndCard({
  Icon,
  iconNode,
  color,
  title,
  subtitle,
  children,
}: {
  Icon?: LucideIcon
  iconNode?: ReactNode
  color: string
  title: string
  subtitle?: ReactNode
  children: ReactNode
}) {
  return (
    <div className="overlay">
      <div className="card" style={{ '--card': color } as React.CSSProperties}>
        <div className="card-icon">{iconNode ?? (Icon && <Icon size={40} strokeWidth={2.2} />)}</div>
        <h2>{title}</h2>
        {subtitle && <div className="card-sub">{subtitle}</div>}
        {children}
      </div>
    </div>
  )
}

function CardButton({ Icon, label, onClick, primary }: { Icon: LucideIcon; label: string; onClick: () => void; primary?: boolean }) {
  return (
    <button className={primary ? 'card-btn primary' : 'card-btn'} onClick={onClick}>
      <Icon size={16} strokeWidth={2.4} />
      {label}
    </button>
  )
}

export function Hud(p: Props) {
  const { snap, terrain, record } = p
  const x = Math.max(0, snap.car.chassis.x)
  const stars = snap.stars.filter(Boolean).length
  const now = performance.now()

  const statCount = snap.cargoTotal > 0 ? 5 : 4
  const summary = (
    <div className="summary" style={{ gridTemplateColumns: `repeat(${statCount === 4 ? 2 : 3}, 1fr)` }}>
      <Stat Icon={Trophy} color="#ffd23f" value={snap.score} label="pontos" />
      <Stat Icon={Ruler} color="#7ee0ff" value={`${snap.maxX.toFixed(0)} m`} label="distância" />
      <Stat Icon={Star} color="#ffd23f" value={`${stars}/${snap.stars.length}`} label="estrelas" />
      <Stat Icon={RotateCcw} color="#ba68c8" value={snap.flips} label="mortais" />
      {snap.cargoTotal > 0 && <Stat Icon={Package} color="#d79b4f" value={`${snap.cargoKept}/${snap.cargoTotal}`} label="carga" />}
    </div>
  )

  const endButtons = (
    <div className="card-actions">
      {snap.ended && snap.ended !== 'finish' && <CardButton Icon={Undo2} label="Voltar ao checkpoint (C)" onClick={p.onRespawn} primary />}
      <CardButton Icon={RotateCcw} label="Correr de novo (R)" onClick={p.onReset} primary={snap.ended === 'finish'} />
      <CardButton Icon={Dices} label="Nova pista (N)" onClick={p.onNewTrack} />
      <CardButton Icon={Wrench} label="Garagem (G)" onClick={p.onBack} />
    </div>
  )

  const newRecord = snap.score >= record.bestScore && snap.score > 0 && <p className="card-record">Novo recorde!</p>

  return (
    <div className="hud">
      {/* ---------- topo esquerdo: pontuação ---------- */}
      <div className="hud-panel hud-score">
        <div className="score-main">
          <small>PONTOS</small>
          <b>{snap.score}</b>
        </div>
        <div className="score-stats">
          <Stat Icon={Ruler} color="#7ee0ff" value={`${x.toFixed(0)} m`} label="distância" />
          <Stat Icon={Timer} color="#b9f6ca" value={formatTime(snap.finishTime ?? snap.time)} label="tempo" />
          <div className="stat">
            {/* key muda a cada estrela: reinicia a animação de "pulo" */}
            <span key={stars} className={stars ? 'bump' : undefined}>
              <Badge Icon={Star} color="#ffd23f" fill={stars > 0} />
            </span>
            <span className="stat-text">
              <b>
                {stars}/{snap.stars.length}
              </b>
              <small>estrelas</small>
            </span>
          </div>
          {snap.cargoTotal > 0 && <Stat Icon={Package} color="#d79b4f" value={`${snap.cargoKept}/${snap.cargoTotal}`} label="carga" />}
        </div>
      </div>

      {/* ---------- topo direito: botões ---------- */}
      <div className="hud-panel hud-buttons">
        <HudButton Icon={p.paused ? Play : Pause} title="Pausa (P)" onClick={p.onPause} />
        <HudButton Icon={RotateCcw} title="Reiniciar (R)" onClick={p.onReset} />
        <HudButton Icon={p.muted ? VolumeX : Volume2} title="Som (M)" onClick={p.onMute} />
        <HudButton Icon={Wrench} title="Garagem (G)" onClick={p.onBack} />
      </div>

      {/* ---------- topo centro: mini-mapa ---------- */}
      <div className="hud-panel hud-map">
        <Minimap terrain={terrain} carX={x} ghostX={p.ghostX} bestX={record.bestDistance} stars={snap.stars} />
        <div className="map-info">
          <span>
            <MapPin size={12} /> Pista #{terrain.seed}
          </span>
          <span>{DIFFICULTIES[terrain.difficulty].name}</span>
          <span>
            <Trophy size={12} /> {record.bestScore}
          </span>
          {record.bestMedal > 0 && (
            <span style={{ color: MEDAL_COLORS[record.bestMedal] }}>
              <MedalIcon level={record.bestMedal} size={12} /> {MEDALS[record.bestMedal].name}
            </span>
          )}
        </div>
      </div>

      {/* ---------- centro: manobras ---------- */}
      <div className="toasts">
        {p.toasts
          .filter((t) => now - t.t0 < 1600)
          .map((t) => (
            <div key={t.id} className="trick" style={{ '--trick': t.color } as React.CSSProperties}>
              <Badge Icon={TOAST_ICONS[t.icon]} color={t.color} size={42} />
              <span>{t.text}</span>
              {t.points ? <em>+{t.points}</em> : null}
            </div>
          ))}
      </div>

      {/* ---------- baixo esquerdo: medidores ---------- */}
      <div className="hud-meters">
        <Meter Icon={Fuel} color="#7cdc5a" label="Combustível" value={snap.fuel} />
        <Meter Icon={Flame} color="#ff9f43" label="Nitro" value={snap.nitro} />
      </div>

      {/* ---------- baixo direito: velocímetro ---------- */}
      <div className="hud-speedo">
        <Speedometer speed={snap.speed} />
      </div>

      {/* ---------- baixo centro: dicas ---------- */}
      <div className={`hud-panel keys ${p.showKeys ? '' : 'hidden'}`}>
        <span>
          <kbd>↑</kbd> acelera
        </span>
        <span>
          <kbd>↓</kbd> freia / ré
        </span>
        <span>
          <kbd>←</kbd>
          <kbd>→</kbd> inclinar
        </span>
        <span>
          <kbd>Shift</kbd> nitro
        </span>
        <span>
          <kbd>F</kbd> desvirar
        </span>
        <span>
          <kbd>C</kbd> checkpoint
        </span>
        <span>
          <kbd>P</kbd> pausa
        </span>
      </div>

      {snap.flipped && !snap.ended && (
        <div className="flip-alert">
          <RotateCcw size={18} strokeWidth={2.5} />
          Capotou!
          <button onMouseDown={noFocus} onClick={p.onRightCar}>
            Desvirar (F)
          </button>
        </div>
      )}

      {p.paused && !snap.ended && (
        <EndCard Icon={Pause} color="#7ee0ff" title="Pausado">
          <div className="card-actions">
            <CardButton Icon={Play} label="Continuar (P)" onClick={p.onPause} primary />
            <CardButton Icon={Undo2} label="Voltar ao checkpoint (C)" onClick={p.onRespawn} />
            <CardButton Icon={RotateCcw} label="Reiniciar (R)" onClick={p.onReset} />
            <CardButton Icon={Dices} label="Nova pista (N)" onClick={p.onNewTrack} />
            <CardButton Icon={Wrench} label="Garagem (G)" onClick={p.onBack} />
          </div>
        </EndCard>
      )}

      {snap.ended === 'finish' && (
        <EndCard
          iconNode={p.medal > 0 ? <MedalIcon level={p.medal} size={44} strokeWidth={2.2} /> : <Flag size={40} strokeWidth={2.2} />}
          color={p.medal > 0 ? MEDAL_COLORS[p.medal] : '#7ee0ff'}
          title="Chegou!"
          subtitle={
            <>
              <span className="card-time">{formatTime(snap.finishTime!)}</span>
              {p.medal > 0 && <span>Medalha de {MEDALS[p.medal].name}</span>}
            </>
          }
        >
          {summary}
          {newRecord}
          {endButtons}
        </EndCard>
      )}
      {snap.ended === 'crash' && (
        <EndCard Icon={Zap} color="#ff7043" title="Capacete no chão!" subtitle="O piloto bateu a cabeça">
          {summary}
          {newRecord}
          {endButtons}
        </EndCard>
      )}
      {snap.ended === 'fuel' && (
        <EndCard Icon={Fuel} color="#ff5252" title="Acabou o combustível" subtitle="Pegue os galões vermelhos pelo caminho">
          {summary}
          {newRecord}
          {endButtons}
        </EndCard>
      )}
    </div>
  )
}
