import {
  Gem,
  Hammer,
  Heart,
  House,
  Leaf,
  Pickaxe,
  Sparkles,
  Star,
  TriangleAlert,
  type LucideIcon,
} from 'lucide-react'
import type { JournalEntry, JournalKind } from '../elements/types.ts'

/** An icon per kind of entry (the colour comes from `.journal__entry--<kind>` in the stylesheet). */
const KIND_ICONS: Record<JournalKind, LucideIcon> = {
  home: House,
  mine: Pickaxe,
  treasure: Gem,
  danger: TriangleAlert,
  nature: Leaf,
  friend: Heart,
  craft: Hammer,
  event: Sparkles,
  skill: Star,
}

/** Entries of one day, in the order they happened. */
interface Day {
  day: number
  entries: JournalEntry[]
}

/** Groups the (oldest-first) journal by day, newest day first. */
function byDay(journal: readonly JournalEntry[]): Day[] {
  const days: Day[] = []
  for (const entry of journal) {
    const last = days[days.length - 1]
    if (last?.day === entry.day) last.entries.push(entry)
    else days.push({ day: entry.day, entries: [entry] })
  }
  return days.reverse()
}

/** A human's diary: lined paper, one "Day N" heading per day, newest on top. */
export function Journal({ journal }: { journal: readonly JournalEntry[] }) {
  if (journal.length === 0) return <p className="journal journal--empty">Nothing written yet…</p>

  return (
    // Focusable so the page can be scrolled from the keyboard.
    <div className="journal" role="region" tabIndex={0} aria-label="Journal">
      {byDay(journal).map(({ day, entries }, d) => (
        <section key={`${day}-${d}`} className="journal__day">
          <h5 className="journal__heading">Day {day}</h5>
          <ul className="journal__entries">
            {entries.map((entry, i) => {
              const Icon = KIND_ICONS[entry.kind] ?? Sparkles
              return (
                <li key={i} className={`journal__entry journal__entry--${entry.kind}`}>
                  <span className="journal__icon" aria-hidden>
                    <Icon size={12} />
                  </span>
                  <span className="journal__text">{entry.text}</span>
                </li>
              )
            })}
          </ul>
        </section>
      ))}
    </div>
  )
}
