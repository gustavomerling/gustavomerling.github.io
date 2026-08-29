import { Link } from 'react-router-dom'
import {
  ArrowRight,
  Archive,
  CalendarDays,
  Languages,
  MessageSquare,
  Trophy,
  Users,
} from 'lucide-react'
import { Badge } from '@/components/ui/Badge'

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
    <section className="mx-auto max-w-[var(--container-max)] px-4 py-16 sm:px-6">
      <header className="max-w-2xl">
        <div className="mb-3 flex items-center gap-2">
          <Badge tone="accent">Comunidade</Badge>
          <Badge>128 mil membros</Badge>
        </div>
        <h1 className="font-display text-4xl font-extrabold tracking-tight text-content-primary sm:text-5xl">
          Comunidade
        </h1>
        <p className="mt-4 text-lg leading-relaxed text-content-secondary">
          A maior fã-base do Paramore no Brasil se encontra aqui: tradução
          colaborativa, torneios de setlists e o acervo que você lê em todo o
          portal.
        </p>
      </header>

      <dl className="mt-10 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {STATS.map((stat) => (
          <div key={stat.label} className="rounded-xl border border-line-1 bg-surface-1 p-5">
            <dt className="order-2 mt-1 block text-xs text-content-muted">{stat.label}</dt>
            <dd className="order-1 font-display text-3xl font-extrabold tracking-tight text-accent">
              {stat.value}
            </dd>
          </div>
        ))}
      </dl>

      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        <section>
          <h2 className="flex items-center gap-2 font-display text-2xl font-extrabold tracking-tight text-content-primary">
            <MessageSquare className="size-5 text-accent" aria-hidden="true" />
            Discórdia #COMUNIDADE
          </h2>
          <ul className="mt-5 space-y-3">
            {CHANNELS.map((channel) => (
              <li
                key={channel.name}
                className="flex items-center gap-4 rounded-xl border border-line-1 bg-surface-1 p-4 transition-colors hover:border-accent/60"
              >
                <channel.icon className="size-5 shrink-0 text-accent" aria-hidden="true" />
                <div>
                  <p className="font-mono text-sm font-semibold text-content-primary">
                    {channel.name}
                  </p>
                  <p className="text-xs text-content-muted">{channel.desc}</p>
                </div>
              </li>
            ))}
          </ul>
          <Link
            to="/comunidade"
            className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-accent transition-colors hover:text-accent-hover"
          >
            Entrar no servidor
            <ArrowRight className="size-4 translate-y-[2px]" aria-hidden="true" />
          </Link>
        </section>

        <section>
          <h2 className="font-display text-2xl font-extrabold tracking-tight text-content-primary">
            Projetos da comunidade
          </h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            {PROJECTS.map((project) => (
              <article
                key={project.title}
                className="flex flex-col rounded-xl border border-line-1 bg-surface-1 p-5 transition-colors hover:border-accent/60"
              >
                <project.icon className="size-6 text-accent" aria-hidden="true" />
                <h3 className="mt-3 font-display text-base font-extrabold tracking-tight text-content-primary">
                  {project.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-content-secondary">
                  {project.desc}
                </p>
                <div className="mt-auto pt-4">
                  <Badge>{project.tag}</Badge>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>

      <section className="mt-10">
        <h2 className="flex items-center gap-2 font-display text-2xl font-extrabold tracking-tight text-content-primary">
          <Users className="size-5 text-accent" aria-hidden="true" />
          Atividade recente
        </h2>
        <ul className="mt-5 space-y-2">
          {ACTIVITY.map((item) => (
            <li
              key={`${item.room}-${item.user}`}
              className="rounded-lg border border-line-1 bg-surface-1 px-4 py-3"
            >
              <p className="text-sm text-content-secondary">{item.text}</p>
              <p className="mt-1 font-mono text-[11px] text-content-muted">
                {item.room} · {item.user} · {item.when}
              </p>
            </li>
          ))}
        </ul>
      </section>
    </section>
  )
}