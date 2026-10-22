import { Tile } from '@engine/physics/tilegrid';
import type { Rect } from '@engine/math/rect';
import type { LevelData } from '../procgen/level';
import { PROP as P } from './palette';

/**
 * Decoration: non-interactive pixel-art clutter (furniture, trash, wall items). Pure rendering —
 * placement is a hash of the tile position, so it never touches level geometry, collisions or the
 * gameplay RNG. The whole level is painted once into an offscreen canvas and blitted each frame.
 */
export type PropStyle = 'city' | 'zombie' | 'castle';

/** Chance a free floor tile gets a prop, per style (indoor, outdoor). */
const DENSITY: Record<PropStyle, { indoor: number; outdoor: number; wall: number }> = {
  city: { indoor: 0.62, outdoor: 0.7, wall: 0.4 },
  zombie: { indoor: 0.78, outdoor: 0.85, wall: 0.35 },
  castle: { indoor: 0.55, outdoor: 0.6, wall: 0.4 },
};

type G = CanvasRenderingContext2D;
/** Draws one prop standing on `floor` (y of the floor's top) inside the tile column starting at `x`. */
type PropFn = (g: G, x: number, floor: number, h: number) => void;
interface PropDef {
  fn: PropFn;
  /** Tiles wide (1 or 2). */
  span: 1 | 2;
  /** Needs the tile above to be free too (taller than one tile). */
  tall?: boolean;
  weight: number;
}

/** Animated bits painted per frame on top of the cached canvas (screens, flames, flies...). */
type AnimKind = 'screen' | 'vend' | 'flame' | 'flies' | 'lamp';
interface Anim {
  kind: AnimKind;
  x: number;
  y: number;
  h: number;
}
interface Painted {
  style: PropStyle;
  canvas: HTMLCanvasElement;
  anims: Anim[];
}
const cache = new WeakMap<LevelData, Painted>();

/** Solid-looking parts of the props (every outlined box), so bullets can chip them. */
interface PropPart {
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
  hp: number;
}
const parts = new WeakMap<LevelData, PropPart[]>();
let recording: PropPart[] | null = null;

/**
 * A bullet moved from (x0,y0) to (x1,y1): if it crosses a prop part, punch a hole in the cached
 * picture there and return the hit point and colour for debris. Visual only: the bullet flies on.
 */
export function chipProps(level: LevelData, x0: number, y0: number, x1: number, y1: number): { x: number; y: number; color: string } | null {
  const list = parts.get(level);
  const hit = cache.get(level);
  if (!list || !hit) return null;
  const mx = (x0 + x1) / 2;
  const my = (y0 + y1) / 2;
  for (const p of list) {
    if (p.hp <= 0 || mx < p.x || mx >= p.x + p.w || my < p.y || my >= p.y + p.h) continue;
    p.hp--;
    const g = hit.canvas.getContext('2d')!;
    if (p.hp <= 0) g.clearRect(p.x, p.y, p.w, p.h);
    else g.clearRect(Math.round(mx) - 1, Math.round(my) - 1, 3, 3);
    return { x: mx, y: my, color: p.color };
  }
  return null;
}
/** Collector for the level being painted (prop fns push their animated spots here). */
let rec: Anim[] = [];
let curStyle: PropStyle = 'city';
const anim = (kind: AnimKind, x: number, y: number, h: number) => rec.push({ kind, x, y, h });

export function drawProps(ctx: G, level: LevelData, view: Rect, style: PropStyle): void {
  if (typeof document === 'undefined') return;
  let hit = cache.get(level);
  if (!hit || hit.style !== style) {
    rec = [];
    curStyle = style;
    recording = [];
    const canvas = paintLevel(level, style);
    parts.set(level, recording);
    recording = null;
    hit = { style, canvas, anims: rec };
    rec = [];
    cache.set(level, hit);
  }
  const c = hit.canvas;
  const sx = Math.max(0, Math.floor(view.x));
  const sy = Math.max(0, Math.floor(view.y));
  const sw = Math.min(c.width - sx, Math.ceil(view.w) + 2);
  const sh = Math.min(c.height - sy, Math.ceil(view.h) + 2);
  if (sw <= 0 || sh <= 0) return;
  ctx.drawImage(c, sx, sy, sw, sh, sx, sy, sw, sh);
  drawAnims(ctx, hit.anims, view);
}

