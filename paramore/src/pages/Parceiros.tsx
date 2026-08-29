import { ArrowRight, Building2, Disc3, ExternalLink, Globe, HeartHandshake, Newspaper, Radio, Sparkles } from 'lucide-react'
import BrandIcon from '@/components/ui/BrandIcon'
import { Badge } from '@/components/ui/Badge'
import TiltCard from '@/components/fx/TiltCard'
import EraAmbientFX from '@/components/fx/EraAmbientFX'

const PARTNERS = [
  {
    icon: Radio,
    group: 'Selo & Gravadora',
    items: [
      { name: 'Congrats Records', role: 'Selo independente de Zac Farro' },
      { name: 'Distribuição nacional', role: 'Parceria de distribuição física no Brasil' },
    ],
  },
  {
    icon: Building2,
    group: 'Assessoria & Produção',
    items: [
      { name: 'Assessoria BR', role: 'Apoio de imprensa para os shows da turnê' },
      { name: 'Produtoras regionais', role: 'Parceria para encontros e pré-shows' },
    ],
  },
  {
    icon: Newspaper,
    group: 'Imprensa & Mídia',
    items: [
      { name: 'Portal Rock BR', role: 'Troca de conteúdo e cobertura conjunta' },
      { name: 'Rádios universitárias', role: 'Divulgação da discografia em novos formatos' },
    ],
  },
  {
    icon: Disc3,
    group: 'Arquivo & Acervo',
    items: [
      { name: 'Acervo Vinil BR', role: 'Parceria de catalogação de edições físicas' },
      { name: 'Museu da Cena', role: 'Doações históricas para o centro cultural' },
    ],
  },
]

const PRINCIPLES = [
  'Seleção editorial independente',
  'Zero conteúdo pago como notícia',
  'Crédito e transparência em todo material',
]

type TeamLink = { href: string; label: string; icon?: 'x' | 'behance' | 'linkedin' }

const TEAM: { name: string; role: string; bio: string; color: string; links: TeamLink[] }[] = [
  {
    name: 'Helena Vieira',
    role: 'Designer & Direção de Arte',
    bio: 'Identidade visual, direção de arte e a cara que o portal apresenta ao mundo.',
    color: 'from-fuchsia-500 to-purple-600',
    links: [
      { href: 'https://x.com/helefanta', label: 'Perfil no X', icon: 'x' },
      { href: 'https://www.behance.net/helefanta', label: 'Portfólio no Behance', icon: 'behance' },
    ],
  },
  {
    name: 'Gustavo Merling',
    role: 'Desenvolvedor Front-end & UI/UX',
    bio: 'Engenharia do site: componentes, acessibilidade, performance e o visual em código.',
    color: 'from-sky-500 to-blue-600',
    links: [
      { href: 'https://gustavomerling.github.io/', label: 'Site pessoal', icon: undefined },
      { href: 'https://br.linkedin.com/in/gustavo-merling', label: 'Perfil no LinkedIn', icon: 'linkedin' },
    ],
  },
]

