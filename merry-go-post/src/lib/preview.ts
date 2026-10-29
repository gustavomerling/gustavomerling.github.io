import type { TemplateDef } from '../templates';
import type { Brand, Palette, Slide, SlideContent, SlideRole } from '../types';
import { DEFAULT_PALETTE } from './color';
import { DEMO_IMAGES } from './demoImages';
import { DEFAULT_FONTS, FONT_CATALOG, type FontCategory } from './fonts';
import { newSlideImage } from './generate';

const hsl = (h: number, s: number, l: number) => {
  const a = (s / 100) * Math.min(l / 100, 1 - l / 100);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const c = l / 100 - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    return Math.round(c * 255)
      .toString(16)
      .padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
};

const between = (min: number, max: number) => min + Math.random() * (max - min);

/** Paleta sorteada, mas coerente: primária forte, secundária clara do mesmo tom, destaque do lado oposto do círculo. */
export function randomPalette(): Palette {
  const h = Math.random() * 360;
  return {
    primary: hsl(h, between(55, 85), between(36, 52)),
    secondary: hsl(h + between(-20, 40), between(45, 75), between(84, 92)),
    accent: hsl(h + between(140, 220), between(75, 95), between(50, 60)),
    dark: hsl(h, between(15, 40), between(7, 14)),
    light: hsl(h, between(20, 45), between(95, 98)),
  };
}

/** Nomes de marcas fictícias para as simulações. */
const FAKE_NAMES = ['Café Aurora', 'Nuvem Tech', 'Verde Vivo', 'Studio Faro', 'Pulso Fit', 'Mar Aberto', 'Lume Casa', 'Boa Brasa', 'Trilha Kids', 'Norte Finanças', 'Ateliê Rosa', 'Onda Pet'];

type LogoShape = 'circle' | 'square' | 'diamond' | 'arch';
const SHAPES: LogoShape[] = ['circle', 'square', 'diamond', 'arch'];

const xml = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const svgUrl = (w: number, h: number, body: string) =>
  `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}">${body}</svg>`)}`;

function symbol(shape: LogoShape, cx: number, cy: number, r: number, fill: string, ink: string, letter: string) {
  const mark = {
    circle: `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}"/>`,
    square: `<rect x="${cx - r}" y="${cy - r}" width="${r * 2}" height="${r * 2}" rx="${r * 0.35}" fill="${fill}"/>`,
    diamond: `<rect x="${cx - r * 0.72}" y="${cy - r * 0.72}" width="${r * 1.44}" height="${r * 1.44}" rx="${r * 0.2}" fill="${fill}" transform="rotate(45 ${cx} ${cy})"/>`,
    arch: `<path d="M${cx - r} ${cy + r} V${cy} A${r} ${r} 0 0 1 ${cx + r} ${cy} V${cy + r} Z" fill="${fill}"/>`,
  }[shape];
  return `${mark}<text x="${cx}" y="${cy + r * 0.36}" font-family="Arial, Helvetica, sans-serif" font-weight="800" font-size="${r * 1.05}" text-anchor="middle" fill="${ink}">${xml(letter)}</text>`;
}

/**
 * Logos fictícios (SVG em data: URL, sem IndexedDB): símbolo + nome.
 * Positivo para fundo claro, negativo para fundo escuro; o símbolo sozinho serve de avatar.
 */
export function fakeLogos(name: string, colors: Palette, shape: LogoShape = pick(SHAPES)) {
  const letter = name.charAt(0).toUpperCase();
  const width = 170 + name.length * 34;
  const word = (fill: string) =>
    `<text x="150" y="104" font-family="Arial, Helvetica, sans-serif" font-weight="800" font-size="62" letter-spacing="-1" fill="${fill}">${xml(name)}</text>`;
  return {
    logos: {
      positive: svgUrl(width, 160, symbol(shape, 70, 80, 56, colors.primary, colors.light, letter) + word(colors.dark)),
      negative: svgUrl(width, 160, symbol(shape, 70, 80, 56, colors.accent, colors.dark, letter) + word('#ffffff')),
    },
    avatar: svgUrl(160, 160, `<rect width="160" height="160" fill="${colors.primary}"/>` + symbol(shape, 80, 80, 46, colors.light, colors.primary, letter)),
  };
}

