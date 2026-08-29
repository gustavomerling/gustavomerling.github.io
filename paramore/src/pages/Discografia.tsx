import { motion } from 'framer-motion'
import { Disc, Sparkles } from 'lucide-react'
import { ALBUMS } from '@/lib/albums'
import AlbumCard from '@/components/album/AlbumCard'
import { Badge } from '@/components/ui/Badge'
import EraAmbientFX from '@/components/fx/EraAmbientFX'

const CONTAINER_VARIANTS = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
}

const ITEM_VARIANTS = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' as const } },
}

export default function Discografia() {
  return (
    <section className="relative mx-auto max-w-[var(--container-max)] px-4 py-16 sm:px-6">
      <EraAmbientFX density="medium" />

      <header className="relative max-w-3xl">
        <div className="mb-3 flex items-center gap-2">
          <Badge tone="accent">
            <Disc className="mr-1 size-3.5 animate-spin" style={{ animationDuration: '6s' }} />
            6 Eras Oficiais
          </Badge>
          <Badge>2005 — Presente</Badge>
        </div>
        <h1 className="font-display text-4xl font-extrabold tracking-tight text-content-primary sm:text-6xl">
          Discografia
          <span className="ml-3 text-accent text-3xl sm:text-5xl font-light">/ Álbuns</span>
        </h1>
        <p className="mt-4 text-lg leading-relaxed text-content-secondary">
          Cada álbum da Paramore é um universo visual e sonoro completo — explore a
          linha temporal, temas de cor dinâmicos, letras traduzidas e acervo de cada era.
        </p>

        {/* Mini barra de linha do tempo das eras */}
        <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-line-1/60 pt-4">
          <span className="text-xs font-semibold uppercase tracking-wider text-content-muted flex items-center gap-1">
            <Sparkles className="size-3 text-accent" /> Eras:
          </span>
          {ALBUMS.map((alb) => (
            <span
              key={alb.id}
              className="rounded-full border border-line-1/80 bg-surface-1/80 px-2.5 py-1 text-[11px] font-mono font-medium text-content-secondary"
            >
              {alb.year} · {alb.shortName}
            </span>
          ))}
        </div>
      </header>

      <motion.div
        variants={CONTAINER_VARIANTS}
        initial="hidden"
        animate="show"
        className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
      >
        {ALBUMS.map((album) => (
          <motion.div key={album.id} variants={ITEM_VARIANTS}>
            <AlbumCard album={album} />
          </motion.div>
        ))}
      </motion.div>
    </section>
  )
}