import { Link } from 'react-router-dom'
import { ArrowRight, Calendar, Clock } from 'lucide-react'
import type { NewsItem } from '@/lib/mock-news'
import { Badge } from '@/components/ui/Badge'
import TiltCard from '@/components/fx/TiltCard'

export default function NewsCard({ news }: { news: NewsItem }) {
  return (
    <TiltCard
      maxTilt={6}
      className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-line-1 bg-surface-1/90 backdrop-blur transition-all duration-300 hover:border-accent/60 hover:bg-surface-2/70"
    >
      <Link
        to={`/noticias/${news.slug}`}
        className="flex h-full flex-col"
      >
        <div className="relative aspect-[16/10] overflow-hidden">
          <img
            src={news.image}
            alt={news.title}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-surface-1 via-transparent to-transparent opacity-80" />
          
          <div className="absolute top-3 left-3 flex flex-wrap items-center gap-1.5">
            <Badge tone="accent">{news.tag}</Badge>
          </div>
        </div>

        <div className="flex flex-1 flex-col p-6 pt-3">
          <div className="flex items-center justify-between text-xs text-content-muted">
            <span className="flex items-center gap-1">
              <Calendar className="size-3 text-accent" /> {news.date}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="size-3 text-accent" /> {news.readTime}
            </span>
          </div>

          <h3 className="mt-3 font-display text-xl font-bold tracking-tight text-content-primary transition-colors group-hover:text-accent">
            {news.title}
          </h3>

          <p className="mt-2 text-sm leading-relaxed text-content-secondary line-clamp-3">
            {news.excerpt}
          </p>

          <div className="mt-auto pt-5 flex items-center justify-between border-t border-line-1/40">
            <span className="font-mono text-[11px] text-content-muted uppercase">
              {news.category}
            </span>
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-accent transition-transform duration-300 group-hover:translate-x-1">
              Ler matéria
              <ArrowRight className="size-3.5" aria-hidden="true" />
            </span>
          </div>
        </div>
      </Link>
    </TiltCard>
  )
}