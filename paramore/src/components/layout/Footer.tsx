import { Link } from 'react-router-dom'
import Logo from '@/components/Logo'
import BrandIcon from '@/components/ui/BrandIcon'
import type { Brand } from '@/components/ui/BrandIcon'
import { HEADER_NAV } from '@/lib/nav'

const SOCIALS = [
  { label: 'Instagram', href: 'https://www.instagram.com/paramorebrasil', brand: 'instagram' as Brand },
  { label: 'X', href: 'https://x.com/paramorebrasil', brand: 'x' as Brand },
  { label: 'Facebook', href: 'https://www.facebook.com/paramorebrasiloficial', brand: 'facebook' as Brand },
  { label: 'YouTube', href: 'https://www.youtube.com/paramore', brand: 'youtube' as Brand },
]

export default function Footer() {
  return (
    <footer className="border-t border-line-1 bg-surface-1/60">
      <div className="mx-auto max-w-[var(--container-max)] px-4 py-8 sm:px-6">
        <div className="grid gap-8 md:grid-cols-[1.2fr_2fr]">
          <div>
            <div className="flex items-center gap-3">
              <Logo className="h-5 w-9 text-accent" />
              <span className="flex flex-col leading-none">
                <span className="font-display text-base font-extrabold tracking-tight text-content-primary">
                  PARAMORE
                </span>
                <span className="text-[10px] font-semibold uppercase tracking-[0.25em] text-content-muted">
                  Brasil
                </span>
              </span>
            </div>
            <p className="mt-3 max-w-sm text-[13px] leading-relaxed text-content-muted">
              Fã-clube independente desde 2005 — acervo, letras e a história da
              banda em português.
            </p>
            <div className="mt-4 flex gap-2">
              {SOCIALS.map(({ label, href, brand }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={label}
                  title={label}
                  className="inline-flex size-9 items-center justify-center rounded-full border border-line-1 bg-surface-1 text-content-secondary transition-colors hover:border-accent/60 hover:bg-surface-2 hover:text-accent"
                >
                  <BrandIcon brand={brand} className="size-4" />
                </a>
              ))}
            </div>
          </div>

          <nav className="grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-3" aria-label="Rodapé">
            {HEADER_NAV.map((item) => (
              <div key={item.label}>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-content-muted">
                  {item.label}
                </p>
                <ul className="mt-2 space-y-1.5">
                  {(item.children ?? []).map((child) => (
                    <li key={child.path}>
                      <Link
                        to={child.path}
                        className="text-[13px] text-content-secondary transition-colors hover:text-accent"
                      >
                        {child.label}
                      </Link>
                    </li>
                  ))}
                  {item.path && (
                    <li>
                      <Link
                        to={item.path}
                        className="text-[13px] text-content-secondary transition-colors hover:text-accent"
                      >
                        {item.label}
                      </Link>
                    </li>
                  )}
                </ul>
              </div>
            ))}
          </nav>
        </div>

        <div className="mt-8 flex flex-col gap-2 border-t border-line-1 pt-4 text-xs text-content-muted sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getFullYear()} PARAMORE BRASIL — fã-clube não afiliado à
            banda.
          </p>
          <p className="font-mono">paramore.isaband • desde 2005</p>
        </div>
      </div>
    </footer>
  )
}