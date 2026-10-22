/**
 * Tiny built-in bitmap font for in-canvas text. The game buffer is 1 px per world unit, so
 * vector fonts at 5–7 px blur; this draws each glyph as crisp fillRects on whole pixels.
 * Glyphs are 5 rows tall (variable width, mostly 3); accents sit 2 rows above the cap height.
 */

type Glyph = readonly string[];

const FALLBACK: Glyph = ['##.', '..#', '.#.', '...', '.#.'];
const G: Partial<Record<string, Glyph>> = {
  A: ['.#.', '#.#', '###', '#.#', '#.#'],
  B: ['##.', '#.#', '##.', '#.#', '##.'],
  C: ['.##', '#..', '#..', '#..', '.##'],
  D: ['##.', '#.#', '#.#', '#.#', '##.'],
  E: ['###', '#..', '##.', '#..', '###'],
  F: ['###', '#..', '##.', '#..', '#..'],
  G: ['.##', '#..', '#.#', '#.#', '.##'],
  H: ['#.#', '#.#', '###', '#.#', '#.#'],
  I: ['###', '.#.', '.#.', '.#.', '###'],
  J: ['..#', '..#', '..#', '#.#', '.#.'],
  K: ['#.#', '#.#', '##.', '#.#', '#.#'],
  L: ['#..', '#..', '#..', '#..', '###'],
  M: ['#...#', '##.##', '#.#.#', '#...#', '#...#'],
  N: ['#..#', '##.#', '#.##', '#..#', '#..#'],
  O: ['.#.', '#.#', '#.#', '#.#', '.#.'],
  P: ['##.', '#.#', '##.', '#..', '#..'],
  Q: ['.#.', '#.#', '#.#', '##.', '.##'],
  R: ['##.', '#.#', '##.', '#.#', '#.#'],
  S: ['.##', '#..', '.#.', '..#', '##.'],
  T: ['###', '.#.', '.#.', '.#.', '.#.'],
  U: ['#.#', '#.#', '#.#', '#.#', '###'],
  V: ['#.#', '#.#', '#.#', '#.#', '.#.'],
  W: ['#...#', '#...#', '#.#.#', '##.##', '#...#'],
  X: ['#.#', '#.#', '.#.', '#.#', '#.#'],
  Y: ['#.#', '#.#', '.#.', '.#.', '.#.'],
  Z: ['###', '..#', '.#.', '#..', '###'],
  '0': ['###', '#.#', '#.#', '#.#', '###'],
  '1': ['.#', '##', '.#', '.#', '.#'],
  '2': ['##.', '..#', '.#.', '#..', '###'],
  '3': ['##.', '..#', '.#.', '..#', '##.'],
  '4': ['#.#', '#.#', '###', '..#', '..#'],
  '5': ['###', '#..', '##.', '..#', '##.'],
  '6': ['.##', '#..', '###', '#.#', '###'],
  '7': ['###', '..#', '.#.', '.#.', '.#.'],
  '8': ['###', '#.#', '###', '#.#', '###'],
  '9': ['###', '#.#', '###', '..#', '##.'],
  ' ': ['..', '..', '..', '..', '..'],
  '.': ['.', '.', '.', '.', '#'],
  ',': ['.', '.', '.', '#', '#'],
  ':': ['.', '#', '.', '#', '.'],
  ';': ['.', '#', '.', '#', '#'],
  '!': ['#', '#', '#', '.', '#'],
  '?': ['##.', '..#', '.#.', '...', '.#.'],
  '-': ['...', '...', '###', '...', '...'],
  '+': ['...', '.#.', '###', '.#.', '...'],
  '=': ['...', '###', '...', '###', '...'],
  '/': ['..#', '..#', '.#.', '#..', '#..'],
  '%': ['#.#', '..#', '.#.', '#..', '#.#'],
  '[': ['##', '#.', '#.', '#.', '##'],
  ']': ['##', '.#', '.#', '.#', '##'],
  '(': ['.#', '#.', '#.', '#.', '.#'],
  ')': ['#.', '.#', '.#', '.#', '#.'],
  "'": ['#', '#', '.', '.', '.'],
  '"': ['#.#', '#.#', '...', '...', '...'],
  '<': ['..#', '.#.', '#..', '.#.', '..#'],
  '>': ['#..', '.#.', '..#', '.#.', '#..'],
  '#': ['#.#', '###', '#.#', '###', '#.#'],
  '*': ['...', '#.#', '.#.', '#.#', '...'],
  _: ['...', '...', '...', '...', '###'],
  '×': ['...', '#.#', '.#.', '#.#', '...'],
};

