import { Body, Health, Npc, PlayerControl, Position } from '../world/components';
import { spawnEnemy } from '../world/prefabs';
import type { RunSystem } from './context';

/**
 * Reinforcements (zombie mode): every `interval` seconds, a group spawns on the floor behind the
 * player, in the band `minDistance..maxDistance` (out of view), while fewer than `maxAlive` are
 * alive. Uses the gameplay RNG, so replays stay exact.
 */
export const hordeSystem: RunSystem = {
  name: 'horde',
  update(world, ctx) {
    const horde = ctx.horde;
    const dt = ctx.clock.dt;
    if (!horde || dt <= 0) return;
    horde.timer -= dt;
    if (horde.timer > 0) return;
    horde.timer = horde.def.interval;

    const p = world.first(Position, Body, PlayerControl, Health);
    if (!p || p[4].hp <= 0) return;
    let alive = 0;
    for (const [, , health] of world.query(Npc, Health)) if (health.hp > 0) alive++;
    if (alive >= horde.def.maxAlive) return;

    const { minDistance, maxDistance, pool } = horde.def;
    const playerX = p[1].x + p[2].w / 2;
    const behind = horde.spots.filter((s) => {
      const d = playerX - s.x;
      return d >= minDistance && d <= maxDistance;
    });
    if (behind.length === 0) return;

    const spot = ctx.rng.pick(behind);
    const enemyId = ctx.rng.weighted(pool.map((e) => ({ item: e.id, weight: e.weight })));
    spawnEnemy(world, enemyId, spot, 1);
  },
};
