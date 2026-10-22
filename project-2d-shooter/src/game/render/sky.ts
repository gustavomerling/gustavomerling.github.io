import { hashString } from '@engine/math/rng';
import type { Rect } from '@engine/math/rect';
import { LIGHTING, setLightClock } from './lighting';
import { rgba, theme, type CastleSky, type CitySky } from './palette';

/**
 * Basic skybox, painted in screen space before the world: a night gradient, stars and moon,
 * drifting clouds and three city skylines (far/mid/near) with horizon haze between them; or, for
 * the castle theme, a dusk sky with two mountain ranges and two castle lines. Every layer scrolls
 * at its own `parallax` (0 = glued to the screen, 1 = moves with the world), horizontally and
 * vertically, so moving reads in the open alleys and through the building windows.
 */

/** Deterministic 0..1 noise per integer slot (stable while scrolling). */
const noise = (i: number, salt: number): number => (hashString(`${salt}:${i}`) % 10000) / 10000;

interface SkylineLayer {
  parallax: number;
  /** Index into the theme's `city.skylines`. */
  tone: 0 | 1 | 2;
  /** Building widths and heights, world units. */
  minW: number;
  maxW: number;
  minH: number;
  maxH: number;
  /** Has lit windows (chance per slot from the theme). */
  lit: boolean;
  salt: number;
  /** Rooftop details (antenna masts, stepped tops). */
  roofs: boolean;
  /** Only drawn when LIGHTING.parallax is on. */
  extra?: boolean;
}

const SKYLINES: readonly SkylineLayer[] = [
  { parallax: 0.06, tone: 0, minW: 40, maxW: 90, minH: 140, maxH: 260, lit: false, salt: 7, roofs: false, extra: true },
  { parallax: 0.14, tone: 1, minW: 30, maxW: 70, minH: 90, maxH: 210, lit: false, salt: 11, roofs: true },
  { parallax: 0.3, tone: 2, minW: 24, maxW: 56, minH: 60, maxH: 160, lit: true, salt: 23, roofs: true },
];

/** Sky gradient, rebuilt only when the height or the theme changes. */
let skyGrad: { key: string; grad: CanvasGradient } | null = null;
function skyGradient(ctx: CanvasRenderingContext2D, h: number, stops: readonly (readonly [number, string])[], id: string): CanvasGradient {
  const key = `${id}:${h}`;
  if (!skyGrad || skyGrad.key !== key) {
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    for (const [at, color] of stops) grad.addColorStop(at, color);
    skyGrad = { key, grad };
  }
  return skyGrad.grad;
}

/** Haze band rising from `base` (screen y) by `height`, fading upwards (pushes far layers back). */
/** A filled circle built from 1 px rows, so it stays crisp in the pixel-art buffer. */
function pixelDisc(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, color: string): void {
  ctx.fillStyle = color;
  const x0 = Math.round(cx);
  const y0 = Math.round(cy);
  for (let dy = -Math.ceil(r); dy <= Math.ceil(r); dy++) {
    const half = Math.floor(Math.sqrt(Math.max(0, r * r - dy * dy)));
    if (half > 0) ctx.fillRect(x0 - half, y0 + dy, half * 2, 1);
  }
}

function drawHaze(ctx: CanvasRenderingContext2D, w: number, base: number, height: number, color: string, alpha: number): void {
  if (!LIGHTING.parallax || alpha <= 0) return;
  const g = ctx.createLinearGradient(0, base - height, 0, base);
  g.addColorStop(0, rgba(color, 0));
  g.addColorStop(1, rgba(color, alpha));
  ctx.fillStyle = g;
  ctx.fillRect(0, base - height, w, height);
}

/**
 * `view` is the visible world rect; `worldHeight` is the level height (the ground line), used to
 * anchor the skylines: with the camera at the bottom their bases sit at the bottom of the screen.
 */
