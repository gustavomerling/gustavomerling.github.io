import {
  Apple,
  Axe,
  Bomb,
  Crosshair,
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
import { useState } from 'react'
import type { Person } from '../engine/Sandbox.ts'

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

      {selected && (
        <section className="person-card" aria-label={`${selected.status.name}'s status`}>
          <header className="person-card__head">
            <PersonStanding size={16} aria-hidden />
            <strong>{selected.status.name}</strong>
            <span className="person-card__activity">{selected.status.activity}</span>
            <button type="button" className="person-card__close" aria-label="Close" onClick={() => setOpen(null)}>
              <X size={14} aria-hidden />
            </button>
          </header>
          {selected.status.meters.map((m) => (
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
            {Array.from({ length: Math.max(SLOTS, selected.status.items.length) }, (_, i) => {
              const item = selected.status.items[i]
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
          {selected.status.tools.length === 0 ? (
            <p className="person-card__empty">Bare hands</p>
          ) : (
            <ul className="inventory">
              {selected.status.tools.map((tool) => {
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
            {selected.status.facts.map((f) => (
              <div key={f.label}>
                <dt>{f.label}</dt>
                <dd>{f.value}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}
    </div>
  )
}
