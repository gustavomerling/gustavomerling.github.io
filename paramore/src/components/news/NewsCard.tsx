import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import type { NewsItem } from '@/lib/mock-news'
import { Badge } from '@/components/ui/Badge'

export default function NewsCard({ news }: { news: NewsItem }) {
  return (
    <Link
      to={`/noticias/${news.slug}`}
      className="group flex h-full flex-col overflow-hidden rounded-lg border border-line-1 bg-surface-1 transition-colors hover:border-accent/60 hover:bg-surface-2"
    >
      <div className="overflow-hidden">
        <img
          src={news.image}
          alt={news.title}
          loading="lazy"
          className="aspect-[3/2] w-full object-cover transition-transform duration-300 ease-out group-hover:scale-105"
        />
      </div>
      <div className="flex flex-1 flex-col p-5">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <Badge tone="accent">{news.tag}</Badge>
          <Badge>{news.readTime} leitura</Badge>
        </div>
        <p className="text-xs text-content-muted">
          {news.date} • {news.category}
        </p>
        <h3 className="mt-2 font-display text-xl font-bold tracking-tight text-content-primary transition-colors group-hover:text-accent">
          {news.title}
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-content-secondary line-clamp-4">
          {news.excerpt}
        </p>
        <span className="mt-auto inline-flex items-center gap-1 pt-4 text-sm font-medium text-accent transition-colors hover:text-accent-hover">
          Ler matéria completa
          <ArrowRight className="size-4 translate-y-[2px] transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
        </span>
      </div>
    </Link>
  )
}