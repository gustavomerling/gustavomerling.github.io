import { hashString } from '@engine/math/rng';
import type { Rect } from '@engine/math/rect';
import { Tile, type TileGrid } from '@engine/physics/tilegrid';
import type { LevelData, PlacedRoom } from '../procgen/level';
import { ROOM_COLS, STOREY_ROWS, STOREYS } from '../procgen/rooms';
import { drawGlow, drawMood, drawShade, flickerFactor, LIGHTING } from './lighting';
import { GRID, LINE, rgba, theme } from './palette';

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

/** Window tiles of a room as a lookup set (cached; rooms don't change during a run). */
const windowSets = new WeakMap<PlacedRoom, Set<number>>();
const cellKey = (cx: number, cy: number): number => cy * 100000 + cx;
function windowSet(room: PlacedRoom): Set<number> {
  let s = windowSets.get(room);
  if (!s) {
    s = new Set(room.windows.map((w) => cellKey(w.cx, w.cy)));
    windowSets.set(room, s);
  }
  return s;
}

/** Deterministic 0..1 per (room, slot). */
const roomNoise = (room: PlacedRoom, slot: number): number => (hashString(`${room.index}:${room.templateId}:${slot}`) % 10000) / 10000;

/**
 * Building back walls. Windows are holes cut in the wall, so the skybox shows through them,
 * with a faint glass tint, a frame around each opening and a sill. Back walls get interior depth
 * (ceiling/floor/corner shadow per storey, a faint storey band) and soft light pools (lamps or
 * torches, light spilling in through windows). Outdoor chunks have no wall at all.
 * Ends with the screen mood (wash + vignette), still below the tiles.
 */
export function drawBackdrop(ctx: CanvasRenderingContext2D, level: LevelData, view: Rect): void {
  const ts = level.grid.tileSize;
  const th = theme();
  const b = th.buildings;
  const light = th.light;
  for (const room of level.rooms) {
    const { x: rx, y: ry, w: rw, h: rh } = room.rect;
    if (room.outdoor || rx + rw < view.x || rx > view.x + view.w) continue;
    const tone = b[room.style.tone];
    ctx.save();
    ctx.beginPath();
    ctx.rect(rx, ry, rw, rh);
    for (const w of room.windows) ctx.rect(w.cx * ts, w.cy * ts, ts, ts);
    ctx.clip('evenodd');
    ctx.fillStyle = tone.wall;
    ctx.fillRect(rx, ry, rw, rh);

    if (LIGHTING.depth) {
      // Inner faces of the side walls (the border columns are solid tiles).
      const inX = rx + ts;
      const inW = rw - ts * 2;
      drawShade(ctx, inX, ry, ts * 2, rh, b.shade, 'right', 0.7);
      drawShade(ctx, inX + inW - ts * 2, ry, ts * 2, rh, b.shade, 'left', 0.7);
      for (let s = 0; s < STOREYS; s++) {
        const y0 = ry + (s * STOREY_ROWS + 1) * ts;
        const y1 = ry + (s + 1) * STOREY_ROWS * ts;
        drawShade(ctx, inX, y0, inW, ts * 1.4, b.shade, 'down');
        drawShade(ctx, inX, y1 - ts * 0.9, inW, ts * 0.9, b.shade, 'up', 0.6);
        ctx.fillStyle = b.band;
        ctx.fillRect(inX, y1 - ts * 1.25, inW, 0.75);
        ctx.fillRect(inX, y0 + ts * 0.35, inW, 0.5);
      }
    }

    if (LIGHTING.glow) {
      for (let s = 0; s < STOREYS; s++) {
        if (roomNoise(room, s) >= light.lampChance) continue;
        const lx = rx + ts * (4 + roomNoise(room, s + 10) * (ROOM_COLS - 8));
        const ly = ry + (s * STOREY_ROWS + 1) * ts + 2;
        const f = flickerFactor(light.flicker, room.index * 5 + s);
        drawGlow(ctx, lx, ly, ts * 3.4, light.lamp, light.lampAlpha * f);
      }
      for (const w of room.windows) drawGlow(ctx, (w.cx + 0.5) * ts, (w.cy + 0.5) * ts, ts * 2.2, light.windowSpill, light.spillAlpha);
    }
    ctx.restore();

    // Glass tint, then one frame around each opening (no lines between tiles of the same window).
    ctx.fillStyle = tone.window;
    ctx.globalAlpha = b.glassAlpha;
    for (const w of room.windows) ctx.fillRect(w.cx * ts, w.cy * ts, ts, ts);
    ctx.globalAlpha = 1;
    const set = windowSet(room);
    const fw = LINE.windowFrame;
    ctx.fillStyle = b.windowFrame;
    for (const w of room.windows) {
      const x = w.cx * ts;
      const y = w.cy * ts;
      if (!set.has(cellKey(w.cx, w.cy - 1))) ctx.fillRect(x - fw, y - fw, ts + fw * 2, fw);
      if (!set.has(cellKey(w.cx - 1, w.cy))) ctx.fillRect(x - fw, y, fw, ts);
      if (!set.has(cellKey(w.cx + 1, w.cy))) ctx.fillRect(x + ts, y, fw, ts);
    }
    ctx.fillStyle = b.windowSill;
    for (const w of room.windows) {
      if (!set.has(cellKey(w.cx, w.cy + 1))) ctx.fillRect(w.cx * ts - 1.5, (w.cy + 1) * ts, ts + 3, 1.5);
    }
  }
  drawMood(ctx, view);
}

