import {
  ArrowRight,
  Archive,
  CalendarDays,
  Languages,
  MessageSquare,
  Trophy,
  Users,
  Sparkles,
  Zap,
} from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import TiltCard from '@/components/fx/TiltCard'
import EraAmbientFX from '@/components/fx/EraAmbientFX'

const STATS = [
  { value: '128 mil', label: 'Membros no fã-clube' },
  { value: '37', label: 'Países alcançados' },
  { value: '4.200+', label: 'Itens no acervo' },
  { value: '9', label: 'Shows cobertos no Brasil' },
]

const CHANNELS = [
  { name: '#geral', icon: MessageSquare, desc: 'Bate-papo diário sobre a banda' },
  { name: '#traducoes', icon: Languages, desc: 'Clube de tradução e revisão de letras' },
  { name: '#setlists', icon: Trophy, desc: 'Torneios e rankings de setlists' },
  { name: '#encontros', icon: CalendarDays, desc: 'Organização de caravanas e meetups' },
  { name: '#acervo', icon: Archive, desc: 'Curadoria de fotos, vídeos e revistas' },
]

const PROJECTS = [
  {
    icon: Languages,
    title: 'Clube de Tradução',
    desc: 'Tradução colaborativa e revisada de letras, declarações e entrevistas — as notas que você lê no site nascem aqui.',
    tag: 'Curadoria',
  },
  {
    icon: Trophy,
    title: 'Torneio de Setlists',
    desc: 'Todo ano a comunidade monta e vota a setlist ideal para a turnê brasileira. Em 2021, a vencedora virou o setlist oficial do show.',
    tag: 'Ranking',
  },
  {
    icon: CalendarDays,
    title: 'Caravanas Regionais',
    desc: 'Grupos por região organizam caronas, hospedagem e coreografias combinadas para shows no Brasil e na América do Sul.',
    tag: 'Encontros',
  },
  {
    icon: Archive,
    title: 'Acervo Colaborativo',
    desc: 'Cada membro contribui com scan de revistas, programas de TV e memorabilia para o arquivo digital do portal.',
    tag: 'História',
  },
]

const ACTIVITY = [
  { room: '#encontros', user: 'luca_sp', when: 'há 12 min', text: 'Fechando caravana SP→Rio pro fim de semana: já somos 14, resto no formulário!' },
  { room: '#traducoes', user: 'ana.bn', when: 'há 1 h', text: 'Pronto o rascunho da nota dos tradutores pra “Crave”. Querem revisar antes de publicar?' },
  { room: '#setlists', user: 'vini.pb', when: 'há 3 h', text: 'TOP 2 da rodada: The Only Exception vs Misguided Ghosts. Impossível escolher.' },
]

