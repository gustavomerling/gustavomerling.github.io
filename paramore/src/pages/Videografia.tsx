import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronLeft, ChevronRight, Clapperboard, ExternalLink, Tv, Radio, Sparkles, Volume2 } from 'lucide-react'
import { Swiper, SwiperSlide } from 'swiper/react'
import { A11y, Navigation } from 'swiper/modules'
import 'swiper/css'
import 'swiper/css/navigation'
import { embedUrl, thumbUrl, TOTAL_CLIPS, VIDEOS, watchUrl } from '@/lib/videos'
import { Badge } from '@/components/ui/Badge'
import EraAmbientFX from '@/components/fx/EraAmbientFX'

export default function Videografia() {
  const [channel, setChannel] = useState(0)
  const [flash, setFlash] = useState<{ ch: number; label: string } | null>(null)
  const [isChangingChannel, setIsChangingChannel] = useState(false)
  const timerRef = useRef<number | undefined>(undefined)
  const glitchTimerRef = useRef<number | undefined>(undefined)

  const clip = VIDEOS[channel]

  const go = (next: number) => {
    const n = ((next % VIDEOS.length) + VIDEOS.length) % VIDEOS.length
    setIsChangingChannel(true)
    setChannel(n)
    setFlash({ ch: n + 1, label: VIDEOS[n].title })
    
    window.clearTimeout(timerRef.current)
    window.clearTimeout(glitchTimerRef.current)

    glitchTimerRef.current = window.setTimeout(() => setIsChangingChannel(false), 300)
    timerRef.current = window.setTimeout(() => setFlash(null), 1200)
  }

  useEffect(() => () => {
    window.clearTimeout(timerRef.current)
    window.clearTimeout(glitchTimerRef.current)
  }, [])

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
    <section className="relative mx-auto max-w-[var(--container-max)] px-4 py-16 sm:px-6">
      <EraAmbientFX density="medium" />

      <header className="relative max-w-2xl">
        <div className="mb-3 flex items-center gap-2">
          <Badge tone="accent">
            <Radio className="mr-1 size-3.5 animate-pulse" />
            Paramore TV Vintage
          </Badge>
          <Badge>{TOTAL_CLIPS} videoclipes oficiais</Badge>
        </div>
        <h1 className="font-display text-4xl font-extrabold tracking-tight text-content-primary sm:text-6xl">
          Videografia
        </h1>
        <p className="mt-4 text-lg leading-relaxed text-content-secondary">
          Experiência interativa em formato de televisão vintage. Sintonize eras e canais usando os botões,
          o teclado (← e →) ou o seletor rápido no guia de programação.
        </p>
      </header>

      {/* Chassi da Televisão com Estilo Hiper-Realista */}
      <div className="relative mt-10 overflow-hidden rounded-[2.5rem] border-2 border-line-2/70 bg-[#0c0c0e] p-3 sm:p-5 shadow-2xl">
        {/* Glow Ambiente da TV */}
        <div
          className="pointer-events-none absolute inset-0 -z-10 opacity-30 blur-3xl"
          style={{ background: 'radial-gradient(circle at center, var(--color-accent), transparent 70%)' }}
        />

        {/* Barra superior de status da TV */}
        <div className="flex items-center justify-between gap-3 border-b border-white/10 bg-black/50 px-5 py-3 rounded-t-2xl">
          <div className="flex items-center gap-2.5">
            <span className="relative flex size-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
              <span className="relative inline-flex size-2.5 rounded-full bg-red-600" />
            </span>
            <Tv className="size-4 text-accent" aria-hidden="true" />
            <span className="font-display text-xs font-black uppercase tracking-widest text-white">
              PARAMORE TUBE VINTAGE · 1080P
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden sm:flex items-center gap-1 font-mono text-xs text-accent">
              <Volume2 className="size-3.5" /> STEREO
            </span>
            <span className="rounded bg-white/10 px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-white">
              CANAL {String(channel + 1).padStart(2, '0')} / {TOTAL_CLIPS}
            </span>
          </div>
        </div>

        {/* Tela CRT */}
        <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-black border border-white/10 shadow-inner">
          <iframe
            key={clip.id}
            src={embedUrl(clip.id)}
            title={`Vídeo: ${clip.title}`}
            allow="autoplay; encrypted-media; picture-in-picture; web-share; fullscreen"
            className="h-full w-full"
            allowFullScreen
          />

          {/* CRT Scanline Overlay */}
          <div className="crt-scanlines pointer-events-none absolute inset-0 z-10 opacity-40" />

          {/* Glitch / Static Effect durante a troca de canal */}
          <AnimatePresence>
            {isChangingChannel && (
              <motion.div
                initial={{ opacity: 0.9 }}
                animate={{ opacity: 0.7 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="pointer-events-none absolute inset-0 z-30 bg-[#111] mix-blend-screen"
                style={{
                  backgroundImage:
                    'repeating-radial-gradient(circle, #fff 0, #000 2px, #fff 3px)',
                  backgroundSize: '4px 4px',
                }}
              />
            )}
          </AnimatePresence>

          {/* Canal OSD (On Screen Display) */}
          <div className="pointer-events-none absolute left-4 top-4 z-20 flex items-center gap-2">
            <span className="rounded-md bg-black/80 px-3 py-1 font-mono text-xs font-black text-accent tracking-widest border border-accent/40 shadow-glow">
              CH {String(channel + 1).padStart(2, '0')}
            </span>
          </div>

          {/* Banner de informações da faixa */}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-black/90 via-black/50 to-transparent px-6 pb-5 pt-16">
            <p className="font-display text-xl font-extrabold text-white sm:text-2xl drop-shadow-md">
              {clip.title}
            </p>
            <p className="mt-1 font-mono text-xs text-accent uppercase tracking-wider">{clip.album}</p>
          </div>

          {/* Flash Pop-up ao trocar canal */}
          <AnimatePresence>
            {flash && (
              <motion.div
                key={flash.ch}
                initial={{ opacity: 0, scale: 0.7 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.2 }}
                className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center"
              >
                <div className="rounded-2xl border border-accent/50 bg-black/85 px-8 py-4 text-center backdrop-blur-md shadow-glow">
                  <span className="font-display text-2xl font-extrabold text-white sm:text-3xl block">
                    CH {String(flash.ch).padStart(2, '0')}
                  </span>
                  <span className="font-mono text-xs text-accent mt-1 block">
                    {flash.label}
                  </span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Controle Remoto Integrado no Rodapé da TV */}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-4 rounded-b-2xl bg-[#141418] px-6 py-4 border border-white/5">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => go(channel - 1)}
              aria-label="Canal anterior"
              title="Canal anterior (←)"
              className="flex size-11 items-center justify-center rounded-full border border-line-1 bg-surface-2 text-content-primary shadow-sm transition-all duration-200 hover:border-accent hover:bg-accent hover:text-content-inverse hover:scale-105 active:scale-95"
            >
              <ChevronLeft className="size-5" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => go(channel + 1)}
              aria-label="Próximo canal"
              title="Próximo canal (→)"
              className="flex size-11 items-center justify-center rounded-full border border-line-1 bg-surface-2 text-content-primary shadow-sm transition-all duration-200 hover:border-accent hover:bg-accent hover:text-content-inverse hover:scale-105 active:scale-95"
            >
              <ChevronRight className="size-5" aria-hidden="true" />
            </button>
            <span className="ml-2 hidden text-xs font-mono text-content-muted sm:inline-block">
              Use as setas do teclado ← →
            </span>
          </div>

          <div className="flex items-center gap-3">
            <a
              href={watchUrl(clip.id)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-content-inverse shadow-glow transition-all hover:bg-accent-hover hover:scale-105"
            >
              Assistir no YouTube
              <ExternalLink className="size-3.5" aria-hidden="true" />
            </a>
          </div>
        </div>
      </div>

      {/* Guia de Canais com Swiper Interativo */}
      <div className="mt-10">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 font-display text-xl font-extrabold tracking-tight text-content-primary">
            <Sparkles className="size-4 text-accent" />
            Guia de Programação ({TOTAL_CLIPS} Videoclipes)
          </h2>
          <span className="font-mono text-xs text-content-muted">Deslize para ver todos</span>
        </div>

        <div
          role="tablist"
          aria-label="Guia de canais"
          className="[--swiper-navigation-color:var(--color-accent)]"
        >
          <Swiper
            modules={[A11y, Navigation]}
            slidesPerView="auto"
            spaceBetween={14}
            navigation
            className="!p-3 !-m-3"
          >
            {VIDEOS.map((item, i) => {
              const active = i === channel
              return (
                <SwiperSlide key={item.id} className="!w-48 shrink-0 py-1">
                  <button
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => go(i)}
                    className={`group block w-full rounded-2xl border p-2.5 text-left transition-all duration-300 ${
                      active
                        ? 'border-accent bg-accent-subtle/80 ring-2 ring-accent/60 shadow-md'
                        : 'border-line-1 bg-surface-1/80 hover:border-accent/60 hover:bg-surface-2'
                    }`}
                  >
                    <div className="relative aspect-video overflow-hidden rounded-xl">
                      <img
                        src={thumbUrl(item.id)}
                        alt={item.title}
                        loading="lazy"
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                      <span className="absolute left-2 top-2 rounded bg-black/80 px-2 py-0.5 font-mono text-[10px] font-bold text-white backdrop-blur">
                        CH {String(i + 1).padStart(2, '0')}
                      </span>
                    </div>
                    <p className="mt-2.5 truncate font-display text-xs font-bold text-content-primary">
                      {item.title}
                    </p>
                    <p className="truncate text-[11px] text-content-muted">
                      {item.album}
                    </p>
                  </button>
                </SwiperSlide>
              )
            })}
          </Swiper>
        </div>
      </div>

      <div className="mt-8 flex items-start gap-3 rounded-2xl border border-line-1 bg-surface-1/80 p-6 backdrop-blur">
        <Clapperboard className="mt-0.5 size-5 shrink-0 text-accent" aria-hidden="true" />
        <p className="text-sm leading-relaxed text-content-secondary">
          <span className="font-semibold text-content-primary">Como navegar:</span> troque de faixa clicando no controle remoto ou diretamente no guia de canais. Todos os clipes são transmitidos com áudio original e alta resolução.
        </p>
      </div>
    </section>
  )
}