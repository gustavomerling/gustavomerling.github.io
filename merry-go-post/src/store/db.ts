import { useMemo } from 'react';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { DEFAULT_PALETTE } from '../lib/color';
import { DEFAULT_FONTS } from '../lib/fonts';
import { applyTemplate, fillPlaceholders } from '../lib/generate';
import { uid } from '../lib/id';
import { collectGarbage } from '../lib/images';
import { CUSTOM_PREFIX, FALLBACK_TEMPLATE_ID, getTemplate, setCustomTemplates, type TemplateDef } from '../templates';
import type { Brand, Client, Post, User } from '../types';

/** Template criado (ou clonado) pelo usuário; vale para todos os clientes dele. */
export interface CustomTemplate extends TemplateDef {
  userId: string;
  /** Template de origem do clone. */
  basedOn?: string;
  createdAt: number;
  updatedAt: number;
}

interface DbState {
  users: User[];
  clients: Client[];
  posts: Post[];
  templates: CustomTemplate[];
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

  /** Novo template do usuário, em branco ou clonado de `from`. */
  createTemplate: (from?: TemplateDef) => string;
  updateTemplate: (id: string, recipe: (t: CustomTemplate) => void) => void;
  /** Apaga o template; os slides que o usavam voltam para o template de origem (ou o padrão). */
  deleteTemplate: (id: string) => void;

  /** Substitui todos os dados (restauração de backup). */
  replaceAll: (data: Pick<DbState, 'users' | 'clients' | 'posts' | 'templates'>) => void;
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
      templates: [],
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
      createTemplate: (from) => {
        const id = `${CUSTOM_PREFIX}${uid()}`;
        const userId = get().currentUserId;
        if (!userId) throw new Error('Sem usuário logado');
        const base: TemplateDef = from ? structuredClone(from) : blankTemplate();
        set((s) => {
          s.templates.push({
            ...base,
            id,
            name: from ? `${from.name} (cópia)` : base.name,
            style: base.style ?? (from?.id.startsWith('social-') ? 'social' : 'design'),
            userId,
            // Clone de clone aponta para o padrão original.
            basedOn: from ? ((from as Partial<CustomTemplate>).basedOn ?? from.id) : undefined,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          });
        });
        return id;
      },
      updateTemplate: (id, recipe) =>
        set((s) => {
          const t = s.templates.find((x) => x.id === id);
          if (t) {
            recipe(t);
            t.updatedAt = Date.now();
          }
        }),
      deleteTemplate: (id) => {
        const gone = get().templates.find((t) => t.id === id);
        if (!gone) return;
        set((s) => {
          s.templates = s.templates.filter((t) => t.id !== id);
        });
        // Já fora do registro: getTemplate devolve o de origem ou o padrão.
        const fallback = getTemplate(gone.basedOn ?? FALLBACK_TEMPLATE_ID);
        set((s) => {
          s.clients.forEach((c) => (c.favoriteTemplates = c.favoriteTemplates.filter((f) => f !== id)));
          s.posts.forEach((p) => {
            if (!p.slides.some((sl) => sl.templateId === id)) return;
            p.slides = p.slides.map((sl) => (sl.templateId === id ? applyTemplate(sl, fallback) : sl));
          });
        });
      },
      replaceAll: (data) => {
        set((s) => {
          s.users = data.users;
          s.clients = data.clients;
          s.posts = data.posts;
          s.templates = data.templates;
          if (!s.users.some((u) => u.id === s.currentUserId)) s.currentUserId = null;
        });
      },
    })),
    {
      name: 'merry-go-post:db',
      version: 3,
      partialize: (s) => ({ users: s.users, clients: s.clients, posts: s.posts, templates: s.templates, currentUserId: s.currentUserId }),
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
  return { ...data, clients, posts, users: (data.users as User[] | undefined) ?? [], templates: (data.templates as CustomTemplate[] | undefined) ?? [] };
}

/** Ponto de partida de um template novo: título e texto, fundo claro. */
function blankTemplate(): TemplateDef {
  return {
    id: '',
    name: 'Novo template',
    style: 'design',
    roles: ['content'],
    bg: 'light',
    capacity: 400,
    images: [],
    boxes: [
      { key: 'title', x: 8, y: 10, w: 84, h: 22, size: 72, font: 'highlight', weight: 800, valign: 'bottom', color: 'auto', emphasis: 'accent', lineHeight: 1.05 },
      { key: 'body', x: 8, y: 36, w: 84, h: 54, size: 40, font: 'base', color: 'auto', emphasis: 'primary', lineHeight: 1.4 },
    ],
  };
}

// Mantém o registro de templates (getTemplate) em dia com o banco.
const syncTemplates = (s: DbState) => setCustomTemplates(s.templates, s.templates.filter((t) => t.userId === s.currentUserId));
syncTemplates(useDb.getState());
useDb.subscribe((s, prev) => {
  if (s.templates !== prev.templates || s.currentUserId !== prev.currentUserId) syncTemplates(s);
});

/** Templates criados pelo usuário logado, mais recentes primeiro. */
export function useMyTemplates() {
  const templates = useDb((s) => s.templates);
  const userId = useDb((s) => s.currentUserId);
  return useMemo(() => templates.filter((t) => t.userId === userId).sort((a, b) => b.updatedAt - a.updatedAt), [templates, userId]);
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
