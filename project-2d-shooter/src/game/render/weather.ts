import type { Rect } from '@engine/math/rect';
import { fxSetting } from '../systems/juice';
import { WEATHER } from './palette';

/**
 * Ambient weather, drawn in world space over the scenery and behind characters. Stateless: every
 * particle's position is a function of its index and the real-time clock, so it costs no memory,
 * never touches the simulation and wraps seamlessly around the view. Off with the particles setting.
 */
export type WeatherKind = 'rain' | 'embers' | 'motes';

export const WEATHER_TUNING = {
  rain: { count: 140, fall: 260, wind: -40, length: 4, alpha: 0.35 },
  embers: { count: 36, rise: 14, sway: 6, alpha: 0.8 },
  motes: { count: 28, drift: 5, sway: 4, alpha: 0.25 },
};

/** Fixed pseudo-random 0..1 per (index, channel). */
const rnd = (i: number, k: number) => {
  const v = Math.sin(i * 127.1 + k * 311.7) * 43758.5453;
  return v - Math.floor(v);
};
const wrap = (v: number, size: number) => ((v % size) + size) % size;

export function drawWeather(
  ctx: CanvasRenderingContext2D,
  view: Rect,
  kind: WeatherKind,
  time: number,
  /** Rain only: true where the sky is covered (indoors, inside walls). */
  covered: (x: number, y: number) => boolean = () => false,
): void {
  if (!fxSetting('particles')) return;
  const { x: vx, y: vy, w, h } = view;
  // Particles live on a tile of the view's size; parallax 1 = they scroll with the world.
  if (kind === 'rain') {
    const t = WEATHER_TUNING.rain;
    ctx.globalAlpha = t.alpha;
    ctx.fillStyle = WEATHER.rain;
    for (let i = 0; i < t.count; i++) {
      const speed = t.fall * (0.8 + rnd(i, 1) * 0.4);
      const x = vx + wrap(rnd(i, 2) * w + t.wind * time * (speed / t.fall) - vx, w);
      const y = vy + wrap(rnd(i, 3) * h + speed * time - vy, h);
      if (covered(x, y + t.length)) continue;
      ctx.fillRect(Math.round(x), Math.round(y), 1, t.length);
    }
  } else if (kind === 'embers') {
    const t = WEATHER_TUNING.embers;
    for (let i = 0; i < t.count; i++) {
      const x = vx + wrap(rnd(i, 2) * w + Math.sin(time * 1.3 + i) * t.sway - vx * 0.9, w);
      const y = vy + wrap(rnd(i, 3) * h - t.rise * (0.6 + rnd(i, 1)) * time - vy * 0.9, h);
      ctx.globalAlpha = t.alpha * (0.4 + 0.6 * Math.abs(Math.sin(time * 3 + i * 1.7)));
      ctx.fillStyle = rnd(i, 4) < 0.3 ? WEATHER.emberHot : WEATHER.ember;
      ctx.fillRect(Math.round(x), Math.round(y), 1, 1);
    }
  } else {
    const t = WEATHER_TUNING.motes;
    ctx.fillStyle = WEATHER.mote;
    for (let i = 0; i < t.count; i++) {
      const x = vx + wrap(rnd(i, 2) * w + t.drift * time + Math.sin(time * 0.7 + i) * t.sway - vx * 0.95, w);
      const y = vy + wrap(rnd(i, 3) * h + Math.cos(time * 0.5 + i * 2) * t.sway - vy * 0.95, h);
      ctx.globalAlpha = t.alpha * (0.5 + 0.5 * Math.sin(time + i));
      ctx.fillRect(Math.round(x), Math.round(y), 1, 1);
    }
  }
  ctx.globalAlpha = 1;
}
