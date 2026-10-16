import { W, type Ctx2D } from './types';

export const TAU = Math.PI * 2;

/** Hue (0-360) and saturation (%). Lightness is decided by whoever draws. */
export type HS = [number, number];
export const hsl = ([h, s]: HS, l: number, a = 1) => `hsla(${h}, ${s}%, ${l}%, ${a})`;

/** Deterministic PRNG: same seed, same video. */
export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function wrapPi(a: number) {
  a = (a + Math.PI) % TAU;
  if (a < 0) a += TAU;
  return a - Math.PI;
}

/** Reflects the velocity on a normal, nudges its angle a bit to avoid periodic orbits and enforces a minimum speed. */
export function bounce(
  vx: number, vy: number, nx: number, ny: number,
  rng: () => number, minSpeed: number,
): [number, number] {
  const dot = vx * nx + vy * ny;
  vx -= 2 * dot * nx;
  vy -= 2 * dot * ny;
  const jitter = (rng() - 0.5) * 0.14;
  const c = Math.cos(jitter), s = Math.sin(jitter);
  [vx, vy] = [vx * c - vy * s, vx * s + vy * c];
  const sp = Math.hypot(vx, vy);
  if (sp < minSpeed) {
    vx *= minSpeed / sp;
    vy *= minSpeed / sp;
  }
  return [vx, vy];
}

export interface Particle {
  x: number; y: number; vx: number; vy: number;
  life: number; maxLife: number; color: HS; size: number;
}

export function updateParticles(ps: Particle[], dt: number, gravity: number) {
  for (const p of ps) {
    p.vy += gravity * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.life -= dt;
  }
  return ps.filter((p) => p.life > 0);
}

export function drawParticles(ctx: Ctx2D, ps: Particle[]) {
  for (const p of ps) {
    const a = Math.max(0, p.life / p.maxLife);
    ctx.fillStyle = hsl(p.color, 82, a);
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size * (0.5 + a * 0.5), 0, TAU);
    ctx.fill();
  }
}

export function burst(
  ps: Particle[], rng: () => number, x: number, y: number,
  count: number, speed: number, colors: HS[],
) {
  for (let i = 0; i < count; i++) {
    const a = rng() * TAU;
    const s = speed * (0.3 + rng() * 0.7);
    const life = 1 + rng() * 1.5;
    ps.push({
      x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s,
      life, maxLife: life, color: colors[i % colors.length], size: 5 + rng() * 7,
    });
  }
}

/** The Lullaballs mascot: a pastel ball with a sleepy smile and blushing cheeks. */
export function drawMascot(
  ctx: Ctx2D, x: number, y: number, r: number, hue: number, squash = 0, sat = 55, light = 74,
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(1 + squash * 0.18, 1 - squash * 0.18);
  const g = ctx.createRadialGradient(-r * 0.35, -r * 0.4, r * 0.1, 0, 0, r);
  g.addColorStop(0, `hsl(${hue}, ${Math.min(100, sat + 15)}%, ${Math.max(light + 18, 90)}%)`);
  g.addColorStop(1, `hsl(${hue}, ${sat}%, ${light}%)`);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, TAU);
  ctx.fill();
  if (r >= 12) {
    const e = r * 0.3;
    ctx.fillStyle = '#3a2d4f';
    ctx.beginPath();
    ctx.arc(-e, -r * 0.08, r * 0.11, 0, TAU);
    ctx.arc(e, -r * 0.08, r * 0.11, 0, TAU);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.beginPath();
    ctx.arc(-e + r * 0.04, -r * 0.13, r * 0.04, 0, TAU);
    ctx.arc(e + r * 0.04, -r * 0.13, r * 0.04, 0, TAU);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,140,170,0.55)';
    ctx.beginPath();
    ctx.ellipse(-r * 0.52, r * 0.18, r * 0.14, r * 0.09, 0, 0, TAU);
    ctx.ellipse(r * 0.52, r * 0.18, r * 0.14, r * 0.09, 0, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = '#3a2d4f';
    ctx.lineWidth = Math.max(1.5, r * 0.06);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(0, r * 0.12, r * 0.14, 0.15 * Math.PI, 0.85 * Math.PI);
    ctx.stroke();
  }
  ctx.restore();
}

/** Headline in the top safe area (TikTok's tabs sit above ~y=200). */
export function drawOverlay(ctx: Ctx2D, text: string) {
  if (!text) return;
  ctx.save();
  ctx.font = '700 64px "Nunito", "Segoe UI", system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(20,15,40,0.55)';
  ctx.shadowBlur = 18;
  // A soft dark outline keeps white text readable on light skies too.
  ctx.lineWidth = 9;
  ctx.lineJoin = 'round';
  ctx.strokeStyle = 'rgba(45,30,70,0.5)';
  ctx.fillStyle = '#fff8f0';
  wrap(ctx, text, 900).forEach((line, i) => {
    ctx.strokeText(line, W / 2, 300 + i * 80);
    ctx.fillText(line, W / 2, 300 + i * 80);
  });
  ctx.restore();
}

export function drawCaption(ctx: Ctx2D, text: string, y: number) {
  ctx.save();
  ctx.font = '700 50px "Nunito", "Segoe UI", system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(20,15,40,0.5)';
  ctx.shadowBlur = 12;
  ctx.lineWidth = 8;
  ctx.lineJoin = 'round';
  ctx.strokeStyle = 'rgba(45,30,70,0.5)';
  ctx.strokeText(text, W / 2, y);
  ctx.fillStyle = 'rgba(255,248,240,0.95)';
  ctx.fillText(text, W / 2, y);
  ctx.restore();
}

function wrap(ctx: Ctx2D, text: string, maxW: number) {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    const next = cur ? `${cur} ${w}` : w;
    if (ctx.measureText(next).width > maxW && cur) {
      lines.push(cur);
      cur = w;
    } else cur = next;
  }
  if (cur) lines.push(cur);
  return lines;
}
