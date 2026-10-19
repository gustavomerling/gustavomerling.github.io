import type { Rect } from '@engine/math/rect';
import { Tile, type TileGrid } from '@engine/physics/tilegrid';
import type { BiomePalette } from '../content/biomes/catalog';
import type { LevelData } from '../procgen/level';

/**
 * Wireframe tiles: solid blocks with an outline only where they face open space,
 * one-way platforms as a thin bar. Replace with tileset blitting when art exists.
 */
export function drawTiles(ctx: CanvasRenderingContext2D, grid: TileGrid, palette: BiomePalette, view: Rect): void {
  const ts = grid.tileSize;
  const c0 = Math.max(0, Math.floor(view.x / ts));
  const r0 = Math.max(0, Math.floor(view.y / ts));
  const c1 = Math.min(grid.cols - 1, Math.floor((view.x + view.w) / ts));
  const r1 = Math.min(grid.rows - 1, Math.floor((view.y + view.h) / ts));
  const open = (c: number, r: number) => grid.inBounds(c, r) && grid.get(c, r) !== Tile.Solid;

  for (let r = r0; r <= r1; r++) {
    for (let c = c0; c <= c1; c++) {
      const t = grid.get(c, r);
      const x = c * ts;
      const y = r * ts;
      if (t === Tile.Solid) {
        ctx.fillStyle = palette.solid;
        ctx.fillRect(x, y, ts, ts);
        ctx.fillStyle = palette.solidEdge;
        if (open(c, r - 1)) ctx.fillRect(x, y, ts, 1);
        if (open(c, r + 1)) ctx.fillRect(x, y + ts - 1, ts, 1);
        if (open(c - 1, r)) ctx.fillRect(x, y, 1, ts);
        if (open(c + 1, r)) ctx.fillRect(x + ts - 1, y, 1, ts);
      } else if (t === Tile.OneWay) {
        ctx.fillStyle = palette.oneWay;
        ctx.fillRect(x, y, ts, 2);
        ctx.fillRect(x + 2, y + 2, 1, 2);
        ctx.fillRect(x + ts - 3, y + 2, 1, 2);
      }
    }
  }
}

/** Exit door marker. */
export function drawExit(ctx: CanvasRenderingContext2D, level: LevelData, palette: BiomePalette, label: string, time: number): void {
  const w = 20;
  const h = 30;
  const x = Math.round(level.exit.x - w / 2);
  const y = Math.round(level.exit.y - h);
  ctx.strokeStyle = palette.accent;
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
  ctx.fillStyle = palette.accent;
  ctx.globalAlpha = 0.5 + 0.5 * Math.sin(time * 4);
  ctx.fillRect(x + 4, y + 4, w - 8, 2);
  ctx.globalAlpha = 1;
  ctx.font = '8px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(label, x + w / 2, y - 3);
}
