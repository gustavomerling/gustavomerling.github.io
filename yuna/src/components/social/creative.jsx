import { resolveImage } from '@/lib/image'
import { CREATIVES, LIGHT_CREATIVES } from '@/lib/mock-data'
import { cn } from '@/lib/utils'

// Peça criativa: a imagem do post quando existe, senão um gradiente da paleta
// como placeholder. O gradiente segue servindo de fundo enquanto a imagem carrega.
export function Creative({
  creative = 'verde',
  image,
  headline,
  kicker,
  className,
  ratio = 'square',
  compact = false,
  alt = '',
}) {
  const src = resolveImage(image)
  const light = !src && LIGHT_CREATIVES.includes(creative)

  return (
    <div
      className={cn(
        'relative isolate flex flex-col justify-end overflow-hidden',
        ratio === 'square' && 'aspect-square',
        ratio === 'portrait' && 'aspect-[4/5]',
        ratio === 'story' && 'aspect-[9/16]',
        ratio === 'wide' && 'aspect-[1.91/1]',
        className,
      )}
      style={{ background: CREATIVES[creative] ?? CREATIVES.verde }}
    >
      {src && (
        <img
          src={src}
          alt={alt || headline || ''}
          loading="lazy"
          className="absolute inset-0 -z-10 size-full object-cover"
        />
      )}

      {!src && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 opacity-70"
          style={{
            background: light
              ? 'radial-gradient(70% 60% at 20% 15%, rgba(255,255,255,0.45) 0%, transparent 60%)'
              : 'radial-gradient(70% 60% at 20% 15%, rgba(176,193,217,0.18) 0%, transparent 60%)',
          }}
        />
      )}

      {(headline || kicker) && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10"
          style={{
            background: light
              ? 'linear-gradient(180deg, transparent 45%, rgba(31,42,51,0.22) 100%)'
              : 'linear-gradient(180deg, transparent 35%, rgba(0,0,0,0.55) 100%)',
          }}
        />
      )}

      {(headline || kicker) && (
        <div className={cn('relative flex flex-col gap-1', compact ? 'p-3' : 'p-5')}>
          {kicker && (
            <span
              className={cn(
                'text-xs tracking-wide',
                light ? 'text-[#1f2a33]/75' : 'text-white/75',
              )}
            >
              {kicker}
            </span>
          )}
          {headline && (
            <span
              className={cn(
                'font-display leading-[1.05]',
                compact ? 'text-xl' : 'text-3xl',
                light ? 'text-[#1f2a33]' : 'text-white',
              )}
            >
              {headline}
            </span>
          )}
        </div>
      )}
    </div>
  )
}
