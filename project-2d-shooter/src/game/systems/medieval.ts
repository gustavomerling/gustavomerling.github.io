import { clamp } from '@engine/math/math';
import { Aim, Arsenal, Body, Faction, Guard, Health, Intent, PlayerControl, Position, SwordState } from '../world/components';
import { bodyCenter } from '../world/geometry';
import type { RunSystem } from './context';
import { applyDamage } from './damage';
import { spawnBlood, spawnShieldFx } from './effects';

/** Cursor speed at which the sword does full damage (px/s). */
export const SWORD_REFERENCE_SPEED = 900;
/** Half-angle of the sword's hit arc (radians). */
export const SWORD_ARC = 0.85;
/** Magic bubble lifetime and cooldown after it drops (seconds). */
export const MAGIC_SHIELD = { duration: 4, cooldown: 7 } as const;

/** Faster flicks cut deeper; slow drags become weak hits. */
export function swordDamage(base: number, speed: number): number {
  return base * clamp(speed / SWORD_REFERENCE_SPEED, 0.6, 1.8);
}

/**
 * Medieval kit: cursor-driven sword swings, the raised shield and the magic bubble.
 * Enemy weapons still go through the normal weapon system (bows/fireballs are projectiles).
 */
export const medievalSystem: RunSystem = {
  name: 'medieval',
  update(world, ctx) {
    const dt = ctx.playerDt;
    if (dt <= 0) return;

    // Timers on every guard (player and shielded skeletons).
    for (const [, guard] of world.query(Guard)) {
      guard.flash = Math.max(0, guard.flash - dt);
      if (guard.magicLeft > 0) {
        guard.magicLeft = Math.max(0, guard.magicLeft - dt);
        if (guard.magicLeft === 0) guard.magicCooldownLeft = MAGIC_SHIELD.cooldown;
      } else {
        guard.magicCooldownLeft = Math.max(0, guard.magicCooldownLeft - dt);
      }
    }

    for (const [e, pos, body, aim, arsenal, intent, guard, sword, health] of world.query(
      Position,
      Body,
      Aim,
      Arsenal,
      Intent,
      Guard,
      SwordState,
      Health,
    )) {
      const ws = arsenal.weapons[arsenal.active];
      if (!ws || health.hp <= 0) {
        guard.raised = false;
        sword.swingLeft = 0;
        continue;
      }
      const behaviors = ws.weapon.behaviors;
      const state = world.get(e, PlayerControl)?.state;
      const busy = state === 'climb' || state === 'mantle' || state === 'roll';
      guard.raised = !busy && behaviors.has('shield') && intent.blockHeld;
      if (busy) {
        sword.lastX = aim.x;
        sword.lastY = aim.y;
        continue;
      }

      if (behaviors.has('magicShield') && intent.firePressed && guard.magicLeft <= 0 && guard.magicCooldownLeft <= 0) {
        guard.magicLeft = MAGIC_SHIELD.duration;
        guard.magicMax = MAGIC_SHIELD.duration;
        ctx.noises.push({ x: pos.x + body.w / 2, y: pos.y + body.h / 2, radius: 70 });
      }

      sword.cooldownLeft = Math.max(0, sword.cooldownLeft - dt);
      sword.swingLeft = Math.max(0, sword.swingLeft - dt);

      if (!behaviors.has('cursorSwing')) {
        sword.lastX = aim.x;
        sword.lastY = aim.y;
        sword.speed = 0;
        continue;
      }

      const dx = aim.x - sword.lastX;
      const dy = aim.y - sword.lastY;
      sword.lastX = aim.x;
      sword.lastY = aim.y;
      sword.speed = Math.hypot(dx, dy) / dt;
      const threshold = ws.weapon.stats.projectileSpeed;
      if (sword.cooldownLeft > 0 || sword.speed < threshold) continue;

      // A fast flick starts the swing: hit everyone inside the arc in front of the body.
      sword.cooldownLeft = 1 / ws.weapon.stats.fireRate;
      sword.swingTotal = 0.18;
      sword.swingLeft = sword.swingTotal;
      sword.swingAngle = Math.atan2(dy, dx);
      sword.hit.clear();
      const origin = bodyCenter(pos, body);
      const damage = swordDamage(ws.weapon.stats.damage, sword.speed);
      for (const [t, tpos, tbody, th, tf] of world.query(Position, Body, Health, Faction)) {
        if (tf.team === 'player' || th.hp <= 0) continue;
        const center = bodyCenter(tpos, tbody);
        const dist = Math.hypot(center.x - origin.x, center.y - origin.y);
        if (dist > ws.weapon.stats.range + tbody.w / 2) continue;
        const toTarget = Math.atan2(center.y - origin.y, center.x - origin.x);
        const diff = Math.atan2(Math.sin(toTarget - sword.swingAngle), Math.cos(toTarget - sword.swingAngle));
        if (Math.abs(diff) > SWORD_ARC) continue;
        sword.hit.add(t);
        const result = applyDamage(world, ctx, t, {
          amount: damage,
          zone: 'torso',
          at: center,
          angle: toTarget,
          from: origin,
          by: 'player',
          knockback: 150 + sword.speed * 0.12,
        });
        if (result === 'blocked') {
          spawnShieldFx(world, center.x, center.y, toTarget, (world.get(t, Guard)?.magicLeft ?? 0) > 0);
          continue;
        }
        spawnBlood(world, center.x, center.y, toTarget, damage * 0.5, false);
      }
    }
  },
};
