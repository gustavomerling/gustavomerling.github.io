import {
  Activity,
  Anchor,
  Car,
  Check,
  Cog,
  Copy,
  FlipHorizontal2,
  Gauge,
  Info,
  Link,
  Link2,
  RotateCcw,
  RotateCw,
  Share2,
  Sparkles,
  Trash2,
  TriangleAlert,
  Weight,
  Zap,
  type LucideIcon,
} from 'lucide-react'
import type { ReactNode } from 'react'
import { AXLES, AXLES_BY_ID } from '../../game/catalog/axles'
import { BLOCKS, BLOCKS_BY_ID, blockMass } from '../../game/catalog/blocks'
import { getChassis } from '../../game/catalog/chassis'
import { FLAGS, FLAGS_BY_ID } from '../../game/catalog/flags'
import { SUSPENSIONS, SUSPENSIONS_BY_ID } from '../../game/catalog/suspensions'
import { WHEELS, WHEELS_BY_ID } from '../../game/catalog/wheels'
import { ROTATABLE, carStats, resolveAttachments, staticPoses } from '../../game/car'
import { deg, rad } from '../../game/geometry'
import { PRESETS } from '../../game/presets'
import type { CarDesign, Part, PartKind } from '../../game/types'
import { CarView } from '../parts/CarView'
import { ChassisShape } from '../parts/ChassisShape'
import { PartShape } from '../parts/PartShape'
import { WheelIcon } from '../ui/icons'

const KIND: Record<PartKind, { name: string; color: string }> = {
  wheel: { name: 'Roda', color: '#29b6f6' },
  suspension: { name: 'Suspensão', color: '#ffb300' },
  axle: { name: 'Eixo', color: '#90a4ae' },
  block: { name: 'Bloco', color: '#9ccc65' },
  flag: { name: 'Bandeira', color: '#ba68c8' },
}
const TYPES: Record<PartKind, { id: string; name: string }[]> = { wheel: WHEELS, suspension: SUSPENSIONS, axle: AXLES, block: BLOCKS, flag: FLAGS }

const PART_VIEW: Record<PartKind, string> = {
  wheel: '-0.95 -0.95 1.9 1.9',
  suspension: '-0.75 -1.25 1.5 1.4',
  axle: '-1.1 -0.6 2.2 1.2',
  block: '-1.1 -1.1 2.2 2.2',
  flag: '-0.3 -2.1 1.2 2.2',
}

/** Enquadra a peça pelo próprio tamanho (roda pequena não some, bandeira alta cabe). */
function partView(kind: PartKind, typeId: string): string {
  if (kind === 'wheel') {
    const r = WHEELS_BY_ID[typeId].radius * 1.2
    return `${-r} ${-r} ${r * 2} ${r * 2}`
  }
  if (kind === 'flag') {
    const f = FLAGS_BY_ID[typeId]
    return `${-0.25} ${-f.length - 0.1} ${f.clothW + 0.5} ${f.length + 0.2}`
  }
  if (kind === 'block') {
    const b = BLOCKS_BY_ID[typeId]
    const h = Math.max(b.w, b.h) / 2 + 0.12
    return `${-h} ${-h} ${h * 2} ${h * 2}`
  }
  return PART_VIEW[kind]
}

/** Caixa que envolve o carro inteiro (para miniaturas). */
function designViewBox(design: CarDesign): string {
  const pts = getChassis(design).outline.map((v) => ({ ...v }))
  for (const p of design.parts) {
    const r = p.kind === 'wheel' ? WHEELS_BY_ID[p.typeId].radius : p.kind === 'flag' ? FLAGS_BY_ID[p.typeId].length : 0.3
    pts.push({ x: p.x - r, y: p.y - (p.kind === 'flag' ? r : r) }, { x: p.x + r, y: p.y + (p.kind === 'flag' ? 0 : r) })
  }
  const xs = pts.map((p) => p.x)
  const ys = pts.map((p) => p.y)
  const [x0, x1, y0, y1] = [Math.min(...xs) - 0.2, Math.max(...xs) + 0.2, Math.min(...ys) - 0.2, Math.max(...ys) + 0.2]
  return `${x0} ${y0} ${x1 - x0} ${y1 - y0}`
}

