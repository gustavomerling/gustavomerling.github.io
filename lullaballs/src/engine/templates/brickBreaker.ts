import { getBackground } from '../backgrounds';
import { getPalette } from '../palettes';
import { DT, FINISH_MAX, FINISH_MIN, FPS, SUBSTEPS, W, type Ctx2D, type SimEvent, type Template } from '../types';
import {
  TAU, burst, drawCaption, drawMascot, drawOverlay, drawParticles, hsl,
  mulberry32, updateParticles, type Particle,
} from '../util';

// Arena (the overlay sits above it, the caption below).
const L = 70, R = 1010, TOP = 560, BOT = 1580;
const TIMER_Y = 485;
const GRID_TOP = TOP + 140;
const GRID_LEFT = L + 20;
const CELL_W = (R - L - 40) / 9;
const ROW_H = 48;
const BLOCK_W = CELL_W - 12, BLOCK_H = ROW_H - 10;
const PADDLE_Y = BOT - 70;
const PADDLE_HALF = 95;
const PADDLE_SPEED = 2600;
/** Outgoing angle (from vertical) at the very edge of the paddle. */
const MAX_ANGLE = 1.05;
/** The countdown the video races against. */
const LIMIT = 70;

interface Ball { x: number; y: number; vx: number; vy: number }
/** What happened in one substep: nothing, a wall, a block (its index) or the paddle line. */
const NONE = -1, WALL = -2;

const fmt = (s: number) => {
  const c = Math.max(0, Math.ceil(s));
  return `${Math.floor(c / 60)}:${String(c % 60).padStart(2, '0')}`;
};

