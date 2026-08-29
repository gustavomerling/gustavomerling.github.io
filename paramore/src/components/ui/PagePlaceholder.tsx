import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'

export default function PagePlaceholder({
  kicker,
  title,
  description,
  group,
  status = 'A construir',
  children,
}: {
  kicker?: string
  title: string
  description?: string
  group?: string
  status?: string
  children?: React.ReactNode
}) {
  return (
    <section className="mx-auto max-w-[var(--container-max)] px-4 py-20 sm:px-6">
      <header className="max-w-2xl">
        {kicker && (
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-accent">
            {kicker}
          </p>
        )}
        <h1 className="font-display text-4xl font-extrabold tracking-tight text-content-primary sm:text-5xl">
          {title}
        </h1>
        {description && (
          <p className="mt-4 text-lg leading-relaxed text-content-secondary">
            {description}
          </p>
        )}
      </header>

      <div className="mt-12 rounded-xl border border-dashed border-line-2 bg-surface-1/60 p-8">
        <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Badge tone="accent">{status}</Badge>
            <p className="mt-3 text-sm text-content-muted">
              {group ? `Grupo no sitemap: ${group}. ` : ''}
              Página reservada na nova arquitetura de informação — conteúdo será
              desenvolvido em uma das fases do roadmap.
            </p>
          </div>
          <Link
            to="/sitemap"
            className="group inline-flex shrink-0 items-center gap-1 text-sm font-medium text-accent hover:text-accent-hover"
          >
            Ver sitemap
            <ArrowRight className="size-4 translate-y-[2px] transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
          </Link>
        </div>
        {children}
      </div>
    </section>
  )
}