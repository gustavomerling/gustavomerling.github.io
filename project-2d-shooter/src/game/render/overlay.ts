import type { World } from '@engine/ecs/world';
import type { Vec2 } from '@engine/math/vec2';
import type { Feedback } from '../systems/context';
import { Aim, Arsenal, Body, PlayerControl, Position } from '../world/components';
import { shoulder } from '../world/geometry';

/** World-space extras drawn after characters (laser sight attachment). */
export function drawWorldOverlay(ctx: CanvasRenderingContext2D, world: World): void {
  const row = world.first(Position, Body, Aim, Arsenal, PlayerControl);
  if (!row) return;
  const [, pos, body, aim, arsenal] = row;
  const ws = arsenal.weapons[arsenal.active];
  if (!ws?.weapon.behaviors.has('laserSight')) return;
  const from = shoulder(pos, body);
  ctx.strokeStyle = 'rgba(255,40,40,0.6)';
  ctx.lineWidth = 0.75;
  ctx.beginPath();
  ctx.moveTo(from.x, from.y);
  ctx.lineTo(from.x + Math.cos(aim.angle) * ws.weapon.stats.range, from.y + Math.sin(aim.angle) * ws.weapon.stats.range);
  ctx.stroke();
}

export interface ScreenOverlayState {
  pointer: Vec2 | null;
  feedback: Feedback;
  /** Tile under the pointer, shown next to the crosshair while the grid is on. */
  pointerTile: { col: number; row: number } | null;
}

/** Screen-space overlay: crosshair, hit marker and the grid read-out. */
export function drawScreenOverlay(ctx: CanvasRenderingContext2D, s: ScreenOverlayState): void {
  if (!s.pointer) return;
  const { x, y } = s.pointer;
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (const [dx, dy] of [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ] as const) {
    ctx.moveTo(x + dx * 2.5, y + dy * 2.5);
    ctx.lineTo(x + dx * 6, y + dy * 6);
  }
  ctx.stroke();

  // Hit marker: diagonal ticks, red on kill, orange on headshot.
  if (s.feedback.hitMarker > 0) {
    ctx.strokeStyle = s.feedback.hitKill ? '#ff3030' : s.feedback.hitHead ? '#ffb347' : '#ffffff';
    const o = s.feedback.hitKill ? 7 : 6;
    ctx.beginPath();
    for (const [sx, sy] of [
      [1, 1],
      [1, -1],
      [-1, 1],
      [-1, -1],
    ] as const) {
      ctx.moveTo(x + sx * 3, y + sy * 3);
      ctx.lineTo(x + sx * o, y + sy * o);
    }
    ctx.stroke();
  }

  if (s.pointerTile) {
    ctx.font = '6px monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillStyle = 'rgba(160,200,255,0.9)';
    ctx.fillText(`${s.pointerTile.col},${s.pointerTile.row}`, x + 7, y + 6);
  }
}
