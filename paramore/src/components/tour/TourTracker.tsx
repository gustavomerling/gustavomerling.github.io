import { useEffect, useState } from 'react'
import { ClipboardList, Guitar, Ticket } from 'lucide-react'

function diffParts(target: number) {
  const ms = Math.max(0, target - Date.now())
  return {
    days: Math.floor(ms / 86_400_000),
    hours: Math.floor((ms / 3_600_000) % 24),
    minutes: Math.floor((ms / 60_000) % 60),
    seconds: Math.floor((ms / 1_000) % 60),
  }
}

export default function TourTracker({
  eventLabel,
  target,
  venue,
}: {
  eventLabel: string
  target: number
  venue: string
}) {
  const [parts, setParts] = useState(() => diffParts(target))

  useEffect(() => {
    const id = window.setInterval(() => setParts(diffParts(target)), 1000)
    return () => window.clearInterval(id)
  }, [target])

  const cells = [
    ['DIAS', parts.days],
    ['HORAS', parts.hours],
    ['MIN', parts.minutes],
    ['SEG', parts.seconds],
  ] as const

  return (
    <div className="overflow-hidden rounded-lg border border-accent/40 bg-surface-1">
      <div className="flex items-center justify-between gap-4 border-b border-line-1 bg-accent-subtle px-5 py-3">
        <div className="flex items-center gap-2">
          <Guitar className="size-4 text-accent" aria-hidden="true" />
          <p className="text-sm font-semibold text-content-primary">{eventLabel}</p>
        </div>
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${parts.days > 0 ? 'bg-status-success/15 text-status-success' : 'bg-status-warning/15 text-status-warning'}`}>
          {parts.days > 0 ? 'Confirmado' : 'Hoje!'}
        </span>
      </div>

      <div className="px-5 py-6">
        <div className="grid max-w-md grid-cols-4 gap-2" role="timer" aria-live="polite">
          {cells.map(([label, value]) => (
            <div
              key={label}
              className="rounded-md border border-line-1 bg-surface-2 px-2 py-3 text-center"
            >
              <p className="font-mono text-2xl font-semibold tabular-nums text-content-primary sm:text-3xl">
                {String(value).padStart(2, '0')}
              </p>
              <p className="mt-1 text-[10px] font-medium uppercase tracking-wider text-content-muted">
                {label}
              </p>
            </div>
          ))}
        </div>
        <p className="mt-5 text-sm text-content-secondary">{venue}</p>
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-content-inverse transition-colors hover:bg-accent-hover"
          >
            <Ticket className="size-4" aria-hidden="true" />
            Comprar ingressos oficiais
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-full border border-line-1 bg-surface-2 px-5 py-2.5 text-sm font-medium text-content-secondary transition-colors hover:text-content-primary"
          >
            <ClipboardList className="size-4" aria-hidden="true" />
            Setlist provável
          </button>
        </div>
      </div>
    </div>
  )
}