function drawAnims(g: G, anims: readonly Anim[], view: Rect): void {
  const t = (typeof performance !== 'undefined' ? performance.now() : Date.now()) / 1000;
  for (const a of anims) {
    if (a.x < view.x - 24 || a.x > view.x + view.w + 24 || a.y < view.y - 24 || a.y > view.y + view.h + 24) continue;
    const ph = t + a.h * 10;
    switch (a.kind) {
      case 'screen': {
        // Text lines scrolling + blinking cursor.
        const step = Math.floor(ph * 2) % 4;
        for (let i = 0; i < 3; i++) {
          const w = 2 + Math.floor(hashMix(a.h, i + step) * 6);
          rect(g, a.x + 1, a.y + 1 + i * 2, w, 1, P.white);
        }
        if (Math.floor(ph * 3) % 2 === 0) rect(g, a.x + 1 + Math.floor(hashMix(a.h, step) * 6), a.y + 5, 2, 1, P.led);
        break;
      }
      case 'vend':
        rect(g, a.x, a.y, 2, 1, Math.floor(ph * 1.5) % 2 ? P.led : P.ledDim);
        if (Math.floor(ph * 4) % 7 === 0) rect(g, a.x, a.y + 2, 2, 2, P.white);
        break;
      case 'flame': {
        const f = Math.floor(ph * 8) % 3;
        rect(g, a.x, a.y - 1 - (f === 1 ? 1 : 0), 2, 2 + (f === 1 ? 1 : 0), P.flame);
        rect(g, a.x + (f === 2 ? 1 : 0), a.y - 2 - f % 2, 1, 1, P.flameHot);
        if (f === 0) rect(g, a.x + 1, a.y - 3, 1, 1, P.flameDark);
        break;
      }
      case 'flies':
        for (let i = 0; i < 3; i++) {
          const k = ph * (2 + i * 0.7) + i * 2.1;
          rect(g, a.x + Math.round(Math.sin(k) * 5), a.y + Math.round(Math.cos(k * 1.3) * 3), 1, 1, P.outline);
        }
        break;
      case 'lamp': {
        const off = a.h > 0.75 && Math.floor(ph * 6) % 9 === 0; // a few lamps sputter
        rect(g, a.x, a.y, 6, 1, off ? P.metalDark : P.lamp);
        break;
      }
    }
  }
}