/** Solid blocks outlined where they face open space, one-way platforms as bars, ladders as rails. */
export function drawTiles(ctx: CanvasRenderingContext2D, grid: TileGrid, view: Rect): void {
  const palette = theme().tiles;
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
        const top = open(c, r - 1);
        if (top) {
          // Lit top face: a slightly lighter band under the walkable edge.
          ctx.fillStyle = palette.solidFace;
          ctx.fillRect(x, y, ts, ts * 0.3);
        }
        ctx.fillStyle = palette.solidEdge;
        if (top) ctx.fillRect(x, y, ts, edge);
        if (open(c, r + 1)) ctx.fillRect(x, y + ts - edge, ts, edge);
        if (open(c - 1, r)) ctx.fillRect(x, y, edge, ts);
        if (open(c + 1, r)) ctx.fillRect(x + ts - edge, y, edge, ts);
      } else if (t === Tile.OneWay) {
        // Thin bar with a bright top line, a soft shadow below and end tabs: never reads as solid.
        const bar = LINE.oneWay;
        ctx.fillStyle = palette.oneWayShadow;
        ctx.fillRect(x, y + bar, ts, 2.5);
        ctx.fillStyle = palette.oneWay;
        ctx.fillRect(x, y, ts, bar);
        if (grid.get(c - 1, r) !== Tile.OneWay) ctx.fillRect(x, y + bar, 1.5, 2.5);
        if (grid.get(c + 1, r) !== Tile.OneWay) ctx.fillRect(x + ts - 1.5, y + bar, 1.5, 2.5);
        ctx.fillStyle = palette.oneWayEdge;
        ctx.fillRect(x, y, ts, edge);
      } else if (t === Tile.Ladder) {
        // Rungs first, rails on top (lighter); rails poke up past the top rung as a grab cue.
        const railW = 1.6;
        const lx = x + 3;
        const rxx = x + ts - 3 - railW;
        ctx.fillStyle = palette.ladder;
        for (let yy = y + 2; yy < y + ts; yy += 4) ctx.fillRect(lx, yy, rxx - lx + railW, 1.2);
        const cap = grid.inBounds(c, r - 1) && grid.get(c, r - 1) === Tile.Empty ? 3 : 0;
        ctx.fillStyle = palette.ladderRail;
        ctx.fillRect(lx, y - cap, railW, ts + cap);
        ctx.fillRect(rxx, y - cap, railW, ts + cap);
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

  const strength = (i: number, chunk: number) => (i % chunk === 0 ? GRID.alpha.chunk : i % STOREY_ROWS === 0 ? GRID.alpha.storey : GRID.alpha.tile);
  for (let c = c0; c <= c1 + 1; c++) {
    ctx.fillStyle = rgba(GRID.line, strength(c, ROOM_COLS));
    ctx.fillRect(c * ts - px / 2, top, px, bottom - top);
  }
  for (let r = r0; r <= r1 + 1; r++) {
    // Rows count from the ground up, so the storey lines land on the slabs.
    const fromGround = grid.rows - r;
    ctx.fillStyle = rgba(GRID.line, fromGround % STOREY_ROWS === 1 ? GRID.alpha.storey : GRID.alpha.tile);
    ctx.fillRect(left, r * ts - px / 2, right - left, px);
  }
}

/** Exit door marker. */
export function drawExit(ctx: CanvasRenderingContext2D, level: LevelData, label: string, time: number): void {
  const color = theme().exit;
  const w = 20;
  const h = 30;
  const x = level.exit.x - w / 2;
  const y = level.exit.y - h;
  ctx.strokeStyle = color;
  ctx.lineWidth = LINE.exitFrame;
  ctx.strokeRect(x, y, w, h);
  ctx.fillStyle = color;
  ctx.globalAlpha = 0.5 + 0.5 * Math.sin(time * 4);
  ctx.fillRect(x + 4, y + 4, w - 8, 2);
  ctx.globalAlpha = 1;
  ctx.font = '8px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(label, x + w / 2, y - 4);
}
