import type { ColorRef, ColorRole, FixedColor, Palette } from '../types';

export const COLOR_ROLES: ColorRole[] = ['primary', 'secondary', 'accent', 'dark', 'light'];

export const COLOR_LABELS: Record<ColorRole, string> = {
  primary: 'Primária',
  secondary: 'Secundária',
  accent: 'Destaque',
  dark: 'Escura',
  light: 'Clara',
};

export const DEFAULT_PALETTE: Palette = {
  primary: '#4f46e5',
  secondary: '#e0e7ff',
  accent: '#f59e0b',
  dark: '#111827',
  light: '#ffffff',
};

/** Toda marca tem preto e branco absolutos, além das cinco cores da paleta. */
export const FIXED_COLORS: Record<FixedColor, { hex: string; label: string }> = {
  black: { hex: '#000000', label: 'Preto' },
  white: { hex: '#ffffff', label: 'Branco' },
};

export const resolveColor = (ref: ColorRef, palette: Palette) =>
  ref.startsWith('#') ? ref : ref === 'black' || ref === 'white' ? FIXED_COLORS[ref].hex : palette[ref as ColorRole];

function luminance(hex: string) {
  const m = hex.replace('#', '');
  const full = m.length === 3 ? m.split('').map((c) => c + c).join('') : m.slice(0, 6);
  const n = parseInt(full, 16);
  if (Number.isNaN(n)) return 0.5;
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
}

const contrast = (a: string, b: string) => {
  const [l1, l2] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
};

/** Papel (dark/light) com melhor contraste sobre o fundo. */
export const textRoleOn = (bgHex: string, palette: Palette): ColorRole =>
  contrast(bgHex, palette.light) >= contrast(bgHex, palette.dark) ? 'light' : 'dark';

export const isHex = (v: string) => /^#[0-9a-f]{6}$/i.test(v);
