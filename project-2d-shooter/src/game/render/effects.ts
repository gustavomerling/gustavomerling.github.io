import type { World } from '@engine/ecs/world';
import { lerp } from '@engine/math/math';
import { lerpAngle } from '@engine/rig/skeleton';
import { drawGun } from '../character/draw';
import { GUN_MODELS, withAttachments } from '../content/weapons/models';
import { nearestPickup } from '../systems/pickups';
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
    ctx.strokeStyle = '#07080a';
    ctx.lineWidth = 0.6;
    ctx.stroke();
    ctx.fillStyle = d.color;
    ctx.fill();
    ctx.restore();
  }
  ctx.globalAlpha = 1;
}

/** Guns on the floor; the one in reach bobs and shows its name and key. */
export function drawPickups(ctx: CanvasRenderingContext2D, world: World, time: number): void {
  const near = nearestPickup(world);
  for (const [e, g] of world.query(Pickup)) {
    const model = withAttachments(GUN_MODELS.get(g.weapon.def.model), g.weapon.attachments.map((a) => a.id));
    const active = near?.e === e;
    const bob = active ? Math.sin(time * 6) * 0.6 - 1 : 0;
    drawGun(ctx, model, g.x - 1, g.y + bob, 1, g.angle, 1, 0, '#07080a', true);
    if (active) {
      ctx.font = '5px monospace';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ffd23f';
      ctx.fillText(`[F] ${g.weapon.def.name}`, g.x, g.y - 7);
      ctx.textAlign = 'left';
    }
  }
}

/** Bullet holes on walls. */
export function drawDecals(ctx: CanvasRenderingContext2D, world: World): void {
  ctx.fillStyle = '#050608';
  for (const [, d] of world.query(Decal)) {
    ctx.beginPath();
    ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** Smoke and dust puffs (soft discs that grow and fade), and sparks (short bright streaks). */
export function drawSmoke(ctx: CanvasRenderingContext2D, world: World): void {
  ctx.lineCap = 'round';
  for (const [, f] of world.query(Fx)) {
    if (f.kind === 'spark') {
      ctx.globalAlpha = 1 - f.age / f.life;
      ctx.strokeStyle = '#ffd27a';
      ctx.lineWidth = 0.6;
      ctx.beginPath();
      ctx.moveTo(f.x, f.y);
      ctx.lineTo(f.x - f.vx * 0.012, f.y - f.vy * 0.012);
      ctx.stroke();
      continue;
    }
    if (f.kind !== 'smoke' && f.kind !== 'dust') continue;
    const t = f.age / f.life;
    ctx.globalAlpha = (f.kind === 'dust' ? 0.45 : 0.32) * (1 - t);
    ctx.fillStyle = f.kind === 'dust' ? '#8a7f6e' : '#b8bec8';
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
    for (const [color, k] of [
      ['#ffb347', 1],
      ['#fff6c8', 0.55],
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
