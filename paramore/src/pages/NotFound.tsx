import { Link } from 'react-router-dom'
import Logo from '@/components/Logo'

export default function NotFound() {
  return (
    <section className="mx-auto flex min-h-[60vh] max-w-[var(--container-max)] flex-col items-center justify-center px-4 py-24 text-center sm:px-6">
      <Logo className="h-12 w-20 text-accent" />
      <p className="mt-6 font-mono text-sm text-content-muted">404 — página não encontrada</p>
      <h1 className="mt-2 font-display text-4xl font-extrabold tracking-tight text-content-primary sm:text-5xl">
        Esta rota não existe
      </h1>
      <p className="mt-4 max-w-md text-content-secondary">
        O que você procura pode ter mudado de endereço no novo portal. Que tal voltar
        ao começo?
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Link
          to="/"
          className="rounded-full bg-accent px-6 py-3 text-sm font-semibold text-content-inverse transition-colors hover:bg-accent-hover"
        >
          Voltar ao início
        </Link>
        <Link
          to="/sitemap"
          className="rounded-full border border-line-1 bg-surface-1 px-6 py-3 text-sm font-medium text-content-secondary transition-colors hover:bg-surface-2 hover:text-content-primary"
        >
          Ver o sitemap
        </Link>
      </div>
    </section>
  )
}