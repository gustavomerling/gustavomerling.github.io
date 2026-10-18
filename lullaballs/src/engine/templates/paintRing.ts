import { getBackground } from '../backgrounds';
import { getPalette } from '../palettes';
import { DT, FPS, SUBSTEPS, W, H, type Ctx2D, type SimEvent, type Template } from '../types';
import {
  TAU, bounce, burst, drawCaption, drawMascot, drawOverlay, drawParticles, hsl,
  mulberry32, updateParticles, type HS, type Particle,
} from '../util';

const mod = (x: number, m: number) => ((x % m) + m) % m;

/** Every spot of the (slowly rotating) circle the ball touches gets painted. Ends at 100%. */
export const paintRing: Template = {
  id: 'paint-ring',
  name: 'Pintar a borda',
  hooks: [
    { text: 'Can it paint the whole circle? 🎨', poll: ['YES ✅', 'NO ❌'] },
    { text: 'The last gap is the hardest 😤' },
    { text: 'Will it finish painting before 1:00? ⏱️', poll: ['YES ✅', 'NO ❌'] },
    { text: 'Watch the colors fill in 🌈' },
    { text: 'Wait for the very last spot 👀' },
  ],
  blurbs: [
    'Satisfying paint simulation: a bouncing ball colors the circle with every hit, to soft piano music.',
    'Relaxing ball painting the ring one bounce at a time. Calm melody for sleep.',
    'Oddly satisfying color fill with a bouncing ball and a lullaby.',
  ],
  tags: ['#paintball', '#oddlysatisfying'],
  defaults: { radius: 420, segments: 120, brushDeg: 14, spin: 0.35, gravity: 1400, ballRadius: 16, minSpeed: 650 },
  specs: [
    { key: 'brushDeg', label: 'Pincel (graus)', min: 2, max: 30, step: 0.5 },
    { key: 'spin', label: 'Rotação', min: 0, max: 2, step: 0.05 },
    { key: 'gravity', label: 'Gravidade', min: 0, max: 3000, step: 50 },
  ],
  create(p, seed, look = {}) {
    const background = getBackground(look.background);
    const palette = getPalette(look.palette).colors;
    const rng = mulberry32(seed);
    const cx = W / 2, cy = H / 2;
    const R = p.radius, br = p.ballRadius;
    const m = Math.round(p.segments);
    const seg = TAU / m;
    const brush = (p.brushDeg * Math.PI) / 180;
    const rot0 = rng() * TAU;
    let colorIdx = Math.floor(rng() * 1000);
    const paint: (HS | null)[] = Array(m).fill(null);
    const glow = Array<number>(m).fill(0);
    let count = 0;
    const a0 = rng() * TAU;
    let x = cx, y = cy, vx = Math.cos(a0) * p.minSpeed, vy = Math.sin(a0) * p.minSpeed;
    let squash = 0;
    let done = false;
    let particles: Particle[] = [];
    const rotAt = (t: number) => rot0 + p.spin * t;

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
          if (d + br <= R) continue;
          const nx = dx / d, ny = dy / d;
          if (vx * nx + vy * ny > 0) {
            [vx, vy] = bounce(vx, vy, nx, ny, rng, p.minSpeed);
            squash = 1;
            if (!done) {
              // Paint the segments under the brush, in the ring's rotating frame.
              const local = mod(Math.atan2(dy, dx) - rotAt(t), TAU);
              const color = palette[colorIdx++ % palette.length];
              const first = Math.floor((local - brush / 2) / seg);
              const last = Math.floor((local + brush / 2) / seg);
              for (let i = first; i <= last; i++) {
                const k = mod(i, m);
                if (!paint[k]) count++;
                paint[k] = color;
                glow[k] = 1;
              }
              events.push({ t, kind: 'hit', x });
              if (count === m) {
                done = true;
                sim.finishTime = t;
                events.push({ t, kind: 'finish' });
                burst(particles, rng, cx, cy, 200, 1200, palette);
              }
            }
          }
          x = cx + nx * (R - br);
          y = cy + ny * (R - br);
        }
        sim.time += 1 / FPS;
        particles = updateParticles(particles, 1 / FPS, 700);
        for (let i = 0; i < m; i++) glow[i] *= 0.93;
        squash *= 0.8;
        return events;
      },
      draw(ctx: Ctx2D, overlay: string) {
        background.draw(ctx, sim.time);
        const rot = rotAt(sim.time);
        ctx.lineCap = 'butt';
        for (let k = 0; k < m; k++) {
          const c = paint[k];
          const from = rot + k * seg - 0.004, to = rot + (k + 1) * seg + 0.004;
          ctx.beginPath();
          ctx.arc(cx, cy, R + 8, from, to);
          if (c) {
            ctx.strokeStyle = background.light ? hsl(c, 58 + glow[k] * 20) : hsl(c, 76 + glow[k] * 16);
            ctx.lineWidth = 16 + glow[k] * 6;
          } else {
            ctx.strokeStyle = background.light ? 'rgba(255,255,255,0.75)' : 'rgba(255,255,255,0.28)';
            ctx.lineWidth = 8;
          }
          ctx.stroke();
        }
        drawParticles(ctx, particles);
        drawMascot(ctx, x, y, br, 262, squash);
        drawOverlay(ctx, overlay);
        const pct = Math.floor((count / m) * 100);
        drawCaption(ctx, done ? 'All painted! Goodnight ✨' : `${pct}% painted`, cy + 640);
      },
    };
    return sim;
  },
};
