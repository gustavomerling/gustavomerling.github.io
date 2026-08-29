import { Link, Navigate, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { getNewsBySlug, NEWS } from '@/lib/mock-news'
import NewsCard from '@/components/news/NewsCard'
import { Badge } from '@/components/ui/Badge'

export default function Noticia() {
  const { slug } = useParams()
  const news = slug ? getNewsBySlug(slug) : undefined

  if (!news) return <Navigate to="/noticias" replace />

  const related = NEWS.filter((n) => n.slug !== news.slug && n.category === news.category)
  const others = related.length > 0 ? related : NEWS.filter((n) => n.slug !== news.slug).slice(0, 3)

  return (
    <section className="mx-auto max-w-[var(--container-max)] px-4 py-12 sm:px-6">
      <Link
        to="/noticias"
        className="group inline-flex items-center gap-1.5 text-sm font-medium text-content-secondary transition-colors hover:text-accent"
      >
        <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-0.5" aria-hidden="true" />
        Voltar para notícias
      </Link>

      <article className="mx-auto mt-6 max-w-3xl">
        <header>
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="accent">{news.tag}</Badge>
            <Badge>{news.category}</Badge>
          </div>
          <h1 className="mt-4 font-display text-3xl font-extrabold leading-tight tracking-tight text-content-primary sm:text-4xl">
            {news.title}
          </h1>
          <p className="mt-4 text-sm text-content-muted">
            {news.date} · {news.readTime} de leitura
          </p>
        </header>

        <figure className="mt-8 overflow-hidden rounded-xl border border-line-1 bg-surface-1">
          <img
            src={news.image}
            alt={news.title}
            loading="lazy"
            className="aspect-[16/9] w-full object-cover"
          />
          <figcaption className="px-4 py-2.5 text-xs text-content-muted">
            {news.title} — arquivo do fã-clube.
          </figcaption>
        </figure>

        <div className="mt-10 space-y-5">
          {news.body.map((paragraph, i) => (
            <p
              key={i}
              className="text-base leading-relaxed text-content-secondary first:text-lg first:text-content-primary"
            >
              {paragraph}
            </p>
          ))}
        </div>

        <footer className="mt-12 flex flex-col gap-4 border-t border-line-1 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-2">
            <Badge>{news.category}</Badge>
            <Badge>#{news.tag.toLowerCase().replace(/\s+/g, '-')}</Badge>
          </div>
          <span className="text-xs text-content-muted">
            Matéria ilustrativa para o novo portal.
          </span>
        </footer>
      </article>

      {others.length > 0 && (
        <aside className="mt-16">
          <h2 className="font-display text-2xl font-extrabold tracking-tight text-content-primary">
            Mais da linha do tempo
          </h2>
          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {others.map((item) => (
              <NewsCard key={item.slug} news={item} />
            ))}
          </div>
        </aside>
      )}
    </section>
  )
}