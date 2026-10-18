import { getBackground } from '../backgrounds';
import { getPalette } from '../palettes';
import { DT, FPS, H, SUBSTEPS, W, type Ctx2D, type SimEvent, type Template } from '../types';
import {
  TAU, burst, drawCaption, drawMascot, drawOverlay, drawParticles, hsl,
  mulberry32, updateParticles, type HS, type Particle,
} from '../util';

interface Ball {
  x: number; y: number; vx: number; vy: number;
  color: HS; squash: number;
  /** Seconds since birth: newborns pop in and can't meet anyone until grown. */
  age: number;
  /** Right after a meeting the two parents can't meet again; they just slide off each other. */
  justMet?: { other: Ball; until: number };
}

const BIRTH = 0.6;
/** How far ahead a bounce looks when picking its angle: samples every PSTEP seconds, NP of them. */
const PSTEP = 1 / 60;
const NP = 100;
/** Bounce angles tried, as offsets from the mirror reflection (radians). */
const OFFSETS = [0, 0.06, -0.06, 0.12, -0.12, 0.2, -0.2, 0.3, -0.3, 0.42, -0.42, 0.55, -0.55];
/** Bounce speeds tried, relative to the plain one. */
const SPEEDS = [1, 1.12, 0.9];

/**
 * Two balls bounce inside a circle and keep barely missing each other. When they finally meet, a new ball is born.
 * The first meeting comes at ~20s, the next one (with the newborn) ~10s later, and each wait gets a bit shorter.
 *
 * Touching always means meeting, and nothing pushes the balls in mid-air: the only levers are the angle and speed each
 * ball leaves the wall with. Every bounce looks ~1.7s ahead and picks the option closest to a plain reflection whose
 * path stays clear of everyone else. Once a meeting is due, the newest ball and its partner instead pick the angle that
 * brings them closest together.
 */
