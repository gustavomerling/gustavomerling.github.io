import type { Rect } from '@engine/math/rect';
import { rgba, theme } from './palette';

/**
 * Cheap mood lighting, decoration only: soft glow pools (lamps, torches, window spill), a
 * directional moon/sun wash and a vignette. Everything here is drawn BEFORE the tiles, so it
 * never covers platforms, characters, bullets, telegraphs or the F2 grid.
 *
 * Gradients are built once per colour in unit space and reused with translate/scale.
 */

/** Switches to compare with/without each effect (docs/05: every new effect has a switch). */
export const LIGHTING = {
  /** Screen-edge darkening + moon/sun wash. */
  mood: true,
  /** Lamp/torch pools and window spill on back walls. */
  glow: true,
  /** Interior depth on back walls: ceiling/floor/corner shadows, storey bands. */
  depth: true,
  /** Extra parallax layers (far skyline/mountains/castle, horizon haze). */
  parallax: true,
};

/** Seconds, fed by drawSky each frame (drives torch/lamp flicker). */
let clock = 0;
export function setLightClock(t: number): void {
  clock = t;
}
export function lightClock(): number {
  return clock;
}

const glowCache = new Map<string, CanvasGradient>();
const shadeCache = new Map<string, CanvasGradient>();
let vignetteCache: { key: string; grad: CanvasGradient } | null = null;

/** Unit radial gradient (radius 1 at the origin) fading `color` to transparent. */
function unitGlow(ctx: CanvasRenderingContext2D, color: string): CanvasGradient {
  let g = glowCache.get(color);
  if (!g) {
    g = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
    g.addColorStop(0, rgba(color, 1));
    g.addColorStop(0.35, rgba(color, 0.45));
    g.addColorStop(1, rgba(color, 0));
    glowCache.set(color, g);
  }
  return g;
}

/** Soft round glow of radius `r` (world units) at (x, y). */
export function drawGlow(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string, alpha: number): void {
  if (alpha <= 0.001 || r <= 0) return;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(r, r);
  ctx.globalAlpha = Math.min(1, alpha);
  ctx.fillStyle = unitGlow(ctx, color);
  ctx.fillRect(-1, -1, 2, 2);
  ctx.restore();
}

/**
 * A shadow band in the rect (x, y, w, h): `color` (an rgba token) on the side named by `dir`'s
 * origin, fading to transparent towards it ('down' = dark at the top, 'up' = dark at the bottom,
 * 'right' = dark at the left, 'left' = dark at the right).
 */
export function drawShade(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  color: string,
  dir: 'down' | 'up' | 'right' | 'left',
  alpha = 1,
): void {
  if (w <= 0 || h <= 0 || alpha <= 0) return;
  const vertical = dir === 'down' || dir === 'up';
  const key = `${color}|${vertical ? 'v' : 'h'}`;
  let g = shadeCache.get(key);
  if (!g) {
    g = vertical ? ctx.createLinearGradient(0, 0, 0, 1) : ctx.createLinearGradient(0, 0, 1, 0);
    g.addColorStop(0, color);
    g.addColorStop(1, rgba('#000000', 0));
    shadeCache.set(key, g);
  }
  ctx.save();
  ctx.globalAlpha = alpha;
  // Map the unit gradient (dark at 0) onto the rect, mirrored for 'up'/'left'.
  if (dir === 'down' || dir === 'right') ctx.translate(x, y);
  else if (dir === 'up') ctx.translate(x, y + h);
  else ctx.translate(x + w, y);
  ctx.scale(dir === 'left' ? -w : w, dir === 'up' ? -h : h);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 1, 1);
  ctx.restore();
}

/** 0..1 multiplier for a flickering light; `seed` desyncs lights. */
export function flickerFactor(amount: number, seed: number): number {
  if (amount <= 0) return 1;
  const t = clock;
  const wobble = 0.5 + 0.5 * Math.sin(t * 9.3 + seed * 1.7) * Math.sin(t * 3.1 + seed * 4.1);
  return 1 - amount * wobble;
}

/**
 * Screen-space mood over the sky and back walls (world coords; `view` = visible world rect):
 * a wide wash from the moon/sun side and an elliptical vignette.
 */
export function drawMood(ctx: CanvasRenderingContext2D, view: Rect): void {
  if (!LIGHTING.mood) return;
  const l = theme().light;
  const { x, y, w, h } = view;
  drawGlow(ctx, x + w * l.washFrom, y - h * 0.15, Math.max(w, h) * 0.9, l.wash, l.washAlpha);

  if (l.vignetteAlpha <= 0) return;
  const key = `${theme().id}:${l.vignette}:${l.vignetteAlpha}`;
  if (!vignetteCache || vignetteCache.key !== key) {
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
    g.addColorStop(0, rgba(l.vignette, 0));
    g.addColorStop(0.55, rgba(l.vignette, 0));
    g.addColorStop(1, rgba(l.vignette, l.vignetteAlpha));
    vignetteCache = { key, grad: g };
  }
  const sx = (w / 2) * 1.12;
  const sy = (h / 2) * 1.12;
  ctx.save();
  ctx.translate(x + w / 2, y + h / 2);
  ctx.scale(sx, sy);
  ctx.fillStyle = vignetteCache.grad;
  ctx.fillRect(-w / 2 / sx, -h / 2 / sy, w / sx, h / sy);
  ctx.restore();
}
