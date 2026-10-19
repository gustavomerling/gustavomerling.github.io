import type { Entity, World } from '@engine/ecs/world';
import type { Vec2 } from '@engine/math/vec2';
import { createRagdoll } from '../character/ragdoll';
import { ENEMIES } from '../content/enemies/catalog';
import { PICKUPS } from '../config';
import { Arsenal, Body, Effect, Faction, Hazard, Health, Npc, Position, Rig, Velocity, Visual } from '../world/components';
import { bodyCenter } from '../world/geometry';
import { spawnPickup, spawnRagdoll } from '../world/prefabs';
import type { RunContext, RunSystem } from './context';

/** Value of each coin dropped. */
const COIN = 5;

/**
 * Timers (stun, i-frames, effects, UI feedback) and deaths: a dead character becomes a
 * ragdoll; enemies also drop loot. The dead player keeps its (invisible) entity so the
 * camera and HUD stay valid; the scene reacts to hp <= 0.
 */
export const lifecycleSystem: RunSystem = {
  name: 'lifecycle',
  update(world, ctx) {
    const dt = ctx.clock.dt;
    const real = ctx.clock.realDt;

    for (const [e, pos, body, health, faction] of world.query(Position, Body, Health, Faction)) {
      health.stunLeft = Math.max(0, health.stunLeft - dt);
      health.invulnLeft = Math.max(0, health.invulnLeft - real);
      if (health.hp > 0 || world.has(e, Hazard)) continue;

      const rig = world.get(e, Rig);
      if (rig) {
        const vel = world.get(e, Velocity) ?? { x: 0, y: 0 };
        const ragdoll = createRagdoll(rig.animator, pos.x + body.w / 2, pos.y + body.h, vel, health.lastHit, Math.max(dt, 1 / 120));
        spawnRagdoll(world, ragdoll, rig.animator.props, rig.style);
      }

      if (faction.team === 'player') {
        world.remove(e, Rig);
        world.remove(e, Visual);
        continue;
      }
      const npc = world.get(e, Npc);
      if (npc) dropLoot(world, ctx, e, npc.defId, bodyCenter(pos, body));
      world.destroy(e);
    }

    for (const [e, fx] of world.query(Effect)) {
      // Effects use real time so a flash doesn't linger forever in slow motion.
      fx.life -= real;
      if (fx.life <= 0) world.destroy(e);
    }

    const fb = ctx.feedback;
    fb.hitMarker = Math.max(0, fb.hitMarker - real);
    for (const d of fb.damageDirs) d.life -= real;
    fb.damageDirs = fb.damageDirs.filter((d) => d.life > 0);
  },
};

function dropLoot(world: World, ctx: RunContext, e: Entity, defId: string, at: Vec2): void {
  const { drops } = ENEMIES.get(defId);
  const pop = () => ({ x: ctx.rng.range(-70, 70), y: ctx.rng.range(-170, -90) });
  const coins = ctx.rng.int(drops.money[0], drops.money[1]);
  for (let i = 0; i < coins; i++) spawnPickup(world, 'money', at, COIN, pop());
  if (ctx.rng.chance(drops.healthChance)) spawnPickup(world, 'health', at, PICKUPS.health, pop());
  if (ctx.rng.chance(drops.ammoChance)) spawnPickup(world, 'ammo', at, 1, pop());

  const ws = world.get(e, Arsenal)?.weapons[0];
  if (ws && ctx.rng.chance(drops.weaponChance)) {
    // Enemies have endless reserve; the dropped gun comes with one spare magazine.
    const dropped = { ...ws, reserve: ws.weapon.stats.magazine, reloadLeft: 0, cooldown: 0, burstLeft: 0, bloom: 0 };
    spawnPickup(world, 'weapon', at, 1, pop(), dropped);
  }
}
