import type { World } from '@engine/ecs/world';
import type { Vec2 } from '@engine/math/vec2';
import type { Feedback } from '../systems/context';
import type { TileGrid } from '@engine/physics/tilegrid';
import { ENEMIES } from '../content/enemies/catalog';
import { Aim, Arsenal, Body, Brain, Npc, PlayerControl, Position } from '../world/components';
import { shoulder } from '../world/geometry';

/** Enemy lasers: a thin red line along the aim, up to the first wall, while they see the player. */
function drawEnemyLasers(ctx: CanvasRenderingContext2D, world: World, grid: TileGrid, time: number): void {
  for (const [, pos, body, aim, brain, npc] of world.query(Position, Body, Aim, Brain, Npc)) {
    const def = ENEMIES.get(npc.defId);
    if (!def.laser || brain.seeTime <= 0) continue;
    const from = shoulder(pos, body);
    let len = 0;
    const dx = Math.cos(aim.angle);
    const dy = Math.sin(aim.angle);
    while (len < def.sightRange && !grid.isSolidAtPixel(from.x + dx * len, from.y + dy * len)) len += 2;
    // Brighter (and flickering) as the shot gets close.
    const ready = Math.min(1, brain.seeTime / (def.reaction ?? 1));
    ctx.strokeStyle = `rgba(255,40,40,${0.25 + 0.5 * ready * (0.8 + 0.2 * Math.sin(time * 40))})`;
    ctx.lineWidth = 0.6;
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(from.x + dx * len, from.y + dy * len);
    ctx.stroke();
  }
}

/** World-space extras drawn after characters (laser sights). */
export function drawWorldOverlay(ctx: CanvasRenderingContext2D, world: World, grid: TileGrid, time: number): void {
  drawEnemyLasers(ctx, world, grid, time);
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
  // Four ticks that open with the gun's spread; dim while reloading / swapping.
  const gap = 2 + s.feedback.spread;
  ctx.strokeStyle = s.feedback.busy ? 'rgba(255,255,255,0.35)' : '#ffffff';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (const [dx, dy] of [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ] as const) {
    ctx.moveTo(x + dx * gap, y + dy * gap);
    ctx.lineTo(x + dx * (gap + 3.5), y + dy * (gap + 3.5));
  }
  ctx.stroke();
  ctx.fillStyle = ctx.strokeStyle;
  ctx.fillRect(x - 0.5, y - 0.5, 1, 1);

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