/** Accent marks (2 rows, drawn above a 3-wide base glyph). */
const ACCENTS: Record<string, Glyph> = {
  acute: ['..#', '.#.'],
  circ: ['.#.', '#.#'],
  tilde: ['.##', '##.'],
};
const ACCENTED: Record<string, [string, keyof typeof ACCENTS]> = {
  Á: ['A', 'acute'], À: ['A', 'acute'], Â: ['A', 'circ'], Ã: ['A', 'tilde'],
  É: ['E', 'acute'], Ê: ['E', 'circ'], Í: ['I', 'acute'],
  Ó: ['O', 'acute'], Ô: ['O', 'circ'], Õ: ['O', 'tilde'], Ú: ['U', 'acute'],
};

export const PIXEL_FONT_HEIGHT = 5;
const SPACING = 1;

export interface PixelTextOptions {
  color?: string;
  align?: 'left' | 'center' | 'right';
  /** Vertical anchor: 'top' (default), 'middle' or 'bottom' of the 5-row cap height. */
  baseline?: 'top' | 'middle' | 'bottom';
  /** Shadow color drawn 1 px down-right beneath the text. */
  shadow?: string;
  /** Integer pixel scale. */
  scale?: number;
}

function glyphFor(ch: string): Glyph {
  return G[ch] ?? FALLBACK;
}

function charWidth(ch: string): number {
  if (ch === 'Ç') return 3;
  const acc = ACCENTED[ch];
  return glyphFor(acc ? acc[0] : ch)[0]?.length ?? 3;
}

export function measurePixelText(text: string, scale = 1): number {
  const t = text.toUpperCase();
  let w = 0;
  for (const ch of t) w += charWidth(ch) + SPACING;
  return Math.max(0, w - SPACING) * scale;
}

function drawRows(ctx: CanvasRenderingContext2D, rows: Glyph, x: number, y: number, s: number): void {
  for (let r = 0; r < rows.length; r++) {
    const row = rows[r] ?? '';
    for (let c = 0; c < row.length; c++) if (row[c] === '#') ctx.fillRect(x + c * s, y + r * s, s, s);
  }
}

function drawRun(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, s: number): void {
  let cx = x;
  for (const ch of text) {
    if (ch === 'Ç') {
      drawRows(ctx, glyphFor('C'), cx, y, s);
      ctx.fillRect(cx + s, y + 5 * s, s, s);
    } else {
      const acc = ACCENTED[ch];
      if (acc) {
        drawRows(ctx, glyphFor(acc[0]), cx, y, s);
        drawRows(ctx, ACCENTS[acc[1]] ?? [], cx, y - 3 * s, s);
      } else drawRows(ctx, glyphFor(ch), cx, y, s);
    }
    cx += (charWidth(ch) + SPACING) * s;
  }
}

/** Draws upper-cased `text` as crisp pixel glyphs; (x, y) is snapped to whole pixels. */
export function drawPixelText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  opts: PixelTextOptions = {},
): void {
  const s = Math.max(1, Math.round(opts.scale ?? 1));
  const t = text.toUpperCase();
  const w = measurePixelText(t, s);
  const h = PIXEL_FONT_HEIGHT * s;
  let px = opts.align === 'center' ? x - w / 2 : opts.align === 'right' ? x - w : x;
  let py = opts.baseline === 'middle' ? y - h / 2 : opts.baseline === 'bottom' ? y - h : y;
  px = Math.round(px);
  py = Math.round(py);
  const prev = ctx.fillStyle;
  if (opts.shadow) {
    ctx.fillStyle = opts.shadow;
    drawRun(ctx, t, px + s, py + s, s);
  }
  ctx.fillStyle = opts.color ?? prev;
  drawRun(ctx, t, px, py, s);
  ctx.fillStyle = prev;
}
