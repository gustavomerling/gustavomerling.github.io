import type { World } from '@engine/ecs/world';
import type { Vec2 } from '@engine/math/vec2';
import type { Feedback } from '../systems/context';
import type { TileGrid } from '@engine/physics/tilegrid';
import { ENEMIES } from '../content/enemies/catalog';
import { Aim, Arsenal, Body, Brain, Guard, Npc, PlayerControl, Position, SwordState } from '../world/components';
import { bodyCenter, shoulder } from '../world/geometry';

/** Magic bubbles, raised-shield glints and the sword's sweep trail. */
function drawMedievalFx(ctx: CanvasRenderingContext2D, world: World, time: number): void {
  for (const [, pos, body, guard] of world.query(Position, Body, Guard)) {
    const center = bodyCenter(pos, body);
    if (guard.magicLeft > 0) {
      const fade = Math.min(1, guard.magicLeft / 0.35, (guard.magicMax - guard.magicLeft) / 0.15 + 0.3);
      const r = Math.max(body.w, body.h) * 0.62 + 2 + Math.sin(time * 7) * 1.2;
      ctx.globalAlpha = 0.32 * fade;
      ctx.fillStyle = '#65d8ef';
      ctx.beginPath();
      ctx.arc(center.x, center.y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 0.85 * fade;
      ctx.strokeStyle = '#8ef3ff';
      ctx.lineWidth = 1.1;
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    if (guard.flash > 0) {
      ctx.globalAlpha = Math.min(1, guard.flash * 5) * 0.7;
      ctx.strokeStyle = guard.magicLeft > 0 ? '#8ef3ff' : '#ffd27a';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.arc(center.x, center.y, Math.max(body.w, body.h) * 0.62 + 3, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }

  const sword = world.first(Position, Body, SwordState, PlayerControl);
  if (!sword) return;
  const [, pos, body, state] = sword;
  if (state.swingLeft <= 0) return;
  const center = bodyCenter(pos, body);
  const t = 1 - state.swingLeft / Math.max(state.swingTotal, 0.01);
  const base = state.swingAngle;
  const arc = 0.85;
  const sweep = base + (t * 2 - 1) * arc;
  ctx.globalAlpha = (1 - t) * 0.75;
  ctx.strokeStyle = '#e9f0ff';
  ctx.lineWidth = 2.6;
  ctx.beginPath();
  ctx.arc(center.x, center.y, 26, sweep - arc * 0.9, sweep + arc * 0.35);
  ctx.stroke();
  ctx.globalAlpha = 1;
}

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
  drawMedievalFx(ctx, world, time);
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
