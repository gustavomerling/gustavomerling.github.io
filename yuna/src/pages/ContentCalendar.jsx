import { useMemo, useState } from 'react'
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  parseISO,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { CalendarPlus, ChevronLeft, ChevronRight } from 'lucide-react'

import { Facebook, Instagram, Linkedin } from '@/components/social/platform-icons'

import { PageHeader } from '@/components/layout/AppShell'
import { PostPreview } from '@/components/social/PostPreview'
import { StatusBadge } from '@/components/StatusBadge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useScope } from '@/hooks/use-scope'
import { FORMATS, STATUS } from '@/lib/mock-data'
import { cn } from '@/lib/utils'

const PLATFORM_ICON = {
  instagram: Instagram,
  facebook: Facebook,
  linkedin: Linkedin,
}

const STATUS_DOT = {
  rascunho: 'bg-muted-foreground/60',
  revisao: 'bg-chart-4',
  aprovacao: 'bg-chart-5',
  aprovado: 'bg-chart-2',
  publicado: 'bg-chart-1',
  ajuste: 'bg-destructive',
}

export default function ContentCalendar() {
  const { posts, clients, clientById, global } = useScope()
  // O seed vive em agosto/setembro de 2026 — a demo abre onde há conteúdo.
  const [cursor, setCursor] = useState(() => new Date(2026, 7, 1))
  const [selected, setSelected] = useState(() => new Date(2026, 7, 26))
  const [clientFilter, setClientFilter] = useState('todos')
  const [openPost, setOpenPost] = useState(null)

  const filtered = useMemo(
    () => (clientFilter === 'todos' ? posts : posts.filter((p) => p.clientId === clientFilter)),
    [posts, clientFilter],
  )

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(cursor), { weekStartsOn: 0 })
    const end = endOfWeek(endOfMonth(cursor), { weekStartsOn: 0 })
    return eachDayOfInterval({ start, end })
  }, [cursor])

  const byDay = useMemo(() => {
    const map = new Map()
    filtered.forEach((p) => {
      const key = p.date.slice(0, 10)
      if (!map.has(key)) map.set(key, [])
      map.get(key).push(p)
    })
    map.forEach((list) => list.sort((a, b) => a.date.localeCompare(b.date)))
    return map
  }, [filtered])

  const selectedPosts = byDay.get(format(selected, 'yyyy-MM-dd')) ?? []
  const monthPosts = filtered.filter((p) => isSameMonth(parseISO(p.date), cursor))

  return (
    <>
      <PageHeader
        eyebrow="Produção"
        title="Calendário editorial"
        description="Cada ponto é uma pauta programada. Clique em um dia para ver as peças e abrir o preview."
        actions={
          <>
            {global && (
              <Select value={clientFilter} onValueChange={setClientFilter}>
                <SelectTrigger size="sm" className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os clientes</SelectItem>
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Button size="sm" variant="outline" onClick={() => setCursor(new Date(2026, 7, 1))}>
              Mês do conteúdo
            </Button>
          </>
        }
      />

      <div className="grid gap-4 xl:grid-cols-[1.7fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="font-display text-2xl font-normal capitalize">
              {format(cursor, "MMMM 'de' yyyy", { locale: ptBR })}
            </CardTitle>
            <CardDescription>
              {monthPosts.length} {monthPosts.length === 1 ? 'pauta' : 'pautas'} no mês
            </CardDescription>
            <CardAction className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                className="size-8"
                onClick={() => setCursor((c) => subMonths(c, 1))}
                aria-label="Mês anterior"
              >
                <ChevronLeft className="size-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="size-8"
                onClick={() => setCursor((c) => addMonths(c, 1))}
                aria-label="Próximo mês"
              >
                <ChevronRight className="size-4" />
              </Button>
            </CardAction>
          </CardHeader>

          <CardContent>
            <div className="grid grid-cols-7 gap-1 border-b border-border/60 pb-2">
              {['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'].map((d) => (
                <span key={d} className="text-center text-xs text-muted-foreground">
                  {d}
                </span>
              ))}
            </div>

            <div className="mt-1 grid grid-cols-7 gap-1">
              {days.map((day) => {
                const key = format(day, 'yyyy-MM-dd')
                const items = byDay.get(key) ?? []
                const outside = !isSameMonth(day, cursor)
                const active = isSameDay(day, selected)

                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setSelected(day)}
                    className={cn(
                      'group flex min-h-[72px] flex-col gap-1 rounded-lg border p-1.5 text-left transition-colors',
                      active
                        ? 'border-primary/60 bg-primary/[0.06]'
                        : 'border-border/60 hover:bg-muted/50',
                      outside && 'opacity-40',
                    )}
                  >
                    <span
                      className={cn(
                        'text-xs tabular-nums',
                        isToday(day) &&
                          'grid size-5 place-items-center rounded-full bg-primary text-primary-foreground',
                      )}
                    >
                      {format(day, 'd')}
                    </span>

                    <span className="flex flex-wrap gap-1">
                      {items.slice(0, 4).map((p) => (
                        <span
                          key={p.id}
                          className={cn('size-1.5 rounded-full', STATUS_DOT[p.status])}
                          title={p.title}
                        />
                      ))}
                    </span>

                    {items.length > 0 && (
                      <span className="mt-auto truncate text-xs text-muted-foreground">
                        {items.length === 1 ? items[0].title : `${items.length} pautas`}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>

            <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5 border-t border-border/60 pt-3">
              {Object.entries(STATUS).map(([key, meta]) => (
                <span
                  key={key}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground"
                >
                  <span className={cn('size-1.5 rounded-full', STATUS_DOT[key])} />
                  {meta.label}
                </span>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base font-medium capitalize">
              {format(selected, "EEEE, d 'de' MMMM", { locale: ptBR })}
            </CardTitle>
            <CardDescription>
              {selectedPosts.length === 0
                ? 'Nenhuma pauta programada'
                : `${selectedPosts.length} ${selectedPosts.length === 1 ? 'pauta' : 'pautas'} no dia`}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-3">
            {selectedPosts.length === 0 && (
              <div className="rounded-lg border border-dashed border-border p-6 text-center">
                <CalendarPlus className="mx-auto size-5 text-muted-foreground" />
                <p className="mt-2 text-sm text-muted-foreground">
                  Dia livre. Selecione outra data com marcadores para ver as peças.
                </p>
              </div>
            )}

            {selectedPosts.map((p) => {
              const client = clientById(p.clientId)
              const Icon = PLATFORM_ICON[p.platform] ?? Instagram
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setOpenPost(p)}
                  className="w-full rounded-lg border border-border/70 p-3 text-left transition-colors hover:bg-muted/50"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="grid size-6 shrink-0 place-items-center rounded-md text-white"
                      style={{ background: client?.color ?? 'var(--primary)' }}
                    >
                      <Icon className="size-3" />
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm">{p.title}</span>
                    <span className="stat shrink-0 text-xs text-muted-foreground">
                      {p.date.slice(11, 16)}
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <StatusBadge status={p.status} className="text-xs" />
                    <span className="text-xs text-muted-foreground">
                      {client?.name} · {FORMATS[p.format]?.label}
                    </span>
                  </div>
                </button>
              )
            })}
          </CardContent>
        </Card>
      </div>

      <Dialog open={Boolean(openPost)} onOpenChange={(open) => !open && setOpenPost(null)}>
        <DialogContent className="max-h-[92svh] overflow-y-auto sm:max-w-2xl">
          {openPost && (
            <>
              <DialogHeader>
                <DialogTitle className="font-display text-2xl font-normal">
                  {openPost.title}
                </DialogTitle>
                <DialogDescription>
                  {clientById(openPost.clientId)?.name} ·{' '}
                  {format(parseISO(openPost.date), "d 'de' MMMM 'às' HH:mm", { locale: ptBR })}
                </DialogDescription>
              </DialogHeader>
              <PostPreview post={openPost} client={clientById(openPost.clientId)} />
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
