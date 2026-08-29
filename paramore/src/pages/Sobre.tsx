import { Archive, Flag, HeartHandshake, History, Rocket, Users } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'

const MILESTONES = [
  { year: '2005', title: 'O começo nos blogs', text: 'O fã-clube nasce como um blog sobre a estreia AWKIF, semanas antes do site oficial dos EUA.' },
  { year: '2008', title: 'Registro do domínio', text: 'Primeiro layout próprio, fórum e a cobertura da primeira turnê sul-americana do Paramore.' },
  { year: '2013', title: 'O auge da era pop', text: 'O portal bate os 10 mil membros com a era Self-Titled e lança o projeto de tradução colaborativa.' },
  { year: '2017', title: 'After Laughter e a pausa', text: 'Cobertura intensa e, com o hiato, o acervo se volta para o arquivo: scans, fitas e redes antigas.' },
  { year: '2023', title: 'This Is Why renova tudo', text: 'A volta do Paramore recoloca o portal no centro, agora com cobertura de turnê mundial.' },
  { year: '2026', title: 'O redesenho', text: 'Lançamos o novo portal: design system próprio, página por álbum, galeria e videografia.' },
]

const TEAM = [
  { role: 'Edição geral', members: 'Gustavo, Ana' },
  { role: 'Acervo & história', members: 'Duda, Rui' },
  { role: 'Tradução', members: 'Clube de Tradução (12 revisores)' },
  { role: 'Design & código', members: 'Time DS-PB' },
  { role: 'Redes sociais', members: 'Bia, Tom' },
]

const VALUES: { icon: typeof Archive; title: string; text: string }[] = [
  { icon: Archive, title: 'Memória antes de moda', text: 'Preservamos a história do Paramore antes do hype — cada era tem seu lugar no acervo.' },
  { icon: HeartHandshake, title: 'Feito por fãs, para fãs', text: 'Sem patrocínio editorial: o conteúdo nasce da comunidade e é revisado pela comunidade.' },
  { icon: Flag, title: 'Raiz brasileira', text: 'Priorizamos o público do Brasil: traduções, caravanas e a cobertura local em primeiro lugar.' },
]

export default function Sobre() {
  return (
    <section className="mx-auto max-w-[var(--container-max)] px-4 py-16 sm:px-6">
      <header className="max-w-2xl">
        <div className="mb-3 flex items-center gap-2">
          <Badge tone="accent">Sobre o Site</Badge>
          <Badge>Desde 2005</Badge>
        </div>
        <h1 className="font-display text-4xl font-extrabold tracking-tight text-content-primary sm:text-5xl">
          Sobre o Site
        </h1>
        <p className="mt-4 text-lg leading-relaxed text-content-secondary">
          A história do portal Paramore Brasil — de um blog de fã à maior base
          de acervo do Paramore em português. Quase 21 anos de memória coletiva.
        </p>
      </header>

      <section className="mt-10 grid gap-4 sm:grid-cols-3">
        {VALUES.map((value) => (
          <article
            key={value.title}
            className="rounded-xl border border-line-1 bg-surface-1 p-6"
          >
            <value.icon className="size-6 text-accent" aria-hidden="true" />
            <h2 className="mt-3 font-display text-base font-extrabold tracking-tight text-content-primary">
              {value.title}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-content-secondary">{value.text}</p>
          </article>
        ))}
      </section>

      <section className="mt-12">
        <h2 className="flex items-center gap-2 font-display text-2xl font-extrabold tracking-tight text-content-primary">
          <History className="size-5 text-accent" aria-hidden="true" />
          Linha do tempo
        </h2>
        <ol className="relative mt-6 space-y-0 border-l border-line-1 pl-8">
          {MILESTONES.map((m) => (
            <li key={m.year} className="relative pb-10 last:pb-0">
              <span className="absolute -left-8 top-1.5 size-3 rounded-full border-2 border-accent bg-canvas" aria-hidden="true" />
              <p className="font-mono text-xs font-semibold text-accent">{m.year}</p>
              <h3 className="mt-1 font-display text-lg font-extrabold tracking-tight text-content-primary">
                {m.title}
              </h3>
              <p className="mt-1 max-w-2xl text-sm leading-relaxed text-content-secondary">{m.text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-4">
        <h2 className="flex items-center gap-2 font-display text-2xl font-extrabold tracking-tight text-content-primary">
          <Users className="size-5 text-accent" aria-hidden="true" />
          Equipe editorial
        </h2>
        <ul className="mt-5 grid gap-3 sm:grid-cols-2">
          {TEAM.map((person) => (
            <li
              key={person.role}
              className="flex items-center justify-between rounded-lg border border-line-1 bg-surface-1 px-4 py-3"
            >
              <span className="text-sm font-medium text-content-primary">{person.role}</span>
              <span className="text-sm text-content-muted">{person.members}</span>
            </li>
          ))}
        </ul>
      </section>

      <footer className="mt-12 flex items-center gap-3 rounded-xl border border-accent/40 bg-accent-subtle p-6">
        <Rocket className="size-6 shrink-0 text-accent" aria-hidden="true" />
        <div>
          <p className="font-display text-base font-extrabold text-content-primary">
            Quer ajudar a escrever o próximo capítulo?
          </p>
          <p className="mt-1 text-sm text-content-secondary">
            O acervo é colaborativo. Quer dizer, o acervo é da fã-base — você
            pode entrar pelo servidor da Comunidade.
          </p>
        </div>
      </footer>
    </section>
  )
}