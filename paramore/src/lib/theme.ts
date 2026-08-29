import { THEMES } from '@/lib/nav'

const STORAGE_KEY = 'pb:tema'

export function applyTheme(bodyClass: string) {
  const body = document.body
  body.classList.remove(...THEMES.map((t) => t.bodyClass))
  body.classList.add(bodyClass)
}

export function getCurrentThemeId(): string {
  if (typeof window === 'undefined') return 'default'
  const stored = window.localStorage.getItem(STORAGE_KEY)
  return stored && THEMES.some((t) => t.id === stored) ? stored : 'default'
}

export function persistTheme(id: string) {
  window.localStorage.setItem(STORAGE_KEY, id)
}

export function applyPersistedTheme() {
  const theme = THEMES.find((t) => t.id === getCurrentThemeId())
  if (theme) applyTheme(theme.bodyClass)
}