import { Link } from 'react-router-dom'
import { ArrowRight, BadgeCheck, Flower2, HeartPulse, Sparkles } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'

const SOLO_ALBUMS = [
  {
    icon: Flower2,
    title: 'Petals for Armor',
    year: 2020,
    tags: ['Art pop', 'R&B', 'Solo'],
    description:
      'O disco de estreia de Hayley fora do Paramore. Vinte e uma canções — entregues em três partes ao longo da primavera — sobre os limites alheios, o autocuidado e aprender a se proteger.',
  },
  {
    icon: HeartPulse,
    title: 'FLOWERS for VASES / descansos',
    year: 2021,
    tags: ['Acústico', 'Intimista'],
    description:
      'Gravado em casa durante o isolamento, é o disco mais pessoal de Hayley: só voz, piano, violão e a parede do quarto como estúdio. Um diário sonoro sem filtros.',
  },
]

export default function PetalsForArmor() {
  return (
    <section className="mx-auto max-w-[var(--container-max)] px-4 py-16 sm:px-6">
      <header className="max-w-2xl">
        <div className="mb-3 flex items-center gap-2">
          <Badge tone="accent">Projetos Paralelos</Badge>
          <Badge>Hayley Williams · 2020 — 2021</Badge>
        </div>
        <h1 className="font-display text-4xl font-extrabold tracking-tight text-content-primary sm:text-5xl">
          Petals for Armor
        </h1>
        <p className="mt-4 text-lg leading-relaxed text-content-secondary">
          A era solo de Hayley Williams: dois álbuns sobre cura — o primeiro,
          um art-pop florido e dançante; o segundo, um disco-acústico gravado
          dentro de casa. Junto deles, a marca Good Dye Young seguiu pintando
          os cabelos e os clipes da era.
        </p>
      </header>

      <ul className="mt-10 grid gap-6 md:grid-cols-2">
        {SOLO_ALBUMS.map((album) => (
          <li key={album.title} className="rounded-2xl border border-line-1 bg-surface-1 p-6">
            <album.icon className="size-8 text-accent" aria-hidden="true" />
            <div className="mt-4 flex items-baseline justify-between gap-3">
              <h2 className="font-display text-2xl font-extrabold tracking-tight text-content-primary">
                {album.title}
              </h2>
              <span className="text-xs font-semibold text-content-muted">{album.year}</span>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-content-secondary">
              {album.description}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {album.tags.map((tag) => (
                <Badge key={tag}>{tag}</Badge>
              ))}
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              <a
                href={`https://open.spotify.com/search/${encodeURIComponent(album.title)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full border border-line-1 bg-surface-2 px-4 py-1.5 text-sm font-semibold text-content-primary transition-colors hover:border-accent hover:text-accent"
              >
                Ouvir no Spotify
              </a>
            </div>
          </li>
        ))}
      </ul>

      <section className="mt-12 rounded-2xl border border-accent/40 bg-accent-subtle p-6 sm:p-8">
        <h2 className="flex items-center gap-2 font-display text-2xl font-extrabold tracking-tight text-content-primary">
          <Sparkles className="size-5 text-accent" aria-hidden="true" />
          A era da cura
        </h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <div>
            <p className="font-display text-base font-extrabold text-content-primary">Sim-bolismo</p>
            <p className="mt-1 text-sm leading-relaxed text-content-secondary">
              A flor nasce do Fernando Pessoa de Hayley: "há flores para quem
              as olha". Cada etapa do disco floresce a partir do que a
              rodeava — física e mentalmente.
            </p>
          </div>
          <div>
            <p className="font-display text-base font-extrabold text-content-primary">Paleta própria</p>
            <p className="mt-1 text-sm leading-relaxed text-content-secondary">
              Os cabelos de Hayley definiram a identidade da era: do cabelo
              natural voltando ao longo das três partes, à pintura Good Dye
              Young nos clipes.
            </p>
          </div>
          <div>
            <p className="font-display text-base font-extrabold text-content-primary">Clipes em casa</p>
            <p className="mt-1 text-sm leading-relaxed text-content-secondary">
              A pandemia empurrou os videoclipes para espaços domésticos —
              e FLOWERS for VASES nasceu literalmente em casa, virando curta.
            </p>
          </div>
        </div>
      </section>

      <div className="mt-10 flex items-start gap-3 rounded-xl border border-line-1 bg-surface-1 p-5">
        <BadgeCheck className="mt-0.5 size-5 shrink-0 text-accent" aria-hidden="true" />
        <p className="text-sm leading-relaxed text-content-secondary">
          <span className="font-semibold text-content-primary">Good Dye Young:</span>{' '}
          a marca de tinturas de Hayley seguiu como vitrine criativa da era —
          das cores da turnê These Tears a parcerias de coleção. Na página de
          projetos há o link oficial da loja.
        </p>
      </div>

      <div className="mt-8 flex flex-wrap gap-2">
        <a
          href="https://www.instagram.com/yelyahwilliams"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-full border border-line-1 bg-surface-2 px-4 py-2 text-sm font-semibold text-content-primary transition-colors hover:border-accent hover:text-accent"
        >
          @yelyahwilliams no Instagram
        </a>
        <Link
          to="/projetos"
          className="inline-flex items-center gap-1.5 rounded-full border border-line-1 bg-surface-2 px-4 py-2 text-sm font-semibold text-content-primary transition-colors hover:border-accent hover:text-accent"
        >
          Voltar para Projetos
          <ArrowRight className="size-3.5 translate-y-[2px]" aria-hidden="true" />
        </Link>
      </div>
    </section>
  )
}