import { useEffect, useState } from 'react'
import { THEMES } from '@/lib/nav'
import {
  applyPersistedTheme,
  applyTheme,
  getCurrentThemeId,
  persistTheme,
} from '@/lib/theme'

export default function ThemeSwitcher() {
  const [active, setActive] = useState(getCurrentThemeId)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    applyPersistedTheme()
  }, [])

  const select = (id: string) => {
    const theme = THEMES.find((t) => t.id === id)
    if (!theme) return
    applyTheme(theme.bodyClass)
    persistTheme(id)
    setActive(id)
    setOpen(false)
  }

  const current = THEMES.find((t) => t.id === active) ?? THEMES[0]

  return (
    <div className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-full border border-line-1 bg-surface-1 px-3 py-1.5 text-xs font-medium text-content-primary transition-colors hover:bg-surface-2"
      >
        <span
          className="size-2.5 rounded-full"
          style={{ backgroundColor: current.dot }}
        />
        <span className="max-sm:hidden">Era: {current.label}</span>
        <span className="hidden max-sm:inline">Era</span>
        <svg
          viewBox="0 0 16 16"
          className={`size-3 text-content-muted transition-transform ${open ? 'rotate-180' : ''}`}
          aria-hidden="true"
        >
          <path d="M4 6l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.6" />
        </svg>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-2 w-56 rounded-lg border border-line-1 bg-surface-3 p-1.5 shadow-lg"
        >
          <p className="px-3 pb-1.5 pt-2 text-[11px] uppercase tracking-wider text-content-muted">
            Mudar a era
          </p>
          {THEMES.map((t) => (
            <button
              key={t.id}
              type="button"
              role="menuitemradio"
              aria-checked={t.id === active}
              onClick={() => select(t.id)}
              className={`flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left text-sm transition-colors ${
                t.id === active
                  ? 'bg-accent-subtle text-content-primary'
                  : 'text-content-secondary hover:bg-surface-2 hover:text-content-primary'
              }`}
            >
              <span className="size-2.5 rounded-full" style={{ backgroundColor: t.dot }} />
              {t.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}