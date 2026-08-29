import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import AlbumCard from '@/components/album/AlbumCard'
import { ALBUMS } from '@/lib/albums'

export default function FeaturedAlbums() {
  return (
    <section className="mx-auto max-w-[var(--container-max)] px-4 py-10 sm:px-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
            Discos
          </p>
          <h2 className="mt-2 font-display text-3xl font-extrabold tracking-tight text-content-primary">
            Seis álbuns, seis eras
          </h2>
        </div>
        <Link
          to="/discografia"
          className="group inline-flex shrink-0 items-center gap-1 text-sm font-medium text-accent transition-colors hover:text-accent-hover"
        >
          Ver todas
          <ArrowRight className="size-4 translate-y-[2px] transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
        </Link>
      </div>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {ALBUMS.map((album, i) => (
          <div key={album.id} className="h-full" data-aos="fade-up" data-aos-delay={(i % 3) * 90}>
            <AlbumCard album={album} />
          </div>
        ))}
      </div>
    </section>
  )
}