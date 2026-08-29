import { Link } from 'react-router-dom'
import {
  ArrowRight,
  Camera,
  Clapperboard,
  Disc3,
  ExternalLink,
  Music2,
} from 'lucide-react'
import { Badge } from '@/components/ui/Badge'

const DISCOGRAPHY = [
  { title: 'halfnoise', type: 'Álbum de estreia', year: 2016, tag: 'Psicodélico / lo-fi' },
  { title: 'Sudden Feeling', type: 'Álbum', year: 2018, tag: 'Pop experimental' },
  { title: 'Natural Disguise', type: 'Álbum', year: 2019, tag: 'Sunshine / dream pop' },
  { title: 'Motivation', type: 'Álbum', year: 2020, tag: 'Synth-pop' },
  { title: 'City Talk', type: 'Álbum', year: 2021, tag: 'Experimental' },
  { title: 'The Shape Of You', type: 'Álbum', year: 2022, tag: 'Dream-pop' },
]

export default function Halfnoise() {
  return (
    <section className="mx-auto max-w-[var(--container-max)] px-4 py-16 sm:px-6">
      <header className="max-w-2xl">
        <div className="mb-3 flex items-center gap-2">
          <Badge tone="accent">Projetos Paralelos</Badge>
          <Badge>Zac Farro · 2010 — presente</Badge>
        </div>
        <h1 className="font-display text-4xl font-extrabold tracking-tight text-content-primary sm:text-5xl">
          halfnoise
        </h1>
        <p className="mt-4 text-lg leading-relaxed text-content-secondary">
          O projeto musical — e cinematográfico — de Zac Farro. Longe do palco
          do Paramore, Zac constrói um universo próprio de sintetizadores,
          bateria orgânica e imagens, onde cada clipe é dirigido por ele mesmo.
        </p>
      </header>

      <div className="mt-10 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="overflow-hidden rounded-2xl border border-line-1 bg-surface-1">
          <div className="flex h-full flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex size-16 shrink-0 items-center justify-center rounded-2xl bg-accent-subtle text-accent">
                <Music2 className="size-8" aria-hidden="true" />
              </div>
              <div>
                <p className="font-display text-xl font-extrabold tracking-tight text-content-primary">
                  Um canto só seu
                </p>
                <p className="mt-1 max-w-md text-sm leading-relaxed text-content-secondary">
                  Nascido em 2010 como válvula de escape durante a primeira
                  saída do Zac do Paramore, o halfnoise cresceu até virar uma
                  banda completa: hoje Zac compõe, toca, escolhe a arte e
                  ainda dirige os próprios clipes.
                </p>
              </div>
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
              <a
                href="https://halfnoisemusic.com"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-full bg-accent px-4 py-2 text-sm font-semibold text-content-inverse transition-colors hover:bg-accent-hover"
              >
                halfnoisemusic.com
                <ExternalLink className="size-3.5" aria-hidden="true" />
              </a>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-line-1 bg-surface-1 p-6">
          <h2 className="flex items-center gap-2 font-display text-lg font-extrabold tracking-tight text-content-primary">
            <Clapperboard className="size-5 text-accent" aria-hidden="true" />
            Veia cinematográfica
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-content-secondary">
            Cada clipe do halfnoise é também um mini-filme: Zac dirige, filma e
            monta, com estética que passeia do filme antigo ao VHS. A arte das
            capas, os zines e o design dos shows seguem a mesma mão.
          </p>
        </div>
      </div>

      <section className="mt-12">
        <h2 className="flex items-center gap-2 font-display text-2xl font-extrabold tracking-tight text-content-primary">
          <Disc3 className="size-5 text-accent" aria-hidden="true" />
          Discografia no projeto
        </h2>
        <ul className="mt-5 grid gap-3 sm:grid-cols-2">
          {DISCOGRAPHY.map((release) => (
            <li
              key={`${release.title}-${release.year}`}
              className="flex items-center justify-between gap-4 rounded-xl border border-line-1 bg-surface-1 px-5 py-4"
            >
              <div>
                <p className="font-display text-base font-extrabold text-content-primary">
                  {release.title}
                </p>
                <p className="text-xs text-content-muted">
                  {release.type} · {release.year}
                </p>
              </div>
              <Badge>{release.tag}</Badge>
            </li>
          ))}
        </ul>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-content-muted">
          Além dos álbuns, o halfnoise lança EPs e singles avulsos em ritmo
          próprio — alguns autoproduzidos em estúdios caseiros de Franklin e
          Kauai, outros já dentro da Congrats Records, selo que Zac fundou para
          abrigar o projeto e artistas amigos.
        </p>
      </section>

      <div className="mt-10 flex flex-wrap gap-2">
        <a
          href="https://www.instagram.com/halfnoisemusic"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-full border border-line-1 bg-surface-2 px-4 py-2 text-sm font-semibold text-content-primary transition-colors hover:border-accent hover:text-accent"
        >
          @halfnoisemusic no Instagram
          <ExternalLink className="size-3.5" aria-hidden="true" />
        </a>
        <a
          href="https://open.spotify.com/search/halfnoise"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-full border border-line-1 bg-surface-2 px-4 py-2 text-sm font-semibold text-content-primary transition-colors hover:border-accent hover:text-accent"
        >
          Ouvir no Spotify
          <ExternalLink className="size-3.5" aria-hidden="true" />
        </a>
        <Link
          to="/projetos"
          className="inline-flex items-center gap-1.5 rounded-full border border-line-1 bg-surface-2 px-4 py-2 text-sm font-semibold text-content-primary transition-colors hover:border-accent hover:text-accent"
        >
          Voltar para Projetos
          <ArrowRight className="size-3.5 translate-y-[2px]" aria-hidden="true" />
        </Link>
      </div>

      <div className="mt-10 flex items-start gap-3 rounded-xl border border-line-1 bg-surface-1 p-5">
        <Camera className="mt-0.5 size-5 shrink-0 text-accent" aria-hidden="true" />
        <p className="text-sm leading-relaxed text-content-secondary">
          <span className="font-semibold text-content-primary">Registro:</span>{' '}
          o halfnoise tocou ao lado do Paramore em datas selecionadas da turnê
          atual (2023–2024) e abriu a turnê australiana de 2024. O portal
          acompanha Zac em qualquer palco.
        </p>
      </div>
    </section>
  )
}