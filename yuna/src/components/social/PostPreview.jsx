import { useMemo, useState } from 'react'

import { Facebook, Instagram, Linkedin } from '@/components/social/platform-icons'

import {
  FacebookCarousel,
  FacebookFeed,
  FacebookReels,
  FacebookStories,
  LinkedInCarousel,
  LinkedInFeed,
} from '@/components/social/MetaPreview'
import {
  InstagramCarousel,
  InstagramFeed,
  InstagramReels,
  InstagramStories,
} from '@/components/social/InstagramPreview'
import { Button } from '@/components/ui/button'
import { FORMATS } from '@/lib/mock-data'
import { cn } from '@/lib/utils'

const PLATFORM_META = {
  instagram: { label: 'Instagram', icon: Instagram },
  facebook: { label: 'Facebook', icon: Facebook },
  linkedin: { label: 'LinkedIn', icon: Linkedin },
}

const RENDERERS = {
  instagram: {
    feed: InstagramFeed,
    carrossel: InstagramCarousel,
    stories: InstagramStories,
    reels: InstagramReels,
  },
  facebook: {
    feed: FacebookFeed,
    carrossel: FacebookCarousel,
    stories: FacebookStories,
    reels: FacebookReels,
  },
  linkedin: {
    feed: LinkedInFeed,
    carrossel: LinkedInCarousel,
  },
}

function formatsFor(platform) {
  return Object.values(FORMATS).filter((f) => f.platforms.includes(platform))
}

// Simulador de publicação. Começa no par plataforma/formato do post, mas
// permite ver a mesma peça em qualquer combinação disponível.
export function PostPreview({ post, client, className }) {
  const [platform, setPlatform] = useState(post.platform ?? 'instagram')
  const [format, setFormat] = useState(post.format ?? 'feed')

  const available = useMemo(() => formatsFor(platform), [platform])
  const activeFormat = available.some((f) => f.id === format) ? format : available[0]?.id
  const Renderer = RENDERERS[platform]?.[activeFormat] ?? InstagramFeed

  function pickPlatform(next) {
    setPlatform(next)
    const nextFormats = formatsFor(next)
    if (!nextFormats.some((f) => f.id === format)) setFormat(nextFormats[0]?.id ?? 'feed')
  }

  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1 rounded-lg bg-muted/70 p-1">
          {Object.entries(PLATFORM_META).map(([id, meta]) => {
            const Icon = meta.icon
            return (
              <button
                key={id}
                type="button"
                onClick={() => pickPlatform(id)}
                className={cn(
                  'flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs transition-colors',
                  platform === id
                    ? 'bg-surface text-foreground shadow-[var(--shadow-soft)]'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <Icon className="size-3.5" />
                {meta.label}
              </button>
            )
          })}
        </div>

        <div className="flex items-center gap-1">
          {available.map((f) => (
            <Button
              key={f.id}
              type="button"
              size="sm"
              variant={activeFormat === f.id ? 'secondary' : 'ghost'}
              onClick={() => setFormat(f.id)}
              className="h-7 px-2.5 text-xs"
            >
              {f.label}
            </Button>
          ))}
        </div>

        {(platform !== post.platform || activeFormat !== post.format) && (
          <span className="text-xs text-muted-foreground">
            visualização alternativa — planejado como {PLATFORM_META[post.platform]?.label}{' '}
            {FORMATS[post.format]?.label?.toLowerCase()}
          </span>
        )}
      </div>

      <div className="rounded-xl bg-muted/35 p-4 sm:p-6">
        <Renderer key={post.id} post={post} client={client} />
      </div>
    </div>
  )
}

export { PLATFORM_META }
