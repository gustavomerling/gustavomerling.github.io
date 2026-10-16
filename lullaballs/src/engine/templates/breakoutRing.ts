import { getBackground } from '../backgrounds';
import { getPalette } from '../palettes';
import { DT, FPS, SUBSTEPS, W, H, type Ctx2D, type SimEvent, type Template } from '../types';
import {
  TAU, bounce, burst, drawCaption, drawMascot, drawOverlay, drawParticles, hsl,
  mulberry32, updateParticles, type Particle,
} from '../util';

const mod = (x: number, m: number) => ((x % m) + m) % m;

/** A slowly rotating ring of blocks lines the inside of a circle. Every block the ball touches breaks. */
export const breakoutRing: Template = {
  id: 'breakout-ring',
  name: 'Quebra-blocos',
  defaultOverlay: 'Can it break every block? 🧱',
  defaults: { radius: 420, blocks: 40, thickness: 34, spin: 0.35, gravity: 1400, ballRadius: 16, minSpeed: 650 },
  specs: [
    { key: 'blocks', label: 'Blocos', min: 12, max: 120, step: 1 },
    { key: 'spin', label: 'Rotação', min: 0, max: 2, step: 0.05 },
    { key: 'gravity', label: 'Gravidade', min: 0, max: 3000, step: 50 },
  ],
  create(p, seed, look = {}) {
    const background = getBackground(look.background);
    const palette = getPalette(look.palette).colors;
    const rng = mulberry32(seed);
    const cx = W / 2, cy = H / 2;
    const R = p.radius, br = p.ballRadius;
    const inner = R - p.thickness;
    const n = Math.round(p.blocks);
    const seg = TAU / n;
    const rot0 = rng() * TAU;
    const colorOffset = Math.floor(rng() * 1000);
    const alive = Array<boolean>(n).fill(true);
    const flash = Array<number>(n).fill(0);
    let left = n;
    const a0 = rng() * TAU;
    let x = cx, y = cy, vx = Math.cos(a0) * p.minSpeed, vy = Math.sin(a0) * p.minSpeed;
    let squash = 0, wallFlash = 0;
    let done = false;
    let particles: Particle[] = [];

    const rotAt = (t: number) => rot0 + p.spin * t;
    const blockColor = (k: number) => palette[(k + colorOffset) % palette.length];

    function shatter(k: number, t: number) {
      const mid = rotAt(t) + (k + 0.5) * seg;
      const r = inner + p.thickness / 2;
      for (let i = 0; i < 14; i++) {
        const a = mid + (rng() - 0.5) * seg;
        const sp = 100 + rng() * 260;
        const life = 0.8 + rng() * 0.8;
        particles.push({
          x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r,
          vx: -Math.cos(a) * sp + (rng() - 0.5) * 120, vy: -Math.sin(a) * sp - 60,
          life, maxLife: life, color: blockColor(k), size: 4 + rng() * 5,
        });
      }
    }

    const sim = {
      time: 0,
      finishTime: null as number | null,
      step() {
        const events: SimEvent[] = [];
        for (let s = 0; s < SUBSTEPS; s++) {
          const t = sim.time + s * DT;
          vy += p.gravity * DT;
          x += vx * DT;
          y += vy * DT;
          const dx = x - cx, dy = y - cy;
          const d = Math.hypot(dx, dy) || 1e-6;
          const nx = dx / d, ny = dy / d;
          const k = Math.floor(mod(Math.atan2(dy, dx) - rotAt(t), TAU) / seg) % n;
          if (!done && alive[k] && d + br > inner) {
            // Bounce off the block's inner face (if the ball wasn't already inside a broken slot) and break it.
            if (d < inner && vx * nx + vy * ny > 0) {
              [vx, vy] = bounce(vx, vy, nx, ny, rng, p.minSpeed);
              x = cx + nx * (inner - br);
              y = cy + ny * (inner - br);
            }
            alive[k] = false;
            left--;
            squash = 1;
            shatter(k, t);
            events.push({ t, kind: 'break' });
            if (left === 0) {
              done = true;
              sim.finishTime = t;
              events.push({ t, kind: 'finish' });
              burst(particles, rng, cx, cy, 200, 1200, palette);
            }
          } else if (d + br > R) {
            if (vx * nx + vy * ny > 0) {
              [vx, vy] = bounce(vx, vy, nx, ny, rng, p.minSpeed);
              squash = 1;
              wallFlash = 1;
              if (!done) events.push({ t, kind: 'hit' });
            }
            x = cx + nx * (R - br);
            y = cy + ny * (R - br);
          }
        }
        sim.time += 1 / FPS;
        particles = updateParticles(particles, 1 / FPS, 700);
        for (let i = 0; i < n; i++) flash[i] *= 0.85;
        squash *= 0.8;
        wallFlash *= 0.85;
        return events;
      },
      draw(ctx: Ctx2D, overlay: string) {
        background.draw(ctx, sim.time);
        const rot = rotAt(sim.time);
        const wallColor = palette[0];
        ctx.strokeStyle = background.light ? hsl(wallColor, 55 + wallFlash * 15, 0.8) : hsl(wallColor, 85, 0.5 + wallFlash * 0.4);
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.arc(cx, cy, R + 3, 0, TAU);
        ctx.stroke();
        ctx.lineCap = 'butt';
        ctx.lineWidth = p.thickness - 6;
        const pad = Math.min(0.02, seg * 0.12);
        for (let k = 0; k < n; k++) {
          if (!alive[k]) continue;
          ctx.strokeStyle = background.light ? hsl(blockColor(k), 60) : hsl(blockColor(k), 78);
          ctx.beginPath();
          ctx.arc(cx, cy, inner + p.thickness / 2, rot + k * seg + pad, rot + (k + 1) * seg - pad);
          ctx.stroke();
        }
        drawParticles(ctx, particles);
        drawMascot(ctx, x, y, br, 262, squash);
        drawOverlay(ctx, overlay);
        drawCaption(ctx, done ? 'All blocks broken! ✨' : `${left} ${left === 1 ? 'block' : 'blocks'} left`, cy + 640);
      },
    };
    return sim;
  },
};
