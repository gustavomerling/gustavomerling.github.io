import { getBackground } from '../backgrounds';
import { getPalette } from '../palettes';
import { DT, FPS, H, SUBSTEPS, W, type Ctx2D, type SimEvent, type Template } from '../types';
import {
  TAU, bounce, burst, drawCaption, drawMascot, drawOverlay, drawParticles, hsl,
  mulberry32, updateParticles, type Particle,
} from '../util';

/** The mascot bounces inside a circle and grows a little on every bounce until it fills it. */
export const growingBall: Template = {
  id: 'growing-ball',
  name: 'Bolinha que cresce',
  hooks: [
    { text: 'Every bounce makes it bigger 🎵' },
    { text: 'Will it fill the whole circle? 🫧', poll: ['YES ✅', 'NO ❌'] },
    { text: 'Guess when it stops growing 👀' },
    { text: 'This gets so satisfying at the end 😌' },
    { text: 'Watch it grow to the beat 🎶' },
  ],
  blurbs: [
    'Satisfying growing ball simulation: every bounce makes it bigger and plays a note.',
    'Relaxing bouncing ball that grows with the music, until it fills the circle.',
    'Calm piano melody played by a growing ball. Oddly satisfying physics for sleep.',
  ],
  tags: ['#growingball', '#oddlysatisfying'],
  defaults: { arena: 430, startRadius: 22, growth: 2.15, gravity: 1400, minSpeed: 700 },
  specs: [
    { key: 'growth', label: 'Crescimento por quique', min: 0.5, max: 8, step: 0.1 },
    { key: 'startRadius', label: 'Raio inicial', min: 10, max: 80, step: 1 },
    { key: 'gravity', label: 'Gravidade', min: 0, max: 3000, step: 50 },
  ],
  create(p, seed, look = {}) {
    const background = getBackground(look.background);
    const palette = getPalette(look.palette).colors;
    const rng = mulberry32(seed);
    const cx = W / 2, cy = H / 2;
    const R = p.arena;
    const a0 = rng() * TAU;
    let x = cx + (rng() - 0.5) * 100, y = cy - 100;
    let vx = Math.cos(a0) * p.minSpeed, vy = Math.sin(a0) * p.minSpeed;
    let r = p.startRadius;
    let hits = 0;
    // Always one rng() call, whatever the palette size, so the physics of a seed never changes with the look.
    let colorIdx = Math.floor(rng() * 1000);
    let flash = 0, squash = 0;
    let popped = false;
    let particles: Particle[] = [];
    const color = () => palette[colorIdx % palette.length];

    const sim = {
      time: 0,
      finishTime: null as number | null,
      step() {
        const events: SimEvent[] = [];
        if (!popped) {
          for (let s = 0; s < SUBSTEPS; s++) {
            const t = sim.time + s * DT;
            vy += p.gravity * DT;
            x += vx * DT;
            y += vy * DT;
            const dx = x - cx, dy = y - cy;
            const d = Math.hypot(dx, dy) || 1e-6;
            if (d + r < R) continue;
            const nx = dx / d, ny = dy / d;
            if (vx * nx + vy * ny > 0) {
              [vx, vy] = bounce(vx, vy, nx, ny, rng, p.minSpeed);
              r = Math.min(R - 4, r + p.growth);
              hits++;
              colorIdx++;
              flash = 1;
              squash = 1;
              events.push({ t, kind: 'hit', x });
              if (r >= R - 6) {
                popped = true;
                sim.finishTime = t;
                events.push({ t, kind: 'finish' });
                burst(particles, rng, cx, cy, 220, 1300, palette);
                break;
              }
            }
            x = cx + nx * (R - r);
            y = cy + ny * (R - r);
          }
        }
        sim.time += 1 / FPS;
        particles = updateParticles(particles, 1 / FPS, 600);
        flash *= 0.88;
        squash *= 0.8;
        return events;
      },
      draw(ctx: Ctx2D, overlay: string) {
        background.draw(ctx, sim.time);
        ctx.strokeStyle = background.light ? hsl(color(), 52 + flash * 20) : hsl(color(), 82 + flash * 12, 0.95);
        ctx.lineWidth = 10 + flash * 6;
        ctx.beginPath();
        ctx.arc(cx, cy, R + 5, 0, TAU);
        ctx.stroke();
        if (!popped) drawMascot(ctx, x, y, r, color()[0], squash * Math.min(1, 40 / r));
        drawParticles(ctx, particles);
        drawOverlay(ctx, overlay);
        const pct = Math.round(((r - p.startRadius) / (R - 6 - p.startRadius)) * 100);
        drawCaption(ctx, popped ? 'Full! Goodnight ✨' : `${hits} bounces · ${pct}%`, cy + 640);
      },
    };
    void H;
    return sim;
  },
};
