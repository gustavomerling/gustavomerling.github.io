import type { World } from '@engine/ecs/world';
import type { Vec2 } from '@engine/math/vec2';
import type { Feedback, HudCues } from '../systems/context';
import { HUD_CUES } from '../systems/hud';
import type { TileGrid } from '@engine/physics/tilegrid';
import { ENEMIES } from '../content/enemies/catalog';
import { lerp } from '@engine/math/math';
import { bladeSegment, fencerPose } from '../systems/fencing';
import { Aim, Arsenal, Body, Brain, Fencer, Npc, PlayerControl, Position, Rig } from '../world/components';
import { bodyCenter, shoulder } from '../world/geometry';
import { ACCENT, DANGER, FX, GRID, INK, LINE, TEAM, UI, rgba, theme } from './palette';
import { drawPixelText } from './pixelFont';

/** Seconds of the cut drawn as a trail behind the blade tip. */
const TRAIL = 0.07;

/**
 * Sword and shield readability: the cut's trail, a glint when the shield takes a hit, a ring
 * and "APARADO!" on a parry, a red glint at the end of an enemy wind-up (parry now) and
 * circling dots over a stunned fighter (riposte now).
 */
function drawFencingFx(ctx: CanvasRenderingContext2D, world: World, alpha: number, time: number): void {
  for (const [e, pos, body, fencer, rig] of world.query(Position, Body, Fencer, Rig)) {
    const at = { x: lerp(pos.prevX, pos.x, alpha), y: lerp(pos.prevY, pos.y, alpha) };
    const scale = rig.animator.s;
    const enemy = !world.has(e, PlayerControl);
    const center = bodyCenter(at, body);

    if (fencer.phase === 'strike') {
      ctx.lineCap = 'round';
      const steps = 6;
      let prev: Vec2 | null = null;
      for (let i = 0; i <= steps; i++) {
        const tip = bladeSegment(at, body, scale, fencer.facing, fencerPose(fencer, fencer.t - TRAIL * (1 - i / steps))).tip;
        if (prev) {
          ctx.globalAlpha = 0.65 * (i / steps);
          ctx.strokeStyle = (enemy ? TEAM.enemy : TEAM.player).slash;
          ctx.lineWidth = 2.2 * (i / steps) + 0.4;
          ctx.beginPath();
          ctx.moveTo(prev.x, prev.y);
          ctx.lineTo(tip.x, tip.y);
          ctx.stroke();
        }
        prev = tip;
      }
      ctx.globalAlpha = 1;
      ctx.lineCap = 'butt';
    }

    if (enemy && fencer.phase === 'windup' && fencer.t / Math.max(fencer.duration, 0.01) > 0.55) {
      const tip = bladeSegment(at, body, scale, fencer.facing, fencerPose(fencer)).tip;
      ctx.globalAlpha = 0.9;
      ctx.fillStyle = DANGER.hot;
      ctx.beginPath();
      ctx.arc(tip.x, tip.y, 1.6 + Math.sin(time * 40) * 0.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    if (fencer.flash > 0 && fencer.parryFlash <= 0) {
      ctx.globalAlpha = Math.min(1, fencer.flash * 6) * 0.8;
      ctx.strokeStyle = FX.spark;
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      const dir = fencer.facing > 0 ? 0 : Math.PI;
      ctx.arc(center.x, center.y, body.h * 0.55, dir - 0.9, dir + 0.9);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    if (fencer.parryFlash > 0) {
      const t = 1 - fencer.parryFlash / 0.4;
      ctx.globalAlpha = 1 - t;
      ctx.strokeStyle = FX.parry;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.arc(center.x, center.y, body.h * (0.5 + t * 0.6), 0, Math.PI * 2);
      ctx.stroke();
      drawPixelText(ctx, 'APARADO!', center.x, at.y - 6 - t * 6, { color: FX.parry, align: 'center', baseline: 'bottom' });
      ctx.globalAlpha = 1;
    }

    if (fencer.phase === 'stunned') {
      ctx.fillStyle = ACCENT.status;
      for (let i = 0; i < 3; i++) {
        const a = time * 6 + (i * Math.PI * 2) / 3;
        ctx.beginPath();
        ctx.arc(center.x + Math.cos(a) * 5, at.y - 4 + Math.sin(a) * 1.6, 1, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
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
    ctx.strokeStyle = rgba(DANGER.base, 0.25 + 0.5 * ready * (0.8 + 0.2 * Math.sin(time * 40)));
    ctx.lineWidth = LINE.telegraph;
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(from.x + dx * len, from.y + dy * len);
    ctx.stroke();
  }
}

/** World-space extras drawn after characters (laser sights). */
export function drawWorldOverlay(ctx: CanvasRenderingContext2D, world: World, grid: TileGrid, time: number, alpha: number): void {
  drawFencingFx(ctx, world, alpha, time);
  drawEnemyLasers(ctx, world, grid, time);
  const row = world.first(Position, Body, Aim, Arsenal, PlayerControl);
  if (!row) return;
  const [, pos, body, aim, arsenal] = row;
  const ws = arsenal.weapons[arsenal.active];
  if (!ws?.weapon.behaviors.has('laserSight')) return;
  const from = shoulder(pos, body);
  ctx.strokeStyle = rgba(DANGER.base, 0.6);
  ctx.lineWidth = LINE.laserSight;
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
  const cues = s.feedback.cues;
  if (cues) {
    drawHurtCue(ctx, cues);
    drawExitIndicator(ctx, cues);
  }
  if (!s.pointer) return;
  const { x, y } = s.pointer;
  // Four ticks that open with the gun's spread; dim while reloading / swapping.
  const gap = 2 + s.feedback.spread;
  ctx.strokeStyle = s.feedback.busy ? rgba(UI.crosshair, 0.35) : UI.crosshair;
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
    ctx.strokeStyle = s.feedback.hitKill ? DANGER.kill : s.feedback.hitHead ? ACCENT.warm : UI.crosshair;
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

  if (cues) drawCrosshairCues(ctx, cues, x, y, gap);

  if (s.pointerTile) {
    drawPixelText(ctx, `${s.pointerTile.col},${s.pointerTile.row}`, x + 7, y + 6, { color: GRID.readout });
  }
}

/** Vertical band (fraction of the view height) the exit arrow is clamped to. */
const EXIT_ARROW_MIN_Y = 0.12;
const EXIT_ARROW_MAX_Y = 0.62;

/** Took damage: the screen edge flashes red and an arc around the player points at the source. */
function drawHurtCue(ctx: CanvasRenderingContext2D, c: HudCues): void {
  if (c.hurt <= 0) return;
  const k = Math.min(1, c.hurt / HUD_CUES.hurtSeconds);
  ctx.strokeStyle = rgba(DANGER.base, 0.35 * k);
  ctx.lineWidth = 4;
  ctx.strokeRect(2, 2, c.screenW - 4, c.screenH - 4);
  if (c.hurtFrom === null) return;
  ctx.strokeStyle = rgba(DANGER.base, 0.9 * k);
  ctx.lineWidth = 2.5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(c.player.x, c.player.y, 24, c.hurtFrom - 0.45, c.hurtFrom + 0.45);
  ctx.stroke();
  ctx.lineCap = 'butt';
}

/** Exit off-screen: an arrow on the screen edge pointing at it, with the distance in tiles (≈ metres). */
function drawExitIndicator(ctx: CanvasRenderingContext2D, c: HudCues): void {
  if (!c.exit) return;
  const m = 14;
  const x = Math.min(c.screenW - m, Math.max(m, c.exit.x));
  // Stay in the band between the top HUD line and the bottom HUD boxes (health / weapons).
  const y = Math.min(c.screenH * EXIT_ARROW_MAX_Y, Math.max(c.screenH * EXIT_ARROW_MIN_Y, c.exit.y));
  const a = Math.atan2(c.exit.y - y, c.exit.x - x);
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = theme().exit;
  ctx.globalAlpha = 0.9;
  ctx.save();
  ctx.rotate(a);
  ctx.beginPath();
  ctx.moveTo(6, 0);
  ctx.lineTo(-3, -4.5);
  ctx.lineTo(-3, 4.5);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  // Text on the inner side of the arrow.
  const align = Math.cos(a) > 0.3 ? 'right' : Math.cos(a) < -0.3 ? 'left' : 'center';
  const tx = Math.cos(a) > 0.3 ? -6 : Math.cos(a) < -0.3 ? 6 : 0;
  const ty = Math.abs(Math.cos(a)) > 0.3 ? 0 : Math.sin(a) > 0 ? -9 : 9;
  drawPixelText(ctx, `SAÍDA ${c.exitTiles}m`, tx, ty, {
    color: theme().exit,
    shadow: INK.black,
    align,
    baseline: 'middle',
  });
  ctx.restore();
}

/** Around the crosshair: reload progress ring, kill confirmation and the ammo hint. */
function drawCrosshairCues(ctx: CanvasRenderingContext2D, c: HudCues, x: number, y: number, gap: number): void {
  if (c.reload > 0) {
    const r = gap + 6;
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = UI.track;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = rgba(ACCENT.base, 0.95);
    ctx.beginPath();
    ctx.arc(x, y, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * c.reload);
    ctx.stroke();
  }

  if (c.kill > 0) {
    // Kill confirmed: a bigger red X that closes in as it fades; a ring on a headshot kill.
    const k = Math.min(1, c.kill / HUD_CUES.killSeconds);
    const o = 6 + 5 * k;
    ctx.strokeStyle = rgba(DANGER.base, 0.4 + 0.6 * k);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (const [sx, sy] of [
      [1, 1],
      [1, -1],
      [-1, 1],
      [-1, -1],
    ] as const) {
      ctx.moveTo(x + sx * (o - 4), y + sy * (o - 4));
      ctx.lineTo(x + sx * o, y + sy * o);
    }
    ctx.stroke();
    if (c.killHead) {
      ctx.strokeStyle = rgba(ACCENT.warm, k);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(x, y, o + 3, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  if (c.ammoHint) {
    const ty = y + gap + (c.reload > 0 ? 10 : 6);
    drawPixelText(ctx, c.ammoHint, x, ty, {
      color: c.ammoEmpty ? DANGER.empty : rgba(ACCENT.base, 0.95),
      shadow: INK.black,
      align: 'center',
    });
  }
}
