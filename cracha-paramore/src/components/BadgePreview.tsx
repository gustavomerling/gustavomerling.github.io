import { useEffect, useRef } from 'react'
import { Download, FileDown, Loader2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { renderBadge, type BadgeData } from '@/lib/badge'
import { cn } from '@/lib/utils'

interface BadgePreviewProps {
  data: BadgeData
  assetsReady: boolean
  ready: boolean
  busy: 'png' | 'pdf' | null
  onDownload: (kind: 'png' | 'pdf') => void
}

export function BadgePreview({ data, assetsReady, ready, busy, onDownload }: BadgePreviewProps) {
  const hostRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (!assetsReady) return
    const host = hostRef.current
    const canvas = canvasRef.current
    if (!host || !canvas) return

    let frame = 0
    const paint = () => {
      const cssWidth = host.clientWidth
      if (!cssWidth) return
      const density = Math.max(2, Math.min(3, window.devicePixelRatio || 1))
      renderBadge(canvas, data, Math.round(cssWidth * density))
    }
    const schedule = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(paint)
    }

    schedule()
    const observer = new ResizeObserver(schedule)
    observer.observe(host)
    return () => {
      cancelAnimationFrame(frame)
      observer.disconnect()
    }
  }, [data, assetsReady])

  const displayName = data.name.trim() || 'Seu nome'
  const label = data.isAdmin ? 'Crachá da equipe' : 'Crachá de fã'

  return (
    <Card className="gap-0 overflow-hidden border-white/10 bg-card/85 py-0 backdrop-blur-md">
      <div className="flex items-center justify-between gap-3 border-b border-white/8 px-5 py-4">
        <div className="flex items-center gap-2.5">
          <span className="relative flex size-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
            <span className="relative inline-flex size-2 rounded-full bg-emerald-400" />
          </span>
          <div>
            <p className="text-sm font-medium text-white/90">Prévia ao vivo</p>
            <p className="text-[11px] text-white/35">Atualiza a cada escolha</p>
          </div>
        </div>
        <Badge
          variant="outline"
          className={cn(
            'border-white/15 bg-white/[0.03] text-[10px] font-semibold uppercase tracking-[0.14em]',
            data.isAdmin ? 'border-amber-200/25 text-amber-200/85' : 'text-white/55',
          )}
        >
          {label}
        </Badge>
      </div>

      <div className="p-4 sm:p-5">
        <div className="preview-stage">
          <div className="badge-mockup">
            <div className="badge-mockup-lanyard" aria-hidden="true">
              <span className="badge-mockup-cord badge-mockup-cord-left">
                <span className="badge-mockup-cord-text">
                  PARAMORE BRASIL · PARAMORE BRASIL · PARAMORE BRASIL
                </span>
              </span>
              <span className="badge-mockup-cord badge-mockup-cord-right">
                <span className="badge-mockup-cord-text">
                  PARAMORE BRASIL · PARAMORE BRASIL · PARAMORE BRASIL
                </span>
              </span>
              <span className="badge-mockup-clip" />
            </div>
            <div className="badge-mockup-holder">
              <span className="badge-mockup-slot" aria-hidden="true" />
              <span className="badge-mockup-glare" aria-hidden="true" />
              <div ref={hostRef} className="badge-mockup-card">
                {assetsReady ? (
                  <canvas
                    ref={canvasRef}
                    role="img"
                    aria-label={`Prévia do crachá de ${displayName}`}
                    className="block h-auto w-full"
                  />
                ) : (
                  <div className="aspect-[54/86] w-full animate-pulse rounded-[10px] border border-white/10 bg-white/[0.04]" />
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between gap-3 px-0.5">
          <div className="min-w-0">
            <p className="truncate font-display text-lg font-semibold capitalize text-white/90">
              {displayName}
            </p>
            <p className="truncate text-[11px] text-white/40">
              {data.isAdmin ? data.role : 'Fã oficial'} · {data.album.title}
            </p>
          </div>
          <span className="shrink-0 rounded-full border border-white/10 px-2 py-1 text-[10px] uppercase tracking-[0.12em] text-white/35">
            {data.album.year}
          </span>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <Button onClick={() => onDownload('png')} disabled={!ready || busy !== null} className="h-10">
            {busy === 'png' ? <Loader2 className="animate-spin" /> : <Download />}
            {busy === 'png' ? 'Gerando...' : 'Baixar PNG'}
          </Button>
          <Button
            variant="outline"
            onClick={() => onDownload('pdf')}
            disabled={!ready || busy !== null}
            className="h-10 border-white/15 bg-white/[0.03]"
          >
            {busy === 'pdf' ? <Loader2 className="animate-spin" /> : <FileDown />}
            {busy === 'pdf' ? 'Gerando...' : 'Baixar PDF'}
          </Button>
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-center gap-x-2.5 gap-y-1 text-center text-[10px] uppercase tracking-[0.1em] text-white/30">
          <span>PNG 300 DPI</span>
          <span className="text-white/15">•</span>
          <span>PDF 600 DPI CMYK</span>
          <span className="text-white/15">•</span>
          <span>54 × 86 mm · CR80</span>
        </div>

        {!ready && (
          <p className="mt-3 text-center text-[11px] leading-relaxed text-white/35">
            {!assetsReady
              ? 'Preparando a arte...'
              : 'Informe seu nome e envie uma foto para liberar o download.'}
          </p>
        )}
      </div>
    </Card>
  )
}
