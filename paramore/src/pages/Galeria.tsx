import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Images, Sparkles, Download, Eye, Layers } from 'lucide-react'
import Lightbox from 'yet-another-react-lightbox'
import Captions from 'yet-another-react-lightbox/plugins/captions'
import DownloadPlugin from 'yet-another-react-lightbox/plugins/download'
import Fullscreen from 'yet-another-react-lightbox/plugins/fullscreen'
import Zoom from 'yet-another-react-lightbox/plugins/zoom'
import 'yet-another-react-lightbox/styles.css'
import { ALBUM_COVERS, GALLERY_PHOTOS } from '@/lib/gallery'
import { Badge } from '@/components/ui/Badge'
import TiltCard from '@/components/fx/TiltCard'
import EraAmbientFX from '@/components/fx/EraAmbientFX'

export default function Galeria() {
  const [photoIndex, setPhotoIndex] = useState<number | null>(null)
  const [coverIndex, setCoverIndex] = useState<number | null>(null)
  const [selectedEra, setSelectedEra] = useState<string>('Todas')

  const eras = useMemo(() => {
    const set = new Set(GALLERY_PHOTOS.map((p) => p.era))
    return ['Todas', ...Array.from(set)]
  }, [])

  const filteredPhotos = useMemo(() => {
    if (selectedEra === 'Todas') return GALLERY_PHOTOS
    return GALLERY_PHOTOS.filter((p) => p.era === selectedEra)
  }, [selectedEra])

  const photoSlides = GALLERY_PHOTOS.map((photo) => ({
    src: photo.src,
    download: photo.file,
    caption: `${photo.title} — ${photo.caption} (${photo.era}) · ${photo.credit}`,
  }))
  const coverSlides = ALBUM_COVERS.map((cover) => ({
    src: cover.src,
    download: cover.file,
    caption: `Capa: ${cover.title} (${cover.year})`,
  }))

  const emitCursor = (active: boolean) =>
    window.dispatchEvent(new CustomEvent<boolean>('pb:cursor', { detail: active }))

  return (
    <section className="relative mx-auto max-w-[var(--container-max)] px-4 py-16 sm:px-6">
      <EraAmbientFX density="medium" />

      <header className="relative max-w-3xl">
        <div className="mb-3 flex items-center gap-2">
          <Badge tone="accent">
            <Sparkles className="mr-1 size-3.5" /> Acervo Fotográfico
          </Badge>
          <Badge>{GALLERY_PHOTOS.length} fotos raras & capas</Badge>
        </div>
        <h1 className="font-display text-4xl font-extrabold tracking-tight text-content-primary sm:text-6xl">
          Galeria & Acervo
        </h1>
        <p className="mt-4 text-lg leading-relaxed text-content-secondary">
          Registros fotográficos de turnês, fotos de estúdio e todas as capas oficiais em altíssima definição.
          Clique em qualquer imagem para zoom de lente, detalhes de autoria e download em arquivo original.
        </p>

        {/* Filtro Dinâmico de Eras */}
        <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-line-1/60 pt-4">
          <span className="text-xs font-semibold uppercase tracking-wider text-content-muted flex items-center gap-1 mr-1">
            <Layers className="size-3.5 text-accent" /> Filtrar por Era:
          </span>
          {eras.map((era) => (
            <button
              key={era}
              type="button"
              onClick={() => setSelectedEra(era)}
              className={`rounded-full px-3.5 py-1 text-xs font-medium transition-all duration-200 ${
                selectedEra === era
                  ? 'bg-accent text-content-inverse shadow-glow scale-105 font-semibold'
                  : 'border border-line-1 bg-surface-1/80 text-content-secondary hover:border-accent/60 hover:text-content-primary'
              }`}
            >
              {era}
            </button>
          ))}
        </div>
      </header>

      {/* Grid Masonry Dinâmico com Framer Motion */}
      <motion.div layout className="mt-12 columns-1 gap-6 sm:columns-2 lg:columns-3">
        <AnimatePresence>
          {filteredPhotos.map((photo, i) => (
            <motion.div
              layout
              key={photo.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.35 }}
              className="mb-6 break-inside-avoid"
            >
              <TiltCard
                maxTilt={5}
                className="group relative overflow-hidden rounded-2xl border border-line-1 bg-surface-1/90 backdrop-blur shadow-sm transition-all duration-300 hover:border-accent/60 hover:bg-surface-2/60"
              >
                <button
                  type="button"
                  onClick={() => setPhotoIndex(i)}
                  className="block w-full cursor-zoom-in text-left"
                  aria-label={`Ampliar: ${photo.title}`}
                >
                  <div className="relative overflow-hidden">
                    <img
                      src={photo.src}
                      alt={photo.title}
                      loading="lazy"
                      className="h-auto w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100 flex items-center justify-center">
                      <span className="flex items-center gap-1.5 rounded-full bg-accent/90 px-4 py-2 text-xs font-bold uppercase tracking-wider text-content-inverse shadow-glow backdrop-blur">
                        <Eye className="size-4" /> Expandir em HD
                      </span>
                    </div>
                  </div>

                  <figcaption className="p-4">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-display text-base font-bold text-content-primary group-hover:text-accent transition-colors">
                        {photo.title}
                      </p>
                      <span className="rounded bg-surface-2 px-2 py-0.5 font-mono text-[10px] font-semibold text-content-muted">
                        {photo.era}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-content-muted">
                      {photo.caption} · {photo.credit}
                    </p>
                  </figcaption>
                </button>
              </TiltCard>
            </motion.div>
          ))}
        </AnimatePresence>
      </motion.div>

      {/* Capas dos Álbuns em Alta Definição */}
      <section className="mt-20 border-t border-line-1/80 pt-12">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="flex items-center gap-2 font-display text-2xl font-extrabold tracking-tight text-content-primary sm:text-3xl">
              <Images className="size-6 text-accent" aria-hidden="true" />
              Capas Oficiais dos Álbuns
            </h2>
            <p className="mt-1 text-sm text-content-secondary">
              As seis capas canônicas em resolução máxima — clique para zoom óptico e download.
            </p>
          </div>
          <span className="font-mono text-xs text-accent">6 Álbum Masters</span>
        </div>

        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {ALBUM_COVERS.map((cover, i) => (
            <TiltCard
              key={cover.id}
              maxTilt={8}
              className="group rounded-2xl border border-line-1 bg-surface-1/90 p-2.5 backdrop-blur shadow-sm transition-all duration-300 hover:border-accent/60"
            >
              <button
                type="button"
                onClick={() => setCoverIndex(i)}
                className="block w-full cursor-zoom-in text-left"
                aria-label={`Ampliar capa de ${cover.title}`}
              >
                <div className="relative overflow-hidden rounded-xl">
                  <img
                    src={cover.src}
                    alt={`Capa de ${cover.title}`}
                    loading="lazy"
                    className="aspect-square w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 transition-opacity duration-300 group-hover:opacity-100 flex items-center justify-center">
                    <Download className="size-5 text-white" />
                  </div>
                </div>
                <div className="mt-3 px-1">
                  <p className="truncate font-display text-xs font-bold text-content-primary group-hover:text-accent transition-colors">
                    {cover.title}
                  </p>
                  <p className="font-mono text-[10px] text-content-muted">{cover.year}</p>
                </div>
              </button>
            </TiltCard>
          ))}
        </div>
      </section>

      <Lightbox
        open={photoIndex !== null}
        index={photoIndex ?? 0}
        close={() => setPhotoIndex(null)}
        slides={photoSlides}
        plugins={[Captions, DownloadPlugin, Fullscreen, Zoom]}
        carousel={{ finite: false }}
        on={{ entered: () => emitCursor(true), exited: () => emitCursor(false) }}
      />
      <Lightbox
        open={coverIndex !== null}
        index={coverIndex ?? 0}
        close={() => setCoverIndex(null)}
        slides={coverSlides}
        plugins={[Captions, DownloadPlugin, Fullscreen, Zoom]}
        carousel={{ finite: false }}
        on={{ entered: () => emitCursor(true), exited: () => emitCursor(false) }}
      />
    </section>
  )
}