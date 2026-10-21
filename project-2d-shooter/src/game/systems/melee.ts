import { KICK } from '../config';
import { Body, Faction, Health, PlayerControl, Position } from '../world/components';
import { bodyRect } from '../world/geometry';
import type { RunSystem } from './context';
import { applyDamage } from './damage';
import { spawnBlood } from './effects';

/** Player kick (Q): when the foot lands, everyone of the other team in reach is shoved and staggered. */
export const playerMeleeSystem: RunSystem = {
  name: 'playerMelee',
  update(world, ctx) {
    const dt = ctx.playerDt;
    if (dt <= 0) return;
    for (const [, pos, body, pc, health, faction] of world.query(Position, Body, PlayerControl, Health, Faction)) {
      pc.kickCooldownLeft = Math.max(0, pc.kickCooldownLeft - dt);
      const busy = pc.state === 'climb' || pc.state === 'mantle' || pc.state === 'roll' || pc.state === 'slide';
      if (ctx.input.pressed('melee') && pc.kickLeft <= 0 && pc.kickCooldownLeft <= 0 && !busy && health.hp > 0) {
        pc.kickLeft = KICK.time;
        pc.kickCooldownLeft = KICK.time + KICK.cooldown;
      }
      if (pc.kickLeft <= 0) continue;
      const before = 1 - pc.kickLeft / KICK.time;
      pc.kickLeft = Math.max(0, pc.kickLeft - dt);
      const after = 1 - pc.kickLeft / KICK.time;
      if (before >= KICK.hitAt || after < KICK.hitAt) continue;

      // The foot's reach: a box in front of the hips.
      const hipY = pos.y + body.h * 0.55;
      const front = pc.facing > 0 ? pos.x + body.w : pos.x - KICK.reach;
      const zone = { x: front, y: hipY - KICK.height / 2, w: KICK.reach, h: KICK.height };
      for (const [t, tpos, tbody, th, tf] of world.query(Position, Body, Health, Faction)) {
        if (tf.team === faction.team || th.hp <= 0) continue;
        const r = bodyRect(tpos, tbody);
        if (r.x > zone.x + zone.w || r.x + r.w < zone.x || r.y > zone.y + zone.h || r.y + r.h < zone.y) continue;
        const angle = pc.facing > 0 ? -0.35 : Math.PI + 0.35;
        const at = { x: r.x + r.w / 2, y: hipY };
        applyDamage(world, ctx, t, { amount: KICK.damage, zone: 'torso', at, angle, by: faction.team, knockback: KICK.knockback });
        spawnBlood(world, at.x, at.y, angle, 4, false);
      }
    }
  },
};
