import { useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { NEWS } from '@/lib/mock-news'
import NewsCard from '@/components/news/NewsCard'
import { Badge } from '@/components/ui/Badge'

export default function Noticias() {
  const [active, setActive] = useState('Todos')
  const [query, setQuery] = useState('')

  const categories = useMemo(
    () => ['Todos', ...Array.from(new Set(NEWS.map((n) => n.category)))],
    []
  )

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return NEWS.filter((n) => {
      const matchesCategory = active === 'Todos' || n.category === active
      const matchesQuery =
        q.length === 0 ||
        n.title.toLowerCase().includes(q) ||
        n.excerpt.toLowerCase().includes(q) ||
        n.tag.toLowerCase().includes(q)
      return matchesCategory && matchesQuery
    })
  }, [active, query])

  return (
    <section className="mx-auto max-w-[var(--container-max)] px-4 py-16 sm:px-6">
      <header className="max-w-2xl">
        <div className="mb-3 flex items-center gap-2">
          <Badge tone="accent">Mockup</Badge>
          <Badge>Conteúdo ilustrativo</Badge>
        </div>
        <h1 className="font-display text-4xl font-extrabold tracking-tight text-content-primary sm:text-5xl">
          Notícias & Artigos
        </h1>
        <p className="mt-4 text-lg leading-relaxed text-content-secondary">
          Cobertura editorial do Paramore no Brasil — novos projetos, Hayley,
          Taylor e Zac. Filtre por categoria ou busque na linha do tempo.
        </p>
      </header>

      <div className="mt-10 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filtros por categoria">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setActive(cat)}
              aria-pressed={active === cat}
              className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
                active === cat
                  ? 'border-transparent bg-accent text-content-inverse'
                  : 'border-line-1 bg-surface-1 text-content-muted hover:border-accent/50 hover:text-content-primary'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
        <label className="relative block w-full max-w-xs">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-content-muted"
            aria-hidden="true"
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar notícias…"
            className="w-full rounded-full border border-line-1 bg-surface-1 py-2 pl-9 pr-4 text-sm text-content-primary outline-none transition-colors placeholder:text-content-muted focus:border-accent/60"
          />
        </label>
      </div>

      <p className="mt-6 text-xs text-content-muted">
        {filtered.length} {filtered.length === 1 ? 'artigo' : 'artigos'}
        {active !== 'Todos' ? ` em ${active}` : ''}
      </p>

      {filtered.length > 0 ? (
        <div className="mt-4 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((news) => (
            <NewsCard key={news.slug} news={news} />
          ))}
        </div>
      ) : (
        <div className="mt-4 rounded-xl border border-dashed border-line-1 bg-surface-1 p-12 text-center">
          <p className="font-display text-lg font-bold text-content-primary">
            Nada por aqui ainda
          </p>
          <p className="mt-2 text-sm text-content-muted">
            Tente outra categoria ou busque outro termo.
          </p>
        </div>
      )}
    </section>
  )
}