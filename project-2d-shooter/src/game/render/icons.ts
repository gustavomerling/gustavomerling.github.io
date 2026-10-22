import { GUN, INK } from './palette';

/**
 * Pixel-art gun silhouettes, one grid per gun model (facing right, 1 char = 1 pixel).
 * Legend: m metal, d dark metal, l light metal, w wood, b brass. Used by the HUD icon and floor pickups.
 */
const GUN_PIXELS: Record<string, readonly string[]> = {
  glock: [
    'dddddddddddd',
    'mmmmmmmmmmml',
    'mmmmmmmmmmmm',
    '.mmmd.d.....',
    '.mmm..dd....',
    'mmmm........',
    'mmm.........',
    'mmm.........',
  ],
  uzi: [
    '....dddddddddd..',
    'll.mmmmmmmmmmmmm',
    '.lmmmmmmmmmmmm..',
    '.....mm.dd......',
    '.....mmdd.......',
    '.....mm.........',
    '.....dd.........',
    '.....dd.........',
  ],
  bizon: [
    '......dd..........',
    'ww.mmmmmmmmmmmmmmm',
    'wwwmmmmmmmmmmmmm..',
    'www..mm.ddddddddd.',
    'ww...mmd..........',
    '.....mm...........',
  ],
  ak47: [
    '.......d..............d',
    'wwwwmmmmmmmmmmmmmmmmmmm',
    'wwwwwmmmmmmmmwwwwwmmm..',
    '..wwww.mmddd...........',
    '...www.m.ddd...........',
    '........ddd............',
    '.......ddd.............',
  ],
  sniper: [
    '.........dddddddd...........',
    '........dllddddlld..........',
    '.........dddddddd...........',
    'wwwwww...m....m.............',
    'wwwwwwwwmmmmmmmmmmmmmmmmmmmm',
    '.wwwwwwwwwmmmmmmmm..........',
    '...wwww..mdd................',
    '.........d.d................',
  ],
  shotgun: [
    'wwww.......................',
    'wwwwwmmmmmmmmmmmmmmmmmmmmml',
    'wwwwwwmmmmmmwwwwwwwwmmmmm..',
    '..wwwwmd.d..wwwwwwww.......',
    '....ww..dd.................',
  ],
  'iron-sword': [
    '....b.................',
    '....b.................',
    'b.wwbllllllllllllllll.',
    'bwwwbmmmmmmmmmmmmmmmml',
    'b.wwbdddddddddddddddd.',
    '....b.................',
    '....b.................',
  ],
  shortbow: [
    '.ww....',
    '.l.w...',
    '.l..w..',
    '.l...w.',
    '.l...w.',
    '.l....w',
    '.l....b',
    '.l....b',
    '.l....w',
    '.l...w.',
    '.l...w.',
    '.l..w..',
    '.l.w...',
    '.ww....',
  ],
};

const FILL: Record<string, string> = { m: GUN.metal, d: GUN.dark, l: GUN.light, w: GUN.wood, b: GUN.brass };

/** The pixel grid for a model (unknown models fall back to the pistol); muzzle attachments add pixels. */
export function gunPixels(modelId: string, attachments: readonly string[] = []): readonly string[] {
  const base = GUN_PIXELS[modelId] ?? GUN_PIXELS.glock!;
  const muzzle = attachments.includes('suppressor') ? 'dddd' : attachments.includes('compensator') ? 'dd' : '';
  if (!muzzle) return base;
  // The muzzle row is the first one that reaches the right edge.
  const w = Math.max(...base.map((r) => r.length));
  const row = Math.max(0, base.findIndex((r) => r.length === w && r[w - 1] !== '.'));
  return base.map((r, i) => r.padEnd(w, '.') + (i === row ? muzzle : '.'.repeat(muzzle.length)));
}

export function gridSize(grid: readonly string[]): { w: number; h: number } {
  return { w: Math.max(...grid.map((r) => r.length)), h: grid.length };
}

/** Draws a grid at (x, y) top-left, `px` canvas units per cell, with a 1-cell outline (8-neighbour) behind it. */
export function drawPixelGrid(ctx: CanvasRenderingContext2D, grid: readonly string[], x: number, y: number, px = 1, outline: string | null = INK.outline): void {
  x = Math.round(x);
  y = Math.round(y);
  if (outline) {
    ctx.fillStyle = outline;
    grid.forEach((row, cy) => {
      for (let cx = 0; cx < row.length; cx++) if (row[cx] !== '.') ctx.fillRect(x + (cx - 1) * px, y + (cy - 1) * px, px * 3, px * 3);
    });
  }
  grid.forEach((row, cy) => {
    for (let cx = 0; cx < row.length; cx++) {
      const fill = FILL[row[cx]!];
      if (!fill) continue;
      ctx.fillStyle = fill;
      ctx.fillRect(x + cx * px, y + cy * px, px, px);
    }
  });
}

/** Draws a gun (with its attachments) fitted into a w x h box at a whole-pixel scale, for UI icons. */
export function drawWeaponIcon(ctx: CanvasRenderingContext2D, w: number, h: number, modelId: string, attachments: readonly string[]): void {
  ctx.clearRect(0, 0, w, h);
  const grid = gunPixels(modelId, attachments);
  const size = gridSize(grid);
  const px = Math.max(1, Math.floor(Math.min((w - 4) / (size.w + 2), (h - 4) / (size.h + 2))));
  drawPixelGrid(ctx, grid, (w - size.w * px) / 2, (h - size.h * px) / 2, px, INK.black);
}
