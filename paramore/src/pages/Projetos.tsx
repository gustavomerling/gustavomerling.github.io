import { Link } from 'react-router-dom'
import {
  ArrowRight,
  ExternalLink,
  Flower,
  Flower2,
  Music2,
  Palette,
  Radio,
} from 'lucide-react'
import { Badge } from '@/components/ui/Badge'

interface Project {
  icon: typeof Music2
  title: string
  owner: string
  years: string
  description: string
  tags: string[]
  link?: { label: string; to: string }
  external?: { label: string; href: string }
  featured?: boolean
}

const PROJECTS: Project[] = [
  {
    icon: Music2,
    title: 'halfnoise',
    owner: 'Zac Farro',
    years: '2010 — presente',
    description:
      'Projeto musical e cinematográfico de Zac Farro. Sons experimentais, lo-fi psicodélico e uma veia visual própria que atravessa clipes, capas e zines.',
    tags: ['Rock experimental', 'Lo-fi', 'Cinema'],
    link: { label: 'Conhecer o halfnoise', to: '/halfnoise' },
    featured: true,
  },
  {
    icon: Flower2,
    title: 'Petals for Armor',
    owner: 'Hayley Williams',
    years: '2020 — 2021',
    description:
      'A estreia solo de Hayley Williams: dois álbuns sobre autocuidado, terapia e a reconstrução da própria identidade depois da banda.',
    tags: ['Art pop', 'Solo', "Álbum de estreia"],
    link: { label: 'Conhecer a era solo', to: '/petals-for-armor' },
    featured: true,
  },
  {
    icon: Flower,
    title: 'FLOWERS for VASES / descansos',
    owner: 'Hayley Williams',
    years: '2021',
    description:
      'Companheiro acústico de Petals for Armor, gravado em casa durante o isolamento — um dos discos mais íntimos da discografia de Hayley.',
    tags: ['Acústico', 'Intimista'],
    link: { label: 'Explorar na era solo', to: '/petals-for-armor' },
  },
  {
    icon: Palette,
    title: 'Good Dye Young',
    owner: 'Hayley Williams',
    years: '2016 — presente',
    description:
      'Marca de tintura e cuidados com o cabelo fundada por Hayley. Do roxo "Fake Happy" ao laranja RIOT!, a paleta que virou código visual da era.',
    tags: ['Beleza', 'Marca'],
    external: { label: 'Visitar gooddyeyoung.com', href: 'https://www.gooddyeyoung.com/' },
  },
  {
    icon: Radio,
    title: 'Congrats Records',
    owner: 'Zac Farro',
    years: '2024 — presente',
    description:
      'Selo criado por Zac para abrigar lançamentos do halfnoise e artistas amigos — é a casa de Operator, single do Paramore gravado no novo ciclo.',
    tags: ['Selo', 'Independente'],
    external: { label: 'Ouvir no Spotify', href: 'https://open.spotify.com/' },
  },
]

export default function Projetos() {
  const featured = PROJECTS.filter((p) => p.featured)
  const others = PROJECTS.filter((p) => !p.featured)

  return (
    <section className="mx-auto max-w-[var(--container-max)] px-4 py-16 sm:px-6">
      <header className="max-w-2xl">
        <div className="mb-3 flex items-center gap-2">
          <Badge tone="accent">Projetos Paralelos</Badge>
          <Badge>Fora do palco</Badge>
        </div>
        <h1 className="font-display text-4xl font-extrabold tracking-tight text-content-primary sm:text-5xl">
          Projetos
        </h1>
        <p className="mt-4 text-lg leading-relaxed text-content-secondary">
          Quando o Paramore tira a folga, o talento continua: os trilhos
          paralelos de Hayley, Taylor e Zac — bandas solo, marcas, selo e o
          cinema musical do halfnoise.
        </p>
      </header>

      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        {featured.map((project) => (
          <article
            key={project.title}
            className="group flex flex-col rounded-xl border border-line-1 bg-surface-1 p-6 transition-colors hover:border-accent/60 hover:bg-surface-2"
          >
            <project.icon className="size-8 text-accent" aria-hidden="true" />
            <div className="mt-4">
              <span className="text-xs font-medium uppercase tracking-wider text-content-muted">
                {project.owner} · {project.years}
              </span>
              <h2 className="mt-1 font-display text-2xl font-extrabold tracking-tight text-content-primary">
                {project.title}
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-content-secondary">
                {project.description}
              </p>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {project.tags.map((tag) => (
                <Badge key={tag}>{tag}</Badge>
              ))}
            </div>
            <div className="mt-auto pt-6">
              {project.link && (
                <Link
                  to={project.link.to}
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-accent transition-colors hover:text-accent-hover"
                >
                  {project.link.label}
                  <ArrowRight className="size-4 translate-y-[2px] transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                </Link>
              )}
              {project.external && (
                <a
                  href={project.external.href}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-accent transition-colors hover:text-accent-hover"
                >
                  {project.external.label}
                  <ExternalLink className="size-4" aria-hidden="true" />
                </a>
              )}
            </div>
          </article>
        ))}
      </div>

      <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {others.map((project) => (
          <article
            key={project.title}
            className="group flex flex-col rounded-xl border border-line-1 bg-surface-1 p-5 transition-colors hover:border-accent/60 hover:bg-surface-2"
          >
            <project.icon className="size-6 text-accent" aria-hidden="true" />
            <h3 className="mt-3 font-display text-lg font-extrabold tracking-tight text-content-primary">
              {project.title}
            </h3>
            <span className="mt-0.5 text-xs text-content-muted">
              {project.owner} · {project.years}
            </span>
            <p className="mt-3 text-sm leading-relaxed text-content-secondary">
              {project.description}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {project.tags.map((tag) => (
                <Badge key={tag}>{tag}</Badge>
              ))}
            </div>
            <div className="mt-auto pt-5">
              {project.link && (
                <Link
                  to={project.link.to}
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-accent transition-colors hover:text-accent-hover"
                >
                  {project.link.label}
                  <ArrowRight className="size-4 translate-y-[2px] transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                </Link>
              )}
              {project.external && (
                <a
                  href={project.external.href}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-accent transition-colors hover:text-accent-hover"
                >
                  {project.external.label}
                  <ExternalLink className="size-4" aria-hidden="true" />
                </a>
              )}
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}