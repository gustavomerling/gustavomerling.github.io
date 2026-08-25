import { create } from 'zustand'
import { persist } from 'zustand/middleware'

import { CLIENTS, POSTS } from '@/lib/mock-data'

let seq = 100

function nextId(prefix) {
  seq += 1
  return `${prefix}-${seq}`
}

// Cadastros e conteúdo vivem no localStorage. "Restaurar dados" volta ao seed.
export const useDataStore = create(
  persist(
    (set, get) => ({
      clients: CLIENTS,
      posts: POSTS,

      addClient: (client) =>
        set({
          clients: [
            {
              id: nextId('c'),
              status: 'onboarding',
              plan: 'Conteúdo social',
              postsMonth: 0,
              monthly: 0,
              color: '#13523d',
              since: new Date().toISOString().slice(0, 10),
              ...client,
            },
            ...get().clients,
          ],
        }),

      updateClient: (id, patch) =>
        set({
          clients: get().clients.map((c) => (c.id === id ? { ...c, ...patch } : c)),
        }),

      removeClient: (id) =>
        set({
          clients: get().clients.filter((c) => c.id !== id),
          posts: get().posts.filter((p) => p.clientId !== id),
        }),

      addPost: (post) =>
        set({
          posts: [
            {
              id: nextId('p'),
              status: 'rascunho',
              platform: 'instagram',
              format: 'feed',
              creative: 'verde',
              caption: '',
              hashtags: '',
              notes: '',
              metrics: { reach: 0, likes: 0, comments: 0, saves: 0 },
              ...post,
            },
            ...get().posts,
          ],
        }),

      updatePost: (id, patch) =>
        set({
          posts: get().posts.map((p) => (p.id === id ? { ...p, ...patch } : p)),
        }),

      removePost: (id) => set({ posts: get().posts.filter((p) => p.id !== id) }),

      setPostStatus: (id, status) =>
        set({
          posts: get().posts.map((p) => (p.id === id ? { ...p, status } : p)),
        }),

      resetData: () => set({ clients: CLIENTS, posts: POSTS }),
    }),
    {
      name: 'yuna:data',
      // Subir a versão faz o seed novo entrar mesmo em navegador que já tem
      // dados salvos. O que o usuário criou (id fora do seed) é preservado.
      version: 2,
      migrate: (persisted) => {
        const seedPostIds = new Set(POSTS.map((p) => p.id))
        const seedClientIds = new Set(CLIENTS.map((c) => c.id))
        const ownPosts = (persisted?.posts ?? []).filter((p) => !seedPostIds.has(p.id))
        const ownClients = (persisted?.clients ?? []).filter((c) => !seedClientIds.has(c.id))
        return {
          ...persisted,
          clients: [...ownClients, ...CLIENTS],
          posts: [...ownPosts, ...POSTS],
        }
      },
    },
  ),
)
