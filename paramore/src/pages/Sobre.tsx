import { Archive, Flag, HeartHandshake, History, Rocket, Users, Sparkles } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import TiltCard from '@/components/fx/TiltCard'
import EraAmbientFX from '@/components/fx/EraAmbientFX'

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
    <section className="relative mx-auto max-w-[var(--container-max)] px-4 py-16 sm:px-6">
      <EraAmbientFX density="medium" />

      <header className="relative max-w-2xl">
        <div className="mb-3 flex items-center gap-2">
          <Badge tone="accent">
            <Sparkles className="mr-1 size-3.5" /> Sobre o Portal
          </Badge>
          <Badge>21 Anos de Memória Coletiva</Badge>
        </div>
        <h1 className="font-display text-4xl font-extrabold tracking-tight text-content-primary sm:text-6xl">
          Sobre o Site
        </h1>
        <p className="mt-4 text-lg leading-relaxed text-content-secondary">
          A história do portal Paramore Brasil — de um blog pioneiro de fã à maior base
          de acervo e tradução do Paramore em língua portuguesa.
        </p>
      </header>

      {/* Valores */}
      <section className="mt-12 grid gap-6 sm:grid-cols-3">
        {VALUES.map((value) => (
          <TiltCard
            key={value.title}
            maxTilt={6}
            className="rounded-2xl border border-line-1 bg-surface-1/90 p-6 backdrop-blur shadow-sm transition-all duration-300 hover:border-accent/60 hover:bg-surface-2/60"
          >
            <div className="flex size-12 items-center justify-center rounded-xl bg-accent-subtle text-accent mb-4">
              <value.icon className="size-6" aria-hidden="true" />
            </div>
            <h2 className="font-display text-lg font-extrabold tracking-tight text-content-primary">
              {value.title}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-content-secondary">{value.text}</p>
          </TiltCard>
        ))}
      </section>

      {/* Linha do Tempo dos 20 anos */}
      <section className="mt-16 border-t border-line-1/80 pt-12">
        <h2 className="flex items-center gap-2 font-display text-2xl font-extrabold tracking-tight text-content-primary sm:text-3xl">
          <History className="size-6 text-accent" aria-hidden="true" />
          Nossa Linha do Tempo (2005–2026)
        </h2>
        <p className="mt-1 text-sm text-content-muted">Duas décadas registrando cada passo e cada era.</p>

        <ol className="relative mt-8 space-y-0 border-l-2 border-accent/40 pl-8 ml-2">
          {MILESTONES.map((m) => (
            <li key={m.year} className="relative pb-10 last:pb-0">
              <span className="absolute -left-[39px] top-1 size-3.5 rounded-full border-4 border-surface-1 bg-accent shadow-glow" aria-hidden="true" />
              <span className="inline-block font-mono text-xs font-bold text-accent uppercase tracking-wider bg-accent-subtle px-2 py-0.5 rounded">
                {m.year}
              </span>
              <h3 className="mt-2 font-display text-xl font-extrabold tracking-tight text-content-primary">
                {m.title}
              </h3>
              <p className="mt-1 max-w-2xl text-sm leading-relaxed text-content-secondary">{m.text}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Equipe */}
      <section className="mt-16 border-t border-line-1/80 pt-12">
        <h2 className="flex items-center gap-2 font-display text-2xl font-extrabold tracking-tight text-content-primary sm:text-3xl">
          <Users className="size-6 text-accent" aria-hidden="true" />
          Equipe Editorial & Colaboradores
        </h2>
        <ul className="mt-6 grid gap-4 sm:grid-cols-2">
          {TEAM.map((person) => (
            <li
              key={person.role}
              className="flex items-center justify-between rounded-xl border border-line-1 bg-surface-1/90 px-5 py-4 backdrop-blur shadow-sm transition-colors hover:border-accent/50"
            >
              <span className="font-display text-sm font-bold text-content-primary">{person.role}</span>
              <span className="text-xs font-mono text-accent">{person.members}</span>
            </li>
          ))}
        </ul>
      </section>

      <footer className="mt-14 flex items-center gap-4 rounded-2xl border border-accent/40 bg-accent-subtle/80 p-8 backdrop-blur shadow-lg">
        <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-accent text-content-inverse shadow-glow">
          <Rocket className="size-6" aria-hidden="true" />
        </div>
        <div>
          <p className="font-display text-lg font-extrabold text-content-primary">
            Quer colaborar com o acervo do Paramore Brasil?
          </p>
          <p className="mt-1 text-sm text-content-secondary">
            Nosso arquivo histórico é feito de doações e pesquisas dos próprios fãs. Conecte-se pelo servidor da Comunidade!
          </p>
        </div>
      </footer>
    </section>
  )
}