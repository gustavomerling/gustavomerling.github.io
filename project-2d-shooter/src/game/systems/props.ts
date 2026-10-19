import { overlaps } from '@engine/math/rect';
import { Tile } from '@engine/physics/tilegrid';
import { PROPS, TILE } from '../config';
import { fx } from '../fx/emitters';
import { Body, Breakable, Hazard, Health, Position, Ragdoll, Smoke } from '../world/components';
import { bodyCenter, bodyRect } from '../world/geometry';
import { spawnPickup, spawnSmoke } from '../world/prefabs';
import type { RunSystem } from './context';
import { applyDamage } from './damage';
import { explode } from './explosions';

const MAX_RAGDOLLS = 12;
const RAGDOLL_SECONDS = 12;

/** Breakables, hazards, smoke clouds and ragdolls: the reactive environment. */
export const propsSystem: RunSystem = {
  name: 'props',
  update(world, ctx) {
    const dt = ctx.clock.dt;

    // Crates, doors, barrels.
    for (const [e, pos, brk, health] of world.query(Position, Breakable, Health)) {
      if (health.hp > 0) continue;
      for (const idx of brk.tiles) {
        ctx.grid.data[idx] = Tile.Empty;
        ctx.breakables.delete(idx);
      }
      const center = { x: pos.x + brk.w / 2, y: pos.y + brk.h / 2 };
      const def = PROPS[brk.kind];
      fx.debris(ctx.particles, center, brk.w, brk.h, def.color, brk.kind === 'door' ? 24 : 14);
      ctx.sfx.breakWood();
      if (brk.kind === 'barrel') {
        explode(world, ctx, center, PROPS.barrel.radius, PROPS.barrel.damage, { hurtsPlayer: true });
      } else if (brk.kind === 'crate' && ctx.rng.chance(0.5)) {
        const kind = ctx.rng.pick(['money', 'ammo', 'health'] as const);
        spawnPickup(world, kind, center, kind === 'money' ? 5 : 1, { x: ctx.rng.range(-40, 40), y: -120 });
      }
      world.destroy(e);
    }

    // Lamps fall when shot and crush whoever is below; extinguishers burst into smoke.
    for (const [e, pos, body, hazard, health] of world.query(Position, Body, Hazard, Health)) {
      if (hazard.kind === 'lamp') {
        if (!hazard.triggered && health.hp <= 0) {
          hazard.triggered = true;
          health.hp = 9999; // keeps it alive while falling
          body.gravityScale = 1;
          ctx.sfx.breakWood();
          fx.debris(ctx.particles, bodyCenter(pos, body), 6, 2, '#cfcfcf', 6);
        } else if (hazard.triggered && body.onGround) {
          const rect = bodyRect(pos, body);
          const hitArea = { x: rect.x - 6, y: rect.y - 26, w: rect.w + 12, h: rect.h + 28 };
          for (const [t, tpos, tbody] of world.query(Position, Body, Health)) {
            if (t === e || !overlaps(hitArea, bodyRect(tpos, tbody))) continue;
            const c = bodyCenter(tpos, tbody);
            applyDamage(world, ctx, t, { amount: PROPS.lamp.damage, zone: 'head', at: { x: c.x, y: tpos.y + 2 }, angle: Math.PI / 2, by: 'player' });
          }
          fx.debris(ctx.particles, bodyCenter(pos, body), 10, 4, '#e8e8e8', 16);
          fx.dust(ctx.particles, { x: pos.x + body.w / 2, y: pos.y + body.h }, 8);
          ctx.camera.addTrauma(0.3);
          ctx.sfx.breakWood();
          world.destroy(e);
        }
      } else if (health.hp <= 0) {
        const c = bodyCenter(pos, body);
        spawnSmoke(world, c, PROPS.extinguisher.smokeRadius, PROPS.extinguisher.smokeSeconds);
        for (let i = 0; i < 12; i++) fx.smokePuff(ctx.particles, c, PROPS.extinguisher.smokeRadius * 0.5);
        ctx.sfx.whoosh();
        world.destroy(e);
      }
    }

    // Smoke clouds keep puffing until they dissipate (they block enemy sight meanwhile).
    for (const [e, pos, smoke] of world.query(Position, Smoke)) {
      smoke.life -= dt;
      if (ctx.rng.chance(dt * 14)) fx.smokePuff(ctx.particles, pos, smoke.radius * 0.8);
      if (smoke.life <= 0) world.destroy(e);
    }

    // Ragdolls.
    const ragdolls = [...world.query(Ragdoll)];
    ragdolls.forEach(([e, rag], i) => {
      rag.age += dt;
      // Bodies also land on the top few pixels of one-way platforms.
      rag.body.step(dt, 980, (x, y) => ctx.grid.isSolidAtPixel(x, y) || (ctx.grid.atPixel(x, y) === Tile.OneWay && y % TILE < 3));
      if (rag.age > RAGDOLL_SECONDS || i < ragdolls.length - MAX_RAGDOLLS) world.destroy(e);
    });
  },
};
