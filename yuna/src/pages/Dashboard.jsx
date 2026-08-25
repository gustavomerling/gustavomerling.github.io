import { Link } from 'react-router-dom'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from 'recharts'
import {
  ArrowUpRight,
  CalendarDays,
  CheckCheck,
  Eye,
  Heart,
  Send,
  TrendingUp,
} from 'lucide-react'

import { PageHeader } from '@/components/layout/AppShell'
import { StatusBadge } from '@/components/StatusBadge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { Progress } from '@/components/ui/progress'
import { useScope } from '@/hooks/use-scope'
import { ACTIVITY, FORMAT_SERIES, REACH_SERIES, ROLES, STATUS } from '@/lib/mock-data'
import { can } from '@/lib/permissions'
import { useAuthStore } from '@/store/useAuthStore'

const reachConfig = {
  instagram: { label: 'Instagram', color: 'var(--chart-1)' },
  facebook: { label: 'Facebook', color: 'var(--chart-3)' },
  linkedin: { label: 'LinkedIn', color: 'var(--chart-4)' },
}

const formatConfig = {
  posts: { label: 'Peças', color: 'var(--chart-1)' },
  engajamento: { label: 'Engajamento %', color: 'var(--chart-2)' },
}

const STATUS_COLORS = {
  rascunho: 'var(--muted-foreground)',
  revisao: 'var(--chart-4)',
  aprovacao: 'var(--chart-5)',
  aprovado: 'var(--chart-2)',
  publicado: 'var(--chart-1)',
  ajuste: 'var(--destructive)',
}

function Metric({ icon: Icon, label, value, hint, trend }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardDescription className="text-xs">{label}</CardDescription>
          <Icon className="size-3.5 text-muted-foreground" />
        </div>
        <CardTitle className="stat text-4xl">{value}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="flex items-center gap-1 text-xs text-muted-foreground">
          {trend && (
            <span className="flex items-center gap-0.5 text-success dark:text-primary">
              <TrendingUp className="size-3" />
              {trend}
            </span>
          )}
          {hint}
        </p>
      </CardContent>
    </Card>
  )
}

