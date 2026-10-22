import type { World } from '@engine/ecs/world';
import { lerp } from '@engine/math/math';
import { lerpAngle } from '@engine/rig/skeleton';
import { drawPixelGrid, gridSize, gunPixels } from './icons';
import { nearestPickup } from '../systems/pickups';
import { ACCENT, FX, INK, LINE } from './palette';
import { Debris, Decal, Fx, Pickup } from '../world/components';

/** Casings and dropped magazines (drawn behind characters), fading out at the end of their life. */
export function drawDebris(ctx: CanvasRenderingContext2D, world: World, alpha: number): void {
  ctx.lineJoin = 'round';
  for (const [, d] of world.query(Debris)) {
    const x = lerp(d.prevX, d.x, alpha);
    const y = lerp(d.prevY, d.y, alpha);
    const a = lerpAngle(d.prevAngle, d.angle, alpha);
    ctx.globalAlpha = Math.min(1, (d.life - d.age) / 1);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(a);
    ctx.beginPath();
    for (let i = 0; i < d.shape.length; i += 2) ctx.lineTo(d.shape[i]!, d.shape[i + 1]!);
    ctx.closePath();
    ctx.strokeStyle = INK.outline;
    ctx.lineWidth = LINE.debris;
    ctx.stroke();
    ctx.fillStyle = d.color;
    ctx.fill();
    ctx.restore();
  }
  ctx.globalAlpha = 1;
}

/** Guns on the floor as pixel silhouettes with a blinking 1px glint; the one in reach bobs and shows its name and key. */
export function drawPickups(ctx: CanvasRenderingContext2D, world: World, time: number): void {
  const near = nearestPickup(world);
  for (const [e, g] of world.query(Pickup)) {
    const grid = gunPixels(g.weapon.def.model, g.weapon.attachments.map((a) => a.id));
    const { w, h } = gridSize(grid);
    const active = near?.e === e;
    // Whole-pixel bob (no sub-pixel smear): 1px up/down twice a second when in reach.
    const bob = active ? (Math.floor(time * 4) % 2 === 0 ? -2 : -1) : 0;
    const x = Math.round(g.x - w / 2);
    const y = Math.round(g.y - h + 1 + bob);
    drawPixelGrid(ctx, grid, x, y, 1, INK.outline);
    // Glint: a single highlight pixel walking along the top row, blinking off between passes.
    const phase = (time * 12 + e * 7) % (w + 10);
    const gx = Math.floor(phase);
    const top = grid[0]!;
    if (gx < w) {
      let row = 0;
      while (row < h - 1 && (grid[row]![gx] ?? '.') === '.') row++;
      if ((grid[row]![gx] ?? '.') !== '.') {
        ctx.fillStyle = active ? ACCENT.base : ACCENT.status;
        ctx.fillRect(x + gx, y + row, 1, 1);
      }
    } else if (active && top.length) {
      ctx.fillStyle = ACCENT.base;
      ctx.fillRect(x + w, y - 2, 1, 1);
    }
    if (active) {
      ctx.font = '5px monospace';
      ctx.textAlign = 'center';
      ctx.fillStyle = ACCENT.base;
      ctx.fillText(`[F] ${g.weapon.def.name}`, Math.round(g.x), y - 4);
      ctx.textAlign = 'left';
    }
  }
}

/** Bullet holes on walls. */
export function drawDecals(ctx: CanvasRenderingContext2D, world: World): void {
  ctx.fillStyle = INK.hole;
  for (const [, d] of world.query(Decal)) {
    ctx.beginPath();
    ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** Smoke and dust puffs (soft discs that grow and fade), sparks (short bright streaks), flat blood/bone blobs and thin rings. */
export function drawSmoke(ctx: CanvasRenderingContext2D, world: World): void {
  ctx.lineCap = 'round';
  for (const [, f] of world.query(Fx)) {
    if (f.kind === 'spark') {
      ctx.globalAlpha = 1 - f.age / f.life;
      ctx.strokeStyle = f.color ?? FX.spark;
      ctx.lineWidth = LINE.spark;
      ctx.beginPath();
      ctx.moveTo(f.x, f.y);
      ctx.lineTo(f.x - f.vx * 0.012, f.y - f.vy * 0.012);
      ctx.stroke();
      continue;
    }
    if (f.kind === 'puff') {
      // Flat blob: pops out fast, shrinks a touch as it fades.
      const t = f.age / f.life;
      ctx.globalAlpha = 0.9 * (1 - t * t);
      ctx.fillStyle = f.color ?? FX.blood[0]!;
      ctx.beginPath();
      ctx.arc(f.x, f.y, f.size * (1.15 - 0.45 * t), 0, Math.PI * 2);
      ctx.fill();
      continue;
    }
    if (f.kind === 'ring') {
      // Thin ring racing out (ease-out), fading: never a filled shape, so nothing under it hides.
      const t = f.age / f.life;
      ctx.globalAlpha = 0.8 * (1 - t);
      ctx.strokeStyle = f.color ?? FX.spark;
      ctx.lineWidth = LINE.fxRing * (1.6 - t);
      ctx.beginPath();
      ctx.arc(f.x, f.y, f.size * (1 - (1 - t) * (1 - t)), 0, Math.PI * 2);
      ctx.stroke();
      continue;
    }
    if (f.kind !== 'smoke' && f.kind !== 'dust') continue;
    const t = f.age / f.life;
    ctx.globalAlpha = (f.kind === 'dust' ? 0.45 : 0.32) * (1 - t);
    ctx.fillStyle = f.color ?? (f.kind === 'dust' ? FX.dust : FX.smoke);
    ctx.beginPath();
    ctx.arc(f.x, f.y, f.size * (1 + t * 2.5), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.lineCap = 'butt';
}

/** Muzzle flashes: a spiky star stretched along the shot, yellow rim around a white core. */
export function drawFlashes(ctx: CanvasRenderingContext2D, world: World): void {
  for (const [, f] of world.query(Fx)) {
    if (f.kind !== 'flash') continue;
    const fade = 1 - f.age / f.life;
    ctx.save();
    ctx.translate(f.x, f.y);
    ctx.rotate(f.angle);
    ctx.scale(f.size, f.size);
    // Soft light around the barrel on the first frames.
    ctx.globalAlpha = 0.22 * fade;
    ctx.fillStyle = FX.flashRim;
    ctx.beginPath();
    ctx.arc(1.5, 0, 4.5, 0, Math.PI * 2);
    ctx.fill();
    for (const [color, k] of [
      [FX.flashRim, 1],
      [FX.flashCore, 0.55],
    ] as const) {
      ctx.globalAlpha = 0.5 + 0.5 * fade;
      ctx.fillStyle = color;
      ctx.beginPath();
      // Long spike forward, short ones up/down and back.
      const pts = [5.5, 0, 1.4, 1.1, 0.6, 2.6, 0, 0.9, -1.1, 0, 0, -0.9, 0.6, -2.6, 1.4, -1.1];
      for (let i = 0; i < pts.length; i += 2) ctx.lineTo(pts[i]! * k, pts[i + 1]! * k);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }
  ctx.globalAlpha = 1;
}