function Card({ Icon, title, color, children, right }: { Icon: LucideIcon | typeof WheelIcon; title: string; color: string; children: ReactNode; right?: ReactNode }) {
  return (
    <section className="i-card" style={{ '--c': color } as React.CSSProperties}>
      <header>
        <span className="i-badge">
          <Icon size={15} strokeWidth={2.4} />
        </span>
        <h3>{title}</h3>
        {right}
      </header>
      {children}
    </section>
  )
}

function Meter({ label, value, max, text, color }: { label: string; value: number; max: number; text: string; color: string }) {
  return (
    <div className="i-meter" style={{ '--m': color } as React.CSSProperties}>
      <div className="i-meter-head">
        <span>{label}</span>
        <b>{text}</b>
      </div>
      <div className="i-meter-track">
        <div className="i-meter-fill" style={{ width: `${Math.min(100, Math.max(4, (value / max) * 100))}%` }} />
      </div>
    </div>
  )
}

function Tile({ Icon, value, label, color }: { Icon: LucideIcon | typeof WheelIcon; value: ReactNode; label: string; color: string }) {
  return (
    <div className="i-tile" style={{ '--t': color } as React.CSSProperties}>
      <Icon size={16} strokeWidth={2.3} />
      <b>{value}</b>
      <small>{label}</small>
    </div>
  )
}

function PartMeters({ part, color }: { part: Part; color: string }) {
  switch (part.kind) {
    case 'wheel': {
      const w = WHEELS_BY_ID[part.typeId]
      return (
        <>
          <Meter color={color} label="Tamanho" value={w.radius} max={0.9} text={`Ø ${(w.radius * 200).toFixed(0)} cm`} />
          <Meter color={color} label="Aderência" value={w.friction} max={2.4} text={w.friction.toFixed(1)} />
          <Meter color={color} label="Força" value={w.maxTorque} max={45} text={`${w.maxTorque} N·m`} />
          <Meter color={color} label="Velocidade" value={w.speed} max={40} text={`${w.speed} rad/s`} />
          {w.soft && <p className="i-note"><Info size={13} /> Pneu mole: amassa e abraça o terreno.</p>}
        </>
      )
    }
    case 'suspension': {
      const s = SUSPENSIONS_BY_ID[part.typeId]
      const travel = s.length * (s.compression + s.extension)
      return (
        <>
          <Meter color={color} label="Maciez" value={1 / s.frequencyHz} max={0.9} text={`${s.frequencyHz} Hz`} />
          <Meter color={color} label="Amortecimento" value={s.dampingRatio} max={1} text={`${Math.round(s.dampingRatio * 100)}%`} />
          <Meter color={color} label="Curso" value={travel} max={1.1} text={`${(travel * 100).toFixed(0)} cm`} />
        </>
      )
    }
    case 'axle': {
      const a = AXLES_BY_ID[part.typeId]
      return <Meter color={color} label="Comprimento" value={a.length} max={2} text={`${a.length} m`} />
    }
    case 'flag': {
      const f = FLAGS_BY_ID[part.typeId]
      return (
        <>
          <Meter color={color} label="Altura" value={f.length} max={2} text={`${(f.length * 100).toFixed(0)} cm`} />
          <Meter color={color} label="Flexibilidade" value={1 / f.frequencyHz} max={1} text={`${f.frequencyHz} Hz`} />
          <p className="i-note"><Info size={13} /> Só enfeite: não pesa nem colide.</p>
        </>
      )
    }
    case 'block': {
      const b = BLOCKS_BY_ID[part.typeId]
      const m = blockMass(b)
      return (
        <>
          <Meter color={color} label="Peso" value={m} max={1.5} text={`${m.toFixed(2)} kg`} />
          {b.restitution ? <Meter color={color} label="Quique" value={b.restitution} max={1} text={`${Math.round(b.restitution * 100)}%`} /> : null}
          {b.friction !== undefined && <p className="i-note"><Info size={13} /> Desliza fácil no chão (esqui).</p>}
        </>
      )
    }
  }
}

