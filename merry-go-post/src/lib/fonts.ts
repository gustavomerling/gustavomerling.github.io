import { useSyncExternalStore } from 'react';

export type FontCategory = 'sans' | 'serif' | 'display' | 'script' | 'mono';

export const FONT_CATEGORY_LABELS: Record<FontCategory, string> = {
  sans: 'Sem serifa',
  serif: 'Serifada',
  display: 'Display',
  script: 'Manuscrita',
  mono: 'Monoespaçada',
};

/** Curadoria do Google Fonts: a API completa exige chave, então começamos por uma lista fixa. */
export const FONT_CATALOG: { family: string; category: FontCategory }[] = [
  ...[
    'Inter', 'Roboto', 'Open Sans', 'Montserrat', 'Poppins', 'Lato', 'Raleway', 'Nunito', 'Work Sans',
    'DM Sans', 'Manrope', 'Plus Jakarta Sans', 'Outfit', 'Sora', 'Space Grotesk', 'Urbanist', 'Lexend',
    'Figtree', 'Rubik', 'Karla', 'Mulish', 'Barlow', 'Barlow Condensed', 'Archivo', 'League Spartan',
    'Kanit', 'Josefin Sans', 'Fira Sans', 'IBM Plex Sans', 'Source Sans 3', 'Quicksand', 'Onest',
    'Bricolage Grotesque', 'Geologica', 'Exo 2', 'Saira', 'Chakra Petch',
  ].map((family) => ({ family, category: 'sans' as const })),
  ...[
    'Playfair Display', 'Merriweather', 'Lora', 'DM Serif Display', 'Libre Baskerville',
    'Cormorant Garamond', 'EB Garamond', 'Crimson Pro', 'Fraunces', 'Bitter', 'Roboto Slab',
    'Zilla Slab', 'Instrument Serif', 'Alfa Slab One', 'Abril Fatface',
  ].map((family) => ({ family, category: 'serif' as const })),
  ...[
    'Bebas Neue', 'Anton', 'Oswald', 'Archivo Black', 'Syne', 'Unbounded', 'Big Shoulders Display',
    'Righteous', 'Bungee', 'Black Ops One', 'Monoton', 'Titan One', 'Luckiest Guy', 'Orbitron', 'Teko',
    'Fredoka', 'Comfortaa', 'Press Start 2P',
  ].map((family) => ({ family, category: 'display' as const })),
  ...['Caveat', 'Dancing Script', 'Pacifico', 'Satisfy', 'Permanent Marker', 'Lobster', 'Shadows Into Light', 'Kalam'].map(
    (family) => ({ family, category: 'script' as const }),
  ),
  ...['Space Mono', 'JetBrains Mono', 'IBM Plex Mono'].map((family) => ({ family, category: 'mono' as const })),
];

export const DEFAULT_FONTS = { base: 'Inter', highlight: 'Montserrat', ultra: 'Bebas Neue' };

const CSS2 = 'https://fonts.googleapis.com/css2';
const enc = (family: string) => encodeURIComponent(family).replace(/%20/g, '+');

/**
 * O css2 responde 400 se pedimos um peso que a família não tem, então tentamos do
 * mais completo para o mais simples até um carregar.
 */
const VARIANTS = ['ital,wght@0,400;0,700;0,900;1,400;1,700', 'ital,wght@0,400;0,700;1,400;1,700', 'wght@400;700', ''];

const requested = new Set<string>();
let version = 0;
const listeners = new Set<() => void>();

function bump() {
  version++;
  listeners.forEach((l) => l());
}

if (typeof document !== 'undefined' && 'fonts' in document) {
  document.fonts.addEventListener('loadingdone', bump);
}

function addLink(href: string, onError?: () => void) {
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = href;
  // crossorigin permite ao exportador ler as regras @font-face.
  link.crossOrigin = 'anonymous';
  link.onload = () => {
    bump();
    document.fonts.ready.then(bump);
  };
  if (onError) link.onerror = () => {
    link.remove();
    onError();
  };
  document.head.appendChild(link);
}

/** Carrega a família com itálico e pesos 400/700/900 (quando existirem). */
export function ensureFont(family: string) {
  const name = family.trim();
  if (!name || requested.has(name)) return;
  requested.add(name);
  const attempt = (i: number) => {
    const spec = VARIANTS[i];
    addLink(`${CSS2}?family=${enc(name)}${spec ? `:${spec}` : ''}&display=swap`, i < VARIANTS.length - 1 ? () => attempt(i + 1) : undefined);
  };
  attempt(0);
}

export const ensureFonts = (families: string[]) => families.forEach(ensureFont);

/** Muda sempre que alguma fonte termina de carregar: usado para reajustar o texto dos slides. */
export function useFontsVersion() {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => version,
  );
}

export const fontStack = (family: string) => `'${family}', system-ui, sans-serif`;
