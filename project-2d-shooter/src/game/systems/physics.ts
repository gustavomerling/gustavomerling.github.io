import { approach } from '@engine/math/math';
import { moveAndCollide } from '@engine/physics/collide';
import { PLAYER_TUNING } from '../config';
import { Body, Position, Velocity } from '../world/components';
import type { RunSystem } from './context';

/** Gravity + tile collision for every entity with a Body (player, NPCs, grenades...). */
export const physicsSystem: RunSystem = {
  name: 'physics',
  update(world, ctx) {
    for (const [, pos, vel, body] of world.query(Position, Velocity, Body)) {
      const dt = body.playerTime ? ctx.playerDt : ctx.clock.dt;
      if (dt <= 0) continue;

      vel.y = Math.min(vel.y + PLAYER_TUNING.gravity * body.gravityScale * dt, PLAYER_TUNING.maxFallSpeed);
      if (body.onGround && body.groundFriction > 0) vel.x = approach(vel.x, 0, body.groundFriction * dt);
      body.dropTimer = Math.max(0, body.dropTimer - dt);

      const box = { x: pos.x, y: pos.y, w: body.w, h: body.h };
      const hit = moveAndCollide(box, vel.x * dt, vel.y * dt, ctx.grid, { dropThrough: body.dropTimer > 0 });
      pos.x = box.x;
      pos.y = box.y;

      if (hit.hitLeft || hit.hitRight) vel.x = -vel.x * body.bounce;
      if (hit.hitCeiling && vel.y < 0) vel.y = -vel.y * body.bounce;
      if (hit.onGround && vel.y > 0) vel.y = body.bounce > 0 && vel.y > 60 ? -vel.y * body.bounce : 0;
      body.hitWall = hit.hitLeft || hit.hitRight;
      body.onGround = hit.onGround;
      body.onOneWay = hit.onOneWay;
    }
  },
};
