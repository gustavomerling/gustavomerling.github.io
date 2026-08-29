import { useState } from 'react'
import { Play, Music2, Sparkles, Volume2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import type { Album } from '@/lib/albums'
import { getTrackLyrics } from '@/lib/lyrics'
import { Badge } from '@/components/ui/Badge'

interface AlbumLyricsProps {
  album: Album
  onSelectTrack?: (track: string) => void
}

export default function AlbumLyrics({ album, onSelectTrack }: AlbumLyricsProps) {
  const [active, setActive] = useState(album.featured.title)
  const lyrics = getTrackLyrics(album.id, active)

  const handleTrackClick = (track: string) => {
    setActive(track)
    onSelectTrack?.(track)
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)] lg:items-start">
      <ol className="space-y-1.5 lg:sticky lg:top-32">
        {album.tracks.map((track, i) => {
          const isActive = track === active
          const hasLyrics = Boolean(getTrackLyrics(album.id, track))
          return (
            <li key={track}>
              <button
                type="button"
                onClick={() => handleTrackClick(track)}
                disabled={!hasLyrics}
                aria-current={isActive ? 'true' : undefined}
                className={`group flex w-full items-center gap-3 rounded-xl border px-3.5 py-2.5 text-left text-sm transition-all duration-200 ${
                  isActive
                    ? 'border-accent bg-accent-subtle/80 text-content-primary shadow-md'
                    : 'border-line-1/40 bg-surface-1/50 text-content-primary hover:border-accent/40 hover:bg-surface-2'
                } ${!hasLyrics ? 'cursor-not-allowed opacity-45' : ''}`}
              >
                <span className="w-6 shrink-0 text-right font-mono text-xs text-content-muted">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span className="grid shrink-0 place-items-center">
                  {isActive ? (
                    <Play className="size-3.5 fill-current text-accent animate-pulse" aria-hidden="true" />
                  ) : (
                    <Music2 className="size-3.5 text-content-muted group-hover:text-accent" aria-hidden="true" />
                  )}
                </span>
                <span className="min-w-0 flex-1 truncate font-medium">{track}</span>
                {isActive && (
                  <span className="flex items-center gap-1 rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-content-inverse shadow-glow">
                    <Volume2 className="size-2.5" /> Tocando
                  </span>
                )}
              </button>
            </li>
          )
        })}
      </ol>

      <AnimatePresence mode="wait">
        <motion.div
          key={active}
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.25 }}
          className="rounded-2xl border border-line-1 bg-surface-1/90 p-6 backdrop-blur-md shadow-xl sm:p-8"
        >
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line-1/60 pb-4">
            <div>
              <span className="inline-flex items-center gap-1 text-[11px] font-mono font-semibold uppercase tracking-wider text-accent">
                <Sparkles className="size-3" /> Letra sincronizada oficial
              </span>
              <h3 className="mt-1 font-display text-2xl font-extrabold tracking-tight text-content-primary sm:text-3xl">
                {active}
              </h3>
            </div>
            <Badge tone="accent">
              {lyrics ? 'Tradução Revisada' : 'Em Breve'}
            </Badge>
          </div>

          {lyrics ? (
            <>
              <p className="mt-3 text-xs text-content-muted">
                Trecho do acervo Paramore Brasil com tradução lado a lado revisada pelo fã-clube.
              </p>
              <div className="mt-6 grid gap-8 md:grid-cols-2 md:gap-0">
                <div className="md:border-r md:border-line-1/60 md:pr-8">
                  <div className="mb-4 flex items-center justify-between">
                    <p className="text-[11px] font-bold uppercase tracking-widest text-content-muted">
                      Original (English)
                    </p>
                    <span className="rounded bg-surface-2 px-1.5 py-0.5 font-mono text-[10px] text-content-muted">
                      EN
                    </span>
                  </div>
                  <ul className="space-y-2.5 font-mono text-sm sm:text-base leading-relaxed text-content-primary">
                    {lyrics.en.map((line, i) => (
                      <li key={i} className="transition-colors hover:text-accent">
                        {line}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="md:pl-8">
                  <div className="mb-4 flex items-center justify-between">
                    <p className="text-[11px] font-bold uppercase tracking-widest text-accent">
                      Tradução (Português)
                    </p>
                    <span className="rounded bg-accent/20 px-1.5 py-0.5 font-mono text-[10px] text-accent">
                      PT-BR
                    </span>
                  </div>
                  <ul className="space-y-2.5 text-sm sm:text-base leading-relaxed text-content-secondary">
                    {lyrics.pt.map((line, i) => (
                      <li key={i} className="transition-colors hover:text-content-primary">
                        {line}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
              {lyrics.note && (
                <aside className="mt-8 rounded-xl border border-accent/40 bg-accent-subtle/80 p-5 shadow-inner">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-accent flex items-center gap-1.5">
                    <Sparkles className="size-3.5" />
                    Nota dos tradutores
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-content-secondary">
                    {lyrics.note}
                  </p>
                </aside>
              )}
            </>
          ) : (
            <div className="mt-8 rounded-xl border border-dashed border-line-1 p-8 text-center">
              <p className="font-display text-lg font-bold text-content-primary">
                Letra em fase de tradução
              </p>
              <p className="mt-2 text-sm text-content-muted max-w-md mx-auto">
                Participe do Clube de Tradução da Comunidade para sugerir e revisar as estrofes desta faixa.
              </p>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}