import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// Tema e preferências de interface, persistidos por navegador.
export const usePrefsStore = create(
  persist(
    (set, get) => ({
      theme: 'light',
      sidebarCollapsed: false,
      notifications: {
        aprovacoes: true,
        publicacoes: true,
        resumoSemanal: false,
        mencoes: true,
      },

      setTheme: (theme) => set({ theme }),
      toggleTheme: () => set({ theme: get().theme === 'dark' ? 'light' : 'dark' }),
      setSidebarCollapsed: (sidebarCollapsed) => set({ sidebarCollapsed }),
      toggleNotification: (key) =>
        set({
          notifications: {
            ...get().notifications,
            [key]: !get().notifications[key],
          },
        }),
    }),
    { name: 'yuna:prefs' },
  ),
)

export function applyTheme(theme) {
  const root = document.documentElement
  root.classList.toggle('dark', theme === 'dark')
  root.style.colorScheme = theme
}
