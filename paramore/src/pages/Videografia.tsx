import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronLeft, ChevronRight, Clapperboard, ExternalLink, Tv } from 'lucide-react'
import { Swiper, SwiperSlide } from 'swiper/react'
import { A11y, Navigation } from 'swiper/modules'
import 'swiper/css'
import 'swiper/css/navigation'
import { embedUrl, thumbUrl, TOTAL_CLIPS, VIDEOS, watchUrl } from '@/lib/videos'
import { Badge } from '@/components/ui/Badge'

export default function Videografia() {
  const [channel, setChannel] = useState(0)
  const [flash, setFlash] = useState<{ ch: number; label: string } | null>(null)
  const timerRef = useRef<number | undefined>(undefined)

  const clip = VIDEOS[channel]

  const go = (next: number) => {
    const n = ((next % VIDEOS.length) + VIDEOS.length) % VIDEOS.length
    setChannel(n)
    setFlash({ ch: n + 1, label: VIDEOS[n].title })
    window.clearTimeout(timerRef.current)
    timerRef.current = window.setTimeout(() => setFlash(null), 1100)
  }

  useEffect(() => () => window.clearTimeout(timerRef.current), [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') {
        e.preventDefault()
        go(channel + 1)
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        go(channel - 1)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [channel])

  return (
    <section className="mx-auto max-w-[var(--container-max)] px-4 py-16 sm:px-6">
      <header className="max-w-2xl">
        <div className="mb-3 flex items-center gap-2">
          <Badge tone="accent">Mídia</Badge>
          <Badge>TV de clipes · {TOTAL_CLIPS} canais</Badge>
        </div>
        <h1 className="font-display text-4xl font-extrabold tracking-tight text-content-primary sm:text-5xl">
          Videografia
        </h1>
        <p className="mt-4 text-lg leading-relaxed text-content-secondary">
          Formato TV: troque de canal para trocar de clipe. Use os botões do
          controle, as setas do teclado ou o guia de canais ali embaixo.
        </p>
      </header>

      <div className="mt-10 overflow-hidden rounded-[2rem] border border-line-1 bg-surface-1 shadow-2xl">
        <div className="flex items-center justify-between gap-3 border-b border-line-1 bg-gradient-to-r from-accent-subtle to-transparent px-5 py-3">
          <div className="flex items-center gap-2">
            <Tv className="size-4 text-accent" aria-hidden="true" />
            <span className="font-display text-sm font-extrabold uppercase tracking-widest text-content-primary">
              Paramore TV
            </span>
          </div>
          <span className="text-xs font-semibold tabular-nums text-content-muted">
            16:9 · Videoclipes oficiais
          </span>
        </div>

        <div className="relative aspect-video w-full bg-black">
          <iframe
            key={clip.id}
            src={embedUrl(clip.id)}
            title={`Vídeo: ${clip.title}`}
            allow="autoplay; encrypted-media; picture-in-picture; web-share; fullscreen"
            className="h-full w-full"
            allowFullScreen
          />

          <div className="pointer-events-none absolute left-4 top-4 flex items-center gap-2">
            <span className="rounded-md bg-black/70 px-2.5 py-1 font-display text-sm font-extrabold text-white">
              CH {String(channel + 1).padStart(2, '0')}
            </span>
          </div>

          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black/85 via-black/40 to-transparent px-5 pb-4 pt-16">
            <p className="font-display text-lg font-extrabold text-white sm:text-xl">
              {clip.title}
            </p>
            <p className="mt-0.5 text-xs text-white/80">{clip.album}</p>
          </div>

          <AnimatePresence>
            {flash && (
              <motion.div
                key={flash.ch}
                initial={{ opacity: 0, scale: 0.6 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18 }}
                className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center"
              >
                <span className="rounded-full bg-black/80 px-6 py-3 font-display text-xl font-extrabold text-white shadow-glow">
                  CH {String(flash.ch).padStart(2, '0')} — {flash.label}
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2 border-t border-line-1 bg-surface-2/60 px-5 py-4">
          <button
            type="button"
            onClick={() => go(channel - 1)}
            aria-label="Canal anterior"
            title="Canal anterior (←)"
            className="flex size-11 items-center justify-center rounded-full border border-line-1 bg-surface-1 text-content-primary transition-colors hover:border-accent hover:text-accent"
          >
            <ChevronLeft className="size-5" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => go(channel + 1)}
            aria-label="Próximo canal"
            title="Próximo canal (→)"
            className="flex size-11 items-center justify-center rounded-full border border-line-1 bg-surface-1 text-content-primary transition-colors hover:border-accent hover:text-accent"
          >
            <ChevronRight className="size-5" aria-hidden="true" />
          </button>
          <span className="mx-2 hidden text-xs font-medium text-content-muted sm:block">
            Zap: {String(channel + 1).padStart(2, '0')} / {TOTAL_CLIPS}
          </span>
          <a
            href={watchUrl(clip.id)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-full bg-accent px-4 py-2 text-sm font-semibold text-content-inverse transition-colors hover:bg-accent-hover"
          >
            Abrir no YouTube
            <ExternalLink className="size-3.5" aria-hidden="true" />
          </a>
        </div>
      </div>

      <div
        role="tablist"
        aria-label="Guia de canais"
        className="mt-6 [--swiper-navigation-color:var(--color-accent)]"
      >
        <Swiper
          modules={[A11y, Navigation]}
          slidesPerView="auto"
          spaceBetween={12}
          navigation
          className="!pb-0"
        >
          {VIDEOS.map((item, i) => {
            const active = i === channel
            return (
              <SwiperSlide key={item.id} className="!w-44 shrink-0">
                <button
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => go(i)}
                  className={`group block w-full truncate rounded-xl border bg-surface-1 p-2 text-left transition-colors ${
                    active
                      ? 'border-accent ring-2 ring-accent/30'
                      : 'border-line-1 hover:border-accent/60'
                  }`}
                >
                  <div className="relative aspect-video overflow-hidden rounded-lg">
                    <img
                      src={thumbUrl(item.id)}
                      alt={item.title}
                      loading="lazy"
                      className="h-full w-full object-cover"
                    />
                    <span className="absolute left-1.5 top-1.5 rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-white">
                      CH {String(i + 1).padStart(2, '0')}
                    </span>
                  </div>
                  <p className="mt-2 truncate text-xs font-semibold text-content-primary">{item.title}</p>
                </button>
              </SwiperSlide>
            )
          })}
        </Swiper>
      </div>

      <div className="mt-6 flex items-start gap-3 rounded-xl border border-line-1 bg-surface-1 p-5">
        <Clapperboard className="mt-0.5 size-5 shrink-0 text-accent" aria-hidden="true" />
        <p className="text-sm leading-relaxed text-content-secondary">
          <span className="font-semibold text-content-primary">Como funciona:</span> cada canal
          é um videoclipe. As setas esquerda/direita (e as teclas do teclado) trocam de canal direto
          na tela — o guia lista todos os {TOTAL_CLIPS} clipes disponíveis.
        </p>
      </div>
    </section>
  )
}