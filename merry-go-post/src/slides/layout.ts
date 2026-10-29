import { resolveColor, textRoleOn } from '../lib/color';
import type { TemplateDef, TextBoxDef } from '../templates';
import type { ColorRef, Palette, Slide, TextKey } from '../types';

export type Tone = 'dark' | 'light';

/** Tom do fundo do slide: decide cor automática de texto, variação do logo e da paginação. */
export const slideBg = (t: TemplateDef, slide?: Slide) => slide?.bg ?? t.bg;

export const toneOf = (hex: string, palette: Palette): Tone => (textRoleOn(hex, palette) === 'light' ? 'dark' : 'light');

/** Fundo trocado pelo usuário manda no tom; senão vale o tom forçado do template (imagem de fundo). */
export const slideTone = (t: TemplateDef, palette: Palette, slide?: Slide): Tone =>
  slide?.bg ? toneOf(resolveColor(slide.bg, palette), palette) : t.tone ?? toneOf(resolveColor(t.bg, palette), palette);

export const isHidden = (slide: Slide, layer: string) => !!slide.hidden?.includes(layer);

export const autoTextColor = (tone: Tone, palette: Palette) => (tone === 'dark' ? palette.light : palette.dark);

export const colorOf = (ref: ColorRef | 'auto' | undefined, tone: Tone, palette: Palette) =>
  !ref || ref === 'auto' ? autoTextColor(tone, palette) : resolveColor(ref, palette);

/** Caixa de texto do template com os ajustes do usuário aplicados. */
export function resolveBox(t: TemplateDef, slide: Slide, key: TextKey): TextBoxDef | null {
  const def = t.boxes.find((b) => b.key === key);
  if (!def) return null;
  const o = slide.boxes[key] ?? {};
  return {
    ...def,
    x: o.x ?? def.x,
    y: o.y ?? def.y,
    w: o.w ?? def.w,
    h: o.h ?? def.h,
    size: def.size * (o.scale ?? 1),
    align: o.align ?? def.align,
    color: o.color ?? def.color,
    font: o.font ?? def.font,
    // Escolher um papel da marca desfaz a fonte avulsa do template.
    family: o.family ?? (o.font ? undefined : def.family),
    lineHeight: o.lineHeight ?? def.lineHeight,
    letterSpacing: o.letterSpacing ?? def.letterSpacing,
    uppercase: o.uppercase ?? def.uppercase,
  };
}

export function withAlpha(hex: string, alpha: number) {
  const m = hex.replace('#', '');
  const full = m.length === 3 ? m.split('').map((c) => c + c).join('') : m.slice(0, 6);
  const n = parseInt(full, 16);
  if (Number.isNaN(n)) return hex;
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}
