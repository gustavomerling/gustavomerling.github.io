import type { World } from '@engine/ecs/world';
import { pixelLine } from '@engine/render/pixel';
import type { Feedback } from '../systems/context';
import { Aim, Arsenal, Body, Effect, PlayerControl, Position } from '../world/components';
import { shoulder } from '../world/geometry';

/** World-space extras drawn after entities (laser sight). */
export function drawWorldOverlay(ctx: CanvasRenderingContext2D, world: World): void {
  const row = world.first(Position, Body, Aim, Arsenal, PlayerControl);
  if (!row) return;
  const [, pos, body, aim, arsenal] = row;
  const ws = arsenal.weapons[arsenal.active];
  if (!ws?.weapon.behaviors.has('laserSight')) return;
  const from = shoulder(pos, body);
  ctx.strokeStyle = 'rgba(255,40,40,0.6)';
  ctx.beginPath();
  ctx.moveTo(from.x, from.y);
  ctx.lineTo(from.x + Math.cos(aim.angle) * ws.weapon.stats.range, from.y + Math.sin(aim.angle) * ws.weapon.stats.range);
  ctx.stroke();
}

export interface ScreenOverlayState {
  pointer: { x: number; y: number } | null;
  timeScale: number;
  feedback: Feedback;
  /** Player health fraction 0..1 (null = no player). */
  health: number | null;
  time: number;
}

/** Screen-space overlay: slow-mo tint, flashes, low-health vignette, damage direction, crosshair + hit marker. */
export function drawScreenOverlay(ctx: CanvasRenderingContext2D, world: World, view: { w: number; h: number }, s: ScreenOverlayState): void {
  if (s.timeScale < 0.999) {
    const k = (1 - s.timeScale) / 0.7;
    ctx.fillStyle = `rgba(40, 90, 160, ${0.18 * k})`;
    ctx.fillRect(0, 0, view.w, view.h);
    ctx.strokeStyle = `rgba(120, 180, 255, ${0.6 * k})`;
    ctx.strokeRect(2.5, 2.5, view.w - 5, view.h - 5);
  }

  for (const [, fx] of world.query(Effect)) {
    if (fx.kind !== 'flash') continue;
    ctx.globalAlpha = Math.min(1, (fx.life / fx.maxLife) * 1.2) * (fx.intensity ?? 1);
    ctx.fillStyle = fx.color;
    ctx.fillRect(0, 0, view.w, view.h);
    ctx.globalAlpha = 1;
  }

  // Low health: pulsing red frame.
  if (s.health !== null && s.health < 0.3) {
    const pulse = 0.25 + 0.15 * Math.sin(s.time * 6);
    const k = (1 - s.health / 0.3) * 0.6 + 0.4;
    ctx.fillStyle = `rgba(200, 0, 0, ${pulse * k})`;
    for (let i = 0; i < 6; i++) {
      ctx.globalAlpha = 1 - i / 6;
      ctx.fillRect(i, i, view.w - i * 2, 1);
      ctx.fillRect(i, view.h - 1 - i, view.w - i * 2, 1);
      ctx.fillRect(i, i, 1, view.h - i * 2);
      ctx.fillRect(view.w - 1 - i, i, 1, view.h - i * 2);
    }
    ctx.globalAlpha = 1;
  }

  // Where the damage came from: red arcs around the screen centre.
  const cx = view.w / 2;
  const cy = view.h / 2;
  for (const d of s.feedback.damageDirs) {
    ctx.globalAlpha = Math.min(1, d.life / 0.4);
    ctx.fillStyle = '#ff2020';
    for (let a = -0.25; a <= 0.25; a += 0.02) {
      const ang = d.angle + a;
      const r = 70 - Math.abs(a) * 20;
      ctx.fillRect(Math.round(cx + Math.cos(ang) * r), Math.round(cy + Math.sin(ang) * r), 2, 2);
    }
    ctx.globalAlpha = 1;
  }

  if (s.pointer) {
    const x = Math.round(s.pointer.x);
    const y = Math.round(s.pointer.y);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x - 5, y, 3, 1);
    ctx.fillRect(x + 3, y, 3, 1);
    ctx.fillRect(x, y - 5, 1, 3);
    ctx.fillRect(x, y + 3, 1, 3);
    ctx.fillRect(x, y, 1, 1);
    // Hit marker: diagonal ticks, red on kill/headshot.
    if (s.feedback.hitMarker > 0) {
      ctx.fillStyle = s.feedback.hitKill ? '#ff3030' : s.feedback.hitHead ? '#ffb347' : '#ffffff';
      const o = s.feedback.hitKill ? 7 : 6;
      for (const [sx, sy] of [
        [1, 1],
        [1, -1],
        [-1, 1],
        [-1, -1],
      ] as const) {
        pixelLine(ctx, x + sx * 3, y + sy * 3, x + sx * o, y + sy * o);
      }
    }
  }
}
