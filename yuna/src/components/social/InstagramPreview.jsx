import { useState } from 'react'
import {
  Bookmark,
  ChevronLeft,
  ChevronRight,
  Ellipsis,
  Heart,
  MessageCircle,
  Music2,
  Play,
  Plus,
  Search,
  Send,
  X,
} from 'lucide-react'

import { Creative } from '@/components/social/creative'
import { cn } from '@/lib/utils'

function Handle({ client, className }) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <span
        className="grid size-7 shrink-0 place-items-center rounded-full text-xs font-medium text-white ring-2 ring-white/25"
        style={{ background: client?.color ?? '#0d3226' }}
      >
        {client?.name?.slice(0, 2).toLowerCase() ?? 'yn'}
      </span>
      <div className="min-w-0 leading-tight">
        <p className="truncate text-xs font-medium">
          {client?.handle?.replace('@', '') ?? 'yuna'}
        </p>
      </div>
    </div>
  )
}

function ActionBar({ metrics, saved, onSave, liked, onLike }) {
  return (
    <div className="px-3 pb-3">
      <div className="flex items-center gap-4 py-2">
        <button type="button" onClick={onLike} aria-label="Curtir">
          <Heart
            className={cn('size-[1.15rem] transition-colors', liked && 'fill-[#ed4956] text-[#ed4956]')}
          />
        </button>
        <MessageCircle className="size-[1.15rem]" />
        <Send className="size-[1.15rem]" />
        <button type="button" onClick={onSave} className="ml-auto" aria-label="Salvar">
          <Bookmark className={cn('size-[1.15rem] transition-colors', saved && 'fill-current')} />
        </button>
      </div>
      <p className="text-xs font-medium">
        {(metrics?.likes ?? 0) + (liked ? 1 : 0)} curtidas
      </p>
    </div>
  )
}

function Caption({ client, caption, hashtags }) {
  return (
    <div className="px-3 pb-3 text-xs leading-relaxed">
      <span className="font-medium">{client?.handle?.replace('@', '') ?? 'yuna'}</span>{' '}
      <span className="text-foreground/80">{caption}</span>
      {hashtags && <p className="mt-1 text-[#3a6a99] dark:text-[#7aa8d4]">{hashtags}</p>}
    </div>
  )
}

function Phone({ children, className, dark = false }) {
  return (
    <div
      className={cn(
        'mx-auto w-full max-w-[392px] overflow-hidden rounded-[2rem] border shadow-[var(--shadow-md)]',
        dark ? 'border-black/60 bg-black text-white' : 'border-border bg-surface',
        className,
      )}
    >
      {children}
    </div>
  )
}

export function InstagramFeed({ post, client }) {
  const [liked, setLiked] = useState(false)
  const [saved, setSaved] = useState(false)

  return (
    <Phone>
      <div className="flex items-center gap-2 border-b border-border/60 px-3 py-2.5">
        <Handle client={client} />
        <Ellipsis className="ml-auto size-4 text-muted-foreground" />
      </div>
      <Creative creative={post.creative} image={post.image} headline={post.title} ratio="square" />
      <ActionBar
        metrics={post.metrics}
        liked={liked}
        onLike={() => setLiked((v) => !v)}
        saved={saved}
        onSave={() => setSaved((v) => !v)}
      />
      <Caption client={client} caption={post.caption} hashtags={post.hashtags} />
    </Phone>
  )
}

export function InstagramCarousel({ post, client }) {
  const slides =
    post.slides?.length > 0
      ? post.slides
      : [{ creative: post.creative, image: post.image, headline: post.title, kicker: 'Slide 1' }]
  const [index, setIndex] = useState(0)
  const [liked, setLiked] = useState(false)

  const slide = slides[Math.min(index, slides.length - 1)]

  return (
    <Phone>
      <div className="flex items-center gap-2 border-b border-border/60 px-3 py-2.5">
        <Handle client={client} />
        <span className="ml-auto text-xs text-muted-foreground">
          {index + 1}/{slides.length}
        </span>
      </div>

      <div className="relative">
        <Creative
          creative={slide.creative}
          image={slide.image}
          headline={slide.headline}
          kicker={slide.kicker}
          ratio="square"
        />
        {index > 0 && (
          <button
            type="button"
            onClick={() => setIndex((i) => i - 1)}
            className="absolute top-1/2 left-2 grid size-7 -translate-y-1/2 place-items-center rounded-full bg-black/45 text-white backdrop-blur-sm"
            aria-label="Slide anterior"
          >
            <ChevronLeft className="size-4" />
          </button>
        )}
        {index < slides.length - 1 && (
          <button
            type="button"
            onClick={() => setIndex((i) => i + 1)}
            className="absolute top-1/2 right-2 grid size-7 -translate-y-1/2 place-items-center rounded-full bg-black/45 text-white backdrop-blur-sm"
            aria-label="Próximo slide"
          >
            <ChevronRight className="size-4" />
          </button>
        )}
        <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-1.5">
          {slides.map((s, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={`Ir para o slide ${i + 1}`}
              className={cn(
                'size-1.5 rounded-full transition-colors',
                i === index ? 'bg-white' : 'bg-white/45',
              )}
            />
          ))}
        </div>
      </div>

      <ActionBar
        metrics={post.metrics}
        liked={liked}
        onLike={() => setLiked((v) => !v)}
        saved={false}
        onSave={() => {}}
      />
      <Caption client={client} caption={post.caption} hashtags={post.hashtags} />
    </Phone>
  )
}

