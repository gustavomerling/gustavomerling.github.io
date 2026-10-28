import type { ColorRef, FontRole, IconElement, PostStyle, SlideRole, TextKey } from '../types';

/** Todas as medidas de posição estão em % do slide; tamanhos de fonte em px num slide de 1080 de largura. */
export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface TextBoxDef extends Rect {
  key: TextKey;
  size: number;
  font: FontRole;
  weight?: number;
  align?: 'left' | 'center' | 'right';
  valign?: 'top' | 'center' | 'bottom';
  /** 'auto' = contraste com o fundo do slide. */
  color?: ColorRef | 'auto';
  /** Cor do <strong> (destaque). */
  emphasis?: ColorRef;
  uppercase?: boolean;
  italic?: boolean;
  lineHeight?: number;
  /** Em em. */
  letterSpacing?: number;
}

export interface ImageSlotDef extends Rect {
  radius?: number;
  overlay?: { kind: 'gradient' | 'solid'; color: ColorRef; opacity: number };
}

export type DecorationDef =
  | (Rect & { kind: 'rect'; color: ColorRef; radius?: number; opacity?: number })
  | { kind: 'glyph'; x: number; y: number; size: number; text: string; color: ColorRef; font: FontRole }
  | { kind: 'index'; x: number; y: number; size: number; color: ColorRef; font: FontRole }
  /** Avatar + nome + selo + @, em linha (estilo post) ou empilhado e centralizado (estilo perfil). */
  | { kind: 'profile'; x: number; y: number; w: number; size: number; color: ColorRef | 'auto'; muted?: ColorRef; layout: 'row' | 'stacked' }
  /** Linha com posts / seguidores / seguindo. */
  | { kind: 'stats'; x: number; y: number; w: number; size: number; color: ColorRef | 'auto'; muted?: ColorRef };

export interface LogoDef {
  x: number;
  y: number;
  w: number;
  h: number;
  align?: 'left' | 'center' | 'right';
  /** Tom do que está por baixo do logo; padrão = tom do slide. */
  tone?: 'dark' | 'light';
}

export interface TemplateDef {
  id: string;
  name: string;
  roles: SlideRole[];
  bg: ColorRef;
  /** Tom forçado (templates com imagem de fundo). */
  tone?: 'dark' | 'light';
  /** Quantos caracteres (título + corpo) cabem confortavelmente. */
  capacity: number;
  /** O layout fica vazio sem título: não é sorteado para slides só com corpo. */
  needsTitle?: boolean;
  images: ImageSlotDef[];
  boxes: TextBoxDef[];
  decorations?: DecorationDef[];
  logo?: LogoDef;
  icons?: Omit<IconElement, 'id' | 'fromTemplate'>[];
}

const FULL: Rect = { x: 0, y: 0, w: 100, h: 100 };

