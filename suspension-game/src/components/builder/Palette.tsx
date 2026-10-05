import { Activity, Box, Car, Flag, GitCommitHorizontal, GripVertical, Pencil, type LucideIcon } from 'lucide-react'
import { useState } from 'react'
import { AXLES, AXLES_BY_ID } from '../../game/catalog/axles'
import { BLOCKS, BLOCKS_BY_ID, blockMass } from '../../game/catalog/blocks'
import { CHASSIS } from '../../game/catalog/chassis'
import { FLAGS, FLAGS_BY_ID } from '../../game/catalog/flags'
import { SUSPENSIONS, SUSPENSIONS_BY_ID } from '../../game/catalog/suspensions'
import { WHEELS, WHEELS_BY_ID } from '../../game/catalog/wheels'
import type { PartKind } from '../../game/types'
import { ChassisShape } from '../parts/ChassisShape'
import { PartShape } from '../parts/PartShape'
import { WheelIcon } from '../ui/icons'

type TabId = 'chassis' | PartKind

interface Tab {
  id: TabId
  title: string
  short: string
  Icon: LucideIcon | typeof WheelIcon
  color: string
  hint: string
}

const TABS: Tab[] = [
  { id: 'chassis', title: 'Chassi', short: 'Chassi', Icon: Car, color: '#ff6b3d', hint: 'A base do carro. Escolha um pronto ou desenhe o seu.' },
  { id: 'suspension', title: 'Suspensões', short: 'Molas', Icon: Activity, color: '#ffb300', hint: 'O topo prende no chassi ou na ponta de um eixo. Rodas e eixos encaixam embaixo.' },
  { id: 'axle', title: 'Eixos', short: 'Eixos', Icon: GitCommitHorizontal, color: '#90a4ae', hint: 'Balancim que gira ±80°. Nas pontas: rodas ou mais suspensões.' },
  { id: 'wheel', title: 'Rodas', short: 'Rodas', Icon: WheelIcon, color: '#29b6f6', hint: 'Fora de um encaixe, a roda fica presa rígida no chassi.' },
  { id: 'block', title: 'Blocos', short: 'Blocos', Icon: Box, color: '#9ccc65', hint: 'Estrutura, lastro, para-choque e esqui. Ficam presos ao chassi.' },
  { id: 'flag', title: 'Bandeiras', short: 'Bandeiras', Icon: Flag, color: '#ba68c8', hint: 'Encaixam na borda do chassi, em eixos ou molas. A haste enverga com o movimento!' },
]

const ITEMS: Record<PartKind, { id: string; name: string }[]> = { suspension: SUSPENSIONS, axle: AXLES, wheel: WHEELS, block: BLOCKS, flag: FLAGS }

/** Linha de detalhe embaixo do nome de cada peça. */
function detail(kind: PartKind, id: string): string {
  switch (kind) {
    case 'suspension': {
      const s = SUSPENSIONS_BY_ID[id]
      return `${s.frequencyHz} Hz · ${Math.round(s.length * (s.compression + s.extension) * 100)} cm`
    }
    case 'axle':
      return `${AXLES_BY_ID[id].length} m`
    case 'wheel': {
      const w = WHEELS_BY_ID[id]
      return `Ø ${Math.round(w.radius * 200)} cm · ${w.maxTorque} N·m`
    }
    case 'block':
      return `${blockMass(BLOCKS_BY_ID[id]).toFixed(2)} kg`
    case 'flag':
      return `${Math.round(FLAGS_BY_ID[id].length * 100)} cm`
  }
}

/** Enquadra cada peça pelo próprio tamanho (placa larga, bandeira alta...). */
function thumbView(kind: PartKind, typeId: string) {
  switch (kind) {
    case 'suspension':
      return '-0.75 -1.25 1.5 1.4'
    case 'axle':
      return '-1.1 -0.6 2.2 1.2'
    case 'wheel':
      return '-0.95 -0.95 1.9 1.9'
    case 'flag': {
      const f = FLAGS_BY_ID[typeId]
      return `${-0.25} ${-f.length - 0.1} ${f.clothW + 0.5} ${f.length + 0.2}`
    }
    case 'block': {
      const b = BLOCKS_BY_ID[typeId]
      const s = Math.max(b.w, b.h) / 2 + 0.15
      return `${-s} ${-s} ${s * 2} ${s * 2}`
    }
  }
}

interface Props {
  chassisId: string
  onChassis: (id: string) => void
  onDrawChassis: () => void
  onStartDrag: (kind: PartKind, typeId: string, e: React.PointerEvent) => void
}

export function Palette({ chassisId, onChassis, onDrawChassis, onStartDrag }: Props) {
  const [tab, setTab] = useState<TabId>('suspension')
  const current = TABS.find((t) => t.id === tab)!

  return (
    <aside className="g-palette" style={{ '--tab': current.color } as React.CSSProperties}>
      <nav className="g-tabs" aria-label="Categorias de peças">
        {TABS.map((t) => (
          <button
            key={t.id}
            className={t.id === tab ? 'g-tab active' : 'g-tab'}
            style={{ '--tab': t.color } as React.CSSProperties}
            onClick={() => setTab(t.id)}
            title={t.title}
          >
            <span className="g-tab-icon">
              <t.Icon size={20} strokeWidth={2.2} />
            </span>
            <small>{t.short}</small>
          </button>
        ))}
      </nav>

      <div className="g-shelf">
        <header className="g-shelf-head">
          <h2>{current.title}</h2>
          <p>{current.hint}</p>
        </header>

        <div className="g-cards">
          {tab === 'chassis' ? (
            <>
              {CHASSIS.map((c) => (
                <button key={c.id} className={c.id === chassisId ? 'g-card active' : 'g-card'} onClick={() => onChassis(c.id)}>
                  <svg className="g-thumb" viewBox="-2.4 -1.3 4.8 2.6">
                    <ChassisShape def={c} />
                  </svg>
                  <span className="g-card-name">{c.name}</span>
                  <small>{c.cargo ? 'com carga' : `${c.polygons.length > 1 ? 'côncavo' : 'simples'}`}</small>
                </button>
              ))}
              <button className={chassisId === 'custom' ? 'g-card draw active' : 'g-card draw'} onClick={onDrawChassis}>
                <span className="g-thumb g-draw-icon">
                  <Pencil size={30} />
                </span>
                <span className="g-card-name">Desenhar</span>
                <small>forma livre</small>
              </button>
            </>
          ) : (
            ITEMS[tab].map((it) => (
              <div
                key={it.id}
                className="g-card draggable"
                onPointerDown={(e) => onStartDrag(tab, it.id, e)}
                title={`Arraste para o carro: ${it.name}`}
              >
                <GripVertical className="g-grip" size={14} />
                <svg className="g-thumb" viewBox={thumbView(tab, it.id)}>
                  <PartShape kind={tab} typeId={it.id} />
                </svg>
                <span className="g-card-name">{it.name}</span>
                <small>{detail(tab, it.id)}</small>
              </div>
            ))
          )}
        </div>
      </div>
    </aside>
  )
}