export default function Comunidade() {
  return (
    <section className="relative mx-auto max-w-[var(--container-max)] px-4 py-16 sm:px-6">
      <EraAmbientFX density="medium" />

      <header className="relative max-w-2xl">
        <div className="mb-3 flex items-center gap-2">
          <Badge tone="accent">
            <Zap className="mr-1 size-3.5" /> Família Paramore Brasil
          </Badge>
          <Badge>128 mil membros ativos</Badge>
        </div>
        <h1 className="font-display text-4xl font-extrabold tracking-tight text-content-primary sm:text-6xl">
          Comunidade & Fã-Clube
        </h1>
        <p className="mt-4 text-lg leading-relaxed text-content-secondary">
          O ponto de encontro dos fãs brasileiros: mutirões de tradução de letras,
          torneios de setlists, organização de caravanas e o acervo histórico colaborativo.
        </p>
      </header>

      {/* Estatísticas em Destaque */}
      <dl className="mt-10 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {STATS.map((stat) => (
          <div
            key={stat.label}
            className="rounded-2xl border border-line-1 bg-surface-1/90 p-6 backdrop-blur shadow-md transition-transform hover:-translate-y-1"
          >
            <dt className="order-2 mt-2 block text-xs font-semibold text-content-muted uppercase tracking-wider">{stat.label}</dt>
            <dd className="order-1 font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-accent drop-shadow-sm">
              {stat.value}
            </dd>
          </div>
        ))}
      </dl>

      <div className="mt-12 grid gap-8 lg:grid-cols-2">
        {/* Canais do Discord */}
        <section className="rounded-2xl border border-line-1 bg-surface-1/90 p-6 backdrop-blur shadow-lg">
          <h2 className="flex items-center gap-2 font-display text-2xl font-extrabold tracking-tight text-content-primary">
            <MessageSquare className="size-5 text-accent" aria-hidden="true" />
            Servidor Oficial #COMUNIDADE
          </h2>
          <p className="mt-1 text-xs text-content-muted">Canais de discussão abertos para membros</p>

          <ul className="mt-5 space-y-3">
            {CHANNELS.map((channel) => (
              <li
                key={channel.name}
                className="group flex items-center gap-4 rounded-xl border border-line-1 bg-surface-2/60 p-4 transition-all duration-200 hover:border-accent/80 hover:bg-surface-2"
              >
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-surface-1 text-accent group-hover:scale-110 transition-transform">
                  <channel.icon className="size-5" aria-hidden="true" />
                </div>
                <div>
                  <p className="font-mono text-sm font-bold text-content-primary group-hover:text-accent transition-colors">
                    {channel.name}
                  </p>
                  <p className="text-xs text-content-muted">{channel.desc}</p>
                </div>
              </li>
            ))}
          </ul>

          <a
            href="https://discord.gg/paramore"
            target="_blank"
            rel="noreferrer"
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-accent px-6 py-3 text-xs font-bold uppercase tracking-wider text-content-inverse shadow-glow transition-all hover:bg-accent-hover hover:scale-105"
          >
            Entrar no Servidor do Discord
            <ArrowRight className="size-4" aria-hidden="true" />
          </a>
        </section>

        {/* Projetos Comunitários */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-2xl font-extrabold tracking-tight text-content-primary">
              Projetos & Iniciativas
            </h2>
            <span className="font-mono text-xs text-accent flex items-center gap-1">
              <Sparkles className="size-3" /> Colaborativo
            </span>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {PROJECTS.map((project) => (
              <TiltCard
                key={project.title}
                maxTilt={6}
                className="flex flex-col rounded-2xl border border-line-1 bg-surface-1/90 p-5 backdrop-blur shadow-sm transition-all duration-300 hover:border-accent/60 hover:bg-surface-2/60"
              >
                <project.icon className="size-6 text-accent" aria-hidden="true" />
                <h3 className="mt-3 font-display text-base font-extrabold tracking-tight text-content-primary">
                  {project.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-content-secondary">
                  {project.desc}
                </p>
                <div className="mt-auto pt-4">
                  <Badge tone="accent">{project.tag}</Badge>
                </div>
              </TiltCard>
            ))}
          </div>
        </section>
      </div>

      {/* Feed de Atividade Recente */}
      <section className="mt-12">
        <h2 className="flex items-center gap-2 font-display text-2xl font-extrabold tracking-tight text-content-primary">
          <Users className="size-5 text-accent" aria-hidden="true" />
          Atividade em Tempo Real
        </h2>
        <ul className="mt-5 space-y-3">
          {ACTIVITY.map((item) => (
            <li
              key={`${item.room}-${item.user}`}
              className="flex items-start justify-between gap-4 rounded-xl border border-line-1 bg-surface-1/80 px-5 py-4 backdrop-blur transition-colors hover:border-accent/50"
            >
              <div>
                <p className="text-sm text-content-secondary leading-relaxed">{item.text}</p>
                <p className="mt-1.5 font-mono text-[11px] text-content-muted">
                  <span className="text-accent font-semibold">{item.room}</span> · @{item.user} · {item.when}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </section>
  )
}