export const TEMPLATES: TemplateDef[] = [
  // ——— Capas ———
  {
    id: 'cover-image-full',
    needsTitle: true,
    name: 'Capa · Imagem cheia',
    roles: ['cover'],
    bg: 'dark',
    tone: 'dark',
    capacity: 160,
    images: [{ ...FULL, overlay: { kind: 'gradient', color: 'dark', opacity: 0.85 } }],
    boxes: [
      { key: 'title', x: 8, y: 50, w: 84, h: 34, size: 96, font: 'highlight', weight: 800, valign: 'bottom', color: 'light', emphasis: 'accent', lineHeight: 1.05 },
      { key: 'body', x: 8, y: 85, w: 84, h: 9, size: 34, font: 'base', color: 'light' },
    ],
    logo: { x: 8, y: 5, w: 22, h: 7, tone: 'dark' },
  },
  {
    id: 'cover-solid',
    needsTitle: true,
    name: 'Capa · Cor sólida',
    roles: ['cover'],
    bg: 'primary',
    capacity: 180,
    images: [],
    decorations: [{ kind: 'rect', x: 8, y: 20, w: 14, h: 1.2, color: 'accent', radius: 99 }],
    boxes: [
      { key: 'title', x: 8, y: 24, w: 84, h: 46, size: 110, font: 'highlight', weight: 800, color: 'auto', emphasis: 'accent', lineHeight: 1.02 },
      { key: 'body', x: 8, y: 72, w: 70, h: 13, size: 36, font: 'base', color: 'auto' },
    ],
    logo: { x: 8, y: 87, w: 22, h: 7 },
    icons: [{ icon: 'ph:arrow-right-bold', x: 87, y: 90.5, size: 9, rotate: 0, color: 'accent' }],
  },
  {
    id: 'cover-split',
    needsTitle: true,
    name: 'Capa · Dividida',
    roles: ['cover'],
    bg: 'light',
    capacity: 150,
    images: [{ x: 0, y: 0, w: 100, h: 54 }],
    boxes: [
      { key: 'title', x: 8, y: 58, w: 84, h: 26, size: 84, font: 'highlight', weight: 800, color: 'primary', emphasis: 'accent', lineHeight: 1.05 },
      { key: 'body', x: 8, y: 85, w: 84, h: 9, size: 32, font: 'base', color: 'dark' },
    ],
    logo: { x: 70, y: 4, w: 22, h: 6, align: 'right', tone: 'dark' },
  },
  {
    id: 'cover-frame',
    needsTitle: true,
    name: 'Capa · Moldura',
    roles: ['cover'],
    bg: 'dark',
    capacity: 140,
    images: [{ x: 8, y: 8, w: 84, h: 56, radius: 36 }],
    boxes: [
      { key: 'title', x: 8, y: 67, w: 84, h: 21, size: 80, font: 'highlight', weight: 800, color: 'light', emphasis: 'accent', lineHeight: 1.05 },
      { key: 'body', x: 8, y: 89, w: 60, h: 6, size: 30, font: 'base', color: 'light' },
    ],
    logo: { x: 70, y: 89, w: 22, h: 6, align: 'right' },
  },
  // ——— Texto ———
  {
    id: 'text-classic',
    name: 'Texto · Clássico',
    roles: ['content', 'quote'],
    bg: 'light',
    capacity: 560,
    images: [],
    decorations: [{ kind: 'rect', x: 8, y: 35, w: 10, h: 0.7, color: 'accent', radius: 99 }],
    boxes: [
      { key: 'title', x: 8, y: 10, w: 84, h: 23, size: 72, font: 'highlight', weight: 800, valign: 'bottom', color: 'primary', emphasis: 'accent', lineHeight: 1.05 },
      { key: 'body', x: 8, y: 39, w: 84, h: 50, size: 40, font: 'base', color: 'dark', emphasis: 'primary', lineHeight: 1.4 },
    ],
  },
  {
    id: 'text-centered',
    name: 'Texto · Centralizado',
    roles: ['content', 'quote', 'closing'],
    bg: 'primary',
    capacity: 420,
    images: [],
    boxes: [
      { key: 'title', x: 10, y: 14, w: 80, h: 28, size: 72, font: 'highlight', weight: 800, align: 'center', valign: 'bottom', color: 'auto', emphasis: 'accent', lineHeight: 1.05 },
      { key: 'body', x: 10, y: 46, w: 80, h: 40, size: 40, font: 'base', align: 'center', color: 'auto', emphasis: 'accent', lineHeight: 1.4 },
    ],
  },
  {
    id: 'statement',
    needsTitle: true,
    name: 'Frase de impacto',
    roles: ['content', 'quote', 'cover'],
    bg: 'accent',
    capacity: 150,
    images: [],
    boxes: [
      { key: 'title', x: 8, y: 12, w: 84, h: 66, size: 124, font: 'ultra', valign: 'center', color: 'auto', emphasis: 'primary', lineHeight: 1, uppercase: true },
      { key: 'body', x: 8, y: 80, w: 84, h: 12, size: 34, font: 'base', color: 'auto' },
    ],
  },
  {
    id: 'quote',
    needsTitle: true,
    name: 'Citação',
    roles: ['quote', 'content'],
    bg: 'dark',
    capacity: 280,
    images: [],
    decorations: [{ kind: 'glyph', x: 6, y: 4, size: 340, text: '“', color: 'accent', font: 'highlight' }],
    boxes: [
      { key: 'title', x: 8, y: 26, w: 84, h: 48, size: 58, font: 'highlight', weight: 700, italic: true, valign: 'center', color: 'light', emphasis: 'accent', lineHeight: 1.2 },
      { key: 'body', x: 8, y: 77, w: 84, h: 14, size: 32, font: 'base', color: 'accent' },
    ],
  },
  // ——— Imagem + texto ———
  {
    id: 'image-top',
    name: 'Imagem no topo',
    roles: ['content', 'quote'],
    bg: 'light',
    capacity: 300,
    images: [{ x: 0, y: 0, w: 100, h: 46 }],
    boxes: [
      { key: 'title', x: 8, y: 50, w: 84, h: 15, size: 60, font: 'highlight', weight: 800, color: 'primary', emphasis: 'accent', lineHeight: 1.05 },
      { key: 'body', x: 8, y: 66, w: 84, h: 26, size: 36, font: 'base', color: 'dark', emphasis: 'primary', lineHeight: 1.4 },
    ],
  },
  {
    id: 'image-bottom',
    name: 'Imagem embaixo',
    roles: ['content'],
    bg: 'primary',
    capacity: 280,
    images: [{ x: 8, y: 50, w: 84, h: 42, radius: 28 }],
    boxes: [
      { key: 'title', x: 8, y: 7, w: 84, h: 16, size: 62, font: 'highlight', weight: 800, valign: 'bottom', color: 'auto', emphasis: 'accent', lineHeight: 1.05 },
      { key: 'body', x: 8, y: 25, w: 84, h: 22, size: 36, font: 'base', color: 'auto', emphasis: 'accent', lineHeight: 1.4 },
    ],
  },
  {
    id: 'image-left',
    name: 'Imagem lateral',
    roles: ['content', 'list'],
    bg: 'light',
    capacity: 300,
    images: [{ x: 0, y: 0, w: 44, h: 100 }],
    boxes: [
      { key: 'title', x: 50, y: 10, w: 44, h: 30, size: 56, font: 'highlight', weight: 800, valign: 'bottom', color: 'primary', emphasis: 'accent', lineHeight: 1.05 },
      { key: 'body', x: 50, y: 43, w: 44, h: 48, size: 32, font: 'base', color: 'dark', emphasis: 'primary', lineHeight: 1.4 },
    ],
  },
  {
    id: 'image-card',
    name: 'Imagem com caixa',
    roles: ['content', 'quote'],
    bg: 'dark',
    tone: 'light',
    capacity: 260,
    images: [FULL],
    decorations: [{ kind: 'rect', x: 6, y: 56, w: 88, h: 38, color: 'light', radius: 32, opacity: 0.96 }],
    boxes: [
      { key: 'title', x: 11, y: 60, w: 78, h: 12, size: 52, font: 'highlight', weight: 800, color: 'primary', emphasis: 'accent', lineHeight: 1.05 },
      { key: 'body', x: 11, y: 73, w: 78, h: 18, size: 32, font: 'base', color: 'dark', emphasis: 'primary', lineHeight: 1.35 },
    ],
  },
  {
    id: 'image-overlay',
    name: 'Imagem com sobreposição',
    roles: ['content', 'quote', 'closing'],
    bg: 'dark',
    tone: 'dark',
    capacity: 300,
    images: [{ ...FULL, overlay: { kind: 'solid', color: 'dark', opacity: 0.55 } }],
    boxes: [
      { key: 'title', x: 10, y: 22, w: 80, h: 30, size: 72, font: 'highlight', weight: 800, align: 'center', valign: 'bottom', color: 'light', emphasis: 'accent', lineHeight: 1.05 },
      { key: 'body', x: 10, y: 55, w: 80, h: 28, size: 36, font: 'base', align: 'center', color: 'light', emphasis: 'accent', lineHeight: 1.4 },
    ],
  },
  {
    id: 'two-images',
    name: 'Duas imagens',
    roles: ['content'],
    bg: 'light',
    capacity: 260,
    images: [
      { x: 8, y: 7, w: 41, h: 46, radius: 24 },
      { x: 51, y: 7, w: 41, h: 46, radius: 24 },
    ],
    boxes: [
      { key: 'title', x: 8, y: 57, w: 84, h: 14, size: 56, font: 'highlight', weight: 800, color: 'primary', emphasis: 'accent', lineHeight: 1.05 },
      { key: 'body', x: 8, y: 72, w: 84, h: 20, size: 34, font: 'base', color: 'dark', emphasis: 'primary', lineHeight: 1.4 },
    ],
  },
  // ——— Listas ———
  {
    id: 'list-classic',
    name: 'Lista',
    roles: ['list', 'content'],
    bg: 'light',
    capacity: 520,
    images: [],
    boxes: [
      { key: 'title', x: 8, y: 8, w: 84, h: 18, size: 64, font: 'highlight', weight: 800, valign: 'bottom', color: 'primary', emphasis: 'accent', lineHeight: 1.05 },
      { key: 'body', x: 8, y: 30, w: 84, h: 62, size: 38, font: 'base', color: 'dark', emphasis: 'primary', lineHeight: 1.4 },
    ],
  },
  {
    id: 'list-card',
    needsTitle: true,
    name: 'Lista em card',
    roles: ['list', 'content'],
    bg: 'primary',
    capacity: 440,
    images: [],
    decorations: [{ kind: 'rect', x: 6, y: 28, w: 88, h: 64, color: 'light', radius: 36 }],
    boxes: [
      { key: 'title', x: 8, y: 7, w: 84, h: 18, size: 60, font: 'highlight', weight: 800, valign: 'bottom', color: 'auto', emphasis: 'accent', lineHeight: 1.05 },
      { key: 'body', x: 12, y: 32, w: 76, h: 56, size: 36, font: 'base', color: 'dark', emphasis: 'primary', lineHeight: 1.4 },
    ],
  },
  {
    id: 'number-big',
    name: 'Número em destaque',
    roles: ['content', 'list'],
    bg: 'secondary',
    capacity: 380,
    images: [],
    decorations: [{ kind: 'index', x: 8, y: 6, size: 230, color: 'accent', font: 'ultra' }],
    boxes: [
      { key: 'title', x: 8, y: 34, w: 84, h: 18, size: 60, font: 'highlight', weight: 800, color: 'auto', emphasis: 'primary', lineHeight: 1.05 },
      { key: 'body', x: 8, y: 54, w: 84, h: 38, size: 36, font: 'base', color: 'auto', emphasis: 'primary', lineHeight: 1.4 },
    ],
  },
  {
    id: 'stripe-top',
    needsTitle: true,
    name: 'Faixa',
    roles: ['content', 'list'],
    bg: 'light',
    capacity: 480,
    images: [],
    decorations: [{ kind: 'rect', x: 0, y: 0, w: 100, h: 31, color: 'primary' }],
    boxes: [
      { key: 'title', x: 8, y: 6, w: 84, h: 22, size: 64, font: 'highlight', weight: 800, valign: 'bottom', color: 'light', emphasis: 'accent', lineHeight: 1.05 },
      { key: 'body', x: 8, y: 36, w: 84, h: 55, size: 38, font: 'base', color: 'dark', emphasis: 'primary', lineHeight: 1.4 },
    ],
  },
  // ——— Formato de post (usa o perfil social do cliente) ———
  {
    id: 'social-text',
    name: 'Post · Texto',
    roles: ['content', 'quote', 'cover', 'closing'],
    bg: 'light',
    capacity: 420,
    images: [],
    decorations: [{ kind: 'profile', x: 8, y: 8, w: 84, size: 120, color: 'dark', muted: '#71767b', layout: 'row' }],
    boxes: [
      { key: 'title', x: 8, y: 19, w: 84, h: 14, size: 54, font: 'base', weight: 700, valign: 'bottom', color: 'dark', emphasis: 'primary', lineHeight: 1.2 },
      { key: 'body', x: 8, y: 35, w: 84, h: 56, size: 44, font: 'base', color: 'dark', emphasis: 'primary', lineHeight: 1.4 },
    ],
  },
  {
    id: 'social-image',
    name: 'Post · Com imagem',
    roles: ['content', 'cover'],
    bg: 'light',
    capacity: 240,
    images: [{ x: 8, y: 50, w: 84, h: 42, radius: 28 }],
    decorations: [{ kind: 'profile', x: 8, y: 6, w: 84, size: 110, color: 'dark', muted: '#71767b', layout: 'row' }],
    boxes: [
      { key: 'title', x: 8, y: 17, w: 84, h: 12, size: 46, font: 'base', weight: 700, valign: 'bottom', color: 'dark', emphasis: 'primary', lineHeight: 1.2 },
      { key: 'body', x: 8, y: 30.5, w: 84, h: 17, size: 36, font: 'base', color: 'dark', emphasis: 'primary', lineHeight: 1.4 },
    ],
  },
  {
    id: 'social-profile',
    needsTitle: true,
    name: 'Capa · Perfil',
    roles: ['cover', 'closing'],
    bg: 'light',
    capacity: 160,
    images: [],
    decorations: [
      { kind: 'profile', x: 8, y: 7, w: 84, size: 260, color: 'dark', muted: '#71767b', layout: 'stacked' },
      { kind: 'stats', x: 8, y: 42, w: 84, size: 34, color: 'dark', muted: '#71767b' },
      { kind: 'rect', x: 8, y: 52, w: 84, h: 0.25, color: '#cfd9de' },
    ],
    boxes: [
      { key: 'title', x: 8, y: 56, w: 84, h: 26, size: 72, font: 'highlight', weight: 800, align: 'center', color: 'primary', emphasis: 'accent', lineHeight: 1.05 },
      { key: 'body', x: 8, y: 83, w: 84, h: 10, size: 32, font: 'base', align: 'center', color: 'dark' },
    ],
  },
  {
    id: 'social-text-brand',
    name: 'Post · Texto (cor)',
    roles: ['content', 'quote', 'cover', 'closing'],
    bg: 'primary',
    capacity: 420,
    images: [],
    decorations: [{ kind: 'profile', x: 8, y: 8, w: 84, size: 120, color: 'auto', layout: 'row' }],
    boxes: [
      { key: 'title', x: 8, y: 19, w: 84, h: 14, size: 54, font: 'base', weight: 700, valign: 'bottom', color: 'auto', emphasis: 'accent', lineHeight: 1.2 },
      { key: 'body', x: 8, y: 35, w: 84, h: 56, size: 44, font: 'base', color: 'auto', emphasis: 'accent', lineHeight: 1.4 },
    ],
  },
  {
    id: 'social-image-brand',
    name: 'Post · Com imagem (cor)',
    roles: ['content', 'cover'],
    bg: 'primary',
    capacity: 240,
    images: [{ x: 8, y: 50, w: 84, h: 42, radius: 28 }],
    decorations: [{ kind: 'profile', x: 8, y: 6, w: 84, size: 110, color: 'auto', layout: 'row' }],
    boxes: [
      { key: 'title', x: 8, y: 17, w: 84, h: 12, size: 46, font: 'base', weight: 700, valign: 'bottom', color: 'auto', emphasis: 'accent', lineHeight: 1.2 },
      { key: 'body', x: 8, y: 30.5, w: 84, h: 17, size: 36, font: 'base', color: 'auto', emphasis: 'accent', lineHeight: 1.4 },
    ],
  },
  {
    id: 'social-profile-brand',
    name: 'Capa · Perfil (cor)',
    needsTitle: true,
    roles: ['cover', 'closing'],
    bg: 'primary',
    capacity: 160,
    images: [],
    decorations: [
      { kind: 'profile', x: 8, y: 7, w: 84, size: 260, color: 'auto', layout: 'stacked' },
      { kind: 'stats', x: 8, y: 42, w: 84, size: 34, color: 'auto' },
      { kind: 'rect', x: 8, y: 52, w: 84, h: 0.25, color: 'accent', opacity: 0.6 },
    ],
    boxes: [
      { key: 'title', x: 8, y: 56, w: 84, h: 26, size: 72, font: 'highlight', weight: 800, align: 'center', color: 'auto', emphasis: 'accent', lineHeight: 1.05 },
      { key: 'body', x: 8, y: 83, w: 84, h: 10, size: 32, font: 'base', align: 'center', color: 'auto' },
    ],
  },
  // ——— Fechamento ———
  {
    id: 'closing-cta',
    needsTitle: true,
    name: 'Fechamento · CTA',
    roles: ['closing'],
    bg: 'primary',
    capacity: 220,
    images: [],
    boxes: [
      { key: 'title', x: 10, y: 32, w: 80, h: 26, size: 80, font: 'highlight', weight: 800, align: 'center', valign: 'bottom', color: 'auto', emphasis: 'accent', lineHeight: 1.05 },
      { key: 'body', x: 10, y: 61, w: 80, h: 16, size: 36, font: 'base', align: 'center', color: 'auto', lineHeight: 1.4 },
    ],
    logo: { x: 34, y: 12, w: 32, h: 10, align: 'center' },
    icons: [{ icon: 'ph:bookmark-simple-fill', x: 50, y: 85, size: 8, rotate: 0, color: 'accent' }],
  },
  {
    id: 'closing-image',
    needsTitle: true,
    name: 'Fechamento · Imagem',
    roles: ['closing'],
    bg: 'primary',
    tone: 'dark',
    capacity: 220,
    images: [{ ...FULL, overlay: { kind: 'solid', color: 'primary', opacity: 0.82 } }],
    boxes: [
      { key: 'title', x: 10, y: 36, w: 80, h: 26, size: 76, font: 'highlight', weight: 800, align: 'center', valign: 'bottom', color: 'light', emphasis: 'accent', lineHeight: 1.05 },
      { key: 'body', x: 10, y: 65, w: 80, h: 16, size: 34, font: 'base', align: 'center', color: 'light', lineHeight: 1.4 },
    ],
    logo: { x: 34, y: 12, w: 32, h: 10, align: 'center', tone: 'dark' },
  },
];

export const TEMPLATE_MAP = new Map(TEMPLATES.map((t) => [t.id, t]));

export const templateStyle = (t: TemplateDef): PostStyle => (t.id.startsWith('social-') ? 'social' : 'design');

export const templatesForStyle = (style: PostStyle) => (style === 'mixed' ? TEMPLATES : TEMPLATES.filter((t) => templateStyle(t) === style));

export const getTemplate = (id: string) => TEMPLATE_MAP.get(id) ?? TEMPLATES[4];

export const ROLE_LABELS: Record<SlideRole, string> = {
  cover: 'Capa',
  content: 'Conteúdo',
  list: 'Lista',
  quote: 'Citação',
  closing: 'Fechamento',
};
