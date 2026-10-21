import { hashString } from '@engine/math/rng';
import type { Rect } from '@engine/math/rect';

/**
 * Basic skybox, painted in screen space before the world: a night gradient, stars and moon,
 * drifting clouds and two city skylines. Every layer scrolls at its own `parallax` (0 = glued
 * to the screen, 1 = moves with the world), horizontally and vertically, so moving reads in the
 * open alleys and through the building windows.
 */

/** Deterministic 0..1 noise per integer slot (stable while scrolling). */
const noise = (i: number, salt: number): number => (hashString(`${salt}:${i}`) % 10000) / 10000;

interface SkylineLayer {
  parallax: number;
  color: string;
  /** Building widths and heights, world units. */
  minW: number;
  maxW: number;
  minH: number;
  maxH: number;
  /** Lit windows: chance per window slot (0 = none). */
  lit: number;
  salt: number;
}

const SKYLINES: readonly SkylineLayer[] = [
  { parallax: 0.12, color: '#141a2a', minW: 30, maxW: 70, minH: 90, maxH: 210, lit: 0, salt: 11 },
  { parallax: 0.3, color: '#1a2134', minW: 24, maxW: 56, minH: 60, maxH: 160, lit: 0.18, salt: 23 },
];

/**
 * `view` is the visible world rect; `worldHeight` is the level height (the ground line), used to
 * anchor the skylines: with the camera at the bottom their bases sit at the bottom of the screen.
 */
export function drawSky(ctx: CanvasRenderingContext2D, view: Rect, worldHeight: number, time: number): void {
  const { w, h } = view;
  // How far the camera is above its lowest position (world units).
  const rise = Math.max(0, worldHeight - h - view.y);

  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, '#070a14');
  grad.addColorStop(0.65, '#121a30');
  grad.addColorStop(1, '#2a2440');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  // Stars: a fixed field that barely moves.
  ctx.fillStyle = '#cfd8ff';
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
  ctx.fillStyle = 'rgba(230,236,255,0.08)';
  ctx.beginPath();
  ctx.arc(mx, my, 22, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#dfe6ff';
  ctx.beginPath();
  ctx.arc(mx, my, 10, 0, Math.PI * 2);
  ctx.fill();

  // Clouds: slow drift over time plus a little parallax.
  const cloudP = 0.06;
  const drift = time * 4;
  const slot = 140;
  const cx0 = view.x * cloudP - drift;
  ctx.fillStyle = 'rgba(120,130,170,0.10)';
  for (let i = Math.floor(cx0 / slot) - 1; i * slot - cx0 < w + slot; i++) {
    const x = i * slot - cx0 + noise(i, 5) * 60;
    const y = h * (0.12 + noise(i, 6) * 0.35) + rise * cloudP;
    const r = 10 + noise(i, 7) * 10;
    ctx.beginPath();
    ctx.ellipse(x, y, r * 3, r, 0, 0, Math.PI * 2);
    ctx.ellipse(x + r * 1.6, y - r * 0.5, r * 1.8, r * 0.8, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  for (const layer of SKYLINES) drawSkyline(ctx, layer, view, rise);
}

function drawSkyline(ctx: CanvasRenderingContext2D, layer: SkylineLayer, view: Rect, rise: number): void {
  const { w, h } = view;
  const slot = layer.maxW + 8;
  const offset = view.x * layer.parallax;
  const base = h + rise * layer.parallax;
  for (let i = Math.floor(offset / slot) - 1; i * slot - offset < w; i++) {
    const bw = layer.minW + noise(i, layer.salt) * (layer.maxW - layer.minW);
    const bh = layer.minH + noise(i, layer.salt + 1) * (layer.maxH - layer.minH);
    const x = i * slot - offset;
    const top = base - bh;
    ctx.fillStyle = layer.color;
    ctx.fillRect(x, top, bw, bh);
    if (layer.lit <= 0) continue;
    // A grid of windows, some of them lit.
    ctx.fillStyle = 'rgba(232,200,106,0.45)';
    let k = 0;
    for (let wy = top + 6; wy < base - 6; wy += 9) {
      for (let wx = x + 4; wx < x + bw - 5; wx += 7) {
        if (noise(i * 977 + k++, layer.salt + 2) < layer.lit) ctx.fillRect(wx, wy, 3, 4);
      }
    }
  }
}