export function demoBrand(colors: Palette = DEFAULT_PALETTE, name = 'Sua Marca'): Brand {
  const fake = fakeLogos(name, colors, 'circle');
  const handle = name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');
  return {
    colors,
    fonts: { ...DEFAULT_FONTS },
    logos: fake.logos,
    profile: { avatar: fake.avatar, displayName: name, handle, posts: '128', followers: '12,5 mil', following: '310', verified: true },
  };
}

const fontsOf = (...cats: FontCategory[]) => FONT_CATALOG.filter((f) => cats.includes(f.category)).map((f) => f.family);

/** Marca inventada: nome, logos, paleta sorteada e trio de fontes plausível (texto legível, títulos com mais personalidade). */
export function randomBrand(): Brand {
  const colors = randomPalette();
  const name = pick(FAKE_NAMES);
  const brand = demoBrand(colors, name);
  const fake = fakeLogos(name, colors);
  return {
    ...brand,
    logos: fake.logos,
    profile: { ...brand.profile, avatar: fake.avatar },
    fonts: { base: pick(fontsOf('sans', 'serif')), highlight: pick(fontsOf('sans', 'serif', 'display')), ultra: pick(fontsOf('display')) },
  };
}

const TITLES = [
  'Como <strong>dobrar</strong> o alcance sem gastar mais',
  'O erro que <strong>quase todo mundo</strong> comete',
  '<mark>Pare</mark> de começar pelo fim',
  '3 hábitos de quem <strong>entrega no prazo</strong>',
  'Menos reunião, <strong>mais resultado</strong>',
  'Você não precisa de <strong>mais ferramentas</strong>',
  'O que ninguém conta sobre <mark>crescer</mark>',
];

const BODIES = [
  '<p>Antes de publicar, pergunte: isso ajuda <strong>quem lê</strong> ou só quem escreve?</p>',
  '<p>Constância vence intensidade. Um post bom por semana bate dez posts às pressas.</p>',
  '<p>Comece pelo problema do cliente, mostre o caminho e feche com <mark>uma ação clara</mark>.</p>',
  '<p>Dados sem contexto não convencem ninguém. Conte a história por trás do número.</p>',
  '<p>Revise uma vez no dia seguinte. O texto fica <strong>pela metade</strong> e o dobro mais claro.</p>',
];

const LISTS = [
  '<ul><li>Comece pelo problema</li><li>Mostre o caminho</li><li>Feche com uma ação</li></ul>',
  '<ul><li>Defina <strong>um</strong> objetivo</li><li>Meça toda semana</li><li>Ajuste sem dó</li><li>Comemore o progresso</li></ul>',
];

const pick = <T,>(list: T[]) => list[Math.floor(Math.random() * list.length)];

export function randomContent(role: SlideRole): SlideContent {
  if (role === 'list') return { title: pick(TITLES), body: pick(LISTS) };
  if (role === 'quote') return { title: '“A simplicidade é o último grau de <strong>sofisticação</strong>.”', body: '<p>— Leonardo da Vinci</p>' };
  return { title: pick(TITLES), body: pick(BODIES) };
}

/** Slide de prévia para um template sendo editado (ícones vêm do próprio template). */
export function previewSlide(t: TemplateDef, content: SlideContent, withImages: boolean, imageOffset = 0): Slide {
  return {
    id: `preview-${t.id}`,
    role: t.roles[0] ?? 'content',
    templateId: t.id,
    content,
    boxes: {},
    images: t.images.map((_, i) => newSlideImage(withImages ? DEMO_IMAGES[(i + imageOffset) % DEMO_IMAGES.length] : null)),
    elements: (t.icons ?? []).map((ic, i) => ({ ...ic, id: `tpl-icon-${i}`, fromTemplate: true })),
  };
}
