import { useEffect } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { getAlbumById } from '@/lib/albums'
import { applyTheme, applyPersistedTheme } from '@/lib/theme'
import { Badge } from '@/components/ui/Badge'
import AlbumLyrics from '@/components/album/AlbumLyrics'

export default function AlbumPage() {
  const { albumId } = useParams()
  const album = getAlbumById(albumId ?? '')

  useEffect(() => {
    if (!album) return
    applyTheme(album.theme)
    return () => applyPersistedTheme()
  }, [album])

  if (!album) return <Navigate to="/discografia" replace />

  return (
    <article>
      <section className="relative overflow-hidden border-b border-line-1">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background: `radial-gradient(ellipse 70% 55% at 50% -15%, var(--color-accent-subtle), transparent)`,
          }}
          aria-hidden="true"
        />
        <div className="relative mx-auto max-w-[var(--container-max)] px-4 py-20 sm:px-6">
          <Link
            to="/discografia"
            className="mb-6 inline-flex items-center gap-1 text-sm font-medium text-content-secondary transition-colors hover:text-accent"
          >
            <span aria-hidden="true">←</span> Discografia
          </Link>
          <div className="grid items-center gap-10 lg:grid-cols-[1fr_300px]">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <Badge tone="accent">Era {album.year}</Badge>
              </div>
              <h1 className="mt-3 font-display text-4xl font-extrabold tracking-tight text-content-primary sm:text-6xl">
                {album.name}
              </h1>
              <p className="mt-3 max-w-xl text-lg text-content-secondary">
                {album.slogan}
              </p>
              <p className="mt-1 text-sm text-content-muted">{album.aesthetic}</p>

              <div className="mt-8 flex flex-wrap items-center gap-4">
                <a
                  href={`${album.spotify}`}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-full bg-accent px-6 py-3 text-sm font-semibold text-content-inverse shadow-glow transition-colors hover:bg-accent-hover"
                >
                  Ouvir no Spotify
                </a>
              </div>
            </div>

            <div className="hidden lg:block">
              <img
                src={album.image}
                alt={`Capa de ${album.name}`}
                className="aspect-square w-full rotate-2 rounded-2xl border border-line-2 object-cover transition-transform duration-300 hover:-rotate-1 hover:scale-[1.02]"
                style={{
                  boxShadow: `0 24px 48px -16px color-mix(in srgb, ${album.colors[0].hex} 60%, #000)`,
                }}
              />
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-[var(--container-max)] px-4 py-16 sm:px-6">
        <section>
          <div className="mb-6 flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-display text-2xl font-extrabold tracking-tight text-content-primary">
              Faixas & Letras
            </h2>
            <Badge>Clique numa faixa</Badge>
          </div>
          <AlbumLyrics album={album} />
        </section>
      </div>
    </article>
  )
}