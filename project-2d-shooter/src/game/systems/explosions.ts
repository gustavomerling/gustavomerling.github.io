import type { World } from '@engine/ecs/world';
import type { Vec2 } from '@engine/math/vec2';
import { fx } from '../fx/emitters';
import { Body, Breakable, Health, PlayerControl, Position, type Team } from '../world/components';
import { bodyCenter } from '../world/geometry';
import { spawnEffect } from '../world/prefabs';
import type { RunContext } from './context';
import { applyDamage } from './damage';

/**
 * Area damage with falloff, knockback away from the centre, and full audiovisual punch.
 * Also damages breakables in range, so barrels can chain-react.
 */
export function explode(
  world: World,
  ctx: RunContext,
  center: Vec2,
  radius: number,
  damage: number,
  opts: { hurtsPlayer: boolean; by?: Team },
): void {
  for (const [t, pos, body] of world.query(Position, Body, Health)) {
    if (!opts.hurtsPlayer && world.has(t, PlayerControl)) continue;
    const c = bodyCenter(pos, body);
    const d = Math.hypot(c.x - center.x, c.y - center.y);
    if (d > radius) continue;
    const angle = Math.atan2(c.y - center.y - 6, c.x - center.x);
    applyDamage(world, ctx, t, { amount: damage * (1 - (d / radius) * 0.5), zone: 'torso', at: c, angle, from: center, by: opts.by, knockback: 300 });
  }
  for (const [t, pos, brk] of world.query(Position, Breakable)) {
    const c = { x: pos.x + brk.w / 2, y: pos.y + brk.h / 2 };
    const d = Math.hypot(c.x - center.x, c.y - center.y);
    if (d > radius + 8) continue;
    applyDamage(world, ctx, t, { amount: damage, zone: 'torso', at: c, by: opts.by });
  }

  ctx.noises.push({ x: center.x, y: center.y, radius: 400 });
  fx.explosion(ctx.particles, center, radius);
  spawnEffect(world, 'ring', center, radius, 0.35, '#ffb347');
  spawnEffect(world, 'flash', center, 0, 0.15, '#ffd9a0', 0.35);
  ctx.camera.addTrauma(0.75);
  ctx.clock.hitStop(0.06);
  ctx.sfx.explosion(ctx.clock.scale);
}
