import { useEffect, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { ArrowLeft, ExternalLink, Music, Sparkles } from 'lucide-react'
import { getAlbumById } from '@/lib/albums'
import { applyTheme, applyPersistedTheme } from '@/lib/theme'
import { Badge } from '@/components/ui/Badge'
import AlbumLyrics from '@/components/album/AlbumLyrics'
import VinylPlayer from '@/components/fx/VinylPlayer'
import EraAmbientFX from '@/components/fx/EraAmbientFX'

export default function AlbumPage() {
  const { albumId } = useParams()
  const album = getAlbumById(albumId ?? '')
  const [activeTrack, setActiveTrack] = useState<string>('')

  useEffect(() => {
    if (!album) return
    applyTheme(album.theme)
    setActiveTrack(album.featured?.title || album.tracks[0] || '')
    return () => applyPersistedTheme()
  }, [album])

  if (!album) return <Navigate to="/discografia" replace />

  return (
    <article className="relative overflow-hidden">
      <EraAmbientFX density="high" />

      {/* Hero da Era */}
      <section className="relative overflow-hidden border-b border-line-1/80 bg-surface-1/40 backdrop-blur-md">
        <div className="relative mx-auto max-w-[var(--container-max)] px-4 py-16 sm:px-6 lg:py-20">
          <Link
            to="/discografia"
            className="group mb-8 inline-flex items-center gap-2 rounded-full border border-line-1 bg-surface-2/60 px-4 py-1.5 text-xs font-semibold text-content-secondary backdrop-blur transition-all hover:border-accent hover:text-accent"
          >
            <ArrowLeft className="size-3.5 transition-transform group-hover:-translate-x-1" aria-hidden="true" />
            Voltar para Discografia
          </Link>

          <div className="grid items-center gap-12 lg:grid-cols-[1.1fr_0.9fr]">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="accent">Era {album.year}</Badge>
                <Badge>{album.tracks.length} faixas oficiais</Badge>
                <span className="inline-flex items-center gap-1 font-mono text-xs text-content-muted">
                  <Sparkles className="size-3 text-accent" /> {album.aesthetic}
                </span>
              </div>

              <h1 className="mt-4 font-display text-4xl font-extrabold tracking-tight text-content-primary sm:text-6xl xl:text-7xl">
                {album.name}
              </h1>

              <p className="mt-4 max-w-xl text-lg leading-relaxed text-content-secondary">
                {album.slogan}
              </p>

              {/* Cores oficiais da Era */}
              <div className="mt-6 flex items-center gap-3">
                <span className="font-mono text-xs text-content-muted">Paleta da era:</span>
                <div className="flex items-center gap-2">
                  {album.colors.map((c) => (
                    <span
                      key={c.role}
                      title={`${c.role}: ${c.hex}`}
                      className="size-5 rounded-full border border-white/20 shadow-md transition-transform hover:scale-125"
                      style={{ backgroundColor: c.hex }}
                    />
                  ))}
                </div>
              </div>

              <div className="mt-8 flex flex-wrap items-center gap-4">
                <a
                  href={`${album.spotify}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-full bg-accent px-6 py-3 text-sm font-semibold text-content-inverse shadow-glow transition-all hover:bg-accent-hover hover:scale-105"
                >
                  <Music className="size-4" />
                  Ouvir álbum no Spotify
                  <ExternalLink className="size-3.5" />
                </a>
              </div>
            </div>

            {/* Vinil 3D Interativo */}
            <div className="flex justify-center lg:justify-end">
              <VinylPlayer
                album={album}
                currentTrack={activeTrack}
                isPlaying={true}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Seção de Letras e Faixas */}
      <div className="mx-auto max-w-[var(--container-max)] px-4 py-16 sm:px-6">
        <section>
          <div className="mb-8 flex flex-wrap items-center justify-between gap-4 border-b border-line-1 pb-4">
            <div>
              <h2 className="font-display text-3xl font-extrabold tracking-tight text-content-primary">
                Faixas & Letras Lado a Lado
              </h2>
              <p className="mt-1 text-sm text-content-secondary">
                Selecione uma faixa para visualizar a letra original sincronizada com a tradução oficial.
              </p>
            </div>
            <Badge tone="accent">Equalizador interativo ativo</Badge>
          </div>
          <AlbumLyrics
            album={album}
            onSelectTrack={(track) => setActiveTrack(track)}
          />
        </section>
      </div>
    </article>
  )
}