function roundRect(ctx: Ctx2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/**
 * Classic breakout against the clock: a paddle at the bottom, a wall of candy blocks at the top and a countdown from
 * 1:10. The paddle plays for real: before each return it test-flies a fan of angles (the physics is deterministic, so
 * the forecast is exact) and picks the one that keeps the clearing on schedule — saving the last block for the final
 * seconds.
 */
export const brickBreaker: Template = {
  id: 'brick-breaker',
  name: 'Quebra-tijolos',
  hooks: [
    { text: 'Can it clear every block before 1:10? ⏱️', poll: ['YES ✅', 'NO ❌'] },
    { text: 'The last brick is always the hardest 😤' },
    { text: 'Bet it misses the last one 👀' },
    { text: 'Satisfying until the very last brick 🧱' },
    { text: 'Every block is a note of the song 🎹' },
  ],
  blurbs: [
    'Satisfying brick breaker game played by itself, every block a note of the song.',
    'Relaxing breakout simulation with soft piano music. Watch every brick fall.',
    'Oddly satisfying auto-play brick breaker with a calming melody.',
  ],
  tags: ['#brickbreaker', '#breakout'],
  defaults: { rows: 7, cols: 9, speed: 1250, ballRadius: 16 },
  specs: [
    { key: 'rows', label: 'Linhas', min: 3, max: 10, step: 1 },
    { key: 'cols', label: 'Colunas', min: 5, max: 9, step: 1 },
    { key: 'speed', label: 'Velocidade', min: 700, max: 1800, step: 50 },
  ],
  create(p, seed, look = {}) {
    const background = getBackground(look.background);
    const palette = getPalette(look.palette).colors;
    const rng = mulberry32(seed);
    const rows = Math.round(p.rows), cols = Math.round(p.cols);
    const n = rows * cols;
    const br = p.ballRadius, speed = p.speed;
    // Fewer columns stay centered in the arena.
    const gridLeft = GRID_LEFT + ((9 - cols) * CELL_W) / 2;
    const bx = (k: number) => gridLeft + (k % cols) * CELL_W + (CELL_W - BLOCK_W) / 2;
    const by = (k: number) => GRID_TOP + Math.floor(k / cols) * ROW_H + (ROW_H - BLOCK_H) / 2;
    const colorOffset = Math.floor(rng() * 1000);
    const blockColor = (k: number) => palette[(Math.floor(k / cols) + colorOffset) % palette.length];

    const alive = new Uint8Array(n).fill(1);
    const flash = new Float32Array(n);
    let left = n;
    const ball: Ball = { x: W / 2, y: PADDLE_Y - br, vx: 0, vy: 0 };
    let paddleX = W / 2, paddleTarget = W / 2;
    let launched = false, planned = false, done = false;
    let squash = 0, paddleSquash = 0;
    let particles: Particle[] = [];
    const trail: [number, number][] = [];

    /** Blocks left the schedule wants at time t: quick while the wall is dense, the last one around 1:04. */
    const T_END = (FINISH_MIN + FINISH_MAX) / 2;
    const planLeft = (t: number) => n * Math.pow(Math.max(0, 1 - t / T_END), 1.25);

    /** Keeps the ball from going nearly flat after a corner hit. */
    function steady(b: Ball) {
      const min = speed * 0.3;
      if (Math.abs(b.vy) < min) {
        b.vy = (b.vy < 0 ? -1 : 1) * min;
        b.vx = (b.vx < 0 ? -1 : 1) * Math.sqrt(speed * speed - min * min);
      }
    }

    /** Moves the ball one substep against walls and blocks (not the paddle). Shared by the real run and forecasts. */
    function move(b: Ball, al: Uint8Array): number {
      b.x += b.vx * DT;
      b.y += b.vy * DT;
      let hit = NONE;
      if (b.x - br < L && b.vx < 0) { b.x = L + br; b.vx = -b.vx; hit = WALL; }
      if (b.x + br > R && b.vx > 0) { b.x = R - br; b.vx = -b.vx; hit = WALL; }
      if (b.y - br < TOP && b.vy < 0) { b.y = TOP + br; b.vy = -b.vy; hit = WALL; }
      // Safety floor, in case the paddle ever misses.
      if (b.y + br > BOT && b.vy > 0) { b.y = BOT - br; b.vy = -b.vy; }
      if (b.y + br < GRID_TOP || b.y - br > GRID_TOP + rows * ROW_H) return hit;
      const c0 = Math.max(0, Math.floor((b.x - br - gridLeft) / CELL_W));
      const c1 = Math.min(cols - 1, Math.floor((b.x + br - gridLeft) / CELL_W));
      const r0 = Math.max(0, Math.floor((b.y - br - GRID_TOP) / ROW_H));
      const r1 = Math.min(rows - 1, Math.floor((b.y + br - GRID_TOP) / ROW_H));
      let best = -1, depth = 0, nx = 0, ny = 0;
      for (let r = r0; r <= r1; r++) {
        for (let c = c0; c <= c1; c++) {
          const k = r * cols + c;
          if (!al[k]) continue;
          const x0 = bx(k), y0 = by(k);
          const qx = Math.max(x0, Math.min(b.x, x0 + BLOCK_W));
          const qy = Math.max(y0, Math.min(b.y, y0 + BLOCK_H));
          const dx = b.x - qx, dy = b.y - qy;
          const d = Math.hypot(dx, dy);
          if (d >= br || br - d <= depth) continue;
          best = k;
          depth = br - d;
          if (d > 1e-6) { nx = dx / d; ny = dy / d; } else { nx = 0; ny = b.vy > 0 ? -1 : 1; }
        }
      }
      if (best < 0) return hit;
      const dot = b.vx * nx + b.vy * ny;
      if (dot < 0) {
        b.vx -= 2 * dot * nx;
        b.vy -= 2 * dot * ny;
        steady(b);
      }
      b.x += nx * depth;
      b.y += ny * depth;
      al[best] = 0;
      return best;
    }

    const reachedPaddle = (b: Ball) => b.vy > 0 && b.y + br >= PADDLE_Y;

    /** Flies a copy of the ball until it comes back down to the paddle line. */
    function forecast(b0: Ball, al: Uint8Array, maxT: number) {
      const b = { ...b0 };
      let hits = 0, t = 0, clearAt: number | null = null;
      let rest = al.reduce((a, v) => a + v, 0);
      while (t < maxT && !reachedPaddle(b)) {
        t += DT;
        if (move(b, al) >= 0) {
          hits++;
          if (--rest === 0 && clearAt === null) clearAt = t;
        }
      }
      return { b, t, hits, clearAt };
    }

    /** As the ball heads down: where will it land, and which angle should it leave with? Then aims the paddle. */
    function plan(now: number) {
      const al = alive.slice();
      const arrive = forecast(ball, al, 8);
      if (arrive.clearAt !== null) {
        paddleTarget = arrive.b.x;
        return;
      }
      const tHit = now + arrive.t;
      let bestCost = Infinity;
      const options: { a: number; cost: number }[] = [];
      for (let i = 0; i < 15; i++) {
        let a = (-0.95 + (1.9 * i) / 14) * MAX_ANGLE + (rng() - 0.5) * 0.04;
        if (Math.abs(a) < 0.1) a = a < 0 ? -0.1 : 0.1;
        const shot = { x: arrive.b.x, y: PADDLE_Y - br, vx: Math.sin(a) * speed, vy: -Math.cos(a) * speed };
        const f = forecast(shot, al.slice(), 8);
        const rest = left - f.hits;
        let cost = Math.abs(rest - planLeft(tHit + f.t));
        if (f.clearAt !== null) {
          const at = tHit + f.clearAt;
          cost += at >= FINISH_MIN + 0.3 && at <= FINISH_MAX - 0.3 ? -1000 : at < FINISH_MIN + 0.3 ? 1000 : 0;
        }
        options.push({ a, cost });
        bestCost = Math.min(bestCost, cost);
      }
      const good = options.filter((o) => o.cost <= bestCost + 0.35);
      const { a } = good[Math.floor(rng() * good.length)];
      paddleTarget = arrive.b.x - (a / MAX_ANGLE) * PADDLE_HALF;
    }

    function shatter(k: number) {
      const x0 = bx(k), y0 = by(k);
      for (let i = 0; i < 16; i++) {
        const life = 0.7 + rng() * 0.8;
        particles.push({
          x: x0 + rng() * BLOCK_W, y: y0 + rng() * BLOCK_H,
          vx: (rng() - 0.5) * 420, vy: (rng() - 0.7) * 380,
          life, maxLife: life, color: blockColor(k), size: 4 + rng() * 5,
        });
      }
    }

    const launchAt = 0.6;

    const sim = {
      time: 0,
      finishTime: null as number | null,
      step() {
        const events: SimEvent[] = [];
        for (let s = 0; s < SUBSTEPS; s++) {
          const t = sim.time + s * DT;
          if (!launched) {
            if (t >= launchAt) {
              launched = true;
              const a = (rng() < 0.5 ? -1 : 1) * (0.35 + rng() * 0.4);
              ball.vx = Math.sin(a) * speed;
              ball.vy = -Math.cos(a) * speed;
              paddleSquash = 1;
              events.push({ t, kind: 'hit', x: ball.x });
            } else {
              ball.x = paddleX;
              continue;
            }
          }
          const hit = move(ball, alive);
          if (hit === WALL) {
            squash = 1;
            planned = false;
            if (!done) events.push({ t, kind: 'hit', x: ball.x });
          } else if (hit >= 0) {
            squash = 1;
            flash[hit] = 1;
            planned = false;
            left--;
            shatter(hit);
            if (!done) events.push({ t, kind: 'break', x: ball.x });
            if (left === 0 && !done) {
              done = true;
              sim.finishTime = t;
              events.push({ t, kind: 'finish' });
              burst(particles, rng, ball.x, ball.y, 220, 1300, palette);
            }
          }
          if (reachedPaddle(ball) && ball.y - br < PADDLE_Y + 8 && Math.abs(ball.x - paddleX) <= PADDLE_HALF + br * 0.6) {
            const off = Math.max(-1, Math.min(1, (ball.x - paddleX) / PADDLE_HALF));
            const a = off * MAX_ANGLE;
            ball.vx = Math.sin(a) * speed;
            ball.vy = -Math.cos(a) * speed;
            ball.y = PADDLE_Y - br;
            squash = 1;
            paddleSquash = 1;
            planned = false;
            if (!done) events.push({ t, kind: 'hit', x: ball.x });
          }
          if (ball.vy > 0 && !planned) {
            planned = true;
            if (done) paddleTarget = ball.x;
            else plan(t);
          } else if (ball.vy < 0) {
            // On the way up it drifts lazily under the ball.
            paddleTarget += (ball.x - paddleTarget) * 0.002;
          }
          const maxMove = PADDLE_SPEED * DT;
          paddleX += Math.max(-maxMove, Math.min(maxMove, paddleTarget - paddleX));
          paddleX = Math.max(L + PADDLE_HALF, Math.min(R - PADDLE_HALF, paddleX));
        }
        sim.time += 1 / FPS;
        trail.push([ball.x, ball.y]);
        if (trail.length > 10) trail.shift();
        particles = updateParticles(particles, 1 / FPS, 900);
        for (let i = 0; i < n; i++) flash[i] *= 0.82;
        squash *= 0.8;
        paddleSquash *= 0.82;
        return events;
      },
      draw(ctx: Ctx2D, overlay: string) {
        background.draw(ctx, sim.time);
        const accent = palette[colorOffset % palette.length];

        // Frosted arena: a dark glass panel keeps any palette readable over a busy background.
        ctx.save();
        ctx.shadowColor = 'rgba(30,15,60,0.35)';
        ctx.shadowBlur = 40;
        ctx.fillStyle = 'rgba(28,20,58,0.62)';
        roundRect(ctx, L - 14, TOP - 14, R - L + 28, BOT - TOP + 28, 38);
        ctx.fill();
        ctx.restore();
        ctx.strokeStyle = 'rgba(255,255,255,0.55)';
        ctx.lineWidth = 4;
        roundRect(ctx, L - 14, TOP - 14, R - L + 28, BOT - TOP + 28, 38);
        ctx.stroke();

        // Candy blocks with a glossy top.
        for (let k = 0; k < n; k++) {
          if (!alive[k]) continue;
          const x0 = bx(k), y0 = by(k), c = blockColor(k);
          const g = ctx.createLinearGradient(0, y0, 0, y0 + BLOCK_H);
          g.addColorStop(0, hsl(c, 80));
          g.addColorStop(1, hsl(c, 62));
          ctx.fillStyle = g;
          roundRect(ctx, x0, y0, BLOCK_W, BLOCK_H, 12);
          ctx.fill();
          ctx.fillStyle = 'rgba(255,255,255,0.45)';
          roundRect(ctx, x0 + 8, y0 + 5, BLOCK_W - 16, 8, 4);
          ctx.fill();
        }

        drawParticles(ctx, particles);

        // Paddle.
        const pw = PADDLE_HALF * 2 * (1 + paddleSquash * 0.08), ph = 26 * (1 - paddleSquash * 0.2);
        const pg = ctx.createLinearGradient(0, PADDLE_Y, 0, PADDLE_Y + ph);
        pg.addColorStop(0, '#fffaf2');
        pg.addColorStop(1, hsl(accent, 70));
        ctx.fillStyle = pg;
        roundRect(ctx, paddleX - pw / 2, PADDLE_Y, pw, ph, ph / 2);
        ctx.fill();

        // Ball with a soft trail.
        trail.forEach(([tx, ty], i) => {
          const a = (i + 1) / trail.length;
          ctx.fillStyle = `rgba(255,240,250,${a * 0.22})`;
          ctx.beginPath();
          ctx.arc(tx, ty, br * (0.4 + a * 0.6), 0, TAU);
          ctx.fill();
        });
        drawMascot(ctx, ball.x, ball.y, br * 1.4, 48, squash, 95, 66);

        drawOverlay(ctx, overlay);
        drawTimer(ctx, sim.time, sim.finishTime);
        drawCaption(
          ctx,
          sim.finishTime !== null
            ? `Cleared with ${fmt(LIMIT - sim.finishTime)} to spare! ✨`
            : `${left} ${left === 1 ? 'block' : 'blocks'} left`,
          BOT + 90,
        );
      },
    };
    return sim;
  },
};

/** Countdown pill: calm white, warming to a pulsing coral in the last 10 seconds, mint once cleared. */
function drawTimer(ctx: Ctx2D, t: number, finish: number | null) {
  const rest = LIMIT - (finish ?? t);
  const urgent = finish === null && rest <= 10;
  const pulse = urgent ? 0.5 + 0.5 * Math.sin(t * TAU * 2) : 0;
  const w = 230, h = 84;
  ctx.save();
  ctx.translate(W / 2, TIMER_Y);
  ctx.scale(1 + pulse * 0.06, 1 + pulse * 0.06);
  ctx.shadowColor = 'rgba(30,15,60,0.35)';
  ctx.shadowBlur = 20;
  ctx.fillStyle = finish !== null ? 'rgba(70,190,140,0.9)' : urgent ? `rgba(255,${100 + 40 * (1 - pulse)},${110 + 30 * (1 - pulse)},0.92)` : 'rgba(28,20,58,0.72)';
  roundRect(ctx, -w / 2, -h / 2, w, h, h / 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.font = '800 56px "Nunito", "Segoe UI", system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#fff8f0';
  ctx.fillText(`⏱ ${fmt(rest)}`, 0, 3);
  ctx.restore();
}
