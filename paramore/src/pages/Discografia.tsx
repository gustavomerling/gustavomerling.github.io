import { ALBUMS } from '@/lib/albums'
import AlbumCard from '@/components/album/AlbumCard'
import { Badge } from '@/components/ui/Badge'

export default function Discografia() {
  return (
    <section className="mx-auto max-w-[var(--container-max)] px-4 py-16 sm:px-6">
      <header className="max-w-2xl">
        <div className="mb-3 flex items-center gap-2">
          <Badge tone="accent">Discos oficiais</Badge>
        </div>
        <h1 className="font-display text-4xl font-extrabold tracking-tight text-content-primary sm:text-5xl">
          Discografia
        </h1>
        <p className="mt-4 text-lg leading-relaxed text-content-secondary">
          Cada álbum da Paramore tem uma página temática própria — mergulhe na
          era, acompanhe letras traduzidas lado a lado e o link direto para o
          Spotify.
        </p>
      </header>

      <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {ALBUMS.map((album) => (
          <AlbumCard key={album.id} album={album} />
        ))}
      </div>
    </section>
  )
}