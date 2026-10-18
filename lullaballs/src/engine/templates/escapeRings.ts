import { getBackground } from '../backgrounds';
import { getPalette } from '../palettes';
import { DT, FPS, H, SUBSTEPS, W, type Ctx2D, type SimEvent, type Template } from '../types';
import {
  TAU, bounce, burst, drawCaption, drawMascot, drawOverlay, drawParticles, hsl,
  mulberry32, updateParticles, wrapPi, type Particle,
} from '../util';

/** The mascot inside concentric rotating rings. Each ring has a gap; escaping through it shatters the ring. */
export const escapeRings: Template = {
  id: 'escape-rings',
  name: 'Escape dos anéis',
  hooks: [
    { text: 'Can the little ball escape? 🌙', poll: ['YES ✅', 'NO ❌'] },
    { text: 'Bet it gets stuck forever 👀' },
    { text: 'Will it escape before 1:00? ⏱️', poll: ['YES ✅', 'NO ❌'] },
    { text: 'Only 1% watch until it gets free 🌙' },
    { text: 'Count the rings with me… 🔢' },
    { text: 'Wait for the last ring 😮‍💨' },
  ],
  blurbs: [
    'Relaxing bouncing ball escaping spinning rings, with soft piano music for sleep and calm.',
    'Satisfying ring escape simulation: every bounce plays a note of the melody.',
    'A sleepy little ball, a dozen rotating rings and a lullaby. Perfect to fall asleep to.',
  ],
  tags: ['#ringescape', '#oddlysatisfying'],
  defaults: {
    rings: 12, innerRadius: 120, spacing: 34, gapDeg: 35, spin: 0.9,
    gravity: 1400, ballRadius: 16, minSpeed: 650,
  },
  specs: [
    { key: 'rings', label: 'Anéis', min: 4, max: 13, step: 1 },
    { key: 'gapDeg', label: 'Abertura (graus)', min: 15, max: 90, step: 1 },
    { key: 'spin', label: 'Rotação', min: 0.2, max: 3, step: 0.05 },
    { key: 'gravity', label: 'Gravidade', min: 0, max: 3000, step: 50 },
  ],
  create(p, seed, look = {}) {
    const background = getBackground(look.background);
    const palette = getPalette(look.palette).colors;
    const rng = mulberry32(seed);
    const cx = W / 2, cy = H / 2;
    const n = Math.round(p.rings);
    const gapRad = (p.gapDeg * Math.PI) / 180;
    // Always one rng() call here, whatever the palette size, so the physics of a seed never changes with the look.
    const colorOffset = Math.floor(rng() * 1000);
    const rings = Array.from({ length: n }, (_, i) => ({
      r: p.innerRadius + i * p.spacing,
      gap0: rng() * TAU,
      spin: p.spin * (1 + i * 0.03) * (i % 2 ? -1 : 1),
      broken: false,
      flash: 0,
      color: palette[(i + colorOffset) % palette.length],
    }));
    const a0 = rng() * TAU;
    let x = cx, y = cy, vx = Math.cos(a0) * p.minSpeed, vy = Math.sin(a0) * p.minSpeed;
    const br = p.ballRadius;
    let active = 0;
    let crossing = false;
    let particles: Particle[] = [];
    const trail: [number, number][] = [];
    let squash = 0;

    const gapAngle = (i: number, t: number) => rings[i].gap0 + rings[i].spin * t;

    function shatter(i: number, t: number) {
      const r = rings[i];
      const g = gapAngle(i, t);
      const pieces = 40;
      for (let k = 0; k < pieces; k++) {
        const a = g + gapRad / 2 + ((TAU - gapRad) * k) / pieces;
        const sp = 120 + rng() * 300;
        const life = 1 + rng() * 1;
        particles.push({
          x: cx + Math.cos(a) * r.r, y: cy + Math.sin(a) * r.r,
          vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 80,
          life, maxLife: life, color: r.color, size: 5 + rng() * 5,
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
          if (active >= n) continue;
          const ring = rings[active];
          const dx = x - cx, dy = y - cy;
          const d = Math.hypot(dx, dy);
          if (d + br < ring.r) {
            crossing = false;
            continue;
          }
          const half = gapRad / 2 - Math.asin(Math.min(1, br / ring.r));
          const inGap = Math.abs(wrapPi(Math.atan2(dy, dx) - gapAngle(active, t))) < half;
          if (crossing || inGap) {
            crossing = true;
            if (d - br > ring.r) {
              ring.broken = true;
              crossing = false;
              shatter(active, t);
              active++;
              events.push({ t, kind: 'break', x });
              if (active >= n) {
                sim.finishTime = t;
                events.push({ t, kind: 'finish' });
                burst(particles, rng, x, y, 120, 900, palette);
                vy = -1400;
              }
            }
            continue;
          }
          const nx = dx / d, ny = dy / d;
          if (vx * nx + vy * ny > 0) {
            [vx, vy] = bounce(vx, vy, nx, ny, rng, p.minSpeed);
            ring.flash = 1;
            squash = 1;
            events.push({ t, kind: 'hit', x });
          }
          x = cx + nx * (ring.r - br);
          y = cy + ny * (ring.r - br);
        }
        sim.time += 1 / FPS;
        trail.push([x, y]);
        if (trail.length > 12) trail.shift();
        particles = updateParticles(particles, 1 / FPS, 700);
        for (const r of rings) r.flash *= 0.88;
        squash *= 0.8;
        return events;
      },
      draw(ctx: Ctx2D, overlay: string) {
        background.draw(ctx, sim.time);
        ctx.lineCap = 'round';
        for (let i = 0; i < n; i++) {
          const r = rings[i];
          if (r.broken) continue;
          const g = gapAngle(i, sim.time);
          const isActive = i === active;
          ctx.strokeStyle = background.light
            ? (isActive ? hsl(r.color, 52 + r.flash * 20) : hsl(r.color, 55, 0.7))
            : (isActive ? hsl(r.color, 80 + r.flash * 12) : hsl(r.color, 74, 0.55));
          ctx.lineWidth = isActive ? 9 + r.flash * 5 : 6;
          ctx.beginPath();
          ctx.arc(cx, cy, r.r, g + gapRad / 2, g - gapRad / 2 + TAU);
          ctx.stroke();
        }
        drawParticles(ctx, particles);
        trail.forEach(([tx, ty], i) => {
          const a = (i + 1) / trail.length;
          ctx.fillStyle = `rgba(255,240,255,${a * 0.25})`;
          ctx.beginPath();
          ctx.arc(tx, ty, br * a * 0.8, 0, TAU);
          ctx.fill();
        });
        if (y < H + br * 2) drawMascot(ctx, x, y, br, 262, squash);
        drawOverlay(ctx, overlay);
        const left = n - active;
        drawCaption(ctx, left > 0 ? `${left} ${left === 1 ? 'ring' : 'rings'} left` : 'Free! Sweet dreams ✨', cy + 640);
      },
    };
    return sim;
  },
};
