import { Tile } from '@engine/physics/tilegrid';
import { createRagdoll } from '../character/ragdoll';
import { PLAYER_TUNING, TILE } from '../config';
import { Body, Health, Npc, Position, Ragdoll, Rig, Velocity } from '../world/components';
import { spawnRagdoll } from '../world/prefabs';
import type { RunSystem } from './context';

const MAX_RAGDOLLS = 12;
const RAGDOLL_SECONDS = 12;

/**
 * Timers (i-frames, hit marker), deaths and ragdolls. A dead character becomes a ragdoll
 * pushed by the killing hit; dead enemies are removed. The dead player keeps its entity
 * (without a rig, so it isn't drawn) so the camera and HUD stay valid.
 */
export const lifecycleSystem: RunSystem = {
  name: 'lifecycle',
  update(world, ctx) {
    const dt = ctx.clock.dt;
    const real = ctx.clock.realDt;

    for (const [e, pos, body, health] of world.query(Position, Body, Health)) {
      health.invulnLeft = Math.max(0, health.invulnLeft - real);
      if (health.hp > 0) continue;
      const rig = world.get(e, Rig);
      if (rig) {
        const vel = world.get(e, Velocity) ?? { x: 0, y: 0 };
        const verlet = createRagdoll(rig.animator, pos.x + body.w / 2, pos.y + body.h, vel, health.lastHit, Math.max(dt, 1 / 120));
        spawnRagdoll(world, verlet, rig.animator.props, rig.style);
        world.remove(e, Rig);
      }
      if (world.has(e, Npc)) world.destroy(e);
    }

    const ragdolls = [...world.query(Ragdoll)];
    ragdolls.forEach(([e, rag], i) => {
      rag.age += dt;
      // Bodies also land on the top few units of one-way platforms.
      rag.body.step(dt, PLAYER_TUNING.gravity, (x, y) => ctx.grid.isSolidAtPixel(x, y) || (ctx.grid.atPixel(x, y) === Tile.OneWay && y % TILE < 3));
      if (rag.age > RAGDOLL_SECONDS || i < ragdolls.length - MAX_RAGDOLLS) world.destroy(e);
    });

    ctx.feedback.hitMarker = Math.max(0, ctx.feedback.hitMarker - real);
  },
};
