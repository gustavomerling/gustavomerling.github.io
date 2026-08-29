import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import Logo from '@/components/Logo'
import ThemeSwitcher from '@/components/ThemeSwitcher'
import { HEADER_NAV } from '@/lib/nav'

function Wordmark() {
  return (
    <Link to="/" className="flex items-center gap-3" aria-label="Paramore Brasil — Início">
      <Logo className="h-6 w-10 text-accent" />
      <span className="flex flex-col leading-none">
        <span className="font-display text-lg font-extrabold tracking-tight text-content-primary">
          PARAMORE
        </span>
        <span className="text-[10px] font-semibold uppercase tracking-[0.25em] text-content-muted">
          Brasil
        </span>
      </span>
    </Link>
  )
}

export default function Navbar() {
  const [openMenu, setOpenMenu] = useState<string | null>(null)
  const [mobileOpen, setMobileOpen] = useState(false)
  const location = useLocation()

  const isActive = (path?: string) =>
    path ? location.pathname === path : false

  return (
    <header className="sticky top-0 z-40 border-b border-line-1 bg-canvas/85 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-[var(--container-max)] items-center justify-between gap-4 px-4 sm:px-6">
        <Wordmark />

        <nav className="hidden items-center gap-1 lg:flex" aria-label="Navegação principal">
          {HEADER_NAV.map((item) =>
            item.children ? (
              <div key={item.label} className="relative">
                <button
                  type="button"
                  aria-expanded={openMenu === item.label}
                  onClick={() =>
                    setOpenMenu(openMenu === item.label ? null : item.label)
                  }
                  className="flex items-center gap-1 rounded-md px-3 py-2 text-sm font-medium text-content-secondary transition-colors hover:bg-surface-1 hover:text-content-primary"
                >
                  {item.label}
                  <svg
                    viewBox="0 0 16 16"
                    className={`size-3 text-content-muted transition-transform ${openMenu === item.label ? 'rotate-180' : ''}`}
                    aria-hidden="true"
                  >
                    <path d="M4 6l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.6" />
                  </svg>
                </button>
                {openMenu === item.label && (
                  <div
                    role="menu"
                    className="absolute left-0 top-full z-50 mt-2 w-60 rounded-lg border border-line-1 bg-surface-3 p-1.5 shadow-lg"
                  >
                    {item.children.map((child) => (
                      <Link
                        key={child.path}
                        to={child.path}
                        role="menuitem"
                        className={`block rounded-md px-3 py-2 text-sm transition-colors ${
                          isActive(child.path)
                            ? 'bg-accent-subtle text-content-primary'
                            : 'text-content-secondary hover:bg-surface-2 hover:text-content-primary'
                        }`}
                        onClick={() => setOpenMenu(null)}
                      >
                        {child.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <Link
                key={item.path}
                to={item.path ?? '/'}
                className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  isActive(item.path)
                    ? 'text-accent'
                    : 'text-content-secondary hover:bg-surface-1 hover:text-content-primary'
                }`}
              >
                {item.label}
              </Link>
            ),
          )}
        </nav>

        <div className="flex items-center gap-2">
          <ThemeSwitcher />
          <button
            type="button"
            aria-label={mobileOpen ? 'Fechar menu' : 'Abrir menu'}
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((v) => !v)}
            className="rounded-md border border-line-1 bg-surface-1 p-2 text-content-primary lg:hidden"
          >
            <svg viewBox="0 0 20 20" className="size-5" aria-hidden="true">
              {mobileOpen ? (
                <path
                  d="M5 5l10 10M15 5L5 15"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
              ) : (
                <path
                  d="M3 6h14M3 10h14M3 14h14"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
              )}
            </svg>
          </button>
        </div>
      </div>

      {mobileOpen && (
        <nav
          className="border-t border-line-1 bg-canvas px-4 py-3 lg:hidden"
          aria-label="Navegação móvel"
        >
          <ul className="space-y-1">
            <li>
              <Link
                to="/"
                className="block rounded-md px-3 py-2 text-sm text-content-secondary hover:bg-surface-1"
                onClick={() => setMobileOpen(false)}
              >
                Início
              </Link>
            </li>
            {HEADER_NAV.map((item) =>
              item.children ? (
                <li key={item.label}>
                  <p className="px-3 pb-1 pt-2 text-[11px] uppercase tracking-wider text-content-muted">
                    {item.label}
                  </p>
                  <ul className="space-y-1">
                    {item.children.map((child) => (
                      <li key={child.path}>
                        <Link
                          to={child.path}
                          className="block rounded-md px-6 py-2 text-sm text-content-secondary hover:bg-surface-1 hover:text-content-primary"
                          onClick={() => setMobileOpen(false)}
                        >
                          {child.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </li>
              ) : (
                <li key={item.path}>
                  <Link
                    to={item.path ?? '/'}
                    className="block rounded-md px-3 py-2 text-sm text-content-secondary hover:bg-surface-1 hover:text-content-primary"
                    onClick={() => setMobileOpen(false)}
                  >
                    {item.label}
                  </Link>
                </li>
              ),
            )}
          </ul>
        </nav>
      )}
    </header>
  )
}