export const meetingBalls: Template = {
  id: 'meeting-balls',
  name: 'Encontros',
  hooks: [
    { text: 'Every time they meet, a new one is born 💞' },
    { text: 'How many will there be at the end? 🤔', poll: ['5?', '11?', '20?'] },
    { text: 'It starts with just two… 💞' },
    { text: 'Wait for the last one to be born 🥹' },
    { text: 'A little family, one meeting at a time 💞' },
  ],
  blurbs: [
    'Cute bouncing balls: every time two meet, a new one is born. Soft piano music for sleep.',
    'Relaxing ball family simulation with a calming melody. Every bounce is a note.',
    'Oddly satisfying and wholesome physics with a gentle lullaby.',
  ],
  tags: ['#cute', '#oddlysatisfying'],
  defaults: {
    arena: 430, ballRadius: 22, gravity: 1300, minSpeed: 700,
    firstMeet: 20, wait: 10, shrink: 0.8, target: 11,
  },
  specs: [
    { key: 'target', label: 'Bolinhas no final', min: 3, max: 20, step: 1 },
    { key: 'firstMeet', label: 'Primeiro encontro (s)', min: 5, max: 40, step: 1 },
    { key: 'wait', label: 'Espera até o 2º encontro (s)', min: 2, max: 20, step: 0.5 },
    { key: 'shrink', label: 'Encurtamento das esperas', min: 0.5, max: 1, step: 0.02 },
    { key: 'gravity', label: 'Gravidade', min: 0, max: 3000, step: 50 },
  ],
  create(p, seed, look = {}) {
    const background = getBackground(look.background);
    const palette = getPalette(look.palette).colors;
    const rng = mulberry32(seed);
    const cx = W / 2, cy = H / 2;
    const R = p.arena;
    const r = p.ballRadius;
    const clear = r * 2 + 14;
    // Always one rng() call, whatever the palette size, so the physics of a seed never changes with the look.
    const colorIdx = Math.floor(rng() * 1000);
    let born = 0;
    /**
     * Every ball gets its own hue: starting from a palette color and turning by the golden angle, so even a palette of
     * close hues (Oceano, Menta...) gives a family of clearly different balls.
     */
    const nextColor = (): HS => {
      const [h, sat] = palette[colorIdx % palette.length];
      return [(h + born++ * 137.508) % 360, Math.max(sat, 60)];
    };
    let balls: Ball[] = [];
    let particles: Particle[] = [];
    let flash = 0, glow = 0;
    let done = false;
    let meetings = 0;
    let dueAt = p.firstMeet - 1;
    let newest: Ball | null = null;
    /** The two balls the next meeting is planned for, chosen when it becomes due. */
    let couple: [Ball, Ball] | null = null;
    /** Current substep time, for helpers that run before `sim` exists. */
    let clock = 0;

    const spawn = (x: number, y: number, vx: number, vy: number, age = BIRTH) => {
      const b: Ball = { x, y, vx, vy, color: nextColor(), squash: 0, age };
      balls.push(b);
      return b;
    };
    const starts = [-1, 1].map((side) => {
      const a = rng() * TAU;
      const speed = p.minSpeed * (0.8 + rng() * 0.4);
      return { b: spawn(cx + side * 180, cy - 60 + side * 40, Math.cos(a) * speed, Math.sin(a) * speed), a, speed };
    });

    /** Ballistic path with plain wall reflections, as flat x,y pairs, plus the sample of its first bounce. */
    function path(x: number, y: number, vx: number, vy: number) {
      const out = new Float64Array(NP * 2);
      let bounceAt = NP;
      const sub = 4, h = PSTEP / sub;
      for (let k = 0; k < NP; k++) {
        for (let i = 0; i < sub; i++) {
          vy += p.gravity * h;
          x += vx * h;
          y += vy * h;
          const dx = x - cx, dy = y - cy;
          const d = Math.hypot(dx, dy) || 1e-6;
          if (d + r > R) {
            const nx = dx / d, ny = dy / d;
            const dot = vx * nx + vy * ny;
            if (dot > 0) {
              vx -= 2 * dot * nx; vy -= 2 * dot * ny;
              bounceAt = Math.min(bounceAt, k);
            }
            x = cx + nx * (R - r);
            y = cy + ny * (R - r);
          }
        }
        out[k * 2] = x;
        out[k * 2 + 1] = y;
      }
      return { pts: out, bounceAt };
    }

    const pairedUp = (a: Ball, b: Ball, t: number) =>
      (a.justMet?.other === b && t < a.justMet.until) || (b.justMet?.other === a && t < b.justMet.until);

    /** Closest distance between two paths over samples [from, to). */
    function closest(a: Float64Array, b: Float64Array, from = 0, to = NP) {
      let best = Infinity;
      for (let k = Math.max(0, from); k < to; k++) {
        const d = Math.hypot(a[k * 2] - b[k * 2], a[k * 2 + 1] - b[k * 2 + 1]);
        if (d < best) best = d;
      }
      return best;
    }

    /**
     * Picks the outgoing direction of `b` (speed `speed`, base angle `base`): the smallest offset whose path keeps
     * clear of everyone (or, for a planned meeting, the one that gets closest to the partner).
     * Being clear until either ball's next bounce is a must (after it, that ball re-plans its own way out); being
     * clear over the whole look-ahead is preferred.
     */
    function choose(b: Ball, base: number, speed: number, offsets: number[]) {
      const partner = couple && !done && couple.includes(b) ? (couple[0] === b ? couple[1] : couple[0]) : null;
      const others = balls.filter((o) => o !== b).map((o) => ({ o, p: path(o.x, o.y, o.vx, o.vy) }));
      let pick: [number, number] = [base + offsets[0], speed], pickScore = -Infinity;
      // A slightly faster or slower bounce changes *when* it crosses the others' paths, a second lever after the angle.
      for (const k of SPEEDS) for (const off of offsets) {
        const a = base + off;
        const v = Math.min(speed * k, Math.max(speed, 1500));
        const mine = path(b.x, b.y, Math.cos(a) * v, Math.sin(a) * v);
        // near: until either ball's next bounce (must be clear); far: the whole look-ahead (nice to have).
        let near = Infinity, far = Infinity, toPartner = Infinity;
        for (const { o, p: op } of others) {
          // Skip the part where one of them is still popping in, or where they just met and are sliding apart.
          const until = b.justMet?.other === o ? b.justMet.until - clock : 0;
          const from = Math.ceil(Math.max(BIRTH - Math.min(b.age, o.age), until) / PSTEP);
          if (o === partner) { toPartner = closest(mine.pts, op.pts, from); continue; }
          const to = Math.min(NP, Math.min(mine.bounceAt, op.bounceAt) + 6);
          near = Math.min(near, closest(mine.pts, op.pts, from, to));
          far = Math.min(far, closest(mine.pts, op.pts, from));
        }
        const score = partner
          // Get together, but never by running into somebody else first.
          ? (near >= clear ? 0 : -1e4) - toPartner
          : (near >= clear ? 2e4 : near) + (far >= clear ? 1e4 : far);
        if (score > pickScore) { pickScore = score; pick = [a, v]; }
        if (!partner && score >= 3e4) return pick;
      }
      return pick;
    }

    /** Re-aims a ball's current velocity (same speed) along a clear path. */
    function aim(b: Ball, offsets: number[]) {
      const speed = Math.max(p.minSpeed, Math.hypot(b.vx, b.vy));
      const [a, v] = choose(b, Math.atan2(b.vy, b.vx), speed, offsets);
      b.vx = Math.cos(a) * v;
      b.vy = Math.sin(a) * v;
    }
    for (const st of starts) aim(st.b, [...OFFSETS, ...OFFSETS.map((o) => o + Math.PI)]);

    function meet(a: Ball, b: Ball, t: number, events: SimEvent[]) {
      const dx = b.x - a.x, dy = b.y - a.y;
      const d = Math.hypot(dx, dy) || 1e-6;
      const nx = dx / d, ny = dy / d;
      const rv = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny;
      if (rv > 0) {
        a.vx -= rv * nx; a.vy -= rv * ny;
        b.vx += rv * nx; b.vy += rv * ny;
      }
      a.squash = b.squash = 1;
      couple = null;
      a.justMet = { other: b, until: t + 0.5 };
      b.justMet = { other: a, until: t + 0.5 };
      // The parents bounce apart, also on paths that keep clear of everyone.
      aim(a, [...OFFSETS, 0.7, -0.7, 0.9, -0.9]);
      aim(b, [...OFFSETS, 0.7, -0.7, 0.9, -0.9]);
      const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
      burst(particles, rng, mx, my, 40, 500, [a.color, b.color]);
      meetings++;
      glow = 1;
      events.push({ t, kind: 'break', x: mx });
      // The newborn leaves roughly perpendicular to its parents, on whichever side is clear.
      const side = rng() < 0.5 ? -1 : 1;
      const base = Math.atan2(nx * side, -ny * side);
      const nb = spawn(mx, my, 0, 0, 0);
      const [dir, v] = choose(nb, base, p.minSpeed, [...OFFSETS, ...OFFSETS.map((o) => o + Math.PI)]);
      nb.vx = Math.cos(dir) * v;
      nb.vy = Math.sin(dir) * v;
      newest = nb;
      if (balls.length >= p.target) {
        done = true;
        sim.finishTime = t;
        events.push({ t, kind: 'finish' });
        burst(particles, rng, cx, cy, 220, 1300, palette);
      } else {
        dueAt = t + p.wait * Math.pow(p.shrink, meetings - 1) - 1;
      }
    }

    /** The newest grown ball (or the first one) and whoever is closest to it. */
    function pickCouple(): [Ball, Ball] | null {
      const grown = balls.filter((b) => b.age >= BIRTH);
      if (grown.length < 2) return null;
      const a = newest && newest.age >= BIRTH ? newest : grown[0];
      let best: Ball | null = null, bestD = Infinity;
      for (const b of grown) {
        if (b === a) continue;
        const d = Math.hypot(b.x - a.x, b.y - a.y);
        if (d < bestD) { bestD = d; best = b; }
      }
      return best ? [a, best] : null;
    }

    const sim = {
      time: 0,
      finishTime: null as number | null,
      step() {
        const events: SimEvent[] = [];
        if (!done && !couple && sim.time >= dueAt) couple = pickCouple();
        for (let s = 0; s < SUBSTEPS; s++) {
          const t = sim.time + s * DT;
          clock = t;
          for (const b of balls) {
            b.age += DT;
            b.vy += p.gravity * DT;
            b.x += b.vx * DT;
            b.y += b.vy * DT;
            const dx = b.x - cx, dy = b.y - cy;
            const d = Math.hypot(dx, dy) || 1e-6;
            const br = r * Math.min(1, b.age / BIRTH);
            if (d + br < R) continue;
            const nx = dx / d, ny = dy / d;
            b.x = cx + nx * (R - br);
            b.y = cy + ny * (R - br);
            const dot = b.vx * nx + b.vy * ny;
            if (dot <= 0) continue;
            const rx = b.vx - 2 * dot * nx, ry = b.vy - 2 * dot * ny;
            const speed = Math.max(p.minSpeed, Math.hypot(rx, ry));
            // Never steer back into the wall: keep the outgoing direction within ~80° of the inward normal.
            const offsets = done ? [0] : OFFSETS.filter((o) => {
              const a = Math.atan2(ry, rx) + o;
              return -(Math.cos(a) * nx + Math.sin(a) * ny) > 0.17;
            });
            const [a, v] = choose(b, Math.atan2(ry, rx), speed, offsets.length ? offsets : [0]);
            b.vx = Math.cos(a) * v;
            b.vy = Math.sin(a) * v;
            if (!done) {
              b.squash = 1;
              flash = 1;
              events.push({ t, kind: 'hit', x: b.x });
            }
          }
          if (done) continue;
          pairs: for (let i = 0; i < balls.length; i++) {
            for (let j = i + 1; j < balls.length; j++) {
              const a = balls[i], b = balls[j];
              const dx = b.x - a.x, dy = b.y - a.y;
              const ra = r * Math.min(1, a.age / BIRTH), rb = r * Math.min(1, b.age / BIRTH);
              const d = Math.hypot(dx, dy);
              if (d >= ra + rb) continue;
              // Touching is always a meeting; only a ball still popping in just slides off.
              if (a.age >= BIRTH && b.age >= BIRTH && !pairedUp(a, b, t)) { meet(a, b, t, events); break pairs; }
              const nx = dx / (d || 1), ny = dy / (d || 1);
              const push = (ra + rb - d) / 2;
              a.x -= nx * push; a.y -= ny * push;
              b.x += nx * push; b.y += ny * push;
            }
          }
        }
        sim.time += 1 / FPS;
        particles = updateParticles(particles, 1 / FPS, 600);
        for (const b of balls) b.squash *= 0.8;
        flash *= 0.85;
        glow *= 0.94;
        return events;
      },
      draw(ctx: Ctx2D, overlay: string) {
        background.draw(ctx, sim.time);
        const col = palette[meetings % palette.length];
        if (!done) {
          ctx.strokeStyle = background.light ? hsl(col, 52 + flash * 15) : hsl(col, 82 + flash * 10, 0.95);
          ctx.lineWidth = 10 + flash * 4 + glow * 8;
          ctx.beginPath();
          ctx.arc(cx, cy, R + 5, 0, TAU);
          ctx.stroke();
        }
        drawParticles(ctx, particles);
        for (const b of balls) {
          const k = Math.min(1, b.age / BIRTH);
          // Pop-in with a small overshoot.
          const scale = k < 1 ? Math.sin(k * Math.PI * 0.75) / Math.sin(Math.PI * 0.75) : 1;
          drawMascot(ctx, b.x, b.y, Math.max(1, r * Math.min(scale, 1.25)), b.color[0], b.squash);
        }
        drawOverlay(ctx, overlay);
        const n = balls.length;
        drawCaption(ctx, done ? `${n} friends! Goodnight ✨` : `${n} ${n === 1 ? 'ball' : 'balls'} · ${meetings} ${meetings === 1 ? 'meeting' : 'meetings'}`, cy + 640);
      },
    };
    void H;
    return sim;
  },
};
