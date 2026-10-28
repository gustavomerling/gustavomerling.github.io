import { useEffect } from 'react';
import { isHex } from './color';
import { logoSvg } from '../components/MerryLogo';

export const DEFAULT_SYSTEM_COLOR = '#7c3aed';

/**
 * Tons "600" do Tailwind: desenhados para botão/link, com contraste e saturação equilibrados.
 * A cor do cliente é aproximada para a família de matiz mais próxima, em vez de usada crua
 * (um #ff0000 puro fica agressivo como cor de interface).
 */
const PALETTE: [string, string][] = [
  ['Vermelho', '#dc2626'],
  ['Laranja', '#ea580c'],
  ['Âmbar', '#d97706'],
  ['Amarelo', '#ca8a04'],
  ['Lima', '#65a30d'],
  ['Verde', '#16a34a'],
  ['Esmeralda', '#059669'],
  ['Turquesa', '#0d9488'],
  ['Ciano', '#0891b2'],
  ['Céu', '#0284c7'],
  ['Azul', '#2563eb'],
  ['Índigo', '#4f46e5'],
  ['Violeta', '#7c3aed'],
  ['Roxo', '#9333ea'],
  ['Fúcsia', '#c026d3'],
  ['Rosa', '#db2777'],
  ['Rosé', '#e11d48'],
];
const NEUTRAL_COOL: [string, string] = ['Ardósia', '#475569'];
const NEUTRAL_WARM: [string, string] = ['Pedra', '#57534e'];

/** sRGB hex → OKLCH (L 0–1, C, h em graus). */
function oklch(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const c = v / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  return { L, C: Math.hypot(A, B), h: ((Math.atan2(B, A) * 180) / Math.PI + 360) % 360 };
}

const PALETTE_HUES = PALETTE.map(([name, hex]) => ({ name, hex, h: oklch(hex).h }));

/** A cor "bonita" mais próxima: mesma família de matiz, no tom 600 do Tailwind. */
export function harmonize(color: string): { name: string; hex: string } {
  if (!isHex(color)) return { name: 'Violeta', hex: DEFAULT_SYSTEM_COLOR };
  const { C, h } = oklch(color);
  // Quase sem saturação (cinzas, preto, branco): neutro frio ou quente.
  if (C < 0.035) {
    const [name, hex] = h > 180 && h < 300 ? NEUTRAL_COOL : NEUTRAL_WARM;
    return { name, hex };
  }
  let best = PALETTE_HUES[0];
  let dist = 360;
  for (const p of PALETTE_HUES) {
    const d = Math.min(Math.abs(p.h - h), 360 - Math.abs(p.h - h));
    if (d < dist) {
      dist = d;
      best = p;
    }
  }
  return { name: best.name, hex: best.hex };
}

/** Texto branco ou quase preto, o que tiver mais contraste sobre a cor. */
function foregroundFor(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  const lin = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  const l = 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2];
  return 1.05 / (l + 0.05) >= (l + 0.05) / 0.0556 ? '#ffffff' : '#111111';
}

function apply(color: string) {
  const c = isHex(color) ? color : DEFAULT_SYSTEM_COLOR;
  const fg = foregroundFor(c);
  const root = document.documentElement.style;
  root.setProperty('--brand', c);
  root.setProperty('--brand-fg', fg);
  // O favicon acompanha a cor do sistema.
  let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
  if (!link) {
    link = document.createElement('link');
    link.rel = 'icon';
    document.head.appendChild(link);
  }
  link.href = `data:image/svg+xml,${encodeURIComponent(logoSvg(c))}`;
}

/** A primária do cliente aberto (harmonizada) vira a cor da interface. */
export function useSystemColor(clientPrimary: string | null | undefined) {
  useEffect(() => {
    apply(clientPrimary ? harmonize(clientPrimary).hex : DEFAULT_SYSTEM_COLOR);
  }, [clientPrimary]);
}
