export type ThemeMode = 'escuro' | 'claro' | 'sistema';
export type AccentId = 'lima' | 'verde' | 'ciano' | 'azul' | 'violeta' | 'rosa' | 'laranja';

export interface ThemePrefs {
  mode: ThemeMode;
  accent: AccentId;
}

export const DEFAULT_THEME: ThemePrefs = { mode: 'escuro', accent: 'lima' };

/** Cores fixas de destaque. O matiz vai para o CSS (data-accent); `figure` é o corpo do bonequinho. */
export const ACCENTS: { id: AccentId; nome: string; swatch: string; figure: string }[] = [
  { id: 'lima', nome: 'Lima', swatch: '#a3e635', figure: '#16a34a' },
  { id: 'verde', nome: 'Esmeralda', swatch: '#34d399', figure: '#059669' },
  { id: 'ciano', nome: 'Ciano', swatch: '#22d3ee', figure: '#0891b2' },
  { id: 'azul', nome: 'Azul', swatch: '#60a5fa', figure: '#2563eb' },
  { id: 'violeta', nome: 'Violeta', swatch: '#a78bfa', figure: '#7c3aed' },
  { id: 'rosa', nome: 'Rosa', swatch: '#f472b6', figure: '#db2777' },
  { id: 'laranja', nome: 'Laranja', swatch: '#fb923c', figure: '#ea580c' },
];

export const MODES: { id: ThemeMode; nome: string }[] = [
  { id: 'escuro', nome: 'Escuro' },
  { id: 'claro', nome: 'Claro' },
  { id: 'sistema', nome: 'Sistema' },
];

const prefersDark = () => window.matchMedia('(prefers-color-scheme: dark)').matches;

export const isDark = (t: ThemePrefs) => (t.mode === 'sistema' ? prefersDark() : t.mode === 'escuro');

/** Aplica o tema no <html> (mesma lógica do script inline do index.html, que evita o flash). */
export function applyTheme(t: ThemePrefs) {
  const dark = isDark(t);
  const root = document.documentElement;
  root.classList.toggle('dark', dark);
  root.dataset.accent = t.accent;
  root.style.colorScheme = dark ? 'dark' : 'light';
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#0a0a0a' : '#f7f7f7');
}
