import {
  Apple,
  Axe,
  Anvil,
  Bomb,
  Coins,
  Crosshair,
  Flame,
  Gem,
  Mountain,
  Droplet,
  Hammer,
  Hexagon,
  Package,
  PaintBucket,
  PersonStanding,
  Pickaxe,
  Sailboat,
  Shovel,
  Sprout,
  Sword,
  TreePine,
  Wheat,
  X,
  type LucideIcon,
} from 'lucide-react'
import { useId, useState, type KeyboardEvent } from 'react'
import type { Person } from '../engine/Sandbox.ts'
import { Journal } from './Journal.tsx'
import { Skills } from './Skills.tsx'
import '../styles/person-card.css'

/** Icons for inventory items and tools (by the ids a status card uses). */
const ICONS: Record<string, LucideIcon> = {
  log: TreePine,
  plank: Hammer,
  stone: Hexagon,
  food: Apple,
  seed: Sprout,
  grain: Wheat,
  gunpowder: Bomb,
  earth: Shovel,
  coal: Mountain,
  iron: Anvil,
  silver: Gem,
  gold: Coins,
  torch: Flame,
  axe: Axe,
  pickaxe: Pickaxe,
  sword: Sword,
  gun: Crosshair,
  bucket: PaintBucket,
  'bucket-full': Droplet,
  boat: Sailboat,
}
/** Inventory slots shown (empty ones fill up the grid). */
const SLOTS = 8

/** The card's paper tabs. */
const TABS = [
  { id: 'status', label: 'Status' },
  { id: 'skills', label: 'Skills' },
  { id: 'journal', label: 'Journal' },
] as const
type Tab = (typeof TABS)[number]['id']

/** How many people get their own button before the rest are summed up. */
const MAX_BUTTONS = 6

/** Top-bar buttons, one per human: click one to keep its status card open (updates live). */
export function PeopleBar({ people }: { people: readonly Person[] }) {
  const [open, setOpen] = useState<number | null>(null)
  if (people.length === 0) return null
  const selected = people.find((p) => p.key === open)
  const shown = people.slice(0, MAX_BUTTONS)

  return (
    <div className="people">
      {shown.map(({ key, status }) => (
        <button
          key={key}
          type="button"
          className={`people__button${key === open ? ' people__button--open' : ''}`}
          aria-pressed={key === open}
          title={`${status.name}: ${status.activity}`}
          onClick={() => setOpen(key === open ? null : key)}
        >
          <PersonStanding size={14} aria-hidden />
          <span className="people__name">{status.name}</span>
          <span className="people__health" style={{ ['--value' as string]: status.meters[0]?.value ?? 100 }} aria-hidden />
        </button>
      ))}
      {people.length > MAX_BUTTONS && <span className="people__more">+{people.length - MAX_BUTTONS}</span>}

      {selected && <PersonCard key={selected.key} person={selected} onClose={() => setOpen(null)} />}
    </div>
  )
}

/** One human's live status card, with Status / Skills / Journal tabs (the tab is kept while it stays open). */
function PersonCard({ person, onClose }: { person: Person; onClose: () => void }) {
  const [tab, setTab] = useState<Tab>('status')
  const id = useId()
  const { status } = person

  /** Arrow keys / Home / End move between tabs, as in a regular tab list. */
  const onTabKey = (e: KeyboardEvent<HTMLButtonElement>) => {
    const at = TABS.findIndex((t) => t.id === tab)
    const moves: Record<string, number> = {
      ArrowRight: (at + 1) % TABS.length,
      ArrowLeft: (at + TABS.length - 1) % TABS.length,
      Home: 0,
      End: TABS.length - 1,
    }
    const next = moves[e.key]
    if (next === undefined) return
    e.preventDefault()
    setTab(TABS[next].id)
    document.getElementById(`${id}-tab-${TABS[next].id}`)?.focus()
  }

  return (
    <section className={`person-card person-card--${tab}`} aria-label={`${status.name}'s status`}>
      <header className="person-card__head">
        <PersonStanding size={16} aria-hidden />
        <span className="person-card__who">
          <strong>{status.name}</strong>
          {status.title && <span className="person-card__title">{status.title}</span>}
        </span>
        <span className="person-card__activity">{status.activity}</span>
        <button type="button" className="person-card__close" aria-label="Close" onClick={onClose}>
          <X size={14} aria-hidden />
        </button>
      </header>

      <div className="person-card__tabs" role="tablist" aria-label="Card view">
        {TABS.map((t) => (
          <button
            key={t.id}
            id={`${id}-tab-${t.id}`}
            type="button"
            role="tab"
            className="person-card__tab"
            aria-selected={tab === t.id}
            aria-controls={`${id}-panel`}
            tabIndex={tab === t.id ? 0 : -1}
            onClick={() => setTab(t.id)}
            onKeyDown={onTabKey}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div id={`${id}-panel`} role="tabpanel" aria-labelledby={`${id}-tab-${tab}`} className="person-card__panel">
        {tab === 'status' && <StatusView status={status} />}
        {tab === 'skills' && <Skills skills={status.skills} />}
        {tab === 'journal' && <Journal journal={status.journal} />}
      </div>
    </section>
  )
}

/** The original card: meters, inventory, tools and facts. */
function StatusView({ status }: { status: Person['status'] }) {
  return (
    <>
      {status.meters.map((m) => (
        <div key={m.label} className="person-card__meter">
          <span>{m.label}</span>
          <span className={`meter${(m.good ? m.value < 35 : m.value > 65) ? ' meter--bad' : ''}`}>
            <span className="meter__fill" style={{ width: `${m.value}%` }} />
          </span>
          <span className="person-card__value">{m.value}%</span>
        </div>
      ))}
      <h4 className="person-card__label">Inventory</h4>
      <ul className="inventory">
        {Array.from({ length: Math.max(SLOTS, status.items.length) }, (_, i) => {
          const item = status.items[i]
          if (!item) return <li key={`empty-${i}`} className="inventory__slot inventory__slot--empty" />
          const Icon = ICONS[item.id] ?? Package
          return (
            <li key={item.id} className="inventory__slot" title={`${item.count} × ${item.label}`}>
              <Icon size={18} aria-hidden />
              <span className="inventory__count">{item.count}</span>
              <span className="sr-only">
                {item.count} {item.label}
              </span>
            </li>
          )
        })}
      </ul>
      <h4 className="person-card__label">Tools</h4>
      {status.tools.length === 0 ? (
        <p className="person-card__empty">Bare hands</p>
      ) : (
        <ul className="inventory">
          {status.tools.map((tool) => {
            const Icon = ICONS[tool.id] ?? Package
            return (
              <li key={tool.id} className={`inventory__slot inventory__slot--tier${tool.tier ?? 0}`} title={tool.label}>
                <Icon size={18} aria-hidden />
                <span className="sr-only">{tool.label}</span>
              </li>
            )
          })}
        </ul>
      )}
      <dl className="person-card__facts">
        {status.facts.map((f) => (
          <div key={f.label}>
            <dt>{f.label}</dt>
            <dd>{f.value}</dd>
          </div>
        ))}
      </dl>
    </>
  )
}
