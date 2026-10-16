import { getBackground } from '../backgrounds';
import { getPalette } from '../palettes';
import { DT, FPS, SUBSTEPS, W, H, type Ctx2D, type SimEvent, type Template } from '../types';
import {
  TAU, bounce, burst, drawCaption, drawMascot, drawOverlay, drawParticles, hsl,
  mulberry32, updateParticles, type Particle,
} from '../util';

/**
 * Nested rotating polygons (triangle, square, pentagon…), each with an opening on one side.
 * Escaping a shape shatters it. Corners make the bounces less predictable than circles.
 */
export const nestedPolygons: Template = {
  id: 'nested-polygons',
  name: 'Polígonos aninhados',
  defaultOverlay: 'Can it escape every shape? 🔷',
  defaults: { layers: 6, innerRadius: 120, margin: 26, gapDeg: 13, spin: 1, gravity: 1400, ballRadius: 12, minSpeed: 1000 },
  specs: [
    { key: 'layers', label: 'Formas', min: 3, max: 6, step: 1 },
    { key: 'gapDeg', label: 'Abertura (graus)', min: 10, max: 60, step: 1 },
    { key: 'spin', label: 'Rotação', min: 0.1, max: 3, step: 0.05 },
    { key: 'gravity', label: 'Gravidade', min: 0, max: 3000, step: 50 },
  ],
  create(p, seed, look = {}) {
    const background = getBackground(look.background);
    const palette = getPalette(look.palette).colors;
    const rng = mulberry32(seed);
    const cx = W / 2, cy = H / 2;
    const br = p.ballRadius;
    const count = Math.round(p.layers);
    const colorOffset = Math.floor(rng() * 1000);

    // Each shape has one more side than the previous one, and is sized so it never touches its neighbours.
    // The opening covers the same angle (seen from the center) on every shape, so big shapes aren't slower to escape.
    const shapes: {
      sides: number; circum: number; apothem: number; gapHalf: number; angle0: number; spin: number;
      /** Outward normal of each side, in the shape's own frame (side k at angle (k + 0.5) * 2π/n). */
      normals: (readonly [number, number])[];
      broken: boolean; flash: number; color: (typeof palette)[number];
    }[] = [];
    let circum = p.innerRadius;
    for (let i = 0; i < count; i++) {
      const sides = 3 + i;
      if (i > 0) circum = (shapes[i - 1].circum + p.margin) / Math.cos(Math.PI / sides);
      const apothem = circum * Math.cos(Math.PI / sides);
      const sideLen = 2 * circum * Math.sin(Math.PI / sides);
      const gap = Math.max(br * 2 + 16, Math.min(sideLen * 0.8, apothem * ((p.gapDeg * Math.PI) / 180)));
      shapes.push({
        sides, circum, apothem, gapHalf: gap / 2,
        normals: Array.from({ length: sides }, (_, k) => {
          const a = ((k + 0.5) * TAU) / sides;
          return [Math.cos(a), Math.sin(a)] as const;
        }),
        angle0: rng() * TAU, spin: p.spin * (i % 2 ? -1 : 1) * (1 - i * 0.04),
        broken: false, flash: 0, color: palette[(i + colorOffset) % palette.length],
      });
    }

    const a0 = rng() * TAU;
    let x = cx, y = cy, vx = Math.cos(a0) * p.minSpeed * 0.5, vy = Math.sin(a0) * p.minSpeed * 0.5;
    let active = 0;
    let crossing = false;
    let squash = 0;
    let particles: Particle[] = [];
    const trail: [number, number][] = [];
    const angleOf = (i: number, t: number) => shapes[i].angle0 + shapes[i].spin * t;

    function vertices(i: number, t: number) {
      const sh = shapes[i];
      const th = angleOf(i, t);
      return Array.from({ length: sh.sides }, (_, k) => {
        const a = th + (k * TAU) / sh.sides;
        return [cx + Math.cos(a) * sh.circum, cy + Math.sin(a) * sh.circum] as const;
      });
    }

    function shatter(i: number, t: number) {
      const vs = vertices(i, t);
      for (let k = 0; k < vs.length; k++) {
        const [ax, ay] = vs[k], [bx, by] = vs[(k + 1) % vs.length];
        for (let j = 0; j < 6; j++) {
          const f = rng();
          const px = ax + (bx - ax) * f, py = ay + (by - ay) * f;
          const a = Math.atan2(py - cy, px - cx);
          const sp = 120 + rng() * 280;
          const life = 0.9 + rng() * 0.8;
          particles.push({
            x: px, y: py, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 80,
            life, maxLife: life, color: shapes[i].color, size: 4 + rng() * 5,
          });
        }
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
          if (active >= count) continue;
          const sh = shapes[active];
          // Shape's own frame: side k has its outward normal at angle (k + 0.5) * 2π/n; the opening is on side 0.
          const th = angleOf(active, t);
          const c = Math.cos(th), sn = Math.sin(th);
          const dx = x - cx, dy = y - cy;
          let lx = dx * c + dy * sn, ly = -dx * sn + dy * c;
          let lvx = vx * c + vy * sn, lvy = -vx * sn + vy * c;
          const limit = sh.apothem - br;
          const normals = sh.normals;
          let maxDepth = -Infinity;
          for (const [nx, ny] of normals) maxDepth = Math.max(maxDepth, lx * nx + ly * ny - limit);
          if (maxDepth <= 0) {
            crossing = false;
            continue;
          }
          const depth0 = lx * normals[0][0] + ly * normals[0][1] - limit;
          // Position along side 0, measured from its midpoint.
          const [n0x, n0y] = normals[0];
          const along = -lx * n0y + ly * n0x;
          if (crossing || (depth0 > 0 && Math.abs(along) < sh.gapHalf - br)) {
            crossing = true;
            if (lx * n0x + ly * n0y - br > sh.apothem) {
              sh.broken = true;
              crossing = false;
              shatter(active, t);
              active++;
              events.push({ t, kind: 'break' });
              if (active >= count) {
                sim.finishTime = t;
                events.push({ t, kind: 'finish' });
                burst(particles, rng, x, y, 120, 900, palette);
                vy = -1400;
              }
            }
            continue;
          }
          let hit = false;
          for (const [nx, ny] of normals) {
            const depth = lx * nx + ly * ny - limit;
            if (depth <= 0) continue;
            lx -= nx * depth;
            ly -= ny * depth;
            if (lvx * nx + lvy * ny > 0) {
              [lvx, lvy] = bounce(lvx, lvy, nx, ny, rng, p.minSpeed);
              hit = true;
            }
          }
          x = cx + lx * c - ly * sn;
          y = cy + lx * sn + ly * c;
          vx = lvx * c - lvy * sn;
          vy = lvx * sn + lvy * c;
          if (hit) {
            sh.flash = 1;
            squash = 1;
            events.push({ t, kind: 'hit' });
          }
        }
        sim.time += 1 / FPS;
        trail.push([x, y]);
        if (trail.length > 10) trail.shift();
        particles = updateParticles(particles, 1 / FPS, 700);
        for (const sh of shapes) sh.flash *= 0.88;
        squash *= 0.8;
        return events;
      },
      draw(ctx: Ctx2D, overlay: string) {
        background.draw(ctx, sim.time);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        for (let i = 0; i < count; i++) {
          const sh = shapes[i];
          if (sh.broken) continue;
          const vs = vertices(i, sim.time);
          const isActive = i === active;
          ctx.strokeStyle = background.light
            ? (isActive ? hsl(sh.color, 52 + sh.flash * 20) : hsl(sh.color, 55, 0.7))
            : (isActive ? hsl(sh.color, 80 + sh.flash * 12) : hsl(sh.color, 74, 0.55));
          ctx.lineWidth = isActive ? 8 + sh.flash * 4 : 5;
          // Side 0 runs from vertex 0 to vertex 1; the opening sits at its middle.
          const [v0x, v0y] = vs[0], [v1x, v1y] = vs[1];
          const len = Math.hypot(v1x - v0x, v1y - v0y);
          const ux = (v1x - v0x) / len, uy = (v1y - v0y) / len;
          const mx = (v0x + v1x) / 2, my = (v0y + v1y) / 2;
          ctx.beginPath();
          ctx.moveTo(mx + ux * sh.gapHalf, my + uy * sh.gapHalf);
          for (let k = 1; k <= sh.sides; k++) ctx.lineTo(vs[k % sh.sides][0], vs[k % sh.sides][1]);
          ctx.lineTo(mx - ux * sh.gapHalf, my - uy * sh.gapHalf);
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
        const left = count - active;
        drawCaption(ctx, left > 0 ? `${left} ${left === 1 ? 'shape' : 'shapes'} left` : 'Free! Sweet dreams ✨', cy + 640);
      },
    };
    return sim;
  },
};
