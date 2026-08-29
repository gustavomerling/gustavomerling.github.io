import { ArrowRight, Building2, Disc3, ExternalLink, Globe, HeartHandshake, Newspaper, Radio } from 'lucide-react'
import BrandIcon from '@/components/ui/BrandIcon'
import { Badge } from '@/components/ui/Badge'

const PARTNERS = [
  {
    icon: Radio,
    group: 'Selo & gravadora',
    items: [
      { name: 'Congrats Records', role: 'Selo independente de Zac Farro' },
      { name: 'Distribuição nacional', role: 'Parceria de distribuição física no Brasil' },
    ],
  },
  {
    icon: Building2,
    group: 'Assessoria & produção',
    items: [
      { name: 'Assessoria BR', role: 'Apoio de imprensa para os shows da turnê' },
      { name: 'Produtoras regionais', role: 'Parceria para encontros e pré-shows' },
    ],
  },
  {
    icon: Newspaper,
    group: 'Imprensa & mídia',
    items: [
      { name: 'Portal Rock BR', role: 'Troca de conteúdo e cobertura conjunta' },
      { name: 'Rádios universitárias', role: 'Divulgação da discografia em novos formatos' },
    ],
  },
  {
    icon: Disc3,
    group: 'Arquivo & acervo',
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
    role: 'Designer',
    bio: 'Identidade visual, direção de arte e a cara que o portal apresenta ao mundo.',
    color: 'from-fuchsia-500 to-purple-600',
    links: [
      { href: 'https://x.com/helefanta', label: 'Perfil no X', icon: 'x' },
      { href: 'https://www.behance.net/helefanta', label: 'Portfólio no Behance', icon: 'behance' },
    ],
  },
  {
    name: 'Gustavo Merling',
    role: 'Desenvolvedor Front-end',
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
    <section className="mx-auto max-w-[var(--container-max)] px-4 py-16 sm:px-6">
      <header className="max-w-2xl">
        <div className="mb-3 flex items-center gap-2">
          <Badge tone="accent">Parceiros</Badge>
          <Badge>Quem apoia o portal</Badge>
        </div>
        <h1 className="font-display text-4xl font-extrabold tracking-tight text-content-primary sm:text-5xl">
          Parceiros
        </h1>
        <p className="mt-4 text-lg leading-relaxed text-content-secondary">
          Selos, produtoras, imprensa e acervos que caminham com o maior
          fã-clube do Paramore no Brasil — sem abrir mão da independência.
        </p>
        <div className="mt-6 flex flex-wrap gap-2">
          {PRINCIPLES.map((p) => (
            <Badge key={p}>{p}</Badge>
          ))}
        </div>
      </header>

      <div className="mt-10 grid gap-6 md:grid-cols-2">
        {PARTNERS.map((partner) => (
          <section
            key={partner.group}
            className="rounded-xl border border-line-1 bg-surface-1 p-6"
          >
            <h2 className="flex items-center gap-2 font-display text-lg font-extrabold tracking-tight text-content-primary">
              <partner.icon className="size-5 text-accent" aria-hidden="true" />
              {partner.group}
            </h2>
            <ul className="mt-4 space-y-3">
              {partner.items.map((item) => (
                <li key={item.name} className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-content-primary">{item.name}</p>
                    <p className="text-xs text-content-muted">{item.role}</p>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <section className="mt-12">
        <h2 className="flex items-center gap-2 font-display text-2xl font-extrabold tracking-tight text-content-primary">
          <HeartHandshake className="size-5 text-accent" aria-hidden="true" />
          Design & Desenvolvimento
        </h2>
        <p className="mt-2 max-w-2xl text-sm text-content-muted">
          Quem constrói o portal — designers e desenvolvedores que mantêm o
          site no ar e de pé.
        </p>
        <div className="mt-6 grid gap-6 sm:grid-cols-2">
          {TEAM.map((member) => (
            <article
              key={member.name}
              className="rounded-xl border border-line-1 bg-surface-1 p-6"
            >
              <div className="flex items-center gap-4">
                <div
                  className={`flex size-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${member.color} font-display text-lg font-extrabold text-white`}
                  aria-hidden="true"
                >
                  {member.name
                    .split(' ')
                    .map((n) => n[0])
                    .join('')}
                </div>
                <div>
                  <p className="font-display text-base font-extrabold text-content-primary">
                    {member.name}
                  </p>
                  <p className="text-sm font-medium text-accent">{member.role}</p>
                </div>
              </div>
              <p className="mt-4 text-sm leading-relaxed text-content-secondary">{member.bio}</p>
              <ul className="mt-4 flex flex-wrap gap-2">
                {member.links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-full border border-line-1 bg-surface-2 px-3.5 py-1.5 text-sm font-medium text-content-primary transition-colors hover:border-accent hover:text-accent"
                    >
                      {link.icon ? (
                        <BrandIcon brand={link.icon} className="size-4" />
                      ) : (
                        <Globe className="size-4" aria-hidden="true" />
                      )}
                      {link.label}
                      <ExternalLink className="size-3 opacity-60" aria-hidden="true" />
                    </a>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>

      <footer className="mt-12 flex flex-col gap-4 rounded-xl border border-accent/40 bg-accent-subtle p-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <HeartHandshake className="mt-0.5 size-6 shrink-0 text-accent" aria-hidden="true" />
          <div>
            <p className="font-display text-base font-extrabold text-content-primary">
              Quer ser parceiro do portal?
            </p>
            <p className="mt-1 text-sm text-content-secondary">
              Propostas de colaboração editorial e cultural são bem-vindas —
              conteúdo pago, não.
            </p>
          </div>
        </div>
        <a
          href="mailto:contato@paramorebrasil.com.br"
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-content-inverse transition-colors hover:bg-accent-hover"
        >
          Falar com a equipe
          <ArrowRight className="size-4" aria-hidden="true" />
        </a>
      </footer>
    </section>
  )
}