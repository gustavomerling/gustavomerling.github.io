import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { DEFAULT_PALETTE } from '../lib/color';
import { DEFAULT_FONTS } from '../lib/fonts';
import { fillPlaceholders } from '../lib/generate';
import { uid } from '../lib/id';
import { collectGarbage } from '../lib/images';
import type { Brand, Client, Post, User } from '../types';

interface DbState {
  users: User[];
  clients: Client[];
  posts: Post[];
  currentUserId: string | null;

  createUser: (name: string) => string;
  login: (id: string) => void;
  logout: () => void;

  createClient: (data: ClientData) => string;
  updateClient: (id: string, recipe: (c: Client) => void) => void;
  deleteClient: (id: string) => void;

  createPost: (clientId: string) => string;
  updatePost: (id: string, recipe: (p: Post) => void) => void;
  /** Adiciona imagens ao post e já preenche os espaços vazios dos slides existentes. */
  addPostImages: (id: string, imageIds: string[]) => void;
  duplicatePost: (id: string) => string | null;
  deletePost: (id: string) => void;
  /** Substitui todos os dados (restauração de backup). */
  replaceAll: (data: Pick<DbState, 'users' | 'clients' | 'posts'>) => void;
}

export type ClientData = Pick<Client, 'name' | 'logos' | 'profile' | 'colors' | 'fonts' | 'favoriteTemplates' | 'hashtags'>;

export const newClientDefaults = (): ClientData => ({
  name: '',
  logos: {},
  profile: { displayName: '', handle: '', posts: '', followers: '', following: '', verified: false },
  colors: { ...DEFAULT_PALETTE },
  fonts: { ...DEFAULT_FONTS },
  favoriteTemplates: [],
  hashtags: '',
});

export const useDb = create<DbState>()(
  persist(
    immer((set, get) => ({
      users: [],
      clients: [],
      posts: [],
      currentUserId: null,

      createUser: (name) => {
        const id = uid();
        set((s) => {
          s.users.push({ id, name: name.trim(), createdAt: Date.now() });
          s.currentUserId = id;
        });
        return id;
      },
      login: (id) => set({ currentUserId: id }),
      logout: () => set({ currentUserId: null }),

      createClient: (data) => {
        const id = uid();
        const userId = get().currentUserId;
        if (!userId) throw new Error('Sem usuário logado');
        set((s) => {
          s.clients.push({ ...data, id, userId, createdAt: Date.now(), updatedAt: Date.now() });
        });
        return id;
      },
      updateClient: (id, recipe) =>
        set((s) => {
          const c = s.clients.find((x) => x.id === id);
          if (c) {
            recipe(c);
            c.updatedAt = Date.now();
          }
        }),
      deleteClient: (id) => {
        set((s) => {
          s.clients = s.clients.filter((c) => c.id !== id);
          s.posts = s.posts.filter((p) => p.clientId !== id);
        });
        runGarbageCollection();
      },

      createPost: (clientId) => {
        const id = uid();
        const count = get().posts.filter((p) => p.clientId === clientId).length;
        set((s) => {
          s.posts.push({
            id,
            clientId,
            title: `Post ${count + 1}`,
            format: '4x5',
            sourceHtml: '',
            imageMode: 'some',
            style: 'design',
            imageIds: [],
            slides: [],
            pagination: { style: 'dots', x: 50, y: 95, color: 'auto' },
            caption: '',
            createdAt: Date.now(),
            updatedAt: Date.now(),
          });
        });
        return id;
      },
      updatePost: (id, recipe) =>
        set((s) => {
          const p = s.posts.find((x) => x.id === id);
          if (p) {
            recipe(p);
            p.updatedAt = Date.now();
          }
        }),
      addPostImages: (id, imageIds) => {
        const cur = get().posts.find((p) => p.id === id);
        if (!cur) return;
        const all = [...cur.imageIds, ...imageIds];
        const slides = fillPlaceholders(cur.slides, all);
        set((s) => {
          const p = s.posts.find((x) => x.id === id)!;
          p.imageIds = all;
          p.slides = slides;
          p.updatedAt = Date.now();
        });
      },
      duplicatePost: (id) => {
        const src = get().posts.find((p) => p.id === id);
        if (!src) return null;
        const copy: Post = structuredClone(src);
        copy.id = uid();
        copy.title = `${src.title} (cópia)`;
        copy.slides.forEach((sl) => (sl.id = uid()));
        copy.createdAt = copy.updatedAt = Date.now();
        set((s) => {
          s.posts.push(copy);
        });
        return copy.id;
      },
      deletePost: (id) => {
        set((s) => {
          s.posts = s.posts.filter((p) => p.id !== id);
        });
        runGarbageCollection();
      },
      replaceAll: (data) => {
        set((s) => {
          s.users = data.users;
          s.clients = data.clients;
          s.posts = data.posts;
          if (!s.users.some((u) => u.id === s.currentUserId)) s.currentUserId = null;
        });
      },
    })),
    {
      name: 'merry-go-post:db',
      version: 2,
      partialize: (s) => ({ users: s.users, clients: s.clients, posts: s.posts, currentUserId: s.currentUserId }),
      migrate: (persisted, version) => migrateDb(persisted as Record<string, unknown>, version) as unknown as DbState,
    },
  ),
);

/** Completa campos que não existiam em versões antigas (também usado ao importar backup). */
export function migrateDb(data: Record<string, unknown>, _version = 0) {
  const clients = (data.clients as Client[] | undefined) ?? [];
  const posts = (data.posts as Post[] | undefined) ?? [];
  clients.forEach((c) => {
    c.hashtags ??= '';
    c.profile ??= newClientDefaults().profile;
  });
  posts.forEach((p) => {
    p.caption ??= '';
    p.style ??= 'design';
  });
  return { ...data, clients, posts, users: (data.users as User[] | undefined) ?? [] };
}

/** Imagens referenciadas por clientes (logos) e posts; o resto pode sair do IndexedDB. */
export function runGarbageCollection() {
  const { clients, posts } = useDb.getState();
  const ids = new Set<string>();
  for (const c of clients) {
    if (c.logos.positive) ids.add(c.logos.positive);
    if (c.logos.negative) ids.add(c.logos.negative);
    if (c.profile.avatar) ids.add(c.profile.avatar);
  }
  for (const p of posts) {
    p.imageIds.forEach((i) => ids.add(i));
    p.slides.forEach((s) =>
      s.images.forEach((i) => {
        if (i.imageId) ids.add(i.imageId);
        if (i.originalId) ids.add(i.originalId);
      }),
    );
  }
  return collectGarbage(ids);
}

export const useCurrentUser = () =>
  useDb((s) => s.users.find((u) => u.id === s.currentUserId) ?? null);

export const brandOf = (c: Pick<Client, 'name' | 'colors' | 'fonts' | 'logos' | 'profile'>): Brand => ({
  colors: c.colors,
  fonts: c.fonts,
  logos: c.logos,
  // Sem nome de exibição, o post usa o nome do cliente.
  profile: { ...c.profile, displayName: c.profile.displayName || c.name },
});
