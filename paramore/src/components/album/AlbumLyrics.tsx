import { useState } from 'react'
import { Play, Music2 } from 'lucide-react'
import type { Album } from '@/lib/albums'
import { getTrackLyrics } from '@/lib/lyrics'
import { Badge } from '@/components/ui/Badge'

export default function AlbumLyrics({ album }: { album: Album }) {
  const [active, setActive] = useState(album.featured.title)
  const lyrics = getTrackLyrics(album.id, active)

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)] lg:items-start">
      <ol className="space-y-1 lg:sticky lg:top-32">
        {album.tracks.map((track, i) => {
          const isActive = track === active
          const hasLyrics = Boolean(getTrackLyrics(album.id, track))
          return (
            <li key={track}>
              <button
                type="button"
                onClick={() => setActive(track)}
                disabled={!hasLyrics}
                aria-current={isActive ? 'true' : undefined}
                className={`flex w-full items-center gap-3 rounded-md border px-3 py-2 text-left text-sm transition-colors ${
                  isActive
                    ? 'border-accent/50 bg-accent-subtle text-content-primary'
                    : 'border-transparent text-content-primary hover:bg-surface-1'
                } ${!hasLyrics ? 'cursor-not-allowed opacity-50' : ''}`}
              >
                <span className="w-6 shrink-0 text-right font-mono text-content-muted">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span className="grid shrink-0 place-items-center">
                  {isActive ? (
                    <Play className="size-3.5 fill-current text-accent" aria-hidden="true" />
                  ) : (
                    <Music2 className="size-3.5 text-content-muted" aria-hidden="true" />
                  )}
                </span>
                <span className="min-w-0 flex-1 truncate">{track}</span>
                {isActive && <Badge tone="accent">Tocando</Badge>}
              </button>
            </li>
          )
        })}
      </ol>

      <div className="rounded-xl border border-line-1 bg-surface-1 p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-display text-2xl font-extrabold tracking-tight text-content-primary">
            {active}
          </h3>
          <span className="text-xs font-medium uppercase tracking-wider text-content-muted">
            Letra original / Tradução
          </span>
        </div>

        {lyrics ? (
          <>
            <p className="mt-2 text-xs text-content-muted">
              Trecho ilustrativo do acervo do fã-clube — a versão completa entra
              na Fase 2, com licenciamento.
            </p>
            <div className="mt-5 grid gap-6 md:grid-cols-2 md:gap-0">
              <div className="md:border-r md:border-line-1 md:pr-6">
                <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-content-muted">
                  Inglês (original)
                </p>
                <ul className="space-y-2 font-mono text-base leading-relaxed text-content-primary">
                  {lyrics.en.map((line, i) => (
                    <li key={i}>{line}</li>
                  ))}
                </ul>
              </div>
              <div className="md:pl-6">
                <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-content-muted">
                  Português (Brasil)
                </p>
                <ul className="space-y-2 text-base leading-relaxed text-content-secondary">
                  {lyrics.pt.map((line, i) => (
                    <li key={i}>{line}</li>
                  ))}
                </ul>
              </div>
            </div>
            {lyrics.note && (
              <aside className="mt-5 rounded-lg border border-accent/40 bg-accent-subtle p-5">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-accent">
                  Nota dos tradutores
                </p>
                <p className="mt-2 text-sm leading-relaxed text-content-secondary">
                  {lyrics.note}
                </p>
              </aside>
            )}
          </>
        ) : (
          <p className="mt-6 text-sm text-content-muted">
            Letra em breve — contribua pelo Clube de Tradução da Comunidade.
          </p>
        )}
      </div>
    </div>
  )
}