import { create } from 'zustand'
import { persist } from 'zustand/middleware'

import { ROLES, USERS } from '@/lib/mock-data'

// Autenticação simulada: qualquer credencial entra. O papel define o que a
// interface mostra e é trocável a qualquer momento pelo menu do usuário.
export const useAuthStore = create(
  persist(
    (set, get) => ({
      authenticated: false,
      role: 'admin',
      provider: null,
      profile: null,

      login: ({ email, role = 'admin', provider = 'email' }) => {
        const base = USERS[role] ?? USERS.admin
        set({
          authenticated: true,
          role,
          provider,
          profile: { ...base, email: email?.trim() ? email.trim() : base.email },
        })
      },

      logout: () => set({ authenticated: false, provider: null, profile: null }),

      setRole: (role) => {
        if (!ROLES[role]) return
        const base = USERS[role]
        set({ role, profile: { ...base } })
      },

      updateProfile: (patch) =>
        set({ profile: { ...(get().profile ?? USERS[get().role]), ...patch } }),

      currentUser: () => get().profile ?? USERS[get().role] ?? USERS.admin,
    }),
    { name: 'yuna:auth' },
  ),
)
