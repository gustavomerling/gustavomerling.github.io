import { Link } from 'react-router-dom'
import { SITE_GROUPS, STATUS_LABEL, type PageStatus } from '@/lib/site'
import { GroupIcon } from '@/lib/groupIcons'
import { Badge } from '@/components/ui/Badge'

const STATUS_TONE: Record<PageStatus, 'default' | 'accent' | 'success' | 'warning' | 'danger'> = {
  pronto: 'success',
  mock: 'warning',
  vazio: 'default',
  externo: 'danger',
}

export default function Sitemap() {
  return (
    <section className="mx-auto max-w-[var(--container-max)] px-4 py-16 sm:px-6">
      <header className="max-w-3xl">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
          Arquitetura de informação
        </p>
        <h1 className="mt-2 font-display text-4xl font-extrabold tracking-tight text-content-primary sm:text-5xl">
          Sitemap do novo portal
        </h1>
        <p className="mt-4 text-lg leading-relaxed text-content-secondary">
          Mapa completo baseado na navegação atual do paramore.com.br, reorganizada
          na nova IA proposta no roadmap. Páginas marcadas como{" "}
          <strong className="font-semibold text-content-primary">A construir</strong>{" "}
          já têm rota reservada.
        </p>
        <div className="mt-6 flex flex-wrap gap-2">
          <Badge tone="success">{STATUS_LABEL.pronto}</Badge>
          <Badge tone="warning">{STATUS_LABEL.mock}</Badge>
          <Badge>{STATUS_LABEL.vazio}</Badge>
        </div>
      </header>

      <div className="mt-12 grid gap-6 md:grid-cols-2">
        {SITE_GROUPS.map((group) => (
          <div
            key={group.title}
            className="rounded-xl border border-line-1 bg-surface-1 p-6"
          >
            <h2 className="flex items-center gap-2 font-display text-lg font-extrabold tracking-tight text-content-primary">
              <span className="flex size-8 items-center justify-center rounded-md border border-line-1 bg-surface-2 text-accent">
                <GroupIcon name={group.icon} className="size-4" />
              </span>
              {group.title}
            </h2>
            <ul className="mt-4 space-y-3">
              {group.pages.map((page) => (
                <li key={page.path} className="flex flex-col gap-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      to={page.path}
                      className="text-sm font-medium text-content-secondary transition-colors hover:text-accent"
                    >
                      <span className="font-mono text-xs text-content-muted">/</span>
                      {page.path.replace(/^\//, '')}
                    </Link>
                    <Badge tone={STATUS_TONE[page.status]}>
                      {STATUS_LABEL[page.status]}
                    </Badge>
                  </div>
                  <p className="text-xs leading-relaxed text-content-muted">
                    {page.description}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <p className="mt-10 text-sm text-content-muted">
        Roteiro completo em{" "}
        <Link
          to="/design-system"
          className="font-medium text-accent hover:text-accent-hover"
        >
          /design-system
        </Link>{" "}
        (seção Roadmap) e no arquivo{" "}
        <code className="rounded bg-surface-1 px-1.5 py-0.5 font-mono text-xs text-content-secondary">
          paramore_redesign_roadmap.md
        </code>
        .
      </p>
    </section>
  )
}