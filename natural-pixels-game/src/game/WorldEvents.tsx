import { CloudSun, Moon, Rainbow, ShoppingBag, Sparkles, type LucideIcon } from 'lucide-react'
import type { WorldEvent } from '../engine/Sandbox.ts'

const EVENTS: Record<WorldEvent, { icon: LucideIcon; text: string }> = {
  eclipse: { icon: Moon, text: 'A solar eclipse!' },
  aurora: { icon: Sparkles, text: 'An aurora lights up the sky' },
  meteors: { icon: Sparkles, text: 'Meteor shower tonight: watch for fallen stars' },
  'double-rainbow': { icon: Rainbow, text: 'A double rainbow!' },
  merchant: { icon: ShoppingBag, text: 'A travelling merchant is in town' },
}

/** Little paper notes pinned over the top of the canvas while something special is going on. */
export function WorldEvents({ events }: { events: readonly WorldEvent[] }) {
  if (!events.length) return null
  return (
    <ul className="world-events" aria-live="polite">
      {events.map((event) => {
        const { icon: Icon, text } = EVENTS[event] ?? { icon: CloudSun, text: event }
        return (
          <li key={event} className={`world-events__note world-events__note--${event}`}>
            <Icon size={14} aria-hidden />
            {text}
          </li>
        )
      })}
    </ul>
  )
}
