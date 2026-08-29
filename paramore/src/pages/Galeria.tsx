import { useState } from 'react'
import { Images } from 'lucide-react'
import Lightbox from 'yet-another-react-lightbox'
import Captions from 'yet-another-react-lightbox/plugins/captions'
import DownloadPlugin from 'yet-another-react-lightbox/plugins/download'
import Fullscreen from 'yet-another-react-lightbox/plugins/fullscreen'
import Zoom from 'yet-another-react-lightbox/plugins/zoom'
import 'yet-another-react-lightbox/styles.css'
import { ALBUM_COVERS, GALLERY_PHOTOS } from '@/lib/gallery'
import { Badge } from '@/components/ui/Badge'

export default function Galeria() {
  const [photoIndex, setPhotoIndex] = useState<number | null>(null)
  const [coverIndex, setCoverIndex] = useState<number | null>(null)

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
    <section className="mx-auto max-w-[var(--container-max)] px-4 py-16 sm:px-6">
      <header className="max-w-2xl">
        <div className="mb-3 flex items-center gap-2">
          <Badge tone="accent">Mídia</Badge>
          <Badge>Acervo do fã-clube</Badge>
        </div>
        <h1 className="font-display text-4xl font-extrabold tracking-tight text-content-primary sm:text-5xl">
          Galeria
        </h1>
        <p className="mt-4 text-lg leading-relaxed text-content-secondary">
          Fotos do acervo do portal em formato original, com expansão, zoom e
          download. A coleção cresce a cada contribuição da comunidade.
        </p>
      </header>

      <div className="mt-10 columns-1 gap-4 sm:columns-2 lg:columns-3">
          {GALLERY_PHOTOS.map((photo, i) => (
            <figure
              key={photo.id}
              className="group relative mb-4 break-inside-avoid overflow-hidden rounded-xl border border-line-1 bg-surface-1"
            >
              <button
                type="button"
                onClick={() => setPhotoIndex(i)}
                className="block w-full cursor-zoom-in"
                aria-label={`Ampliar: ${photo.title}`}
              >
                <img
                  src={photo.src}
                  alt={photo.title}
                  loading="lazy"
                  className="h-auto w-full transition-transform duration-300 group-hover:scale-[1.03]"
                />
              </button>
              <figcaption className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent p-4 pt-10">
                <p className="text-sm font-semibold text-white">{photo.title}</p>
                <p className="text-xs text-white/80">
                  {photo.era} · {photo.credit}
                </p>
              </figcaption>
            </figure>
          ))}
        </div>

      <section className="mt-16">
        <h2 className="flex items-center gap-2 font-display text-2xl font-extrabold tracking-tight text-content-primary">
          <Images className="size-5 text-accent" aria-hidden="true" />
          Capas dos álbuns
        </h2>
        <p className="mt-2 text-sm text-content-muted">
          As seis capas em alta resolução — clique para expandir e baixar.
        </p>
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {ALBUM_COVERS.map((cover, i) => (
            <figure key={cover.id} className="group">
              <button
                type="button"
                onClick={() => setCoverIndex(i)}
                className="block w-full cursor-zoom-in"
                aria-label={`Ampliar capa de ${cover.title}`}
              >
                <img
                  src={cover.src}
                  alt={`Capa de ${cover.title}`}
                  loading="lazy"
                  className="aspect-square w-full rounded-xl border border-line-1 object-cover transition-transform duration-300 group-hover:-translate-y-0.5"
                />
              </button>
              <figcaption className="mt-2 px-0.5">
                <p className="truncate text-xs font-semibold text-content-primary">{cover.title}</p>
                <p className="text-[11px] text-content-muted">{cover.year}</p>
              </figcaption>
            </figure>
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