import { useEffect, useRef } from 'react';

/** CSS pixels per backdrop pixel. */
const BACKDROP_PIXEL = 3;

/** Skyline repeats every LOOP px. */
const LOOP = 1600;
const ACCENT = '255,210,63';
const TV = '120,180,255';
const WHITE = '220,226,235';
/** Stable 0..1 hash per (building seed, a, b). */
const hash01 = (seed: number, a: number, b: number): number => {
  let h = Math.imul(seed ^ (a * 374761393) ^ (b * 668265263), 1274126177);
  h = Math.imul(h ^ (h >>> 15), 2246822519);
  return ((h ^ (h >>> 13)) >>> 0) / 4294967296;
};

interface Building {
  x: number;
  w: number;
  h: number;
  seed: number;
}

interface Layer {
  /** Scroll speed, px/s (parallax: nearer layers move faster). */
  speed: number;
  /** Ground line as a fraction of the height. */
  ground: number;
  /** Height multiplier. */
  scale: number;
  fill: string;
  edge: string;
  /** Share of windows lit (0..1). */
  lit: number;
  buildings: Building[];
}

/** Small deterministic PRNG: the skyline is the same on every visit. */
function prng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function makeLayer(seed: number, layer: Omit<Layer, 'buildings'>): Layer {
  const rand = prng(seed);
  const buildings: Building[] = [];
  for (let x = 0; x < LOOP; ) {
    const w = 46 + rand() * 70;
    buildings.push({ x, w, h: 90 + rand() * 170, seed: Math.floor(rand() * 1e6) });
    x += w + 4 + rand() * 10;
  }
  return { ...layer, buildings };
}

const LAYERS: Layer[] = [
  makeLayer(7, { speed: 6, ground: 0.8, scale: 0.7, fill: '#0b0d11', edge: '#161920', lit: 0.12 }),
  makeLayer(21, { speed: 16, ground: 0.88, scale: 0.8, fill: '#0f1116', edge: '#1e222a', lit: 0.2 }),
  makeLayer(99, { speed: 34, ground: 0.95, scale: 0.9, fill: '#131620', edge: '#2a2f3a', lit: 0.3 }),
];

/** One frame: measuring grid, then the skyline from far to near. `t` in seconds. */
function paint(ctx: CanvasRenderingContext2D, W: number, H: number, t: number) {
  const k = H / 720;
  ctx.clearRect(0, 0, W, H);

  const cell = 48 * k;
  const drift = (t * 8 * k) % cell;
  ctx.strokeStyle = 'rgba(255,255,255,0.045)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = -drift; x < W; x += cell) {
    ctx.moveTo(Math.round(x) + 0.5, 0);
    ctx.lineTo(Math.round(x) + 0.5, H);
  }
  for (let y = 0; y < H; y += cell) {
    ctx.moveTo(0, Math.round(y) + 0.5);
    ctx.lineTo(W, Math.round(y) + 0.5);
  }
  ctx.stroke();

  // Windows change every ~2 s, so the city looks inhabited without busy motion.
  const phase = Math.floor(t / 2.2);
  for (const layer of LAYERS) {
    const ground = H * layer.ground;
    const off = (t * layer.speed) % LOOP;
    for (const b of layer.buildings) {
      for (const shift of [0, LOOP]) {
        const x = b.x + shift - off;
        if (x > W || x + b.w < 0) continue;
        const h = b.h * k * layer.scale;
        const top = ground - h;
        ctx.fillStyle = layer.fill;
        ctx.fillRect(x, top, b.w, h);
        ctx.strokeStyle = layer.edge;
        ctx.strokeRect(Math.round(x) + 0.5, Math.round(top) + 0.5, b.w, h);

        // Each building has its own window grid; lights are hashed (no diagonal patterns), cluster
        // by floor (some floors busy, others dark), vary in colour, and a few switch over time.
        const bs = b.seed;
        const ww = 3 + (bs % 3);
        const wh = 4 + ((bs >> 3) % 4);
        const gx = ww + 4 + ((bs >> 5) % 5);
        const gy = wh + 6 + ((bs >> 8) % 6);
        const cols = Math.floor((b.w - 8) / gx);
        const rows = Math.floor((h - 12) / gy);
        const pad = (b.w - cols * gx + (gx - ww)) / 2;
        for (let j = 0; j < rows; j++) {
          const floorBusy = hash01(bs, j, 0) < 0.55 ? 1.9 : 0.35;
          for (let i = 0; i < cols; i++) {
            const flip = hash01(bs, i * 97 + j, 3) < 0.04 ? Math.floor(phase / (2 + (i % 3))) : 0;
            const v = hash01(bs + flip * 13, i, j);
            if (v >= layer.lit * floorBusy) continue;
            const tint = hash01(bs, i, j + 50);
            ctx.fillStyle = tint < 0.7 ? `rgba(${ACCENT},${0.25 + v * 0.9})` : tint < 0.88 ? `rgba(${TV},0.45)` : `rgba(${WHITE},0.4)`;
            ctx.fillRect(Math.round(x + pad + i * gx), Math.round(top + 8 + j * gy), ww, wh);
          }
        }
      }
    }
  }
  // Ground line of the nearest layer, to anchor the city.
  ctx.fillStyle = LAYERS[LAYERS.length - 1]!.edge;
  ctx.fillRect(0, H * LAYERS[LAYERS.length - 1]!.ground, W, 1);
}

/** Animated backdrop of the main menu: skyline with parallax over the measuring grid. */
export function MenuBackdrop() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const start = performance.now();
    let W = 0;
    let H = 0;
    let raf = 0;

    const fit = () => {
      // Pixel art: one canvas pixel per BACKDROP_PIXEL CSS px, scaled up with image-rendering: pixelated.
      const dpr = 1 / BACKDROP_PIXEL;
      W = canvas.clientWidth;
      H = canvas.clientHeight;
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    const paintAt = (now: number) => paint(ctx, W, H, reduce ? 0 : (now - start) / 1000);
    const loop = (now: number) => {
      paintAt(now);
      raf = requestAnimationFrame(loop);
    };
    const onResize = () => {
      fit();
      paintAt(performance.now());
    };

    fit();
    paintAt(performance.now());
    if (!reduce) raf = requestAnimationFrame(loop);
    window.addEventListener('resize', onResize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
    };
  }, []);

  return (
    <div className="menu-backdrop" aria-hidden="true">
      <canvas ref={ref} />
      <div className="menu-backdrop-shade" />
    </div>
  );
}