export function drawSky(
  ctx: CanvasRenderingContext2D,
  view: Rect,
  worldHeight: number,
  time: number,
): void {
  const { w, h } = view;
  const t = theme();
  setLightClock(time);
  // How far the camera is above its lowest position (world units).
  const rise = Math.max(0, worldHeight - h - view.y);

  if (t.skyKind === 'castle') {
    drawCastleSky(ctx, view, rise, time, t.castle);
    return;
  }

  const c = t.city;
  ctx.fillStyle = skyGradient(ctx, h, c.gradient, t.id);
  ctx.fillRect(0, 0, w, h);

  // Stars: a fixed field that barely moves.
  ctx.fillStyle = c.star;
  const starP = 0.03;
  const sx = view.x * starP;
  for (let i = Math.floor(sx / 24) - 1; i * 24 - sx < w; i++) {
    const x = i * 24 - sx + noise(i, 1) * 24;
    const y = noise(i, 2) * h * 0.6 + rise * starP;
    ctx.globalAlpha = 0.25 + 0.5 * noise(i, 3);
    ctx.fillRect(x, y, 0.8, 0.8);
  }
  ctx.globalAlpha = 1;

  // Moon.
  const mx = w * 0.78 - view.x * 0.02;
  const my = h * 0.22 + rise * 0.02;
  pixelDisc(ctx, mx, my, 22, c.moonGlow);
  pixelDisc(ctx, mx, my, 10, c.moon);
  // Craters: darker discs on the moon's face.
  ctx.globalAlpha = 0.18;
  pixelDisc(ctx, mx - 3, my - 2, 3, c.moonGlow);
  pixelDisc(ctx, mx + 4, my + 3, 2, c.moonGlow);
  pixelDisc(ctx, mx + 1, my - 6, 1.5, c.moonGlow);
  ctx.globalAlpha = 1;

  // Clouds: slow drift over time plus a little parallax.
  const cloudP = 0.06;
  const drift = time * 4;
  const slot = 140;
  const cx0 = view.x * cloudP - drift;
  ctx.fillStyle = c.cloud;
  for (let i = Math.floor(cx0 / slot) - 1; i * slot - cx0 < w + slot; i++) {
    const x = i * slot - cx0 + noise(i, 5) * 60;
    const y = h * (0.12 + noise(i, 6) * 0.35) + rise * cloudP;
    const r = 10 + noise(i, 7) * 10;
    ctx.beginPath();
    ctx.ellipse(x, y, r * 3, r, 0, 0, Math.PI * 2);
    ctx.ellipse(x + r * 1.6, y - r * 0.5, r * 1.8, r * 0.8, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  for (const layer of SKYLINES) {
    if (layer.extra && !LIGHTING.parallax) continue;
    drawSkyline(ctx, layer, view, rise, c);
    // Haze in front of the far layers pushes them back (atmospheric depth).
    if (layer.tone < 2) drawHaze(ctx, w, h + rise * layer.parallax, 70 + layer.tone * 30, c.haze, 0.22 - layer.tone * 0.06);
  }
}

/** Dusk over the castle: two mountain ranges, a low sun and two crenellated castle lines. */
function drawCastleSky(ctx: CanvasRenderingContext2D, view: Rect, rise: number, time: number, c: CastleSky): void {
  const { w, h } = view;

  ctx.fillStyle = skyGradient(ctx, h, c.gradient, theme().id);
  ctx.fillRect(0, 0, w, h);

  // Fewer, warmer stars.
  const starP = 0.03;
  const sx = view.x * starP;
  ctx.fillStyle = c.star;
  for (let i = Math.floor(sx / 31) - 1; i * 31 - sx < w; i++) {
    const x = i * 31 - sx + noise(i, 31) * 31;
    const y = noise(i, 32) * h * 0.45 + rise * starP;
    ctx.globalAlpha = 0.2 + 0.4 * noise(i, 33);
    ctx.fillRect(x, y, 0.9, 0.9);
  }
  ctx.globalAlpha = 1;

  const mx = w * 0.28 - view.x * 0.02;
  const my = h * 0.56 + rise * 0.02;
  ctx.fillStyle = c.sunGlow;
  ctx.beginPath();
  ctx.arc(mx, my, 30, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = c.sun;
  ctx.beginPath();
  ctx.arc(mx, my, 13, 0, Math.PI * 2);
  ctx.fill();

  // Clouds: slow violet bands.
  const drift = time * 3;
  const slot = 170;
  const cx0 = view.x * 0.06 - drift;
  ctx.fillStyle = c.cloud;
  for (let i = Math.floor(cx0 / slot) - 1; i * slot - cx0 < w + slot; i++) {
    const x = i * slot - cx0 + noise(i, 5) * 70;
    const y = h * (0.14 + noise(i, 6) * 0.3) + rise * 0.06;
    const r = 12 + noise(i, 7) * 12;
    ctx.beginPath();
    ctx.ellipse(x, y, r * 3.2, r, 0, 0, Math.PI * 2);
    ctx.ellipse(x + r * 1.8, y - r * 0.4, r * 2, r * 0.8, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Mountains: a far hazy range, then the near one.
  if (LIGHTING.parallax) {
    drawRange(ctx, view, rise, 0.05, 260, 120, 120, 61, c.mountainsFar);
    drawHaze(ctx, w, h + rise * 0.05, 90, c.haze, 0.2);
  }
  drawRange(ctx, view, rise, 0.1, 210, 70, 110, 41, c.mountains);

  // A far, smaller castle line behind the near one.
  if (LIGHTING.parallax) {
    drawCastleLine(ctx, view, rise, 0.17, 150, 0.55, 71, c.silhouetteFar, null, c);
    drawHaze(ctx, w, h + rise * 0.17, 60, c.haze, 0.16);
  }
  drawCastleLine(ctx, view, rise, 0.26, 120, 1, 51, c.silhouette, c.banner, c);
}

/** A mountain range: one peak (with a shoulder on the way up) per slot. */
function drawRange(
  ctx: CanvasRenderingContext2D,
  view: Rect,
  rise: number,
  mp: number,
  peakSlot: number,
  minH: number,
  varH: number,
  salt: number,
  color: string,
): void {
  const { w, h } = view;
  const base = h + rise * mp;
  const mo = view.x * mp;
  const bottom = Math.max(h, base);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(-40, base);
  for (let i = Math.floor(mo / peakSlot) - 1; i * peakSlot - mo < w + peakSlot; i++) {
    const x = i * peakSlot - mo;
    const peak = base - minH - noise(i, salt) * varH;
    ctx.lineTo(x + peakSlot * 0.3, base - (base - peak) * (0.55 + noise(i, salt + 1) * 0.2));
    ctx.lineTo(x + peakSlot * 0.5, peak);
    ctx.lineTo(x + peakSlot + 40, base);
  }
  ctx.lineTo(w + 40, bottom);
  ctx.lineTo(-40, bottom);
  ctx.closePath();
  ctx.fill();
}

/** Castle line: towers with crenellations, curtain walls, window slits and (optional) banners. */
function drawCastleLine(
  ctx: CanvasRenderingContext2D,
  view: Rect,
  rise: number,
  cp: number,
  towerSlot: number,
  scale: number,
  salt: number,
  color: string,
  banner: string | null,
  c: CastleSky,
): void {
  const { w, h } = view;
  const cbase = h + rise * cp;
  const co = view.x * cp;
  ctx.fillStyle = color;
  for (let i = Math.floor(co / towerSlot) - 1; i * towerSlot - co < w + towerSlot; i++) {
    const x = i * towerSlot - co;
    const tw = (46 + noise(i, salt) * 46) * scale;
    const th = (90 + noise(i, salt + 1) * 160) * scale;
    const top = cbase - th;
    ctx.fillRect(x, top, tw, th);
    // Curtain wall to the next tower.
    const wallH = th * (0.35 + noise(i, salt + 4) * 0.15);
    ctx.fillRect(x + tw, cbase - wallH, towerSlot - tw, wallH);
    const merlon = 9 * scale;
    for (let m = x; m < x + tw - 2; m += merlon * 2) ctx.fillRect(m, top - merlon, merlon, merlon);
    for (let m = x + tw + merlon; m < x + towerSlot - merlon; m += merlon * 2) ctx.fillRect(m, cbase - wallH - merlon * 0.7, merlon, merlon * 0.7);
    if (banner && noise(i, salt + 2) < 0.55) {
      ctx.fillRect(x + tw * 0.5 - 0.7, top - 34, 1.4, 26);
      ctx.fillStyle = banner;
      ctx.beginPath();
      ctx.moveTo(x + tw * 0.5 + 0.6, top - 34);
      ctx.lineTo(x + tw * 0.5 + 15, top - 29);
      ctx.lineTo(x + tw * 0.5 + 0.6, top - 22);
      ctx.closePath();
      ctx.fill();
    }
    ctx.fillStyle = c.litWindow;
    ctx.globalAlpha = scale < 1 ? 0.6 : 1;
    let k = 0;
    for (let wy = top + 14 * scale; wy < cbase - 14 * scale; wy += 24 * scale) {
      for (let wx = x + 9 * scale; wx < x + tw - 9 * scale; wx += 14 * scale) {
        if (noise(i * 733 + k++, salt + 3) < 0.18) ctx.fillRect(wx, wy, 2.4 * scale, 5 * scale);
      }
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = color;
  }
}

function drawSkyline(ctx: CanvasRenderingContext2D, layer: SkylineLayer, view: Rect, rise: number, c: CitySky): void {
  const { w, h } = view;
  const slot = layer.maxW + 8;
  const offset = view.x * layer.parallax;
  const base = h + rise * layer.parallax;
  for (let i = Math.floor(offset / slot) - 1; i * slot - offset < w; i++) {
    const bw = layer.minW + noise(i, layer.salt) * (layer.maxW - layer.minW);
    const bh = layer.minH + noise(i, layer.salt + 1) * (layer.maxH - layer.minH);
    const x = i * slot - offset;
    const top = base - bh;
    ctx.fillStyle = c.skylines[layer.tone];
    ctx.fillRect(x, top, bw, bh);
    if (layer.roofs) {
      // Rooftop silhouettes: a mast, a stepped top, or a small block with a mast.
      const kind = noise(i, layer.salt + 3);
      if (kind < 0.3) ctx.fillRect(x + bw * (0.2 + noise(i, layer.salt + 4) * 0.6), top - 14, 1.2, 14);
      else if (kind < 0.55) ctx.fillRect(x + bw * 0.2, top - 6, bw * 0.6, 6);
      else if (kind < 0.7) {
        ctx.fillRect(x + bw * 0.3, top - 10, bw * 0.4, 10);
        ctx.fillRect(x + bw * 0.5 - 0.6, top - 22, 1.2, 12);
      }
    }
    if (!layer.lit || c.litChance <= 0) continue;
    // A grid of windows, some of them lit.
    ctx.fillStyle = c.litWindow;
    let k = 0;
    for (let wy = top + 6; wy < base - 6; wy += 9) {
      for (let wx = x + 4; wx < x + bw - 5; wx += 7) {
        if (noise(i * 977 + k++, layer.salt + 2) < c.litChance) ctx.fillRect(wx, wy, 3, 4);
      }
    }
  }
}
