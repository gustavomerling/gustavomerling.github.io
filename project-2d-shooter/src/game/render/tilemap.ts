import type { Rect } from '@engine/math/rect';
import { Tile, type TileGrid } from '@engine/physics/tilegrid';
import type { BiomePalette } from '../content/biomes/catalog';
import type { LevelData } from '../procgen/level';
import { ROOM_COLS, STOREY_ROWS } from '../procgen/rooms';

/** One device pixel, in world units (for hairlines that stay 1px at any zoom). */
const hairline = (ctx: CanvasRenderingContext2D): number => 1 / ctx.getTransform().a;

/** Visible tile range of a view rect. */
function tileRange(grid: TileGrid, view: Rect) {
  const ts = grid.tileSize;
  return {
    c0: Math.max(0, Math.floor(view.x / ts)),
    r0: Math.max(0, Math.floor(view.y / ts)),
    c1: Math.min(grid.cols - 1, Math.floor((view.x + view.w) / ts)),
    r1: Math.min(grid.rows - 1, Math.floor((view.y + view.h) / ts)),
  };
}

/**
 * Building back walls. Windows are holes cut in the wall, so the skybox shows through them,
 * with a faint glass tint and a thin frame. Outdoor chunks have no wall at all.
 */
export function drawBackdrop(ctx: CanvasRenderingContext2D, level: LevelData, view: Rect): void {
  const ts = level.grid.tileSize;
  for (const room of level.rooms) {
    if (room.outdoor || room.rect.x + room.rect.w < view.x || room.rect.x > view.x + view.w) continue;
    ctx.save();
    ctx.beginPath();
    ctx.rect(room.rect.x, room.rect.y, room.rect.w, room.rect.h);
    for (const w of room.windows) ctx.rect(w.cx * ts, w.cy * ts, ts, ts);
    ctx.clip('evenodd');
    ctx.fillStyle = room.style.wall;
    ctx.fillRect(room.rect.x, room.rect.y, room.rect.w, room.rect.h);
    ctx.restore();

    ctx.fillStyle = room.style.window;
    ctx.globalAlpha = 0.35;
    for (const w of room.windows) ctx.fillRect(w.cx * ts, w.cy * ts, ts, ts);
    ctx.globalAlpha = 1;
    ctx.strokeStyle = 'rgba(160,170,200,0.35)';
    ctx.lineWidth = 0.75;
    for (const w of room.windows) ctx.strokeRect(w.cx * ts, w.cy * ts, ts, ts);
  }
}

/** Solid blocks outlined where they face open space, one-way platforms as bars, ladders as rails. */
export function drawTiles(ctx: CanvasRenderingContext2D, grid: TileGrid, palette: BiomePalette, view: Rect): void {
  const ts = grid.tileSize;
  const { c0, r0, c1, r1 } = tileRange(grid, view);
  const open = (c: number, r: number) => grid.inBounds(c, r) && grid.get(c, r) !== Tile.Solid;
  const edge = Math.max(1, hairline(ctx) * 2);

  for (let r = r0; r <= r1; r++) {
    for (let c = c0; c <= c1; c++) {
      const t = grid.get(c, r);
      const x = c * ts;
      const y = r * ts;
      if (t === Tile.Solid) {
        ctx.fillStyle = palette.solid;
        ctx.fillRect(x, y, ts, ts);
        ctx.fillStyle = palette.solidEdge;
        if (open(c, r - 1)) ctx.fillRect(x, y, ts, edge);
        if (open(c, r + 1)) ctx.fillRect(x, y + ts - edge, ts, edge);
        if (open(c - 1, r)) ctx.fillRect(x, y, edge, ts);
        if (open(c + 1, r)) ctx.fillRect(x + ts - edge, y, edge, ts);
      } else if (t === Tile.OneWay) {
        ctx.fillStyle = palette.oneWay;
        ctx.fillRect(x, y, ts, 3);
      } else if (t === Tile.Ladder) {
        ctx.fillStyle = palette.ladder;
        ctx.fillRect(x + 3, y, 1.5, ts);
        ctx.fillRect(x + ts - 4.5, y, 1.5, ts);
        for (let yy = y + 2; yy < y + ts; yy += 4) ctx.fillRect(x + 3, yy, ts - 6, 1.2);
      }
    }
  }
}

/**
 * Measuring grid over the world: a line every tile, stronger every storey/5 tiles,
 * strongest on chunk borders. Drawn above the tiles so it reads everywhere.
 */
export function drawGrid(ctx: CanvasRenderingContext2D, grid: TileGrid, view: Rect): void {
  const ts = grid.tileSize;
  const { c0, r0, c1, r1 } = tileRange(grid, view);
  const px = hairline(ctx);
  const top = r0 * ts;
  const bottom = (r1 + 1) * ts;
  const left = c0 * ts;
  const right = (c1 + 1) * ts;

  const strength = (i: number, chunk: number) => (i % chunk === 0 ? 0.4 : i % STOREY_ROWS === 0 ? 0.22 : 0.1);
  for (let c = c0; c <= c1 + 1; c++) {
    ctx.fillStyle = `rgba(160,200,255,${strength(c, ROOM_COLS)})`;
    ctx.fillRect(c * ts - px / 2, top, px, bottom - top);
  }
  for (let r = r0; r <= r1 + 1; r++) {
    // Rows count from the ground up, so the storey lines land on the slabs.
    const fromGround = grid.rows - r;
    ctx.fillStyle = `rgba(160,200,255,${fromGround % STOREY_ROWS === 1 ? 0.22 : 0.1})`;
    ctx.fillRect(left, r * ts - px / 2, right - left, px);
  }
}

/** Exit door marker. */
export function drawExit(ctx: CanvasRenderingContext2D, level: LevelData, palette: BiomePalette, label: string, time: number): void {
  const w = 20;
  const h = 30;
  const x = level.exit.x - w / 2;
  const y = level.exit.y - h;
  ctx.strokeStyle = palette.accent;
  ctx.lineWidth = 1.5;
  ctx.strokeRect(x, y, w, h);
  ctx.fillStyle = palette.accent;
  ctx.globalAlpha = 0.5 + 0.5 * Math.sin(time * 4);
  ctx.fillRect(x + 4, y + 4, w - 8, 2);
  ctx.globalAlpha = 1;
  ctx.font = '8px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(label, x + w / 2, y - 4);
}
