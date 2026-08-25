import { useState } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  Ellipsis,
  Globe,
  MessageCircle,
  Repeat2,
  Send,
  Share2,
  ThumbsUp,
  X,
} from 'lucide-react'

import { Creative } from '@/components/social/creative'
import { cn } from '@/lib/utils'

function Avatar({ client, size = 'size-9', rounded = 'rounded-full' }) {
  return (
    <span
      className={cn('grid shrink-0 place-items-center text-xs font-medium text-white', size, rounded)}
      style={{ background: client?.color ?? '#0d3226' }}
    >
      {client?.name?.slice(0, 2).toUpperCase() ?? 'YN'}
    </span>
  )
}

function Card({ children, className }) {
  return (
    <div
      className={cn(
        'mx-auto w-full max-w-[456px] overflow-hidden rounded-xl border border-border bg-surface shadow-[var(--shadow-soft)]',
        className,
      )}
    >
      {children}
    </div>
  )
}

export function FacebookFeed({ post, client }) {
  const [liked, setLiked] = useState(false)

  return (
    <Card>
      <div className="flex items-start gap-2.5 p-3">
        <Avatar client={client} />
        <div className="min-w-0 leading-tight">
          <p className="truncate text-[0.8rem] font-medium">{client?.name ?? 'Yuna'}</p>
          <p className="flex items-center gap-1 text-xs text-muted-foreground">
            Patrocinado <Globe className="size-2.5" />
          </p>
        </div>
        <Ellipsis className="ml-auto size-4 text-muted-foreground" />
      </div>

      <p className="px-3 pb-2.5 text-[0.78rem] leading-relaxed">{post.caption}</p>

      <Creative creative={post.creative} image={post.image} headline={post.title} ratio="wide" />

      <div className="flex items-center justify-between border-b border-border/60 px-3 py-2 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <span className="grid size-3.5 place-items-center rounded-full bg-[#1877f2]">
            <ThumbsUp className="size-2 fill-white text-white" />
          </span>
          {(post.metrics?.likes ?? 0) + (liked ? 1 : 0)}
        </span>
        <span>{post.metrics?.comments ?? 0} comentários</span>
      </div>

      <div className="grid grid-cols-3 px-1 py-1 text-xs text-muted-foreground">
        <button
          type="button"
          onClick={() => setLiked((v) => !v)}
          className={cn(
            'flex items-center justify-center gap-1.5 rounded-md py-1.5 transition-colors hover:bg-muted/60',
            liked && 'text-[#1877f2]',
          )}
        >
          <ThumbsUp className={cn('size-3.5', liked && 'fill-current')} />
          Curtir
        </button>
        <span className="flex items-center justify-center gap-1.5 py-1.5">
          <MessageCircle className="size-3.5" />
          Comentar
        </span>
        <span className="flex items-center justify-center gap-1.5 py-1.5">
          <Share2 className="size-3.5" />
          Compartilhar
        </span>
      </div>
    </Card>
  )
}

export function FacebookCarousel({ post, client }) {
  const slides =
    post.slides?.length > 0
      ? post.slides
      : [{ creative: post.creative, image: post.image, headline: post.title, kicker: 'Slide 1' }]
  const [index, setIndex] = useState(0)

  return (
    <Card>
      <div className="flex items-start gap-2.5 p-3">
        <Avatar client={client} />
        <div className="min-w-0 leading-tight">
          <p className="truncate text-[0.8rem] font-medium">{client?.name ?? 'Yuna'}</p>
          <p className="flex items-center gap-1 text-xs text-muted-foreground">
            Patrocinado <Globe className="size-2.5" />
          </p>
        </div>
      </div>

      <p className="px-3 pb-2.5 text-[0.78rem] leading-relaxed">{post.caption}</p>

      <div className="relative overflow-hidden">
        <div
          className="flex transition-transform duration-300 ease-out"
          style={{ transform: `translateX(-${index * 72}%)`, paddingRight: '28%' }}
        >
          {slides.map((s, i) => (
            <div key={i} className="w-[72%] shrink-0 pr-1.5 pl-3">
              <Creative
                creative={s.creative}
                image={s.image}
                headline={s.headline}
                kicker={s.kicker}
                ratio="square"
                compact
                className="rounded-lg"
              />
              <div className="mt-1.5 rounded-lg bg-muted/60 px-2 py-1.5">
                <p className="truncate text-xs font-medium">{s.headline}</p>
                <p className="truncate text-xs text-muted-foreground">{s.kicker}</p>
              </div>
            </div>
          ))}
        </div>

        {index > 0 && (
          <button
            type="button"
            onClick={() => setIndex((i) => i - 1)}
            className="absolute top-1/3 left-1 grid size-7 place-items-center rounded-full bg-surface/90 shadow-[var(--shadow-soft)]"
            aria-label="Anterior"
          >
            <ChevronLeft className="size-4" />
          </button>
        )}
        {index < slides.length - 1 && (
          <button
            type="button"
            onClick={() => setIndex((i) => i + 1)}
            className="absolute top-1/3 right-1 grid size-7 place-items-center rounded-full bg-surface/90 shadow-[var(--shadow-soft)]"
            aria-label="Próximo"
          >
            <ChevronRight className="size-4" />
          </button>
        )}
      </div>

      <div className="mt-2 grid grid-cols-3 border-t border-border/60 px-1 py-1 text-xs text-muted-foreground">
        <span className="flex items-center justify-center gap-1.5 py-1.5">
          <ThumbsUp className="size-3.5" /> Curtir
        </span>
        <span className="flex items-center justify-center gap-1.5 py-1.5">
          <MessageCircle className="size-3.5" /> Comentar
        </span>
        <span className="flex items-center justify-center gap-1.5 py-1.5">
          <Share2 className="size-3.5" /> Compartilhar
        </span>
      </div>
    </Card>
  )
}

export function FacebookStories({ post, client }) {
  return (
    <div className="mx-auto w-full max-w-[344px] overflow-hidden rounded-[1.75rem] border border-black/60 bg-black">
      <div className="relative">
        <Creative creative={post.creative} image={post.image} ratio="story" />
        <div className="absolute inset-x-0 top-0 p-3">
          <div className="flex gap-1">
            <span className="h-0.5 flex-1 rounded-full bg-white/85" />
            <span className="h-0.5 flex-1 rounded-full bg-white/30" />
          </div>
          <div className="mt-3 flex items-center gap-2">
            <Avatar client={client} size="size-7" />
            <div className="leading-tight text-white">
              <p className="text-xs font-medium">{client?.name ?? 'Yuna'}</p>
              <p className="text-xs text-white/70">há 12 min</p>
            </div>
            <X className="ml-auto size-4 text-white/90" />
          </div>
        </div>
        <div className="absolute inset-x-0 bottom-0 space-y-3 p-4">
          <p className="font-display text-2xl leading-tight text-white">{post.title}</p>
          <p className="text-xs text-white/85">{post.caption}</p>
          <div className="flex items-center gap-2">
            <span className="flex-1 rounded-full bg-white/15 px-3 py-1.5 text-xs text-white/75">
              Responder
            </span>
            <ThumbsUp className="size-4 text-white" />
            <Send className="size-4 text-white" />
          </div>
        </div>
      </div>
    </div>
  )
}

export function FacebookReels({ post, client }) {
  return (
    <div className="mx-auto w-full max-w-[344px] overflow-hidden rounded-[1.75rem] border border-black/60 bg-black">
      <div className="relative">
        <Creative creative={post.creative} image={post.image} ratio="story" />
        <div className="absolute inset-x-0 top-0 flex items-center gap-2 p-3 text-white">
          <span className="text-[0.78rem] font-medium">Reels</span>
        </div>
        <div className="absolute right-2 bottom-20 flex flex-col items-center gap-4 text-white">
          <div className="flex flex-col items-center gap-1">
            <ThumbsUp className="size-5" />
            <span className="text-xs">{post.metrics?.likes ?? 0}</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <MessageCircle className="size-5" />
            <span className="text-xs">{post.metrics?.comments ?? 0}</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <Share2 className="size-5" />
            <span className="text-xs">Enviar</span>
          </div>
        </div>
        <div className="absolute inset-x-0 bottom-0 space-y-2 p-3 pr-12 text-white">
          <div className="flex items-center gap-2">
            <Avatar client={client} size="size-6" />
            <p className="text-xs font-medium">{client?.name ?? 'Yuna'}</p>
          </div>
          <p className="line-clamp-2 text-xs text-white/90">{post.caption}</p>
          <p className="text-xs text-white/70">{post.audio ?? 'Áudio original'}</p>
        </div>
      </div>
    </div>
  )
}

export function LinkedInFeed({ post, client }) {
  const [reacted, setReacted] = useState(false)

  return (
    <Card>
      <div className="flex items-start gap-2.5 p-3">
        <Avatar client={client} rounded="rounded-md" />
        <div className="min-w-0 leading-tight">
          <p className="truncate text-[0.8rem] font-medium">{client?.name ?? 'Yuna'}</p>
          <p className="truncate text-xs text-muted-foreground">
            {client?.segment ?? 'Marketing e comunicação'} · {client?.city ?? 'Joinville, SC'}
          </p>
          <p className="flex items-center gap-1 text-xs text-muted-foreground">
            há 2 h <Globe className="size-2.5" />
          </p>
        </div>
        <Ellipsis className="ml-auto size-4 text-muted-foreground" />
      </div>

      <div className="px-3 pb-2.5 text-[0.78rem] leading-relaxed">
        <p>{post.caption}</p>
        {post.hashtags && (
          <p className="mt-1.5 text-[#0a66c2] dark:text-[#7aa8d4]">{post.hashtags}</p>
        )}
      </div>

      <Creative creative={post.creative} image={post.image} headline={post.title} ratio="wide" />

      <div className="flex items-center gap-1 border-b border-border/60 px-3 py-2 text-xs text-muted-foreground">
        <span className="grid size-3.5 place-items-center rounded-full bg-[#0a66c2]">
          <ThumbsUp className="size-2 fill-white text-white" />
        </span>
        <span>{(post.metrics?.likes ?? 0) + (reacted ? 1 : 0)}</span>
        <span className="ml-auto">{post.metrics?.comments ?? 0} comentários</span>
      </div>

      <div className="grid grid-cols-4 px-1 py-1 text-xs text-muted-foreground">
        <button
          type="button"
          onClick={() => setReacted((v) => !v)}
          className={cn(
            'flex items-center justify-center gap-1 rounded-md py-1.5 transition-colors hover:bg-muted/60',
            reacted && 'text-[#0a66c2]',
          )}
        >
          <ThumbsUp className={cn('size-3.5', reacted && 'fill-current')} />
          Gostei
        </button>
        <span className="flex items-center justify-center gap-1 py-1.5">
          <MessageCircle className="size-3.5" /> Comentar
        </span>
        <span className="flex items-center justify-center gap-1 py-1.5">
          <Repeat2 className="size-3.5" /> Republicar
        </span>
        <span className="flex items-center justify-center gap-1 py-1.5">
          <Send className="size-3.5" /> Enviar
        </span>
      </div>
    </Card>
  )
}

export function LinkedInCarousel({ post, client }) {
  const slides =
    post.slides?.length > 0
      ? post.slides
      : [{ creative: post.creative, image: post.image, headline: post.title, kicker: 'Slide 1' }]
  const [index, setIndex] = useState(0)

  const slide = slides[Math.min(index, slides.length - 1)]

  return (
    <Card>
      <div className="flex items-start gap-2.5 p-3">
        <Avatar client={client} rounded="rounded-md" />
        <div className="min-w-0 leading-tight">
          <p className="truncate text-[0.8rem] font-medium">{client?.name ?? 'Yuna'}</p>
          <p className="truncate text-xs text-muted-foreground">
            {client?.segment ?? 'Marketing e comunicação'}
          </p>
        </div>
      </div>

      <p className="px-3 pb-2.5 text-[0.78rem] leading-relaxed">{post.caption}</p>

      <div className="relative bg-muted/40 px-3 py-3">
        <Creative
          creative={slide.creative}
          image={slide.image}
          headline={slide.headline}
          kicker={slide.kicker}
          ratio="square"
          className="rounded-lg"
        />
        <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
          <span>
            Documento · {index + 1} de {slides.length}
          </span>
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => setIndex((i) => Math.max(0, i - 1))}
              disabled={index === 0}
              className="grid size-6 place-items-center rounded-full border border-border disabled:opacity-40"
              aria-label="Página anterior"
            >
              <ChevronLeft className="size-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setIndex((i) => Math.min(slides.length - 1, i + 1))}
              disabled={index === slides.length - 1}
              className="grid size-6 place-items-center rounded-full border border-border disabled:opacity-40"
              aria-label="Próxima página"
            >
              <ChevronRight className="size-3.5" />
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-4 border-t border-border/60 px-1 py-1 text-xs text-muted-foreground">
        <span className="flex items-center justify-center gap-1 py-1.5">
          <ThumbsUp className="size-3.5" /> Gostei
        </span>
        <span className="flex items-center justify-center gap-1 py-1.5">
          <MessageCircle className="size-3.5" /> Comentar
        </span>
        <span className="flex items-center justify-center gap-1 py-1.5">
          <Repeat2 className="size-3.5" /> Republicar
        </span>
        <span className="flex items-center justify-center gap-1 py-1.5">
          <Send className="size-3.5" /> Enviar
        </span>
      </div>
    </Card>
  )
}