export function InstagramStories({ post, client }) {
  return (
    <Phone dark>
      <div className="relative">
        <Creative creative={post.creative} image={post.image} ratio="story" />

        <div className="absolute inset-x-0 top-0 p-3">
          <div className="flex gap-1">
            <span className="h-0.5 flex-1 rounded-full bg-white/85" />
            <span className="h-0.5 flex-1 rounded-full bg-white/30" />
            <span className="h-0.5 flex-1 rounded-full bg-white/30" />
          </div>
          <div className="mt-3 flex items-center gap-2 text-white">
            <Handle client={client} className="[&_p]:text-white" />
            <span className="text-xs text-white/70">agora</span>
            <X className="ml-auto size-4 text-white/90" />
          </div>
        </div>

        <div className="absolute inset-x-0 bottom-0 space-y-4 p-4">
          <p className="font-display text-3xl leading-[1.1] text-white drop-shadow-[0_4px_4px_rgba(0,0,0,0.25)]">
            {post.title}
          </p>
          <p className="text-xs leading-relaxed text-white/85">{post.caption}</p>
          <div className="flex items-center gap-2">
            <span className="flex-1 rounded-full border border-white/35 px-3 py-1.5 text-xs text-white/70">
              Enviar mensagem
            </span>
            <Heart className="size-[1.15rem] text-white" />
            <Send className="size-[1.15rem] text-white" />
          </div>
        </div>
      </div>
    </Phone>
  )
}

export function InstagramReels({ post, client }) {
  const [liked, setLiked] = useState(false)

  return (
    <Phone dark>
      <div className="relative">
        <Creative creative={post.creative} image={post.image} ratio="story" />

        <div className="absolute inset-x-0 top-0 flex items-center justify-between p-3 text-white">
          <span className="text-[0.8rem] font-medium">Reels</span>
          <div className="flex items-center gap-3">
            <Search className="size-4" />
            <Ellipsis className="size-4" />
          </div>
        </div>

        <div className="absolute top-1/2 left-1/2 grid size-14 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-black/35 backdrop-blur-sm">
          <Play className="size-6 fill-white text-white" />
        </div>

        <div className="absolute right-2 bottom-16 flex flex-col items-center gap-4 text-white">
          <button
            type="button"
            onClick={() => setLiked((v) => !v)}
            className="flex flex-col items-center gap-1"
            aria-label="Curtir"
          >
            <Heart className={cn('size-5', liked && 'fill-[#ed4956] text-[#ed4956]')} />
            <span className="text-xs">{(post.metrics?.likes ?? 0) + (liked ? 1 : 0)}</span>
          </button>
          <div className="flex flex-col items-center gap-1">
            <MessageCircle className="size-5" />
            <span className="text-xs">{post.metrics?.comments ?? 0}</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <Send className="size-5" />
            <span className="text-xs">Enviar</span>
          </div>
          <Bookmark className="size-5" />
          <span
            className="mt-1 grid size-7 place-items-center rounded-md border border-white/60 text-xs"
            style={{ background: client?.color ?? '#0d3226' }}
          >
            {client?.name?.slice(0, 2).toLowerCase() ?? 'yn'}
          </span>
        </div>

        <div className="absolute inset-x-0 bottom-0 space-y-2 p-3 pr-14 text-white">
          <div className="flex items-center gap-2">
            <Handle client={client} className="[&_p]:text-white" />
            <span className="rounded border border-white/60 px-1.5 py-0.5 text-xs">
              Seguir
            </span>
          </div>
          <p className="line-clamp-2 text-xs leading-relaxed text-white/90">
            {post.caption}
          </p>
          <div className="flex items-center gap-1.5 text-xs text-white/80">
            <Music2 className="size-3" />
            <span className="truncate">{post.audio ?? 'Áudio original'}</span>
            {post.duration && <span className="ml-auto shrink-0">{post.duration}</span>}
          </div>
        </div>
      </div>
    </Phone>
  )
}

export function InstagramGrid({ posts, onSelect }) {
  return (
    <div className="grid grid-cols-3 gap-0.5">
      {posts.map((p) => (
        <button
          key={p.id}
          type="button"
          onClick={() => onSelect?.(p)}
          className="group relative focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          <Creative creative={p.creative} image={p.image} ratio="square" />
          <span className="absolute inset-0 grid place-items-center bg-black/45 opacity-0 transition-opacity group-hover:opacity-100">
            <Plus className="size-5 text-white" />
          </span>
        </button>
      ))}
    </div>
  )
}
