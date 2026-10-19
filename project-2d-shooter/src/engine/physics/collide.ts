import type { Rect } from '../math/rect';
import { isBlocking, Tile, type TileGrid } from './tilegrid';

export interface CollisionResult {
  onGround: boolean;
  /** Standing on a one-way platform (so "drop through" is possible). */
  onOneWay: boolean;
  hitCeiling: boolean;
  hitLeft: boolean;
  hitRight: boolean;
}

export interface MoveOptions {
  /** Ignore one-way platforms this move (drop-through). */
  dropThrough?: boolean;
}

const EPS = 1e-4;

/**
 * Moves an AABB by (dx, dy) against the grid, X then Y, mutating `box`.
 * Movement is split into sub-steps of at most half a tile so fast bodies never tunnel.
 */
export function moveAndCollide(box: Rect, dx: number, dy: number, grid: TileGrid, options: MoveOptions = {}): CollisionResult {
  const result: CollisionResult = { onGround: false, onOneWay: false, hitCeiling: false, hitLeft: false, hitRight: false };
  const maxStep = grid.tileSize / 2;
  const steps = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)) / maxStep));
  const sx = dx / steps;
  const sy = dy / steps;
  let blockedX = false;
  let blockedY = false;
  for (let i = 0; i < steps; i++) {
    if (!blockedX && sx !== 0) blockedX = moveX(box, sx, grid, result);
    if (!blockedY && sy !== 0) blockedY = moveY(box, sy, grid, result, options);
  }
  if (!result.onGround && dy >= 0) probeGround(box, grid, result, options);
  return result;
}

function moveX(box: Rect, dx: number, grid: TileGrid, result: CollisionResult): boolean {
  const ts = grid.tileSize;
  const nx = box.x + dx;
  const r0 = Math.floor(box.y / ts);
  const r1 = Math.floor((box.y + box.h - EPS) / ts);
  if (dx > 0) {
    const col = Math.floor((nx + box.w - EPS) / ts);
    for (let r = r0; r <= r1; r++) {
      if (isBlocking(grid.get(col, r))) {
        box.x = col * ts - box.w;
        result.hitRight = true;
        return true;
      }
    }
  } else {
    const col = Math.floor(nx / ts);
    for (let r = r0; r <= r1; r++) {
      if (isBlocking(grid.get(col, r))) {
        box.x = (col + 1) * ts;
        result.hitLeft = true;
        return true;
      }
    }
  }
  box.x = nx;
  return false;
}

function moveY(box: Rect, dy: number, grid: TileGrid, result: CollisionResult, options: MoveOptions): boolean {
  const ts = grid.tileSize;
  const ny = box.y + dy;
  const c0 = Math.floor(box.x / ts);
  const c1 = Math.floor((box.x + box.w - EPS) / ts);
  if (dy > 0) {
    const bottom = box.y + box.h;
    const row = Math.floor((ny + box.h - EPS) / ts);
    const rowTop = row * ts;
    let landed = false;
    let oneWay = false;
    for (let c = c0; c <= c1; c++) {
      const t = grid.get(c, row);
      if (isBlocking(t)) {
        landed = true;
        oneWay = false;
        break;
      }
      // One-way: only when we were above its top edge before this move.
      if (t === Tile.OneWay && !options.dropThrough && bottom <= rowTop + EPS) {
        landed = true;
        oneWay = true;
      }
    }
    if (landed) {
      box.y = rowTop - box.h;
      result.onGround = true;
      result.onOneWay = oneWay;
      return true;
    }
  } else {
    const row = Math.floor(ny / ts);
    for (let c = c0; c <= c1; c++) {
      if (isBlocking(grid.get(c, row))) {
        box.y = (row + 1) * ts;
        result.hitCeiling = true;
        return true;
      }
    }
  }
  box.y = ny;
  return false;
}

/** Grounded check when not moving down this step (e.g. standing still with dy = 0). */
function probeGround(box: Rect, grid: TileGrid, result: CollisionResult, options: MoveOptions): void {
  const ts = grid.tileSize;
  const bottom = box.y + box.h;
  if (Math.abs(bottom - Math.round(bottom / ts) * ts) > 0.01) return;
  const row = Math.round(bottom / ts);
  const c0 = Math.floor(box.x / ts);
  const c1 = Math.floor((box.x + box.w - EPS) / ts);
  for (let c = c0; c <= c1; c++) {
    const t = grid.get(c, row);
    if (isBlocking(t) || (t === Tile.OneWay && !options.dropThrough)) {
      result.onGround = true;
      result.onOneWay = t === Tile.OneWay;
      if (isBlocking(t)) return;
    }
  }
}

/** True if the box overlaps no solid tile (e.g. "is there room to stand up?"). */
export function boxFits(box: Rect, grid: TileGrid): boolean {
  const ts = grid.tileSize;
  const c0 = Math.floor(box.x / ts);
  const c1 = Math.floor((box.x + box.w - EPS) / ts);
  const r0 = Math.floor(box.y / ts);
  const r1 = Math.floor((box.y + box.h - EPS) / ts);
  for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) if (isBlocking(grid.get(c, r))) return false;
  return true;
}
