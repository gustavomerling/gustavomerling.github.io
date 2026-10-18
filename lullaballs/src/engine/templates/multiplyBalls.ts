import { getBackground } from '../backgrounds';
import { getPalette } from '../palettes';
import { DT, FPS, H, SUBSTEPS, W, type Ctx2D, type SimEvent, type Template } from '../types';
import {
  TAU, bounce, burst, drawCaption, drawMascot, drawOverlay, drawParticles, hsl,
  mulberry32, updateParticles, type HS, type Particle,
} from '../util';

interface Ball {
  x: number; y: number; vx: number; vy: number;
  crossing: boolean; color: HS; squash: number;
}

/** A slowly rotating square with an opening on one side. Every ball that escapes turns into two new balls. */
export const multiplyBalls: Template = {
  id: 'multiply-balls',
  name: 'Multiplicação',
  hooks: [
    { text: 'Every escape = 2 more balls 🫧' },
    { text: 'How many balls at the end? 🤔', poll: ['20?', '50?', '100?'] },
    { text: 'It starts with just ONE ball… 😳' },
    { text: 'Wait until the box overflows 🫧' },
    { text: 'Guess the final count before it ends 👇' },
  ],
  blurbs: [
    'Satisfying multiplying balls simulation: every escape releases two more, with soft piano music.',
    'One bouncing ball turns into hundreds. Relaxing physics with a calming melody.',
    'Oddly satisfying ball multiplication: every bounce plays the song.',
  ],
  tags: ['#multiplyingballs', '#oddlysatisfying'],
  defaults: { half: 380, gap: 175, spin: 0.6, gravity: 1300, ballRadius: 14, minSpeed: 650, target: 50 },
  specs: [
    { key: 'target', label: 'Bolinhas no final', min: 10, max: 300, step: 5 },
    { key: 'gap', label: 'Abertura (px)', min: 40, max: 500, step: 5 },
    { key: 'spin', label: 'Rotação', min: 0, max: 3, step: 0.05 },
    { key: 'gravity', label: 'Gravidade', min: 0, max: 3000, step: 50 },
  ],
  create(p, seed, look = {}) {
    const background = getBackground(look.background);
    const palette = getPalette(look.palette).colors;
    const rng = mulberry32(seed);
    const cx = W / 2, cy = H / 2;
    const L = p.half;
    const br = p.ballRadius;
    const inner = L - br;
    const gapHalf = p.gap / 2;
    const angle0 = rng() * TAU;
    let colorIdx = Math.floor(rng() * 1000);
    let balls: Ball[] = [];
    let escaped: Ball[] = [];
    let particles: Particle[] = [];
    let flash = 0;
    let done = false;

    // Random speed per ball, so twins born together don't hit the wall at the same instant.
    const spawn = () => {
      const a = rng() * TAU;
      const speed = p.minSpeed * (0.6 + rng() * 0.8);
      balls.push({
        x: cx + (rng() - 0.5) * 60, y: cy + (rng() - 0.5) * 60,
        vx: Math.cos(a) * speed, vy: Math.sin(a) * speed,
        crossing: false, color: palette[colorIdx++ % palette.length], squash: 0,
      });
    };
    spawn();

    /** Equal-mass elastic collisions between balls (silent: only the walls play notes). */
    function collide() {
      const minD = br * 2;
      for (let i = 0; i < balls.length; i++) {
        const a = balls[i];
        for (let j = i + 1; j < balls.length; j++) {
          const b = balls[j];
          const dx = b.x - a.x, dy = b.y - a.y;
          if (Math.abs(dx) >= minD || Math.abs(dy) >= minD) continue;
          const d = Math.hypot(dx, dy);
          if (d >= minD || d === 0) continue;
          const nx = dx / d, ny = dy / d;
          const push = (minD - d) / 2;
          a.x -= nx * push; a.y -= ny * push;
          b.x += nx * push; b.y += ny * push;
          const rv = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny;
          if (rv <= 0) continue;
          a.vx -= rv * nx; a.vy -= rv * ny;
          b.vx += rv * nx; b.vy += rv * ny;
          a.squash = b.squash = 0.6;
        }
      }
    }

    const angleAt = (t: number) => angle0 + p.spin * t;

    const sim = {
      time: 0,
      finishTime: null as number | null,
      step() {
        const events: SimEvent[] = [];
        for (let s = 0; s < SUBSTEPS; s++) {
          const t = sim.time + s * DT;
          const th = angleAt(t);
          const c = Math.cos(th), sn = Math.sin(th);
          let born = 0;
          for (const b of balls) {
            b.vy += p.gravity * DT;
            b.x += b.vx * DT;
            b.y += b.vy * DT;
            if (done) continue;
            // Work in the square's own (rotating) frame: walls are x = ±L and y = ±L; the opening is on y = -L.
            const dx = b.x - cx, dy = b.y - cy;
            let lx = dx * c + dy * sn, ly = -dx * sn + dy * c;
            let lvx = b.vx * c + b.vy * sn, lvy = -b.vx * sn + b.vy * c;
            if (Math.abs(lx) <= inner && Math.abs(ly) <= inner) {
              b.crossing = false;
              continue;
            }
            if (b.crossing || (ly < -inner && Math.abs(lx) < gapHalf - br)) {
              b.crossing = true;
              if (ly < -L - br) {
                escaped.push(b);
                born += 2;
                events.push({ t, kind: 'break', x: b.x });
              }
              continue;
            }
            let hit = false;
            for (const [nx, ny] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
              const depth = lx * nx + ly * ny;
              if (depth <= inner) continue;
              lx -= nx * (depth - inner);
              ly -= ny * (depth - inner);
              if (lvx * nx + lvy * ny > 0) {
                [lvx, lvy] = bounce(lvx, lvy, nx, ny, rng, p.minSpeed * 0.6);
                hit = true;
              }
            }
            b.x = cx + lx * c - ly * sn;
            b.y = cy + lx * sn + ly * c;
            b.vx = lvx * c - lvy * sn;
            b.vy = lvx * sn + lvy * c;
            if (hit) {
              b.squash = 1;
              flash = 1;
              events.push({ t, kind: 'hit', x: b.x });
            }
          }
          if (!done) collide();
          if (born) {
            balls = balls.filter((b) => !escaped.includes(b));
            for (let i = 0; i < born; i++) spawn();
            if (!done && balls.length >= p.target) {
              done = true;
              sim.finishTime = t;
              events.push({ t, kind: 'finish' });
              // The square bursts and every ball is set free.
              burst(particles, rng, cx, cy, 200, 1200, palette);
              for (const b of balls) {
                const a = Math.atan2(b.y - cy, b.x - cx);
                b.vx = Math.cos(a) * 900;
                b.vy = Math.sin(a) * 900 - 400;
              }
            }
          }
          for (const b of escaped) {
            b.vy += p.gravity * DT;
            b.x += b.vx * DT;
            b.y += b.vy * DT;
          }
        }
        escaped = escaped.filter((b) => b.y < H + 60 && b.x > -60 && b.x < W + 60);
        if (done) balls = balls.filter((b) => b.y < H + 60 && b.x > -60 && b.x < W + 60);
        sim.time += 1 / FPS;
        particles = updateParticles(particles, 1 / FPS, 600);
        for (const b of balls) b.squash *= 0.8;
        flash *= 0.85;
        return events;
      },
      draw(ctx: Ctx2D, overlay: string) {
        background.draw(ctx, sim.time);
        if (!done) {
          const col = palette[0];
          const e = L + 5;
          ctx.save();
          ctx.translate(cx, cy);
          ctx.rotate(angleAt(sim.time));
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.strokeStyle = background.light ? hsl(col, 52 + flash * 15) : hsl(col, 82 + flash * 10, 0.95);
          ctx.lineWidth = 10 + flash * 4;
          // Square outline, starting and ending at the edges of the opening on the top side.
          ctx.beginPath();
          ctx.moveTo(gapHalf, -e);
          ctx.lineTo(e, -e);
          ctx.lineTo(e, e);
          ctx.lineTo(-e, e);
          ctx.lineTo(-e, -e);
          ctx.lineTo(-gapHalf, -e);
          ctx.stroke();
          ctx.restore();
        }
        drawParticles(ctx, particles);
        for (const b of [...escaped, ...balls]) {
          if (balls.length + escaped.length < 80) drawMascot(ctx, b.x, b.y, br, b.color[0], b.squash);
          else {
            ctx.fillStyle = hsl(b.color, 84);
            ctx.beginPath();
            ctx.arc(b.x, b.y, br, 0, TAU);
            ctx.fill();
          }
        }
        drawOverlay(ctx, overlay);
        drawCaption(ctx, done ? `${Math.round(p.target)}+ balls! Goodnight ✨` : `${balls.length} ${balls.length === 1 ? 'ball' : 'balls'}`, cy + 640);
      },
    };
    return sim;
  },
};