function hash(c: number, r: number, salt: number): number {
  let h = (c * 374761393 + r * 668265263 + salt * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function pick(defs: readonly PropDef[], u: number): PropDef {
  const total = defs.reduce((s, d) => s + d.weight, 0);
  let t = u * total;
  for (const d of defs) if ((t -= d.weight) < 0) return d;
  return defs[defs.length - 1]!;
}

function paintLevel(level: LevelData, style: PropStyle): HTMLCanvasElement {
  const grid = level.grid;
  const canvas = document.createElement('canvas');
  canvas.width = grid.widthPx;
  canvas.height = grid.heightPx;
  const g = canvas.getContext('2d')!;
  g.imageSmoothingEnabled = false;
  const ts = grid.tileSize;
  const used = new Set<number>();
  const free = (c: number, r: number) => grid.inBounds(c, r) && grid.get(c, r) === Tile.Empty;
  const floorUnder = (c: number, r: number) => {
    const t = grid.get(c, r + 1);
    return t === Tile.Solid || t === Tile.OneWay;
  };
  const roomAt = (x: number, y: number) =>
    level.rooms.find((rm) => x >= rm.rect.x && x < rm.rect.x + rm.rect.w && y >= rm.rect.y && y < rm.rect.y + rm.rect.h);
  const nearLadder = (c: number, r: number) =>
    grid.get(c - 1, r) === Tile.Ladder || grid.get(c + 1, r) === Tile.Ladder || grid.get(c, r + 1) === Tile.Ladder;

  // Window openings in back walls: nothing may hang over them.
  const windows = new Set<number>();
  for (const rm of level.rooms) for (const w of rm.windows) windows.add(w.cy * grid.cols + w.cx);
  const nearWindow = (c: number, r: number) => {
    for (let dc = -1; dc <= 1; dc++) for (let dr = -3; dr <= 0; dr++) if (windows.has((r + dr) * grid.cols + c + dc)) return true;
    return false;
  };
  const sets = SETS[style];
  for (let r = 1; r < grid.rows - 1; r++) {
    for (let c = 1; c < grid.cols - 1; c++) {
      if (!free(c, r) || !floorUnder(c, r) || nearLadder(c, r)) continue;
      const x = c * ts;
      const floor = (r + 1) * ts;
      const room = roomAt(x + ts / 2, floor - 1);
      const outdoor = !room || room.outdoor;
      const dens = DENSITY[style];
      const h = hash(c, r, 1);
      // Wall decoration on the back wall (indoors only), independent of the floor prop.
      if (!outdoor && !nearWindow(c, r) && free(c, r - 1) && free(c, r - 2) && hash(c, r, 7) < dens.wall) {
        pick(sets.wall, hash(c, r, 8)).fn(g, x, floor, hash(c, r, 9));
      }
      if (used.has(r * grid.cols + c)) continue;
      if (h > (outdoor ? dens.outdoor : dens.indoor)) continue;
      const pool = outdoor ? sets.outdoor : sets.indoor;
      let def = pick(pool, hash(c, r, 2));
      const wideOk = free(c + 1, r) && floorUnder(c + 1, r) && !nearLadder(c + 1, r) && !used.has(r * grid.cols + c + 1);
      const tallOk = free(c, r - 1) && (def.span === 1 || free(c + 1, r - 1));
      if ((def.span === 2 && !wideOk) || (def.tall && !tallOk)) {
        def = pick(pool.filter((d) => d.span === 1 && !d.tall), hash(c, r, 3));
      }
      def.fn(g, x, floor, hash(c, r, 4));
      used.add(r * grid.cols + c);
      if (def.span === 2) used.add(r * grid.cols + c + 1);
      // Loose litter on top of whatever stands here.
      if (style !== 'castle' && hash(c, r, 5) < (style === 'zombie' ? 0.6 : 0.3)) litter(g, x, floor, hash(c, r, 6), style);
      if (style === 'zombie' && hash(c, r, 10) < 0.18) bloodPool(g, x, floor, hash(c, r, 11));
      if (style === 'castle' && hash(c, r, 10) < 0.2) bones(g, x + 2, floor, hash(c, r, 11));
    }
  }
  return canvas;
}

// ---- primitives ------------------------------------------------------------------------------

function rect(g: G, x: number, y: number, w: number, h: number, color: string): void {
  g.fillStyle = color;
  g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

/** Filled box with a 1 px outline. */
function box(g: G, x: number, y: number, w: number, h: number, fill: string, light?: string): void {
  // Big parts take a few hits before they're blown away; small ones go in one.
  recording?.push({ x: Math.round(x), y: Math.round(y), w: Math.round(w), h: Math.round(h), color: fill, hp: Math.max(1, Math.round((w * h) / 40)) });
  rect(g, x, y, w, h, P.outline);
  rect(g, x + 1, y + 1, w - 2, h - 2, fill);
  if (light) rect(g, x + 1, y + 1, w - 2, 1, light);
}

const pickOf = <T,>(list: readonly T[], u: number): T => list[Math.floor(u * list.length) % list.length]!;

// ---- city indoor -----------------------------------------------------------------------------

const desk: PropFn = (g, x, f, h) => {
  box(g, x + 1, f - 12, 30, 3, P.wood, P.woodLight);
  rect(g, x + 3, f - 9, 2, 9, P.woodDark);
  rect(g, x + 27, f - 9, 2, 9, P.woodDark);
  box(g, x + 19, f - 9, 9, 9, P.woodDark);
  rect(g, x + 22, f - 6, 3, 1, P.metalLight);
  // monitor
  box(g, x + 6, f - 23, 12, 9, P.metalDark);
  rect(g, x + 7, f - 22, 10, 7, P.screen);
  anim('screen', x + 7, f - 22, h);
  rect(g, x + 11, f - 14, 2, 2, P.metalDark);
  if (h > 0.4) box(g, x + 21, f - 16, 5, 4, P.white); // mug
  if (h > 0.7) rect(g, x + 2, f - 13, 4, 1, P.paper);
};
const chair: PropFn = (g, x, f, h) => {
  const o = h < 0.5 ? 3 : 6;
  box(g, x + o + 5, f - 18, 3, 9, P.plastic);
  box(g, x + o, f - 10, 9, 3, P.plastic);
  rect(g, x + o + 4, f - 7, 1, 5, P.metalDark);
  rect(g, x + o + 1, f - 2, 7, 1, P.metalDark);
  rect(g, x + o, f - 1, 1, 1, P.outline);
  rect(g, x + o + 8, f - 1, 1, 1, P.outline);
};
const cabinet: PropFn = (g, x, f) => {
  box(g, x + 3, f - 22, 10, 22, P.metal, P.metalLight);
  for (let i = 0; i < 3; i++) {
    rect(g, x + 4, f - 15 + i * 7, 8, 1, P.metalDark);
    rect(g, x + 7, f - 19 + i * 7, 2, 1, P.metalLight);
  }
};
const plant: PropFn = (g, x, f, h) => {
  box(g, x + 4, f - 6, 8, 6, P.pot);
  const tall = h > 0.5 ? 8 : 4;
  rect(g, x + 7, f - 8 - tall, 2, tall + 2, P.leaf);
  rect(g, x + 3, f - 10 - tall / 2, 4, 3, P.leaf);
  rect(g, x + 9, f - 12 - tall / 2, 4, 3, P.leafLight);
  rect(g, x + 5, f - 12 - tall, 6, 3, P.leafLight);
};
const boxes: PropFn = (g, x, f, h) => {
  box(g, x + 1, f - 8, 10, 8, P.cardboard, P.cardboardDark);
  rect(g, x + 5, f - 7, 2, 2, P.yellow);
  if (h > 0.3) box(g, x + 4, f - 15, 9, 7, P.cardboard, P.cardboardDark);
  if (h > 0.75) box(g, x + 3, f - 20, 7, 5, P.cardboardDark);
};
const bin: PropFn = (g, x, f, h) => {
  box(g, x + 5, f - 8, 7, 8, P.metal);
  rect(g, x + 4, f - 9, 9, 2, P.metalDark);
  if (h > 0.4) rect(g, x + 6, f - 11, 3, 2, P.paper);
  if (h > 0.7) rect(g, x + 10, f - 10, 2, 1, P.can);
};
const cooler: PropFn = (g, x, f) => {
  box(g, x + 4, f - 12, 8, 12, P.white);
  rect(g, x + 6, f - 9, 4, 1, P.metalDark);
  box(g, x + 5, f - 20, 6, 8, P.water);
  rect(g, x + 6, f - 19, 1, 6, P.screenLit);
};
const shelf: PropFn = (g, x, f, h) => {
  box(g, x + 1, f - 28, 14, 28, P.woodDark);
  for (let row = 0; row < 3; row++) {
    const y = f - 26 + row * 9;
    rect(g, x + 2, y + 7, 12, 1, P.wood);
    for (let b = 0; b < 5; b++) {
      if (hashMix(h, row * 5 + b) < 0.2) continue;
      rect(g, x + 2 + b * 2.4, y + 1 + (b % 2), 2, 6 - (b % 2), pickOf(P.poster, hashMix(h, b + row * 3)));
    }
  }
};
const vending: PropFn = (g, x, f, h) => {
  box(g, x + 1, f - 30, 14, 30, h < 0.5 ? P.red : P.plastic, P.white);
  rect(g, x + 3, f - 27, 7, 18, P.metalDark);
  for (let i = 0; i < 4; i++) rect(g, x + 4, f - 25 + i * 4, 5, 2, pickOf(P.poster, hashMix(h, i)));
  rect(g, x + 11, f - 24, 2, 4, P.screenLit);
  anim('vend', x + 11, f - 19, h);
  rect(g, x + 3, f - 6, 7, 3, P.outline);
};
const sofa: PropFn = (g, x, f) => {
  box(g, x + 2, f - 14, 28, 7, P.fabric, P.fabricLight);
  box(g, x + 1, f - 9, 30, 6, P.fabric, P.fabricLight);
  box(g, x, f - 11, 4, 8, P.fabric);
  box(g, x + 28, f - 11, 4, 8, P.fabric);
  rect(g, x + 3, f - 3, 2, 3, P.woodDark);
  rect(g, x + 27, f - 3, 2, 3, P.woodDark);
};
const printer: PropFn = (g, x, f) => {
  box(g, x + 2, f - 9, 12, 9, P.woodDark);
  box(g, x + 3, f - 15, 10, 6, P.white);
  rect(g, x + 4, f - 14, 8, 1, P.metalDark);
  rect(g, x + 5, f - 17, 6, 2, P.paper);
  rect(g, x + 11, f - 12, 1, 1, P.leafLight);
};
const extinguisher: PropFn = (g, x, f) => {
  box(g, x + 6, f - 11, 5, 11, P.red);
  rect(g, x + 7, f - 13, 3, 2, P.metalDark);
  rect(g, x + 10, f - 13, 3, 1, P.outline);
};

// ---- wall items ------------------------------------------------------------------------------

const poster: PropFn = (g, x, f, h) => {
  const w = 9 + Math.floor(h * 4);
  box(g, x + 2, f - 44, w, 13, pickOf(P.poster, h));
  rect(g, x + 4, f - 41, w - 4, 2, P.white);
  rect(g, x + 4, f - 37, w - 6, 1, P.paper);
};
const clock: PropFn = (g, x, f) => {
  box(g, x + 4, f - 46, 8, 8, P.white);
  rect(g, x + 8, f - 44, 1, 3, P.outline);
  rect(g, x + 8, f - 42, 2, 1, P.outline);
};
const frame: PropFn = (g, x, f, h) => {
  box(g, x + 2, f - 45, 12, 10, P.woodLight);
  rect(g, x + 3, f - 44, 10, 8, h < 0.5 ? P.leaf : P.water);
  rect(g, x + 5, f - 40, 6, 3, h < 0.5 ? P.leafLight : P.white);
};
const whiteboard: PropFn = (g, x, f, h) => {
  box(g, x + 1, f - 46, 14, 11, P.white);
  rect(g, x + 3, f - 43, 6, 1, P.red);
  rect(g, x + 3, f - 40, 9, 1, P.plastic);
  if (h > 0.5) rect(g, x + 10, f - 43, 3, 3, P.leaf);
};
const acUnit: PropFn = (g, x, f) => {
  box(g, x + 1, f - 52, 14, 6, P.white);
  rect(g, x + 2, f - 48, 12, 1, P.metalLight);
};
const switchPlate: PropFn = (g, x, f) => {
  box(g, x + 7, f - 30, 3, 5, P.white);
};

// ---- outdoor / trash -------------------------------------------------------------------------

const trashBags: PropFn = (g, x, f, h) => {
  box(g, x + 1, f - 8, 9, 8, P.trashBag, P.trashBagLight);
  rect(g, x + 5, f - 10, 2, 2, P.trashBag);
  if (h > 0.3) box(g, x + 7, f - 6, 8, 6, P.trashBag, P.trashBagLight);
  if (h > 0.7) box(g, x + 4, f - 13, 7, 6, P.trashBagLight);
  if (curStyle === 'zombie' && h < 0.6) anim('flies', x + 8, f - 14, h);
};
const dumpster: PropFn = (g, x, f, h) => {
  box(g, x + 1, f - 16, 30, 14, P.dumpster, P.dumpsterLight);
  rect(g, x + 2, f - 17, 28, 2, h < 0.5 ? P.dumpsterLight : P.outline);
  rect(g, x + 4, f - 12, 24, 1, P.outline);
  rect(g, x + 8, f - 9, 6, 3, P.yellow);
  rect(g, x + 3, f - 2, 3, 2, P.outline);
  rect(g, x + 26, f - 2, 3, 2, P.outline);
  if (h > 0.4) {
    rect(g, x + 6, f - 19, 5, 3, P.trashBagLight);
    rect(g, x + 18, f - 18, 4, 2, P.paper);
  }
};
const cans: PropFn = (g, x, f, h) => {
  rect(g, x + 2, f - 4, 2, 4, P.can);
  rect(g, x + 6, f - 2, 4, 2, P.metalLight);
  rect(g, x + 11, f - 5, 2, 5, P.glass);
  rect(g, x + 11, f - 6, 1, 1, P.glass);
  if (h > 0.5) rect(g, x + 13, f - 2, 3, 2, P.can);
};
const tire: PropFn = (g, x, f, h) => {
  box(g, x + 2, f - 10, 11, 10, P.trashBag);
  rect(g, x + 5, f - 7, 5, 4, P.outline);
  if (h > 0.5) box(g, x + 4, f - 14, 8, 4, P.trashBag);
};
const pallet: PropFn = (g, x, f) => {
  for (let i = 0; i < 3; i++) rect(g, x + 1, f - 2 - i * 2, 14, 1, i % 2 ? P.woodDark : P.woodLight);
  rect(g, x + 1, f - 6, 2, 6, P.woodDark);
  rect(g, x + 13, f - 6, 2, 6, P.woodDark);
  rect(g, x + 7, f - 6, 2, 6, P.woodDark);
};
const barrel: PropFn = (g, x, f, h) => {
  box(g, x + 3, f - 14, 10, 14, h < 0.5 ? P.rust : P.metal);
  rect(g, x + 4, f - 10, 8, 1, P.outline);
  rect(g, x + 4, f - 5, 8, 1, P.outline);
  if (h > 0.6) rect(g, x + 6, f - 13, 3, 2, P.yellow);
};
const cone: PropFn = (g, x, f) => {
  rect(g, x + 4, f - 2, 9, 2, P.outline);
  rect(g, x + 6, f - 6, 5, 4, P.orange);
  rect(g, x + 7, f - 9, 3, 3, P.orange);
  rect(g, x + 7, f - 6, 3, 1, P.white);
};
const hydrant: PropFn = (g, x, f) => {
  box(g, x + 5, f - 11, 7, 11, P.red);
  rect(g, x + 4, f - 9, 9, 2, P.red);
  rect(g, x + 6, f - 13, 5, 2, P.red);
  rect(g, x + 6, f - 10, 5, 1, P.white);
};
const cardboard: PropFn = (g, x, f, h) => {
  rect(g, x + 1, f - 2, 13, 2, P.cardboardDark);
  box(g, x + 3, f - 9, 10, 7, P.cardboard);
  rect(g, x + 2, f - 10, 4, 2, P.cardboard);
  if (h > 0.5) rect(g, x + 10, f - 11, 4, 2, P.cardboardDark);
};

function litter(g: G, x: number, f: number, h: number, style: PropStyle): void {
  const n = style === 'zombie' ? 4 : 2;
  for (let i = 0; i < n; i++) {
    const u = hashMix(h, i);
    const px = x + Math.floor(u * 14);
    const kind = Math.floor(hashMix(h, i + 9) * 4);
    if (kind === 0) rect(g, px, f - 1, 3, 1, P.paper);
    else if (kind === 1) rect(g, px, f - 2, 2, 2, P.can);
    else if (kind === 2) rect(g, px, f - 1, 2, 1, P.glass);
    else rect(g, px, f - 1, 4, 1, P.paperDark);
  }
}

function bloodPool(g: G, x: number, f: number, h: number): void {
  const w = 6 + Math.floor(h * 8);
  rect(g, x + 1, f - 1, w, 1, P.blood);
  rect(g, x + 3, f - 2, w - 5, 1, P.bloodLight);
}

// ---- castle ----------------------------------------------------------------------------------

const crate: PropFn = (g, x, f, h) => {
  box(g, x + 1, f - 11, 12, 11, P.wood, P.woodLight);
  rect(g, x + 2, f - 6, 10, 1, P.woodDark);
  rect(g, x + 6, f - 10, 1, 9, P.woodDark);
  if (h > 0.55) box(g, x + 4, f - 19, 9, 8, P.wood, P.woodLight);
};
const castleBarrel: PropFn = (g, x, f, h) => {
  box(g, x + 3, f - 13, 10, 13, P.wood, P.woodLight);
  rect(g, x + 3, f - 10, 10, 1, P.metalDark);
  rect(g, x + 3, f - 4, 10, 1, P.metalDark);
  if (h > 0.6) box(g, x + 9, f - 9, 7, 9, P.woodDark);
};
const hay: PropFn = (g, x, f) => {
  box(g, x + 1, f - 9, 14, 9, P.hay, P.hayDark);
  rect(g, x + 2, f - 6, 12, 1, P.hayDark);
  rect(g, x + 4, f - 11, 2, 2, P.hay);
  rect(g, x + 10, f - 10, 3, 1, P.hay);
};
const sacks: PropFn = (g, x, f, h) => {
  box(g, x + 1, f - 7, 8, 7, P.paperDark, P.paper);
  box(g, x + 7, f - 8, 8, 8, P.paperDark, P.paper);
  if (h > 0.5) box(g, x + 4, f - 13, 7, 6, P.paperDark, P.paper);
};
const candleStand: PropFn = (g, x, f) => {
  rect(g, x + 7, f - 14, 2, 14, P.metalDark);
  rect(g, x + 5, f - 1, 6, 1, P.metalDark);
  rect(g, x + 5, f - 15, 6, 1, P.metalDark);
  rect(g, x + 7, f - 18, 2, 3, P.candle);
  anim('flame', x + 7, f - 18, 0.3);
};
const bucket: PropFn = (g, x, f) => {
  box(g, x + 5, f - 6, 7, 6, P.wood);
  rect(g, x + 5, f - 4, 7, 1, P.metalDark);
  rect(g, x + 6, f - 8, 5, 1, P.metalDark);
};
const weaponRack: PropFn = (g, x, f) => {
  rect(g, x + 2, f - 2, 12, 2, P.woodDark);
  rect(g, x + 2, f - 16, 12, 1, P.woodDark);
  for (let i = 0; i < 3; i++) {
    rect(g, x + 4 + i * 4, f - 22, 1, 20, P.metalLight);
    rect(g, x + 3 + i * 4, f - 23, 3, 2, P.metal);
  }
};
function bones(g: G, x: number, f: number, h: number): void {
  rect(g, x, f - 1, 6, 1, P.bone);
  rect(g, x - 1, f - 2, 1, 2, P.boneDark);
  if (h > 0.5) {
    rect(g, x + 7, f - 4, 4, 3, P.bone);
    rect(g, x + 8, f - 3, 1, 1, P.outline);
    rect(g, x + 10, f - 3, 1, 1, P.outline);
  }
}
const banner: PropFn = (g, x, f, h) => {
  rect(g, x + 3, f - 54, 10, 1, P.woodDark);
  box(g, x + 4, f - 53, 8, 16, P.banner);
  rect(g, x + 4, f - 38, 3, 2, P.banner);
  rect(g, x + 9, f - 38, 3, 2, P.banner);
  rect(g, x + 7, f - 48, 2, 5, P.bannerGold);
  if (h > 0.5) rect(g, x + 6, f - 46, 4, 1, P.bannerGold);
};
const chains: PropFn = (g, x, f) => {
  for (let i = 0; i < 6; i++) rect(g, x + 7 + (i % 2), f - 52 + i * 3, 1, 2, P.metalLight);
  rect(g, x + 6, f - 34, 4, 2, P.metalDark);
};
const shieldEmblem: PropFn = (g, x, f, h) => {
  box(g, x + 4, f - 46, 9, 10, h < 0.5 ? P.banner : P.plastic);
  rect(g, x + 6, f - 37, 5, 2, h < 0.5 ? P.banner : P.plastic);
  rect(g, x + 8, f - 45, 1, 8, P.bannerGold);
  rect(g, x + 5, f - 42, 7, 1, P.bannerGold);
};

function hashMix(h: number, i: number): number {
  const v = Math.sin((h * 9301 + i * 49297) * 0.0001 + i * 12.9898) * 43758.5453;
  return v - Math.floor(v);
}

// ---- sets ------------------------------------------------------------------------------------

const d = (fn: PropFn, weight: number, span: 1 | 2 = 1, tall = false): PropDef => ({ fn, weight, span, tall });

const CITY_INDOOR = [
  d(desk, 4, 2, true), d(chair, 3), d(cabinet, 2, 1, true), d(plant, 3, 1, true), d(boxes, 3, 1, true),
  d(bin, 3), d(cooler, 1, 1, true), d(shelf, 2, 1, true), d(vending, 1, 1, true), d(sofa, 1, 2),
  d(printer, 1, 1, true), d(extinguisher, 1),
];
const CITY_OUTDOOR = [
  d(trashBags, 5), d(dumpster, 2, 2, true), d(cans, 3), d(tire, 2), d(pallet, 2), d(barrel, 2),
  d(cone, 1), d(hydrant, 1), d(cardboard, 3), d(boxes, 2, 1, true),
];
const CITY_WALL = [d(poster, 4), d(clock, 1), d(frame, 3), d(whiteboard, 2), d(acUnit, 1), d(switchPlate, 2)];

const SETS: Record<PropStyle, { indoor: readonly PropDef[]; outdoor: readonly PropDef[]; wall: readonly PropDef[] }> = {
  city: { indoor: CITY_INDOOR, outdoor: CITY_OUTDOOR, wall: CITY_WALL },
  zombie: {
    // Same city, abandoned: more trash, knocked-over furniture.
    indoor: [...CITY_INDOOR, d(trashBags, 4), d(cardboard, 3), d(cans, 3), d(tire, 1)],
    outdoor: [...CITY_OUTDOOR, d(trashBags, 4), d(cans, 3)],
    wall: CITY_WALL.filter((p) => p.fn !== clock),
  },
  castle: {
    indoor: [
      d(crate, 4, 1, true), d(castleBarrel, 4), d(hay, 2), d(sacks, 3), d(candleStand, 2, 1, true),
      d(bucket, 2), d(weaponRack, 2, 1, true),
    ],
    outdoor: [d(crate, 3, 1, true), d(castleBarrel, 3), d(hay, 3), d(sacks, 2), d(bucket, 2)],
    wall: [d(banner, 3), d(chains, 2), d(shieldEmblem, 2)],
  },
};