export default function Dashboard() {
  const role = useAuthStore((s) => s.role)
  const profile = useAuthStore((s) => s.profile)
  const { posts, clients, global, scopedClient, clientById } = useScope()

  const published = posts.filter((p) => p.status === 'publicado')
  const pending = posts.filter((p) => p.status === 'aprovacao')
  const reach = published.reduce((sum, p) => sum + (p.metrics?.reach ?? 0), 0)
  const engagement = published.reduce(
    (sum, p) => sum + (p.metrics?.likes ?? 0) + (p.metrics?.comments ?? 0) + (p.metrics?.saves ?? 0),
    0,
  )

  const upcoming = [...posts]
    .filter((p) => p.status !== 'publicado')
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 5)

  const statusData = Object.keys(STATUS)
    .map((key) => ({
      status: key,
      label: STATUS[key].label,
      value: posts.filter((p) => p.status === key).length,
    }))
    .filter((d) => d.value > 0)

  const firstName = (profile?.name ?? '').split(' ')[0]

  return (
    <>
      <PageHeader
        eyebrow={`${ROLES[role]?.label} · ${global ? 'carteira completa' : scopedClient?.name ?? ''}`}
        title={firstName ? `Bom dia, ${firstName}.` : 'Visão geral'}
        description={
          global
            ? 'O que está em produção, o que espera retorno e como as contas se comportaram nas últimas oito semanas.'
            : 'O que a Yuna está produzindo para a sua marca e o que precisa do seu retorno.'
        }
        actions={
          <>
            <Button asChild variant="outline" size="sm">
              <Link to="/app/calendario">
                <CalendarDays />
                Calendário
              </Link>
            </Button>
            {pending.length > 0 && (
              <Button asChild size="sm">
                <Link to="/app/aprovacoes">
                  <CheckCheck />
                  {pending.length} para aprovar
                </Link>
              </Button>
            )}
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric
          icon={Send}
          label="Peças publicadas"
          value={published.length}
          hint="no período"
          trend="+12%"
        />
        <Metric
          icon={CheckCheck}
          label="Aguardando aprovação"
          value={pending.length}
          hint={pending.length > 0 ? 'com o cliente' : 'fila limpa'}
        />
        <Metric
          icon={Eye}
          label="Alcance acumulado"
          value={reach.toLocaleString('pt-BR')}
          hint="somando as contas"
          trend="+8,4%"
        />
        <Metric
          icon={Heart}
          label="Interações"
          value={engagement.toLocaleString('pt-BR')}
          hint="curtidas, comentários e salvamentos"
        />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1.6fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-medium">Alcance por plataforma</CardTitle>
            <CardDescription>Últimas oito semanas, somando todas as contas ativas</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={reachConfig} className="h-[260px] w-full">
              <AreaChart data={REACH_SERIES} margin={{ left: 4, right: 8, top: 8 }}>
                <defs>
                  {Object.entries(reachConfig).map(([key, cfg]) => (
                    <linearGradient key={key} id={`fill-${key}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={cfg.color} stopOpacity={0.35} />
                      <stop offset="95%" stopColor={cfg.color} stopOpacity={0.02} />
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid vertical={false} strokeOpacity={0.35} />
                <XAxis
                  dataKey="week"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  fontSize={11}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  width={44}
                  fontSize={11}
                  tickFormatter={(v) => `${Math.round(v / 1000)}k`}
                />
                <ChartTooltip content={<ChartTooltipContent indicator="line" />} />
                {Object.entries(reachConfig).map(([key, cfg]) => (
                  <Area
                    key={key}
                    animationDuration={700}
                    dataKey={key}
                    type="natural"
                    stroke={cfg.color}
                    fill={`url(#fill-${key})`}
                    strokeWidth={1.75}
                    stackId="a"
                  />
                ))}
              </AreaChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base font-medium">Situação das pautas</CardTitle>
            <CardDescription>Distribuição atual do fluxo de produção</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ChartContainer config={{}} className="mx-auto h-[180px] w-full">
              <PieChart>
                <ChartTooltip content={<ChartTooltipContent nameKey="label" />} />
                <Pie
                  data={statusData}
                  dataKey="value"
                  nameKey="label"
                  innerRadius={48}
                  outerRadius={72}
                  paddingAngle={2}
                  strokeWidth={0}
                  animationDuration={700}
                >
                  {statusData.map((d) => (
                    <Cell key={d.status} fill={STATUS_COLORS[d.status]} />
                  ))}
                </Pie>
              </PieChart>
            </ChartContainer>

            <div className="space-y-2">
              {statusData.map((d) => (
                <div key={d.status} className="flex items-center gap-2 text-xs">
                  <span
                    className="size-2 shrink-0 rounded-full"
                    style={{ background: STATUS_COLORS[d.status] }}
                  />
                  <span className="text-muted-foreground">{d.label}</span>
                  <span className="stat ml-auto">{d.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1fr_1fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-medium">Próximas publicações</CardTitle>
            <CardDescription>Ordenadas por data programada</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {upcoming.length === 0 && (
              <p className="text-sm text-muted-foreground">Nenhuma pauta na fila.</p>
            )}
            {upcoming.map((p) => {
              const client = clientById(p.clientId)
              return (
                <Link
                  key={p.id}
                  to="/app/conteudo"
                  className="flex items-start gap-3 rounded-lg border border-border/70 p-3 transition-colors hover:bg-muted/50"
                >
                  <span
                    className="mt-0.5 size-2 shrink-0 rounded-full"
                    style={{ background: client?.color ?? 'var(--primary)' }}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm">{p.title}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {client?.name} ·{' '}
                      {new Date(p.date).toLocaleString('pt-BR', {
                        day: '2-digit',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                  <StatusBadge status={p.status} className="shrink-0 text-xs" />
                </Link>
              )
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base font-medium">Desempenho por formato</CardTitle>
            <CardDescription>Volume produzido e engajamento médio</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={formatConfig} className="h-[220px] w-full">
              <BarChart data={FORMAT_SERIES} margin={{ left: -8, right: 4, top: 8 }}>
                <CartesianGrid vertical={false} strokeOpacity={0.35} />
                <XAxis
                  dataKey="format"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  fontSize={11}
                />
                <YAxis tickLine={false} axisLine={false} width={36} fontSize={11} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="posts" fill="var(--chart-1)" radius={[4, 4, 0, 0]} animationDuration={700} />
                <Bar
                  dataKey="engajamento"
                  fill="var(--chart-2)"
                  radius={[4, 4, 0, 0]}
                  animationDuration={700}
                />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base font-medium">
              {global ? 'Contas da carteira' : 'Sua conta'}
            </CardTitle>
            <CardDescription>Volume mensal contratado x entregue</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {clients.slice(0, 5).map((c) => {
              const done = posts.filter(
                (p) => p.clientId === c.id && p.status === 'publicado',
              ).length
              const target = Math.max(c.postsMonth || 1, 1)
              const pct = Math.min(100, Math.round((done / target) * 100))
              return (
                <div key={c.id} className="space-y-1.5">
                  <div className="flex items-center gap-2 text-xs">
                    <span
                      className="size-2 shrink-0 rounded-full"
                      style={{ background: c.color }}
                    />
                    <span className="truncate">{c.name}</span>
                    <span className="stat ml-auto shrink-0 text-muted-foreground">
                      {done}/{target}
                    </span>
                  </div>
                  <Progress value={pct} className="h-1.5" />
                </div>
              )
            })}
            {can(role, 'gerenciarClientes') && (
              <Button asChild variant="ghost" size="sm" className="w-full">
                <Link to="/app/clientes">
                  Ver todos os clientes
                  <ArrowUpRight />
                </Link>
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="text-base font-medium">Atividade recente</CardTitle>
          <CardDescription>O que aconteceu na plataforma nos últimos dias</CardDescription>
        </CardHeader>
        <CardContent>
          <ol className="space-y-3">
            {ACTIVITY.map((a) => (
              <li key={a.id} className="flex flex-wrap items-baseline gap-x-1.5 text-sm">
                <span className="font-medium">{a.who}</span>
                <span className="text-muted-foreground">{a.what}</span>
                <span>{a.target}</span>
                <span className="ml-auto text-xs text-muted-foreground">{a.when}</span>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>
    </>
  )
}