export default function Parceiros() {
  return (
    <section className="relative mx-auto max-w-[var(--container-max)] px-4 py-16 sm:px-6">
      <EraAmbientFX density="medium" />

      <header className="relative max-w-2xl">
        <div className="mb-3 flex items-center gap-2">
          <Badge tone="accent">
            <Sparkles className="mr-1 size-3.5" /> Alianças & Criação
          </Badge>
          <Badge>Quem apoia o portal</Badge>
        </div>
        <h1 className="font-display text-4xl font-extrabold tracking-tight text-content-primary sm:text-6xl">
          Parceiros & Criadores
        </h1>
        <p className="mt-4 text-lg leading-relaxed text-content-secondary">
          Selos, produtoras, imprensa e acervos que caminham com o maior
          fã-clube do Paramore no Brasil — com total transparência e independência editorial.
        </p>
        <div className="mt-6 flex flex-wrap gap-2">
          {PRINCIPLES.map((p) => (
            <Badge key={p}>{p}</Badge>
          ))}
        </div>
      </header>

      {/* Grid de Parceiros */}
      <div className="mt-12 grid gap-6 md:grid-cols-2">
        {PARTNERS.map((partner) => (
          <section
            key={partner.group}
            className="rounded-2xl border border-line-1 bg-surface-1/90 p-6 backdrop-blur shadow-md transition-all duration-300 hover:border-accent/60"
          >
            <h2 className="flex items-center gap-2 font-display text-xl font-extrabold tracking-tight text-content-primary">
              <partner.icon className="size-5 text-accent" aria-hidden="true" />
              {partner.group}
            </h2>
            <ul className="mt-5 space-y-4">
              {partner.items.map((item) => (
                <li key={item.name} className="flex items-start justify-between gap-4 border-b border-line-1/40 pb-3 last:border-none last:pb-0">
                  <div>
                    <p className="text-sm font-bold text-content-primary">{item.name}</p>
                    <p className="text-xs text-content-muted mt-0.5">{item.role}</p>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      {/* Equipe Criativa e Desenvolvedores */}
      <section className="mt-16 border-t border-line-1/80 pt-12">
        <h2 className="flex items-center gap-2 font-display text-2xl font-extrabold tracking-tight text-content-primary sm:text-3xl">
          <HeartHandshake className="size-6 text-accent" aria-hidden="true" />
          Design & Engenharia Front-end
        </h2>
        <p className="mt-2 max-w-2xl text-sm text-content-secondary">
          Mentes que desenham e desenvolvem a experiência visual e interativa do Paramore Brasil.
        </p>

        <div className="mt-8 grid gap-6 sm:grid-cols-2">
          {TEAM.map((member) => (
            <TiltCard
              key={member.name}
              maxTilt={6}
              className="rounded-2xl border border-line-1 bg-surface-1/90 p-6 backdrop-blur shadow-sm transition-all duration-300 hover:border-accent/60 hover:bg-surface-2/60"
            >
              <div className="flex items-center gap-4">
                <div
                  className={`flex size-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${member.color} font-display text-xl font-extrabold text-white shadow-md`}
                  aria-hidden="true"
                >
                  {member.name
                    .split(' ')
                    .map((n) => n[0])
                    .join('')}
                </div>
                <div>
                  <h3 className="font-display text-lg font-bold text-content-primary">
                    {member.name}
                  </h3>
                  <p className="text-xs font-semibold text-accent uppercase tracking-wider">{member.role}</p>
                </div>
              </div>

              <p className="mt-4 text-sm leading-relaxed text-content-secondary">{member.bio}</p>

              <ul className="mt-6 flex flex-wrap gap-2 border-t border-line-1/40 pt-4">
                {member.links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-full border border-line-1 bg-surface-2/80 px-3.5 py-1.5 text-xs font-semibold text-content-primary transition-all hover:border-accent hover:text-accent hover:scale-105"
                    >
                      {link.icon ? (
                        <BrandIcon brand={link.icon} className="size-3.5" />
                      ) : (
                        <Globe className="size-3.5" aria-hidden="true" />
                      )}
                      {link.label}
                      <ExternalLink className="size-3 opacity-60" aria-hidden="true" />
                    </a>
                  </li>
                ))}
              </ul>
            </TiltCard>
          ))}
        </div>
      </section>

      {/* CTA de Parceria */}
      <footer className="mt-14 flex flex-col gap-4 rounded-2xl border border-accent/40 bg-accent-subtle/80 p-8 backdrop-blur sm:flex-row sm:items-center sm:justify-between shadow-lg">
        <div className="flex items-start gap-4">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-accent text-content-inverse shadow-glow">
            <HeartHandshake className="size-6" aria-hidden="true" />
          </div>
          <div>
            <p className="font-display text-lg font-extrabold text-content-primary">
              Quer construir parcerias com o Paramore Brasil?
            </p>
            <p className="mt-1 text-sm text-content-secondary">
              Propostas de colaboração editorial, produção cultural e apoio a eventos são sempre bem-vindas.
            </p>
          </div>
        </div>

        <a
          href="mailto:contato@paramorebrasil.com.br"
          className="inline-flex shrink-0 items-center gap-2 rounded-full bg-accent px-6 py-3 text-xs font-bold uppercase tracking-wider text-content-inverse shadow-glow transition-all hover:bg-accent-hover hover:scale-105"
        >
          Falar com a Equipe
          <ArrowRight className="size-4" aria-hidden="true" />
        </a>
      </footer>
    </section>
  )
}