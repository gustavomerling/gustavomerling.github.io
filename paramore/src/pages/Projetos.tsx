import { Link } from 'react-router-dom'
import {
  ArrowRight,
  ExternalLink,
  Flower,
  Flower2,
  Music2,
  Palette,
  Radio,
  Sparkles,
} from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import TiltCard from '@/components/fx/TiltCard'
import EraAmbientFX from '@/components/fx/EraAmbientFX'

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
    <section className="relative mx-auto max-w-[var(--container-max)] px-4 py-16 sm:px-6">
      <EraAmbientFX density="medium" />

      <header className="relative max-w-2xl">
        <div className="mb-3 flex items-center gap-2">
          <Badge tone="accent">
            <Sparkles className="mr-1 size-3.5" /> Projetos Paralelos
          </Badge>
          <Badge>Fora do palco oficial</Badge>
        </div>
        <h1 className="font-display text-4xl font-extrabold tracking-tight text-content-primary sm:text-6xl">
          Projetos & Carreiras Solo
        </h1>
        <p className="mt-4 text-lg leading-relaxed text-content-secondary">
          Quando o Paramore respira entre turnês, a criatividade dos membros continua em alta voltagem:
          a estética do halfnoise, a cura de Petals for Armor e as marcas autorais de Hayley e Zac.
        </p>
      </header>

      {/* Projetos em Destaque com TiltCards */}
      <div className="mt-12 grid gap-6 lg:grid-cols-2">
        {featured.map((project) => (
          <TiltCard
            key={project.title}
            maxTilt={6}
            className="group flex flex-col rounded-2xl border border-line-1 bg-surface-1/90 p-8 backdrop-blur-md transition-all duration-300 hover:border-accent/60 hover:bg-surface-2/60"
          >
            <div className="flex size-14 items-center justify-center rounded-2xl bg-accent-subtle text-accent shadow-inner">
              <project.icon className="size-7" aria-hidden="true" />
            </div>

            <div className="mt-6">
              <span className="font-mono text-xs font-semibold uppercase tracking-wider text-accent">
                {project.owner} · {project.years}
              </span>
              <h2 className="mt-1 font-display text-3xl font-extrabold tracking-tight text-content-primary group-hover:text-accent transition-colors">
                {project.title}
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-content-secondary">
                {project.description}
              </p>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              {project.tags.map((tag) => (
                <Badge key={tag}>{tag}</Badge>
              ))}
            </div>

            <div className="mt-auto pt-8 border-t border-line-1/50">
              {project.link && (
                <Link
                  to={project.link.to}
                  className="inline-flex items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-content-inverse shadow-glow transition-all hover:bg-accent-hover hover:scale-105"
                >
                  {project.link.label}
                  <ArrowRight className="size-4" aria-hidden="true" />
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
          </TiltCard>
        ))}
      </div>

      {/* Demais Projetos */}
      <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {others.map((project) => (
          <TiltCard
            key={project.title}
            maxTilt={6}
            className="group flex flex-col rounded-2xl border border-line-1 bg-surface-1/80 p-6 backdrop-blur transition-all duration-300 hover:border-accent/60 hover:bg-surface-2/60"
          >
            <div className="flex size-11 items-center justify-center rounded-xl bg-surface-2 text-accent">
              <project.icon className="size-5" aria-hidden="true" />
            </div>

            <h3 className="mt-4 font-display text-xl font-extrabold tracking-tight text-content-primary group-hover:text-accent transition-colors">
              {project.title}
            </h3>
            <span className="font-mono text-xs text-content-muted mt-0.5">
              {project.owner} · {project.years}
            </span>

            <p className="mt-3 text-sm leading-relaxed text-content-secondary">
              {project.description}
            </p>

            <div className="mt-4 flex flex-wrap gap-1.5">
              {project.tags.map((tag) => (
                <Badge key={tag}>{tag}</Badge>
              ))}
            </div>

            <div className="mt-auto pt-6">
              {project.link && (
                <Link
                  to={project.link.to}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-accent transition-colors hover:text-accent-hover"
                >
                  {project.link.label}
                  <ArrowRight className="size-3.5" aria-hidden="true" />
                </Link>
              )}
              {project.external && (
                <a
                  href={project.external.href}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-accent transition-colors hover:text-accent-hover"
                >
                  {project.external.label}
                  <ExternalLink className="size-3.5" aria-hidden="true" />
                </a>
              )}
            </div>
          </TiltCard>
        ))}
      </div>
    </section>
  )
}