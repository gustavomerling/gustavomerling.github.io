import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import type { Album } from '@/lib/albums'

export default function AlbumCard({ album }: { album: Album }) {
  return (
    <Link
      to={`/discos/${album.id}`}
      className="group flex h-full flex-col rounded-lg border border-line-1 bg-surface-1 p-5 transition-all hover:-translate-y-0.5 hover:border-accent/60 hover:bg-surface-2"
    >
      <div className="overflow-hidden rounded-md border border-line-1 bg-surface-2 shadow-sm" aria-hidden="true">
        <img
          src={album.image}
          alt={`Capa de ${album.name}`}
          loading="lazy"
          className="aspect-square w-full object-cover transition-transform duration-300 ease-out group-hover:scale-105"
        />
      </div>
      <h3 className="mt-4 font-display text-lg font-bold tracking-tight text-content-primary transition-colors group-hover:text-accent">
        {album.name}
      </h3>
      <p className="mt-1 text-xs font-medium uppercase tracking-wider text-content-muted">
        {album.year}
      </p>
      <p className="mt-2 text-sm text-content-secondary">{album.slogan}</p>
      <span className="mt-auto inline-flex items-center gap-1 pt-4 text-sm font-medium text-accent transition-transform group-hover:translate-x-0.5">
        Explorar a era
        <ArrowRight className="size-4 translate-y-[2px]" aria-hidden="true" />
      </span>
    </Link>
  )
}