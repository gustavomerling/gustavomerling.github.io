import { hashString } from '@engine/math/rng';
import type { BackgroundLayer } from '../content/biomes/catalog';

type Painter<L extends BackgroundLayer> = (ctx: CanvasRenderingContext2D, layer: L, view: View, salt: number) => void;
type View = { x: number; y: number; w: number; h: number };

/** Deterministic 0..1 noise per integer slot (stable while scrolling). */
const noise = (i: number, salt: number): number => (hashString(`${salt}:${i}`) % 10000) / 10000;

/** One painter per layer kind. Adding a kind = add a type in biomes/catalog.ts + a painter here. */
const PAINTERS: { [K in BackgroundLayer['kind']]: Painter<Extract<BackgroundLayer, { kind: K }>> } = {
  fill(ctx, layer, view) {
    ctx.fillStyle = layer.color;
    ctx.fillRect(0, 0, view.w, view.h);
  },

  grid(ctx, layer, view) {
    const s = layer.spacing;
    const ox = mod(view.x * layer.parallax, s);
    const oy = mod(view.y * layer.parallax, s);
    ctx.fillStyle = layer.color;
    for (let x = -ox; x < view.w; x += s) ctx.fillRect(Math.round(x), 0, 1, view.h);
    for (let y = -oy; y < view.h; y += s) ctx.fillRect(0, Math.round(y), view.w, 1);
  },

  pillars(ctx, layer, view) {
    const offset = view.x * layer.parallax;
    const first = Math.floor(offset / layer.spacing) - 1;
    ctx.fillStyle = layer.color;
    for (let i = first; i * layer.spacing - offset < view.w; i++) {
      ctx.fillRect(Math.round(i * layer.spacing - offset), 0, layer.width, view.h);
    }
  },

  skyline(ctx, layer, view, salt) {
    const slot = layer.maxWidth + 6;
    const offset = view.x * layer.parallax;
    const first = Math.floor(offset / slot) - 1;
    ctx.fillStyle = layer.color;
    for (let i = first; i * slot - offset < view.w; i++) {
      const w = layer.minWidth + noise(i, salt) * (layer.maxWidth - layer.minWidth);
      const h = layer.minHeight + noise(i, salt + 7) * (layer.maxHeight - layer.minHeight);
      ctx.fillRect(Math.round(i * slot - offset), Math.round(view.h - h), Math.round(w), Math.ceil(h));
    }
  },
};

/** Paints all layers in screen space (call before applying the camera transform). */
export function drawBackground(ctx: CanvasRenderingContext2D, layers: readonly BackgroundLayer[], view: View): void {
  layers.forEach((layer, index) => {
    (PAINTERS[layer.kind] as Painter<BackgroundLayer>)(ctx, layer, view, index * 101);
  });
}

const mod = (a: number, n: number) => ((a % n) + n) % n;
