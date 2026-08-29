import { useState } from 'react'
import { Music2, Shuffle, Ticket, MapPin } from 'lucide-react'
import TourTracker from '@/components/tour/TourTracker'
import { Badge } from '@/components/ui/Badge'

type ShowStatus = 'ingressos' | 'esgotado' | 'breve'

interface Show {
  id: number
  ts: number
  city: string
  state: string
  venue: string
  status: ShowStatus
}

const CITIES = [
  ['São Paulo', 'SP'],
  ['Rio de Janeiro', 'RJ'],
  ['Curitiba', 'PR'],
  ['Porto Alegre', 'RS'],
  ['Belo Horizonte', 'MG'],
  ['Brasília', 'DF'],
  ['Recife', 'PE'],
  ['Fortaleza', 'CE'],
  ['Salvador', 'BA'],
  ['Florianópolis', 'SC'],
] as const

const VENUES = [
  'Allianz Parque',
  'Espaço Unimed',
  'Qualistage',
  'Arena Hall BH',
  'Pepsi on Stage',
  'Ginásio Nilson Nelson',
  'Classic Hall',
  'Centro de Convenções',
  'Arena Fonte Nova',
]

const DAY_MS = 86_400_000

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function shuffled<T>(arr: readonly T[]): T[] {
  const out = [...arr]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

function generateSchedule(): Show[] {
  const cities = shuffled(CITIES)
  const [first, second] = [cities[0], cities[1]]
  let cursor = new Date(2026, 8, 5).getTime()
  const shows: Show[] = []

  for (let i = 0; i < 12; i++) {
    cursor += (3 + Math.floor(Math.random() * 7)) * DAY_MS
    const roll = Math.random()
    const status: ShowStatus = roll < 0.6 ? 'ingressos' : roll < 0.85 ? 'esgotado' : 'breve'
    shows.push({
      id: i,
      ts: cursor,
      city: i % 4 === 3 ? first[0] : second[0],
      state: i % 4 === 3 ? first[1] : second[1],
      venue: pick(VENUES),
      status,
    })
  }
  return shows.sort((a, b) => a.ts - b.ts)
}

const STATUS_META: Record<ShowStatus, { label: string; tone: 'success' | 'danger' | 'warning' }> = {
  ingressos: { label: 'Ingressos à venda', tone: 'success' },
  esgotado: { label: 'Esgotado', tone: 'danger' },
  breve: { label: 'Em breve', tone: 'warning' },
}

const fmtDate = new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })
const fmtDay = new Intl.DateTimeFormat('pt-BR', { day: '2-digit' })
const fmtMonth = new Intl.DateTimeFormat('pt-BR', { month: 'short' })
const fmtWeekday = new Intl.DateTimeFormat('pt-BR', { weekday: 'long' })

export default function Agenda() {
  const [shows, setShows] = useState<Show[]>(() => generateSchedule())
  const [now] = useState(() => Date.now())

  const nextShow = shows.find((s) => s.ts > now)

  return (
    <section className="mx-auto max-w-[var(--container-max)] px-4 py-16 sm:px-6">
      <header className="max-w-2xl">
        <div className="mb-3 flex items-center gap-2">
          <Badge tone="accent">Shows & Turnê</Badge>
          <Badge>Agenda simulada</Badge>
        </div>
        <h1 className="font-display text-4xl font-extrabold tracking-tight text-content-primary sm:text-5xl">
          Agenda de shows
        </h1>
        <p className="mt-4 text-lg leading-relaxed text-content-secondary">
          Datas simuladas da próxima turnê sul-americana, com contagem regressiva
          e status de ingressos. Clique em "sortear" para gerar uma nova agenda
          aleatória.
        </p>
      </header>

      {nextShow && (
        <div className="mt-10 grid gap-4 lg:grid-cols-[1fr_360px] lg:items-start">
          <TourTracker
            eventLabel={`${nextShow.city} — ${nextShow.venue}`}
            target={nextShow.ts}
            venue={`${fmtWeekday.format(nextShow.ts)} · ${fmtDate.format(nextShow.ts)}`}
          />
          <div className="rounded-xl border border-line-1 bg-surface-1 p-6">
            <h2 className="flex items-center gap-2 font-display text-base font-bold text-content-primary">
              <Music2 className="size-4 text-accent" aria-hidden="true" />
              Última hora da turnê
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-content-secondary">
              A venda de ingressos para novas datas abre por aqui: o fã-clube
              avisa primeiro no grupo do Discord e nas redes.
            </p>
          </div>
        </div>
      )}

      <div className="mt-12 flex items-center justify-between gap-4">
        <h2 className="font-display text-2xl font-extrabold tracking-tight text-content-primary">
          Datas
        </h2>
        <button
          type="button"
          onClick={() => setShows(generateSchedule())}
          className="inline-flex items-center gap-2 rounded-full border border-line-1 bg-surface-1 px-4 py-2 text-sm font-medium text-content-secondary transition-colors hover:border-accent/60 hover:text-accent"
        >
          <Shuffle className="size-4" aria-hidden="true" />
          Sortear nova agenda
        </button>
      </div>

      <div className="mt-6 space-y-3">
        {shows.map((show) => {
          const meta = STATUS_META[show.status]
          const past = show.ts < now
          return (
            <div
              key={show.id}
              className={`flex flex-col gap-4 rounded-xl border border-line-1 bg-surface-1 p-5 sm:flex-row sm:items-center ${
                past ? 'opacity-55' : ''
              }`}
            >
              <div className="flex w-20 shrink-0 flex-col items-center rounded-lg border border-line-1 bg-surface-2 px-3 py-2 text-center">
                <span className="font-display text-2xl font-extrabold text-content-primary">
                  {fmtDay.format(show.ts)}
                </span>
                <span className="text-[11px] uppercase tracking-wider text-content-muted">
                  {fmtMonth.format(show.ts)}
                </span>
                <span className="mt-0.5 text-[10px] text-content-muted">
                  {past ? 'Encerrado' : fmtWeekday.format(show.ts).slice(0, 3)}
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-display text-lg font-bold text-content-primary">
                  {show.city}, {show.state}
                </p>
                <p className="mt-0.5 flex items-center gap-1.5 text-sm text-content-secondary">
                  <MapPin className="size-3.5 shrink-0 text-content-muted" aria-hidden="true" />
                  {show.venue}
                </p>
                <div className="mt-2">
                  <Badge tone={meta.tone}>{meta.label}</Badge>
                </div>
              </div>
              <div className="shrink-0">
                {past ? (
                  <span className="text-xs font-medium uppercase tracking-wider text-content-muted">
                    Turnê encerrada
                  </span>
                ) : (
                  <button
                    type="button"
                    disabled={show.status !== 'ingressos'}
                    className={`inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition-colors ${
                      show.status === 'ingressos'
                        ? 'bg-accent text-content-inverse hover:bg-accent-hover'
                        : 'cursor-not-allowed border border-line-1 bg-surface-2 text-content-muted'
                    }`}
                  >
                    <Ticket className="size-4" aria-hidden="true" />
                    {show.status === 'ingressos'
                      ? 'Comprar ingressos'
                      : show.status === 'esgotado'
                        ? 'Lista de espera'
                        : 'Anunciar'}
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <p className="mt-6 text-xs text-content-muted">
        Agenda ilustrativa gerada para demonstração do novo portal. Datas,
        locais e setlists são fictícios — feitos para exercitar o rastreador de
        turnê.
      </p>
    </section>
  )
}