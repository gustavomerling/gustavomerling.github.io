import { Link } from 'react-router-dom'
import { ArrowRight, Sparkles } from 'lucide-react'
import type { Album } from '@/lib/albums'
import TiltCard from '@/components/fx/TiltCard'

export default function AlbumCard({ album }: { album: Album }) {
  return (
    <TiltCard
      className="group relative h-full rounded-2xl border border-line-1 bg-surface-1/90 p-5 backdrop-blur-sm transition-all duration-300 hover:border-accent/60 hover:bg-surface-2/70"
      maxTilt={8}
    >
      <Link
        to={`/discos/${album.id}`}
        className="flex h-full flex-col"
      >
        <div
          className="relative overflow-hidden rounded-xl border border-line-1 bg-surface-2 shadow-md transition-all duration-500"
          style={{
            boxShadow: `0 12px 28px -10px color-mix(in srgb, ${album.colors[0]?.hex || '#000'} 40%, transparent)`,
          }}
        >
          <img
            src={album.image}
            alt={`Capa de ${album.name}`}
            loading="lazy"
            className="aspect-square w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-60 transition-opacity duration-300 group-hover:opacity-30" />

          <div className="absolute top-2.5 right-2.5 rounded-full bg-black/70 px-2.5 py-0.5 backdrop-blur-md">
            <span className="font-mono text-[11px] font-bold text-white tracking-wider">
              {album.year}
            </span>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between gap-2">
          <h3 className="font-display text-xl font-bold tracking-tight text-content-primary transition-colors group-hover:text-accent">
            {album.name}
          </h3>
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-accent opacity-0 transition-opacity group-hover:opacity-100">
            <Sparkles className="size-3" />
            Era
          </span>
        </div>

        <p className="mt-1 font-mono text-xs uppercase tracking-wider text-content-muted">
          {album.shortName} · {album.tracks.length} faixas
        </p>

        <p className="mt-2 text-sm leading-relaxed text-content-secondary line-clamp-2">
          {album.slogan}
        </p>

        <div className="mt-auto pt-4 flex items-center justify-between border-t border-line-1/50">
          <span className="text-xs text-content-muted truncate max-w-[170px]">
            {album.aesthetic}
          </span>
          <span className="inline-flex items-center gap-1 text-sm font-semibold text-accent transition-transform duration-300 group-hover:translate-x-1">
            Explorar
            <ArrowRight className="size-4" aria-hidden="true" />
          </span>
        </div>
      </Link>
    </TiltCard>
  )
}