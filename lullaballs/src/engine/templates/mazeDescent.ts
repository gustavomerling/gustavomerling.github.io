import { getBackground } from '../backgrounds';
import { getPalette } from '../palettes';
import { DT, FPS, H, SUBSTEPS, W, type Ctx2D, type SimEvent, type Template } from '../types';
import {
  TAU, bounce, burst, drawCaption, drawMascot, drawOverlay, drawParticles, hsl,
  mulberry32, updateParticles, type Particle,
} from '../util';

type Seg = [number, number, number, number];

/**
 * A tall tower the ball has to descend. Every floor has one small hole that slides left and right,
 * and a wall hangs below each floor splitting the chamber. The camera follows the ball down.
 */
export const mazeDescent: Template = {
  id: 'maze-descent',
  name: 'Labirinto descendente',
  defaultOverlay: 'Can it reach the bottom? 🌀',
  defaults: {
    floors: 11, spacing: 300, width: 860, hole: 120, holeSpeed: 0.9, baffle: 0.45,
    gravity: 1400, ballRadius: 16, minSpeed: 650, cruise: 850,
  },
  specs: [
    { key: 'floors', label: 'Andares', min: 4, max: 20, step: 1 },
    { key: 'hole', label: 'Buraco (px)', min: 40, max: 200, step: 1 },
    { key: 'holeSpeed', label: 'Velocidade do buraco', min: 0.1, max: 3, step: 0.05 },
    { key: 'baffle', label: 'Altura das paredes', min: 0, max: 0.8, step: 0.05 },
    { key: 'gravity', label: 'Gravidade', min: 300, max: 3000, step: 50 },
  ],
  create(p, seed, look = {}) {
    const background = getBackground(look.background);
    const palette = getPalette(look.palette).colors;
    const rng = mulberry32(seed);
    const n = Math.round(p.floors);
    const br = p.ballRadius;
    const left = (W - p.width) / 2, right = left + p.width;
    const top = 700; // y of the first floor, in world coordinates
    const thick = 12;
    const colorOffset = Math.floor(rng() * 1000);
    const travel = p.width / 2 - p.hole / 2 - 20;

    const floors = Array.from({ length: n }, (_, k) => ({
      y: top + k * p.spacing,
      phase: rng() * TAU,
      speed: p.holeSpeed * (0.8 + rng() * 0.4) * (rng() < 0.5 ? -1 : 1),
      // The wall hanging below this floor, splitting the next chamber.
      baffleX: left + p.width * (0.25 + rng() * 0.5),
      color: palette[(k + colorOffset) % palette.length],
      passed: false,
      flash: 0,
    }));
    const holeX = (k: number, t: number) => W / 2 + Math.sin(floors[k].phase + floors[k].speed * t) * travel;

    // Start just under the roof, exactly like right after passing a floor, so the first floor has the same rhythm.
    const a0 = Math.PI / 2 + (rng() - 0.5) * 1.6;
    let x = W / 2 + (rng() - 0.5) * 300, y = top - p.spacing + br + 20;
    let vx = Math.cos(a0) * p.cruise, vy = Math.sin(a0) * p.cruise;
    let active = 0;
    let cam = y - H * 0.45;
    let squash = 0;
    let particles: Particle[] = [];
    const trail: [number, number][] = [];

    /** Walls around the ball's current chamber (between floor active-1 and floor active). */
    function walls(t: number): Seg[] {
      const segs: Seg[] = [];
      const ceilY = active > 0 ? floors[active - 1].y : top - p.spacing;
      const floorY = active < n ? floors[active].y : floors[n - 1].y + p.spacing;
      segs.push([left, ceilY - 400, left, floorY + 400], [right, ceilY - 400, right, floorY + 400]);
      segs.push([left, ceilY, right, ceilY]); // the roof, then every passed floor, is closed
      if (active > 0) {
        const f = floors[active - 1];
        if (p.baffle > 0) segs.push([f.baffleX, ceilY, f.baffleX, ceilY + p.spacing * p.baffle]);
      }
      if (active < n) {
        const hx = holeX(active, t);
        segs.push([left, floorY, hx - p.hole / 2, floorY], [hx + p.hole / 2, floorY, right, floorY]);
      } else {
        segs.push([left, floorY, right, floorY]); // solid ground at the bottom
      }
      return segs;
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
          let hit = false;
          for (const [ax, ay, bx, by] of walls(t)) {
            // Circle vs. thick segment: push out along the normal and reflect.
            const ex = bx - ax, ey = by - ay;
            const len2 = ex * ex + ey * ey;
            const u = Math.max(0, Math.min(1, ((x - ax) * ex + (y - ay) * ey) / len2));
            const qx = ax + ex * u, qy = ay + ey * u;
            const dx = x - qx, dy = y - qy;
            const d = Math.hypot(dx, dy);
            const minD = br + thick / 2;
            if (d >= minD || d === 0) continue;
            const nx = dx / d, ny = dy / d;
            x = qx + nx * minD;
            y = qy + ny * minD;
            if (vx * nx + vy * ny < 0) {
              [vx, vy] = bounce(vx, vy, -nx, -ny, rng, p.minSpeed);
              hit = true;
            }
          }
          if (hit) {
            squash = 1;
            if (active < n) floors[active].flash = 1;
            if (sim.finishTime === null) events.push({ t, kind: 'hit' });
          }
          if (active < n && y - br > floors[active].y + thick / 2) {
            const f = floors[active];
            f.passed = true;
            // Reset the speed on every floor: falls would otherwise keep adding energy and rush the music.
            const sp = Math.hypot(vx, vy) || 1;
            vx *= p.cruise / sp;
            vy *= p.cruise / sp;
            for (let i = 0; i < 26; i++) {
              const px = left + rng() * p.width;
              const life = 0.8 + rng() * 0.7;
              particles.push({
                x: px, y: f.y, vx: (rng() - 0.5) * 200, vy: -100 - rng() * 200,
                life, maxLife: life, color: f.color, size: 4 + rng() * 4,
              });
            }
            active++;
            events.push({ t, kind: 'break' });
            if (active >= n) {
              sim.finishTime = t;
              events.push({ t, kind: 'finish' });
              burst(particles, rng, x, y, 160, 1000, palette);
            }
          }
        }
        sim.time += 1 / FPS;
        // Camera eases toward the ball, keeping it a bit above the middle of the screen.
        cam += (y - H * 0.45 - cam) * 0.08;
        trail.push([x, y]);
        if (trail.length > 10) trail.shift();
        particles = updateParticles(particles, 1 / FPS, 700);
        for (const f of floors) f.flash *= 0.88;
        squash *= 0.8;
        return events;
      },
      draw(ctx: Ctx2D, overlay: string) {
        background.draw(ctx, sim.time);
        ctx.save();
        ctx.translate(0, -cam);
        ctx.lineCap = 'round';
        const lightness = (k: number) => (background.light ? 52 + floors[k].flash * 20 : 80 + floors[k].flash * 12);
        // Side walls of the tower.
        ctx.strokeStyle = background.light ? 'rgba(80,60,110,0.35)' : 'rgba(255,255,255,0.22)';
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.moveTo(left, cam - 50); ctx.lineTo(left, cam + H + 50);
        ctx.moveTo(right, cam - 50); ctx.lineTo(right, cam + H + 50);
        ctx.stroke();
        // Roof of the tower.
        ctx.lineWidth = thick;
        ctx.strokeStyle = hsl(palette[0], background.light ? 55 : 74, 0.6);
        ctx.beginPath();
        ctx.moveTo(left, top - p.spacing); ctx.lineTo(right, top - p.spacing);
        ctx.stroke();
        for (let k = 0; k < n; k++) {
          const f = floors[k];
          if (f.y < cam - 200 || f.y - p.spacing > cam + H + 200) continue;
          ctx.lineWidth = thick;
          if (f.passed) {
            ctx.strokeStyle = hsl(f.color, background.light ? 55 : 74, 0.45);
            ctx.beginPath();
            ctx.moveTo(left, f.y); ctx.lineTo(right, f.y);
            ctx.stroke();
          } else {
            const hx = holeX(k, sim.time);
            ctx.strokeStyle = hsl(f.color, k === active ? lightness(k) : (background.light ? 55 : 74), k === active ? 1 : 0.6);
            ctx.beginPath();
            ctx.moveTo(left, f.y); ctx.lineTo(hx - p.hole / 2, f.y);
            ctx.moveTo(hx + p.hole / 2, f.y); ctx.lineTo(right, f.y);
            ctx.stroke();
          }
          if (p.baffle > 0) {
            ctx.lineWidth = thick - 2;
            ctx.strokeStyle = hsl(f.color, background.light ? 55 : 74, f.passed ? 0.45 : 0.75);
            ctx.beginPath();
            ctx.moveTo(f.baffleX, f.y);
            ctx.lineTo(f.baffleX, f.y + p.spacing * p.baffle);
            ctx.stroke();
          }
        }
        if (active >= n) {
          const gy = floors[n - 1].y + p.spacing;
          ctx.lineWidth = thick;
          ctx.strokeStyle = hsl(palette[0], background.light ? 55 : 80);
          ctx.beginPath();
          ctx.moveTo(left, gy); ctx.lineTo(right, gy);
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
        drawMascot(ctx, x, y, br, 262, squash);
        ctx.restore();
        drawOverlay(ctx, overlay);
        const leftFloors = n - active;
        drawCaption(ctx, leftFloors > 0 ? `${leftFloors} ${leftFloors === 1 ? 'floor' : 'floors'} to go` : 'Made it down! ✨', H - 330);
      },
    };
    return sim;
  },
};