interface Props {
  design: CarDesign
  selected: Part | null
  onChange: (d: CarDesign) => void
  onUpdatePart: (id: string, patch: Partial<Part>) => void
  onAngle: (id: string, angle: number) => void
  onDuplicate: () => void
  onMirror: () => void
  onRemove: () => void
  onShare: () => void
  shareMsg: string | null
}

export function Inspector({ design, selected, onChange, onUpdatePart, onAngle, onDuplicate, onMirror, onRemove, onShare, shareMsg }: Props) {
  if (selected) {
    const kind = KIND[selected.kind]
    const att = resolveAttachments(design)[selected.id]
    const where =
      !att || att.kind === 'chassis'
        ? selected.kind === 'wheel'
          ? 'Presa rígida no chassi'
          : 'Preso ao chassi'
        : att.kind === 'suspension'
          ? 'No cubo de uma suspensão'
          : 'Na ponta de um eixo'
    const angle = Math.round(deg(selected.angle ?? 0))
    const typeName = TYPES[selected.kind].find((t) => t.id === selected.typeId)?.name
    return (
      <aside className="g-inspector" style={{ '--c': kind.color } as React.CSSProperties}>
        <div className="i-hero">
          <svg className="i-hero-thumb" viewBox={partView(selected.kind, selected.typeId)}>
            <PartShape kind={selected.kind} typeId={selected.typeId} />
          </svg>
          <div className="i-hero-text">
            <small>{kind.name}</small>
            <h2>{typeName}</h2>
            <span className="i-where">
              {att && att.kind !== 'chassis' ? <Link2 size={12} /> : <Anchor size={12} />} {where}
            </span>
          </div>
        </div>

        <Card Icon={Sparkles} title="Trocar tipo" color={kind.color}>
          <div className="i-types">
            {TYPES[selected.kind].map((t) => (
              <button
                key={t.id}
                className={t.id === selected.typeId ? 'i-type active' : 'i-type'}
                onClick={() => onUpdatePart(selected.id, { typeId: t.id })}
                title={t.name}
              >
                <svg viewBox={partView(selected.kind, t.id)}>
                  <PartShape kind={selected.kind} typeId={t.id} />
                </svg>
                <span>{t.name}</span>
              </button>
            ))}
          </div>
        </Card>

        <Card Icon={Gauge} title="Atributos" color={kind.color}>
          <PartMeters part={selected} color={kind.color} />
        </Card>

        {(ROTATABLE.includes(selected.kind) || selected.kind === 'wheel') && (
          <Card Icon={Cog} title="Ajustes" color={kind.color}>
            {ROTATABLE.includes(selected.kind) && (
              <div className="i-angle">
                <div className="i-angle-head">
                  <span>Ângulo</span>
                  <b>{angle}°</b>
                </div>
                <div className="i-angle-row">
                  <button className="g-iconbtn sm" onClick={() => onAngle(selected.id, rad(angle - 15))} title="Girar −15° (Q)" aria-label="Girar para a esquerda">
                    <RotateCcw size={14} />
                  </button>
                  <input type="range" min={-180} max={180} step={5} value={angle} onChange={(e) => onAngle(selected.id, rad(+e.target.value))} />
                  <button className="g-iconbtn sm" onClick={() => onAngle(selected.id, rad(angle + 15))} title="Girar +15° (E)" aria-label="Girar para a direita">
                    <RotateCw size={14} />
                  </button>
                  <button className="g-chip" onClick={() => onAngle(selected.id, 0)} title="Zerar ângulo">
                    0°
                  </button>
                </div>
              </div>
            )}
            {selected.kind === 'wheel' && (
              <label className="i-switch">
                <span>
                  <b>Tração</b>
                  <small>Motor nesta roda (T)</small>
                </span>
                <input
                  type="checkbox"
                  className="switch"
                  checked={selected.driven !== false}
                  onChange={(e) => onUpdatePart(selected.id, { driven: e.target.checked ? undefined : false })}
                />
              </label>
            )}
          </Card>
        )}

        <div className="i-actions">
          <button onClick={onDuplicate} title="Duplicar (Ctrl+D)">
            <Copy size={16} />
            <span>Duplicar</span>
          </button>
          <button onClick={onMirror} title="Espelhar (M)">
            <FlipHorizontal2 size={16} />
            <span>Espelhar</span>
          </button>
          <button className="danger" onClick={onRemove} title="Remover (Delete)">
            <Trash2 size={16} />
            <span>Remover</span>
          </button>
        </div>
        <p className="i-foot">
          <kbd>Q</kbd>
          <kbd>E</kbd> girar · <kbd>←</kbd>
          <kbd>→</kbd> mover · <kbd>Esc</kbd> soltar
        </p>
      </aside>
    )
  }

  const stats = carStats(design)
  const ch = getChassis(design)
  const ratio = stats.torque / Math.max(1, stats.mass)
  return (
    <aside className="g-inspector" style={{ '--c': '#ff6b3d' } as React.CSSProperties}>
      <div className="i-hero">
        <svg className="i-hero-thumb wide" viewBox="-2.4 -1.3 4.8 2.6">
          <ChassisShape def={ch} />
        </svg>
        <div className="i-hero-text">
          <small>Seu carro</small>
          <h2>{ch.name}</h2>
          <span className="i-where">{design.parts.length} peças</span>
        </div>
      </div>

      <Card Icon={Gauge} title="Desempenho" color="#ff6b3d">
        <div className="i-tiles">
          <Tile Icon={Weight} value={stats.mass.toFixed(1)} label="kg" color="#90a4ae" />
          <Tile Icon={Zap} value={stats.torque.toFixed(0)} label="N·m" color="#ffb300" />
          <Tile Icon={Gauge} value={ratio.toFixed(1)} label="força/peso" color="#66bb6a" />
        </div>
        <div className="i-tiles">
          <Tile Icon={WheelIcon} value={stats.wheels} label="rodas" color="#29b6f6" />
          <Tile Icon={Cog} value={stats.driven} label="c/ tração" color="#29b6f6" />
          <Tile Icon={Activity} value={stats.suspensions} label="molas" color="#ffb300" />
        </div>
        {stats.wheels === 0 && (
          <p className="i-alert">
            <TriangleAlert size={14} /> Sem rodas! Arraste uma roda da paleta.
          </p>
        )}
        {stats.wheels > 0 && stats.driven === 0 && (
          <p className="i-alert">
            <TriangleAlert size={14} /> Nenhuma roda com tração.
          </p>
        )}
        <p className="i-note">
          <span className="com-dot" /> Centro de massa: quanto mais baixo, menos capota.
        </p>
      </Card>

      <Card Icon={Car} title="Modelos prontos" color="#29b6f6">
        <div className="i-presets">
          {PRESETS.map((p) => (
            <button key={p.name} className="i-preset" onClick={() => onChange(structuredClone(p.design))} title={`Carregar: ${p.name}`}>
              <svg viewBox={designViewBox(p.design)}>
                <CarView design={p.design} poses={staticPoses(p.design)} />
              </svg>
              <span>{p.name}</span>
            </button>
          ))}
        </div>
      </Card>

      <Card Icon={Share2} title="Compartilhar" color="#ba68c8">
        <button className="i-share" onClick={onShare}>
          {shareMsg ? <Check size={16} /> : <Link size={16} />}
          {shareMsg ?? 'Copiar link do carro'}
        </button>
      </Card>
    </aside>
  )
}
