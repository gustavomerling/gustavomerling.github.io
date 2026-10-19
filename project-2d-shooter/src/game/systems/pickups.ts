import { overlaps } from '@engine/math/rect';
import { PICKUPS } from '../config';
import { fx } from '../fx/emitters';
import { Arsenal, Body, Health, Pickup, PlayerControl, Position, Velocity, Wallet } from '../world/components';
import { bodyCenter, bodyRect } from '../world/geometry';
import { spawnPickup } from '../world/prefabs';
import type { RunSystem } from './context';

const COLORS = { health: '#5dff8a', money: '#ffd23f', ammo: '#7fb8ff', weapon: '#d0d0d0' } as const;

/**
 * Collecting things: health/money/ammo fly to the player when close (magnet) and are
 * taken on touch; weapons wait for F and swap with the gun in hand.
 */
export const pickupSystem: RunSystem = {
  name: 'pickups',
  update(world, ctx) {
    ctx.feedback.prompt = null;
    const p = world.first(Position, Body, PlayerControl, Health, Arsenal, Wallet);
    const dt = ctx.clock.dt;

    let nearestWeapon: { e: number; d: number } | null = null;
    for (const [e, pos, body, vel, pickup] of world.query(Position, Body, Velocity, Pickup)) {
      pickup.age += dt;
      if (pickup.age > PICKUPS.despawnSeconds) {
        world.destroy(e);
        continue;
      }
      if (!p || p[4].hp <= 0 || pickup.age < 0.35) continue;
      const [, ppos, pbody, , health, arsenal, wallet] = p;
      const pc = bodyCenter(ppos, pbody);
      const c = bodyCenter(pos, body);
      const d = Math.hypot(pc.x - c.x, pc.y - c.y);

      if (pickup.kind === 'weapon') {
        if (d <= PICKUPS.interactRadius && (!nearestWeapon || d < nearestWeapon.d)) nearestWeapon = { e, d };
        continue;
      }
      if (pickup.kind === 'health' && health.hp >= health.max) continue;

      if (d < PICKUPS.magnetRadius) {
        body.gravityScale = 0;
        vel.x = ((pc.x - c.x) / d) * PICKUPS.magnetSpeed;
        vel.y = ((pc.y - c.y) / d) * PICKUPS.magnetSpeed;
      } else {
        body.gravityScale = 1;
      }

      const grab = bodyRect(ppos, pbody);
      if (!overlaps({ x: grab.x - 2, y: grab.y - 2, w: grab.w + 4, h: grab.h + 4 }, bodyRect(pos, body))) continue;
      switch (pickup.kind) {
        case 'health':
          health.hp = Math.min(health.max, health.hp + pickup.amount);
          break;
        case 'money':
          wallet.money += pickup.amount;
          break;
        case 'ammo':
          for (const ws of arsenal.weapons) ws.reserve += ws.weapon.stats.magazine * PICKUPS.ammoMagazines * pickup.amount;
          break;
      }
      fx.pickupSparkle(ctx.particles, c, COLORS[pickup.kind]);
      ctx.sfx.pickup(pickup.kind);
      world.destroy(e);
    }

    if (!p || !nearestWeapon) return;
    const pickup = world.require(nearestWeapon.e, Pickup);
    const pos = world.require(nearestWeapon.e, Position);
    const ws = pickup.weapon;
    if (!ws) return;
    ctx.feedback.prompt = { text: `[F] ${ws.weapon.def.name}`, x: pos.x + 5, y: pos.y - 4 };
    if (!ctx.input.pressed('interact')) return;

    const arsenal = p[5];
    if (arsenal.weapons.length < PICKUPS.maxWeapons) {
      arsenal.weapons.push(ws);
      arsenal.active = arsenal.weapons.length - 1;
    } else {
      // Swap: drop the gun in hand where the new one was.
      const dropped = arsenal.weapons[arsenal.active]!;
      dropped.reloadLeft = 0;
      arsenal.weapons[arsenal.active] = ws;
      spawnPickup(world, 'weapon', { x: pos.x + 5, y: pos.y }, 1, { x: 0, y: -80 }, dropped);
    }
    ctx.feedback.interactUsed = true;
    ctx.sfx.pickup('weapon');
    world.destroy(nearestWeapon.e);
  },
};
