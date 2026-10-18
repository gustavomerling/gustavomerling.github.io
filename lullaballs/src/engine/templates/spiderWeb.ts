import { getBackground } from '../backgrounds';
import { getPalette } from '../palettes';
import { DT, FPS, H, SUBSTEPS, W, type Ctx2D, type SimEvent, type Template } from '../types';
import {
  TAU, bounce, burst, drawCaption, drawMascot, drawOverlay, drawParticles, hsl,
  mulberry32, updateParticles, wrapPi, type Particle,
} from '../util';

/**
 * The mascot is caught in the middle of a slowly turning spider web: concentric polygon rings strung between the
 * spokes. Every hit frays the thread it lands on, and a thread hit often enough tears open; once the ball slips
 * through a torn thread, that whole ring falls apart and the next one holds it. A spider watches from above and
 * climbs away when the ball breaks free.
 */
export const spiderWeb: Template = {
  id: 'spider-web',
  name: 'Teia de aranha',
  hooks: [
    { text: 'Can it escape the spider web? 🕸️', poll: ['YES ✅', 'NO ❌'] },
    { text: 'Will the spider catch it? 🕷️', poll: ['YES ✅', 'NO ❌'] },
    { text: '12 layers of web… can it break them all? 🕸️' },
    { text: 'Bet it gets stuck in the last layer 👀' },
    { text: 'Will it escape before 1:00? ⏱️', poll: ['YES ✅', 'NO ❌'] },
  ],
  blurbs: [
    'Spooky but cute: a little pumpkin ball escapes a spider web, every bounce a note of the song.',
    'Satisfying Halloween spider web escape simulation with relaxing music.',
    'Oddly satisfying web breaking physics. Thread by thread, layer by layer.',
  ],
  tags: ['#spiderweb', '#halloween'],
  defaults: {
    rings: 12, spokes: 14, toughness: 2, innerRadius: 120, outerRadius: 470, spin: 0.3,
    gravity: 1400, ballRadius: 16, minSpeed: 650,
  },
  specs: [
    { key: 'rings', label: 'Anéis da teia', min: 3, max: 14, step: 1 },
    { key: 'spokes', label: 'Raios da teia', min: 6, max: 24, step: 1 },
    { key: 'toughness', label: 'Batidas para rasgar um fio', min: 1, max: 6, step: 1 },
    { key: 'spin', label: 'Rotação', min: 0, max: 2, step: 0.05 },
    { key: 'gravity', label: 'Gravidade', min: 0, max: 3000, step: 50 },
  ],
  create(p, seed, look = {}) {
    const background = getBackground(look.background);
    const palette = getPalette(look.palette).colors;
    const rng = mulberry32(seed);
    const cx = W / 2, cy = H / 2;
    const n = Math.round(p.rings);
    const S = Math.round(p.spokes);
    const seg = TAU / S;
    /** Distance from the center to the middle of each thread, as a share of the ring's radius. */
    const apo = Math.cos(seg / 2);
    const br = p.ballRadius;
    const hp0 = Math.round(p.toughness);
    const rot0 = rng() * TAU;
    const colorOffset = Math.floor(rng() * 1000);
    const rings = Array.from({ length: n }, (_, i) => ({
      r: n === 1 ? p.outerRadius : p.innerRadius + ((p.outerRadius - p.innerRadius) * i) / (n - 1),
      hp: Array<number>(S).fill(hp0),
      flash: Array<number>(S).fill(0),
      broken: false,
      color: palette[(i + colorOffset) % palette.length],
    }));
    const a0 = rng() * TAU;
    let x = cx, y = cy, vx = Math.cos(a0) * p.minSpeed, vy = Math.sin(a0) * p.minSpeed;
    let active = 0;
    let squash = 0;
    let particles: Particle[] = [];
    const trail: [number, number][] = [];
    /** When the ball broke free: the spider climbs away from then on. */
    let freeAt: number | null = null;

    const rotAt = (t: number) => rot0 + p.spin * t;
    const mod = (v: number, m: number) => ((v % m) + m) % m;
    const vertex = (r: number, rot: number, k: number): [number, number] =>
      [cx + Math.cos(rot + k * seg) * r, cy + Math.sin(rot + k * seg) * r];

    /** Silk bits flying off a thread (k) of ring i, or off the whole ring when k is null. */
    function shred(i: number, k: number | null, t: number) {
      const ring = rings[i];
      const rot = rotAt(t);
      const pieces = k === null ? 50 : 10;
      for (let j = 0; j < pieces; j++) {
        const a = k === null ? rng() * TAU : rot + (k + rng()) * seg;
        const sp = 80 + rng() * (k === null ? 320 : 200);
        const life = 0.8 + rng();
        particles.push({
          x: cx + Math.cos(a) * ring.r * apo, y: cy + Math.sin(a) * ring.r * apo,
          vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 80,
          life, maxLife: life, color: k === null || rng() < 0.5 ? ring.color : [0, 0], size: 3 + rng() * 4,
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
          const d = Math.hypot(dx, dy) || 1e-6;
          // Out past the corners of this ring: it's left behind and falls apart.
          if (d - br > ring.r) {
            ring.broken = true;
            shred(active, null, t);
            active++;
            events.push({ t, kind: 'break', x });
            if (active >= n) {
              sim.finishTime = freeAt = t;
              events.push({ t, kind: 'finish' });
              burst(particles, rng, x, y, 120, 900, palette);
              vy = -1400;
            }
            continue;
          }
          const rot = rotAt(t);
          const k = Math.floor(mod(Math.atan2(dy, dx) - rot, TAU) / seg) % S;
          if (ring.hp[k] <= 0) continue;
          // Each thread is a straight edge of the polygon: collide with its line, along its middle normal.
          const mid = rot + (k + 0.5) * seg;
          const nx = Math.cos(mid), ny = Math.sin(mid);
          const along = dx * nx + dy * ny;
          if (along + br < ring.r * apo) continue;
          // A ball still partly inside a torn neighbor is slipping out; let it go.
          const side = wrapPi(Math.atan2(dy, dx) - mid);
          const reach = Math.asin(Math.min(1, br / d));
          const nb = side > 0 ? (k + 1) % S : (k + S - 1) % S;
          if (Math.abs(side) > seg / 2 - reach && ring.hp[nb] <= 0 && along > ring.r * apo) continue;
          if (vx * nx + vy * ny > 0) {
            [vx, vy] = bounce(vx, vy, nx, ny, rng, p.minSpeed);
            squash = 1;
            ring.flash[k] = 1;
            ring.hp[k]--;
            if (ring.hp[k] <= 0) {
              shred(active, k, t);
              events.push({ t, kind: 'break', x });
            } else {
              events.push({ t, kind: 'hit', x });
            }
          }
          x -= nx * (along + br - ring.r * apo);
          y -= ny * (along + br - ring.r * apo);
        }
        sim.time += 1 / FPS;
        trail.push([x, y]);
        if (trail.length > 12) trail.shift();
        particles = updateParticles(particles, 1 / FPS, 700);
        for (const ring of rings) for (let k = 0; k < S; k++) ring.flash[k] *= 0.86;
        squash *= 0.8;
        return events;
      },
      draw(ctx: Ctx2D, overlay: string) {
        background.draw(ctx, sim.time);
        const light = background.light;
        const rot = rotAt(sim.time);
        const outer = rings[n - 1];
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        // Spokes, from the ring holding the ball out to the rim (the inner ones are gone).
        if (active < n) {
          const from = rings[active].r;
          ctx.strokeStyle = light ? 'rgba(70,50,100,0.35)' : 'rgba(235,230,255,0.28)';
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          for (let k = 0; k < S; k++) {
            ctx.moveTo(...vertex(from, rot, k));
            ctx.lineTo(...vertex(outer.r + 30, rot, k));
          }
          ctx.stroke();
        }

        // Threads: each sags a little toward the center, like real silk. Frayed ones fade and thin out.
        for (let i = active; i < n; i++) {
          const ring = rings[i];
          const isActive = i === active;
          for (let k = 0; k < S; k++) {
            if (ring.hp[k] <= 0) continue;
            const wear = ring.hp[k] / hp0;
            const f = ring.flash[k];
            const [ax, ay] = vertex(ring.r, rot, k);
            const [bx, by] = vertex(ring.r, rot, k + 1);
            const mid = rot + (k + 0.5) * seg;
            const sag = ring.r * apo - ring.r * 0.04;
            ctx.strokeStyle = light
              ? hsl(ring.color, (isActive ? 48 : 55) + f * 20, isActive ? 0.55 + wear * 0.45 : 0.6)
              : hsl(ring.color, (isActive ? 76 : 72) + f * 15, isActive ? 0.45 + wear * 0.55 : 0.45);
            ctx.lineWidth = isActive ? 3 + wear * 4 + f * 4 : 3.5;
            ctx.beginPath();
            ctx.moveTo(ax, ay);
            ctx.quadraticCurveTo(cx + Math.cos(mid) * sag, cy + Math.sin(mid) * sag, bx, by);
            ctx.stroke();
          }
        }

        drawSpider(ctx);
        drawParticles(ctx, particles);
        trail.forEach(([tx, ty], i) => {
          const a = (i + 1) / trail.length;
          ctx.fillStyle = `rgba(255,220,180,${a * 0.25})`;
          ctx.beginPath();
          ctx.arc(tx, ty, br * a * 0.8, 0, TAU);
          ctx.fill();
        });
        // A little pumpkin-orange mascot, for the season.
        if (y < H + br * 2) drawMascot(ctx, x, y, br, 28, squash, 85, 64);
        drawOverlay(ctx, overlay);
        const left = n - active;
        drawCaption(ctx, left > 0 ? `${left} ${left === 1 ? 'layer' : 'layers'} of web left` : 'Free from the web! 🎃', cy + 640);
      },
    };

    /** The spider hangs on its thread at the side, bobbing; once the ball is free it climbs away. */
    function drawSpider(ctx: Ctx2D) {
      const sx = W * 0.83;
      const climb = freeAt === null ? 0 : Math.min(1, (sim.time - freeAt) / 1.6);
      const sy = 560 + Math.sin(sim.time * 1.1) * 30 - climb * climb * 700;
      if (sy < -60) return;
      ctx.save();
      ctx.strokeStyle = 'rgba(235,230,255,0.45)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(sx, 0);
      ctx.lineTo(sx, sy - 22);
      ctx.stroke();
      ctx.translate(sx, sy);
      ctx.rotate(Math.sin(sim.time * 1.7) * 0.08);
      // Legs: four on each side, wiggling a little.
      ctx.strokeStyle = '#1c1426';
      ctx.lineWidth = 4;
      for (const side of [-1, 1]) {
        for (let j = 0; j < 4; j++) {
          const wig = Math.sin(sim.time * 6 + j * 1.3) * 3 * (1 + climb * 3);
          const ang = (-0.6 + j * 0.4) + wig * 0.02;
          const kx = side * (22 + Math.cos(ang) * 14), ky = Math.sin(ang) * 14 - 8;
          ctx.beginPath();
          ctx.moveTo(side * 8, -2 + j * 4);
          ctx.lineTo(kx, ky + wig);
          ctx.lineTo(kx + side * 12, ky + 18 + j * 3);
          ctx.stroke();
        }
      }
      ctx.fillStyle = '#241a30';
      ctx.beginPath();
      ctx.ellipse(0, 8, 18, 20, 0, 0, TAU);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(0, -14, 12, 0, TAU);
      ctx.fill();
      // Friendly eyes, so it reads cute rather than scary.
      ctx.fillStyle = '#fff8f0';
      ctx.beginPath();
      ctx.arc(-5, -16, 4.5, 0, TAU);
      ctx.arc(5, -16, 4.5, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#241a30';
      ctx.beginPath();
      ctx.arc(-4.5, -15, 2, 0, TAU);
      ctx.arc(5.5, -15, 2, 0, TAU);
      ctx.fill();
      ctx.restore();
    }

    return sim;
  },
};
