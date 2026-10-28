import { useEffect } from 'react';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { uid } from '../lib/id';

export type Theme = 'system' | 'light' | 'dark';

interface UiState {
  theme: Theme;
  showGrid: boolean;
  snapToGrid: boolean;
  showGuides: boolean;
  setTheme: (t: Theme) => void;
  toggle: (key: 'showGrid' | 'snapToGrid' | 'showGuides') => void;
}

/** Preferências da interface (por navegador). */
export const useUi = create<UiState>()(
  persist(
    (set) => ({
      theme: 'system',
      showGrid: false,
      snapToGrid: false,
      showGuides: false,
      setTheme: (theme) => set({ theme }),
      toggle: (key) => set((s) => ({ [key]: !s[key] }) as Partial<UiState>),
    }),
    { name: 'merry-go-post:ui' },
  ),
);

/** Aplica o tema no <html>, acompanhando o sistema quando estiver em "automático". */
export function useApplyTheme() {
  const theme = useUi((s) => s.theme);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => document.documentElement.classList.toggle('dark', theme === 'dark' || (theme === 'system' && mq.matches));
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, [theme]);
}

// ——— Toasts ———

export interface Toast {
  id: string;
  message: string;
  tone: 'info' | 'success' | 'error';
}

interface ToastState {
  toasts: Toast[];
  push: (message: string, tone?: Toast['tone']) => void;
  dismiss: (id: string) => void;
}

export const useToasts = create<ToastState>()((set, get) => ({
  toasts: [],
  push: (message, tone = 'success') => {
    const id = uid();
    set((s) => ({ toasts: [...s.toasts, { id, message, tone }] }));
    setTimeout(() => get().dismiss(id), 3200);
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

export const toast = (message: string, tone?: Toast['tone']) => useToasts.getState().push(message, tone);
