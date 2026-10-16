import { getBackground } from '../backgrounds';
import { getPalette } from '../palettes';
import { DT, FPS, SUBSTEPS, W, type Ctx2D, type SimEvent, type Template } from '../types';
import {
  TAU, bounce, burst, drawCaption, drawMascot, drawOverlay, drawParticles, hsl,
  mulberry32, updateParticles, type Particle,
} from '../util';

type Seg = [number, number, number, number];

/** A little red Santa hat on top of the mascot. */
function drawSantaHat(ctx: Ctx2D, x: number, y: number, r: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-0.35);
  ctx.fillStyle = '#d83a4a';
  ctx.beginPath();
  ctx.moveTo(-r * 0.75, -r * 0.62);
  ctx.quadraticCurveTo(r * 0.1, -r * 2.2, r * 0.95, -r * 1.55);
  ctx.lineTo(r * 0.75, -r * 0.62);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#fff6f0';
  ctx.beginPath();
  ctx.ellipse(0, -r * 0.62, r * 0.85, r * 0.2, 0, 0, TAU);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(r * 0.95, -r * 1.55, r * 0.22, 0, TAU);
  ctx.fill();
  ctx.restore();
}

/** The ball bounces inside a Christmas tree; every bounce lights one more ornament until the star shines. */
export const christmasTree: Template = {
  id: 'christmas-tree',
  name: 'Árvore de Natal',
  defaultOverlay: 'Every bounce decorates the tree 🎄',
  defaults: { ornaments: 120, gravity: 600, ballRadius: 15, minSpeed: 430 },
  specs: [
    { key: 'ornaments', label: 'Enfeites', min: 20, max: 150, step: 1 },
    { key: 'gravity', label: 'Gravidade', min: 200, max: 3000, step: 50 },
  ],
  create(p, seed, look = {}) {
    const background = getBackground(look.background);
    const palette = getPalette(look.palette).colors;
    const rng = mulberry32(seed);
    const br = p.ballRadius;
    const apexX = W / 2, apexY = 560, baseY = 1400, halfW = 420;
    const bl: [number, number] = [apexX - halfW, baseY], brc: [number, number] = [apexX + halfW, baseY];
    const walls: Seg[] = [
      [apexX, apexY, bl[0], bl[1]],
      [apexX, apexY, brc[0], brc[1]],
      [bl[0], bl[1], brc[0], brc[1]],
    ];
    const thick = 10;
    const target = Math.round(p.ornaments);

    // Ornament spots spread over the tree (random order = the tree lights up all over, not row by row).
    const slots: { x: number; y: number; color: (typeof palette)[number]; on: number }[] = [];
    let colorIdx = Math.floor(rng() * 1000);
    for (let tries = 0; slots.length < target && tries < 20000; tries++) {
      const y = apexY + 90 + rng() * (baseY - apexY - 130);
      const half = (halfW * (y - apexY)) / (baseY - apexY) - 38;
      if (half <= 0) continue;
      const x = apexX + (rng() * 2 - 1) * half;
      if (slots.every((s) => (s.x - x) ** 2 + (s.y - y) ** 2 > 44 * 44)) {
        slots.push({ x, y, color: palette[colorIdx++ % palette.length], on: 0 });
      }
    }
    const total = slots.length;

    const a0 = -Math.PI / 2 + (rng() - 0.5) * 1.4;
    let x = apexX + (rng() - 0.5) * 200, y = baseY - 200;
    let vx = Math.cos(a0) * p.minSpeed, vy = Math.sin(a0) * p.minSpeed;
    let lit = 0;
    let squash = 0, starGlow = 0;
    let done = false;
    let particles: Particle[] = [];

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
          let hit = false;
          for (const [ax, ay, bx, by] of walls) {
            const ex = bx - ax, ey = by - ay;
            const u = Math.max(0, Math.min(1, ((x - ax) * ex + (y - ay) * ey) / (ex * ex + ey * ey)));
            const qx = ax + ex * u, qy = ay + ey * u;
            const dx = x - qx, dy = y - qy;
            const d = Math.hypot(dx, dy);
            const minD = br + thick / 2;
            if (d >= minD || d === 0) continue;
            const nx = dx / d, ny = dy / d;
            x = qx + nx * minD;
            y = qy + ny * minD;
            if (vx * nx + vy * ny < 0) {
              [vx, vy] = bounce(vx, vy, nx, ny, rng, p.minSpeed);
              hit = true;
            }
          }
          if (!hit) continue;
          squash = 1;
          if (done) continue;
          const slot = slots[lit];
          slot.on = 1;
          lit++;
          for (let i = 0; i < 8; i++) {
            const a = rng() * TAU, sp = 60 + rng() * 140, life = 0.5 + rng() * 0.5;
            particles.push({ x: slot.x, y: slot.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life, maxLife: life, color: slot.color, size: 3 + rng() * 3 });
          }
          events.push({ t, kind: 'hit' });
          if (lit >= total) {
            done = true;
            sim.finishTime = t;
            starGlow = 1;
            events.push({ t, kind: 'finish' });
            burst(particles, rng, apexX, apexY - 40, 180, 900, palette);
          }
        }
        sim.time += 1 / FPS;
        particles = updateParticles(particles, 1 / FPS, 500);
        squash *= 0.8;
        return events;
      },
      draw(ctx: Ctx2D, overlay: string) {
        background.draw(ctx, sim.time);
        // Trunk and tree outline.
        ctx.fillStyle = 'rgba(120,80,60,0.85)';
        ctx.fillRect(apexX - 45, baseY + 6, 90, 110);
        ctx.fillStyle = background.light ? 'rgba(40,110,70,0.25)' : 'rgba(40,140,90,0.18)';
        ctx.beginPath();
        ctx.moveTo(apexX, apexY); ctx.lineTo(bl[0], bl[1]); ctx.lineTo(brc[0], brc[1]);
        ctx.closePath();
        ctx.fill();
        ctx.lineJoin = 'round';
        ctx.lineWidth = thick;
        ctx.strokeStyle = background.light ? 'hsl(145, 50%, 38%)' : 'hsl(145, 55%, 62%)';
        ctx.stroke();
        // Ornaments: dim placeholders that light up one by one, with a soft twinkle once lit.
        for (let i = 0; i < total; i++) {
          const s = slots[i];
          if (i < lit) {
            const tw = 0.85 + 0.15 * Math.sin(sim.time * 3 + i);
            ctx.fillStyle = hsl(s.color, 68 * tw + (s.color[1] === 0 ? 20 : 0));
            ctx.beginPath();
            ctx.arc(s.x, s.y, 12, 0, TAU);
            ctx.fill();
            ctx.fillStyle = 'rgba(255,255,255,0.7)';
            ctx.beginPath();
            ctx.arc(s.x - 3.5, s.y - 4, 3.5, 0, TAU);
            ctx.fill();
          } else {
            ctx.strokeStyle = 'rgba(255,255,255,0.18)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(s.x, s.y, 9, 0, TAU);
            ctx.stroke();
          }
        }
        // Star on top: faint until the tree is complete.
        const glowA = done ? 0.6 + 0.3 * Math.sin(sim.time * 4) : 0.15;
        const g = ctx.createRadialGradient(apexX, apexY - 40, 0, apexX, apexY - 40, 150);
        g.addColorStop(0, `rgba(255,225,120,${glowA})`);
        g.addColorStop(1, 'rgba(255,225,120,0)');
        ctx.fillStyle = g;
        ctx.fillRect(apexX - 150, apexY - 190, 300, 300);
        ctx.fillStyle = done ? '#ffd95a' : 'rgba(255,217,90,0.45)';
        ctx.beginPath();
        for (let k = 0; k < 10; k++) {
          const a = -Math.PI / 2 + (k * Math.PI) / 5;
          const rr = k % 2 ? 22 : 52;
          ctx.lineTo(apexX + Math.cos(a) * rr, apexY - 40 + Math.sin(a) * rr);
        }
        ctx.closePath();
        ctx.fill();
        drawParticles(ctx, particles);
        drawMascot(ctx, x, y, br, 262, squash);
        drawSantaHat(ctx, x, y, br);
        drawOverlay(ctx, overlay);
        drawCaption(ctx, done ? 'Merry Christmas! 🎄' : `${lit}/${total} ornaments`, 1600);
        void starGlow;
      },
    };
    return sim;
  },
};
