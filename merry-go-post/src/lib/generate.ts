import { getTemplate, templatesForStyle, type TemplateDef } from '../templates';
import type { IconElement, ImageFilter, ImageMode, PostStyle, Slide, SlideImage, SlideRole } from '../types';
import { hashString, seededRandom, uid } from './id';
import type { SlideDraft } from './split';

export const DEFAULT_FILTER: ImageFilter = {
  brightness: 100,
  contrast: 100,
  saturate: 100,
  grayscale: 0,
  sepia: 0,
  blur: 0,
  hueRotate: 0,
  overlayColor: 'dark',
  overlayOpacity: 0,
};

export const newSlideImage = (imageId: string | null): SlideImage => ({
  imageId,
  zoom: 1,
  x: 50,
  y: 50,
  filter: { ...DEFAULT_FILTER },
});

const plainLength = (html: string) => html.replace(/<[^>]+>/g, '').replace(/&\w+;/g, ' ').length;

export const contentLength = (c: { title: string; body: string }) => plainLength(c.title) + plainLength(c.body);

/**
 * Quais slides recebem template com imagem.
 * Se o texto marcou slides com "imagem", são exatamente esses (mais todos, no modo "todas").
 */
function imageFlags(roles: SlideRole[], mode: ImageMode, imageCount: number, requested: (boolean | undefined)[]): boolean[] {
  if (requested.some(Boolean)) return roles.map((_, i) => !!requested[i] || mode === 'all');
  const n = roles.length;
  if (mode === 'none') return roles.map(() => false);
  if (mode === 'all') return roles.map(() => true);
  const target = Math.min(n, Math.max(imageCount, Math.ceil(n / 2)));
  const flags = roles.map(() => false);
  if (!target) return flags;
  // Capa primeiro; o restante espalhado de forma uniforme.
  const picks = target === 1 ? [0] : Array.from({ length: target }, (_, k) => Math.round((k * (n - 1)) / (target - 1)));
  for (const p of picks) {
    let i = p;
    while (flags[i] && i < n - 1) i++;
    flags[i] = true;
  }
  return flags;
}

interface PickOptions {
  style: PostStyle;
  role: SlideRole;
  /** Quantidade exata de espaços de imagem; null = qualquer quantidade > 0. */
  images: number | 'any' | 0;
  textLen: number;
  hasTitle: boolean;
  favorites: string[];
  avoid?: string[];
  rand: () => number;
}

const imagesMatch = (t: TemplateDef, want: PickOptions['images']) =>
  want === 'any' ? t.images.length > 0 : t.images.length === want;

export function pickTemplate(o: PickOptions): TemplateDef {
  const styled = templatesForStyle(o.style);
  const titled = o.hasTitle ? styled : styled.filter((t) => !t.needsTitle);
  const all = titled.length ? titled : styled;
  const generic: SlideRole = o.role === 'cover' || o.role === 'closing' ? o.role : 'content';
  const tiers = [
    all.filter((t) => t.roles.includes(o.role) && imagesMatch(t, o.images)),
    all.filter((t) => t.roles.includes(generic) && imagesMatch(t, o.images)),
    all.filter((t) => imagesMatch(t, o.images)),
    all.filter((t) => t.roles.includes(o.role)),
  ];
  let pool = tiers.find((p) => p.length) ?? all;

  const fit = pool.filter((t) => t.capacity >= o.textLen);
  pool = fit.length ? fit : [pool.reduce((a, b) => (b.capacity > a.capacity ? b : a))];

  const fresh = pool.filter((t) => !o.avoid?.includes(t.id));
  if (fresh.length) pool = fresh;

  const weights = pool.map((t) => {
    let w = o.favorites.includes(t.id) ? 4 : 1;
    if (t.images.length > 1) w *= 0.5;
    return w;
  });
  let r = o.rand() * weights.reduce((a, b) => a + b, 0);
  for (let i = 0; i < pool.length; i++) {
    r -= weights[i];
    if (r <= 0) return pool[i];
  }
  return pool[pool.length - 1];
}

const templateIcons = (t: TemplateDef): IconElement[] =>
  (t.icons ?? []).map((ic) => ({ ...ic, id: uid(), fromTemplate: true }));

interface BuildOptions {
  style: PostStyle;
  drafts: SlideDraft[];
  mode: ImageMode;
  imageIds: string[];
  favorites: string[];
  /** Com semente, o resultado é estável (prévia ao vivo); sem, é sorteado de novo. */
  seed?: string;
  /** Slides travados: índice → template fixo (fica de fora do sorteio). */
  pins?: Record<string, string>;
}

export function buildSlides(o: BuildOptions): Slide[] {
  const flags = imageFlags(
    o.drafts.map((d) => d.role),
    o.mode,
    o.imageIds.length,
    o.drafts.map((d) => d.image),
  );
  let next = 0;
  let prev: string | undefined;
  return o.drafts.map((d, i) => {
    const rand = o.seed !== undefined ? seededRandom(hashString(`${o.seed}:${i}:${d.role}`)) : Math.random;
    const pinned = o.pins?.[i];
    const t = pinned ? getTemplate(pinned) : pickTemplate({
      style: o.style,
      role: d.role,
      images: flags[i] ? 'any' : 0,
      textLen: contentLength(d.content),
      hasTitle: plainLength(d.content.title) > 0,
      favorites: o.favorites,
      avoid: prev ? [prev] : [],
      rand,
    });
    prev = t.id;
    const images = t.images.map(() => newSlideImage(o.imageIds[next++] ?? null));
    return {
      id: uid(),
      role: d.role,
      templateId: t.id,
      content: d.content,
      boxes: {},
      images,
      elements: templateIcons(t),
    };
  });
}

/** Troca o template de um slide, preservando texto, imagens já escolhidas e ícones do usuário. */
export function applyTemplate(slide: Slide, t: TemplateDef, spareImages: string[] = []): Slide {
  const spare = [...spareImages];
  const images = t.images.map((_, i) => slide.images[i] ?? newSlideImage(spare.shift() ?? null));
  return {
    ...slide,
    templateId: t.id,
    boxes: {},
    images,
    elements: [...slide.elements.filter((e) => !e.fromTemplate), ...templateIcons(t)],
  };
}

/** "Regerar": outro template para o mesmo conteúdo, com a mesma quantidade de imagens. */
export function regenerateSlide(slide: Slide, style: PostStyle, favorites: string[]): Slide {
  const t = pickTemplate({
    style,
    role: slide.role,
    images: slide.images.length,
    textLen: contentLength(slide.content),
    hasTitle: plainLength(slide.content.title) > 0,
    favorites,
    avoid: [slide.templateId],
    rand: Math.random,
  });
  return applyTemplate(slide, t);
}

/** Imagens do post que ainda não estão em nenhum slide. */
export function unusedImages(slides: Slide[], imageIds: string[]) {
  const used = new Set(slides.flatMap((s) => s.images.map((i) => i.imageId)));
  return imageIds.filter((id) => !used.has(id));
}

/** Preenche, em ordem, os espaços vazios (placeholders) com as imagens ainda não usadas. */
export function fillPlaceholders(slides: Slide[], imageIds: string[]): Slide[] {
  const queue = unusedImages(slides, imageIds);
  if (!queue.length) return slides;
  return slides.map((s) =>
    s.images.some((i) => !i.imageId)
      ? { ...s, images: s.images.map((i) => (i.imageId || !queue.length ? i : { ...i, imageId: queue.shift()! })) }
      : s,
  );
}

export const slideTemplate = (s: Slide) => getTemplate(s.templateId);
