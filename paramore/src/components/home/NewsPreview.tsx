import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import NewsCard from '@/components/news/NewsCard'
import { NEWS } from '@/lib/mock-news'

export default function NewsPreview() {
  return (
    <section className="border-y border-line-1 bg-surface-1/40">
      <div className="mx-auto max-w-[var(--container-max)] px-4 py-20 sm:px-6">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
              Últimas notícias
            </p>
            <h2 className="mt-2 font-display text-3xl font-extrabold tracking-tight text-content-primary">
              O que está rolando
            </h2>
          </div>
          <Link
            to="/noticias"
            className="group inline-flex shrink-0 items-center gap-1 text-sm font-medium text-accent transition-colors hover:text-accent-hover"
          >
            Ver todas
            <ArrowRight className="size-4 translate-y-[2px] transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
          </Link>
        </div>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {NEWS.slice(0, 3).map((news, i) => (
            <div key={news.title} className="h-full" data-aos="fade-up" data-aos-delay={i * 90}>
              <NewsCard news={news} />
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}