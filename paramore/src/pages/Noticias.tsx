import { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Newspaper, Search, Sparkles } from 'lucide-react'
import { NEWS } from '@/lib/mock-news'
import NewsCard from '@/components/news/NewsCard'
import { Badge } from '@/components/ui/Badge'
import EraAmbientFX from '@/components/fx/EraAmbientFX'

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
    <section className="relative mx-auto max-w-[var(--container-max)] px-4 py-16 sm:px-6">
      <EraAmbientFX density="medium" />

      <header className="relative max-w-2xl">
        <div className="mb-3 flex items-center gap-2">
          <Badge tone="accent">
            <Newspaper className="mr-1 size-3.5" /> Editorial & Imprensa
          </Badge>
          <Badge>Cobertura Oficial</Badge>
        </div>
        <h1 className="font-display text-4xl font-extrabold tracking-tight text-content-primary sm:text-6xl">
          Notícias & Artigos
        </h1>
        <p className="mt-4 text-lg leading-relaxed text-content-secondary">
          Cobertura completa do Paramore no Brasil — novos projetos solo de Hayley, Taylor e Zac,
          rumores de estúdio, setlists e matérias especiais do fã-clube.
        </p>
      </header>

      {/* Barra de Filtros e Busca */}
      <div className="mt-10 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between border-b border-line-1/80 pb-6">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filtros por categoria">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setActive(cat)}
              aria-pressed={active === cat}
              className={`rounded-full px-4 py-1.5 text-xs font-semibold uppercase tracking-wider transition-all duration-200 ${
                active === cat
                  ? 'bg-accent text-content-inverse shadow-glow scale-105'
                  : 'border border-line-1 bg-surface-1/80 text-content-muted hover:border-accent/50 hover:text-content-primary'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <label className="relative block w-full max-w-xs">
          <Search
            className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-content-muted"
            aria-hidden="true"
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar notícias ou faixas…"
            className="w-full rounded-full border border-line-1 bg-surface-1/90 py-2.5 pl-10 pr-4 text-xs text-content-primary outline-none transition-all placeholder:text-content-muted focus:border-accent focus:ring-2 focus:ring-accent/30 shadow-inner"
          />
        </label>
      </div>

      <p className="mt-6 font-mono text-xs text-content-muted">
        Exibindo {filtered.length} {filtered.length === 1 ? 'publicação' : 'publicações'}
        {active !== 'Todos' ? ` na categoria ${active}` : ''}
      </p>

      {filtered.length > 0 ? (
        <motion.div
          layout
          className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
        >
          <AnimatePresence>
            {filtered.map((news) => (
              <motion.div
                layout
                key={news.slug}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.25 }}
              >
                <NewsCard news={news} />
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      ) : (
        <div className="mt-8 rounded-2xl border border-dashed border-line-1 bg-surface-1/50 p-12 text-center">
          <Sparkles className="mx-auto size-8 text-accent mb-2" />
          <p className="font-display text-lg font-bold text-content-primary">
            Nenhuma publicação encontrada
          </p>
          <p className="mt-2 text-sm text-content-muted max-w-sm mx-auto">
            Tente selecionar outra categoria ou buscar por outro termo de pesquisa.
          </p>
        </div>
      )}
    </section>
  )
}