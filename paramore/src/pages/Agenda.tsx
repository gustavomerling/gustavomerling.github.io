import { useState } from 'react'
import { motion } from 'framer-motion'
import { Music2, Shuffle, Ticket, MapPin, Sparkles, Calendar, Zap } from 'lucide-react'
import TourTracker from '@/components/tour/TourTracker'
import { Badge } from '@/components/ui/Badge'
import EraAmbientFX from '@/components/fx/EraAmbientFX'

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
    <section className="relative mx-auto max-w-[var(--container-max)] px-4 py-16 sm:px-6">
      <EraAmbientFX density="high" />

      <header className="relative max-w-2xl">
        <div className="mb-3 flex items-center gap-2">
          <Badge tone="accent">
            <Zap className="mr-1 size-3.5 animate-pulse" /> Live Tour & Turnê
          </Badge>
          <Badge>América do Sul</Badge>
        </div>
        <h1 className="font-display text-4xl font-extrabold tracking-tight text-content-primary sm:text-6xl">
          Agenda de Shows
        </h1>
        <p className="mt-4 text-lg leading-relaxed text-content-secondary">
          Datas simuladas com contagem regressiva ao vivo em alta precisão, status de lote e ingressos oficiais.
          Clique no botão para sortear novas cidades e rotas de turnê.
        </p>
      </header>

      {nextShow && (
        <div className="mt-10 grid gap-6 lg:grid-cols-[1fr_360px] lg:items-start">
          <TourTracker
            eventLabel={`${nextShow.city} — ${nextShow.venue}`}
            target={nextShow.ts}
            venue={`${fmtWeekday.format(nextShow.ts)} · ${fmtDate.format(nextShow.ts)}`}
          />
          <div className="rounded-2xl border border-line-1 bg-surface-1/90 p-6 backdrop-blur-md shadow-xl">
            <h2 className="flex items-center gap-2 font-display text-base font-bold text-content-primary">
              <Music2 className="size-4 text-accent" aria-hidden="true" />
              Notificações de Ingressos
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-content-secondary">
              Abertura de vendas de novos lotes e caravanas oficiais do Brasil são avisadas primeiro em nossa comunidade do Discord.
            </p>
            <div className="mt-5 flex items-center gap-2 text-xs font-mono text-accent">
              <Sparkles className="size-3.5" /> Fila virtual inteligente
            </div>
          </div>
        </div>
      )}

      <div className="mt-14 flex items-center justify-between gap-4 border-b border-line-1/80 pb-4">
        <div>
          <h2 className="font-display text-2xl font-extrabold tracking-tight text-content-primary sm:text-3xl">
            Próximas Apresentações
          </h2>
          <p className="text-xs text-content-muted mt-0.5">
            {shows.length} datas programadas para a temporada
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShows(generateSchedule())}
          className="group inline-flex items-center gap-2 rounded-full border border-line-1 bg-surface-1/90 px-4 py-2 text-xs font-semibold text-content-secondary shadow-sm backdrop-blur transition-all hover:border-accent hover:text-accent hover:scale-105"
        >
          <Shuffle className="size-3.5 transition-transform group-hover:rotate-180 duration-500" aria-hidden="true" />
          Sortear Nova Rota
        </button>
      </div>

      <div className="mt-6 space-y-4">
        {shows.map((show, idx) => {
          const meta = STATUS_META[show.status]
          const past = show.ts < now
          return (
            <motion.div
              key={show.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className={`group relative flex flex-col gap-4 overflow-hidden rounded-2xl bg-surface-1/95 p-5 backdrop-blur-md shadow-md transition-all duration-300 hover:bg-surface-2 sm:flex-row sm:items-center ${
                past ? 'opacity-55' : ''
              }`}
            >
              {/* Recortes laterais autênticos de ticket (Notches) sem borda */}
              <div className="hidden sm:block absolute -left-3.5 top-1/2 -translate-y-1/2 size-7 rounded-full bg-canvas shadow-inner" aria-hidden="true" />
              <div className="hidden sm:block absolute -right-3.5 top-1/2 -translate-y-1/2 size-7 rounded-full bg-canvas shadow-inner" aria-hidden="true" />

              {/* Calendário / Canhoto do Ingresso */}
              <div className="flex w-24 shrink-0 flex-col items-center rounded-xl bg-surface-2/90 px-3 py-2.5 text-center shadow-inner sm:ml-3">
                <span className="font-display text-3xl font-extrabold text-content-primary">
                  {fmtDay.format(show.ts)}
                </span>
                <span className="font-mono text-xs font-bold uppercase tracking-wider text-accent">
                  {fmtMonth.format(show.ts)}
                </span>
                <span className="mt-0.5 text-[10px] text-content-muted capitalize">
                  {past ? 'Encerrado' : fmtWeekday.format(show.ts).slice(0, 3)}
                </span>
              </div>

              {/* Linha pontilhada divisória de ticket */}
              <div className="hidden sm:block h-12 w-px border-r-2 border-dashed border-line-1/80 mx-1" aria-hidden="true" />

              {/* Detalhes do Local */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate font-display text-xl font-bold text-content-primary group-hover:text-accent transition-colors">
                    {show.city}, {show.state}
                  </p>
                  <Badge tone={meta.tone}>{meta.label}</Badge>
                </div>

                <p className="mt-1 flex items-center gap-1.5 text-sm text-content-secondary">
                  <MapPin className="size-4 shrink-0 text-accent" aria-hidden="true" />
                  {show.venue}
                </p>

                <p className="mt-1 font-mono text-[11px] text-content-muted flex items-center gap-1">
                  <Calendar className="size-3" /> Portões abrem às 17h00 · Show às 21h00
                </p>
              </div>

              {/* Ação do Ingresso */}
              <div className="shrink-0 sm:mr-3">
                {past ? (
                  <span className="text-xs font-medium uppercase tracking-wider text-content-muted">
                    Show realizado
                  </span>
                ) : (
                  <button
                    type="button"
                    disabled={show.status !== 'ingressos'}
                    className={`inline-flex items-center gap-2 rounded-full px-6 py-3 text-xs font-bold uppercase tracking-wider shadow-sm transition-all duration-300 ${
                      show.status === 'ingressos'
                        ? 'bg-accent text-content-inverse shadow-glow hover:bg-accent-hover hover:scale-105'
                        : 'cursor-not-allowed bg-surface-2 text-content-muted'
                    }`}
                  >
                    <Ticket className="size-4" aria-hidden="true" />
                    {show.status === 'ingressos'
                      ? 'Garantir Ingresso'
                      : show.status === 'esgotado'
                        ? 'Lista de Espera'
                        : 'Avisar Vendas'}
                  </button>
                )}
              </div>
            </motion.div>
          )
        })}
      </div>

      <p className="mt-8 text-xs text-content-muted border-t border-line-1/40 pt-4">
        * Agenda ilustrativa interativa gerada pelo simulador oficial do portal Paramore Brasil para demonstrar os fluxos de turnê.
      </p>
    </section>
  )
}