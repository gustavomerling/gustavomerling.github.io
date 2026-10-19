import { boxFits } from '@engine/physics/collide';
import type { TileGrid } from '@engine/physics/tilegrid';
import { approach, sign } from '@engine/math/math';
import { IMPACT, PLAYER_TUNING as T } from '../config';
import { Body, Health, PlayerControl, Position, Velocity, type BodyData } from '../world/components';
import type { RunSystem } from './context';

/**
 * Turns input into the player's velocity and stance: walk/sprint, crouch, slide,
 * jump (coyote time + buffer + variable height) and drop-through. Integration and
 * collision happen afterwards in the physics system.
 */
export const playerMovementSystem: RunSystem = {
  name: 'playerMovement',
  update(world, ctx) {
    const dt = ctx.playerDt;
    if (dt <= 0) return;
    const { input } = ctx;

    for (const [e, pos, vel, body, pc] of world.query(Position, Velocity, Body, PlayerControl)) {
      const health = world.get(e, Health);
      if (health && health.hp <= 0) {
        vel.x = approach(vel.x, 0, T.groundFriction * dt);
        continue;
      }
      // Starting a slide is a dodge: brief invulnerability.
      const dodge = () => {
        if (health) health.invulnLeft = Math.max(health.invulnLeft, IMPACT.slideIFrames);
      };
      const moveX = (input.isDown('right') ? 1 : 0) - (input.isDown('left') ? 1 : 0);
      const grounded = body.onGround;

      pc.coyoteLeft = grounded ? T.coyoteTime : Math.max(0, pc.coyoteLeft - dt);
      pc.jumpBufferLeft = input.pressed('jump') ? T.jumpBuffer : Math.max(0, pc.jumpBufferLeft - dt);
      pc.slideCooldownLeft = Math.max(0, pc.slideCooldownLeft - dt);

      // Down + jump on a one-way platform: fall through instead of jumping.
      if (grounded && body.onOneWay && input.isDown('down') && pc.jumpBufferLeft > 0) {
        body.dropTimer = T.dropThroughTime;
        pc.jumpBufferLeft = 0;
        pc.coyoteLeft = 0;
      }

      // Crouch in the air (e.g. run -> jump -> crouch): keep momentum, land into a slide.
      if (!input.isDown('crouch')) pc.slideQueued = false;
      else if (!grounded && pc.state !== 'slide') pc.slideQueued = true;
      if (grounded && pc.slideQueued) {
        pc.slideQueued = false;
        if (Math.abs(vel.x) >= T.slideMinSpeed) {
          pc.state = 'slide';
          pc.slideLeft = T.slideDuration;
          pc.slideDir = sign(vel.x) as 1 | -1;
          vel.x = pc.slideDir * Math.max(Math.abs(vel.x), T.slideSpeed * 0.9);
          dodge();
        }
      }

      // Crouch while moving fast on the ground starts a slide; otherwise it crouches.
      if (
        pc.state !== 'slide' &&
        grounded &&
        input.pressed('crouch') &&
        Math.abs(vel.x) >= T.slideMinSpeed &&
        pc.slideCooldownLeft <= 0
      ) {
        pc.state = 'slide';
        pc.slideLeft = T.slideDuration;
        pc.slideDir = (sign(vel.x) || pc.facing) as 1 | -1;
        vel.x = pc.slideDir * T.slideSpeed;
        dodge();
      }

      let low: boolean;
      if (pc.state === 'slide') {
        pc.slideLeft -= dt;
        vel.x = approach(vel.x, 0, T.slideFriction * dt);
        if (pc.slideLeft <= 0 || !grounded || Math.abs(vel.x) < T.crouchSpeed) {
          pc.state = grounded ? 'crouch' : 'air';
          pc.slideCooldownLeft = T.slideCooldown;
        }
        low = true;
      } else {
        const crouching = grounded && input.isDown('crouch');
        const speed = crouching ? T.crouchSpeed : input.isDown('sprint') ? T.sprintSpeed : T.walkSpeed;
        const accel = !grounded ? T.airAccel : moveX !== 0 ? T.groundAccel : T.groundFriction;
        // A queued air-slide keeps its horizontal momentum untouched.
        if (!pc.slideQueued) vel.x = approach(vel.x, moveX * speed, accel * dt);
        low = crouching;
      }

      // Can't stand up under a low ceiling: stay crouched.
      if (!setHeight(pos, body, low ? T.crouchHeight : T.standHeight, ctx.grid)) low = true;

      if (pc.jumpBufferLeft > 0 && pc.coyoteLeft > 0) {
        // Jumping stands up first; a slide-jump keeps the slide's momentum.
        if (!low || setHeight(pos, body, T.standHeight, ctx.grid)) {
          vel.y = -T.jumpSpeed;
          pc.jumpBufferLeft = 0;
          pc.coyoteLeft = 0;
          if (pc.state === 'slide') {
            pc.state = 'air';
            pc.slideCooldownLeft = T.slideCooldown;
          }
          low = false;
        }
      }
      if (input.released('jump') && vel.y < 0) vel.y *= T.jumpCutMultiplier;

      if (pc.state !== 'slide') {
        pc.state = !grounded
          ? 'air'
          : low
            ? 'crouch'
            : Math.abs(vel.x) < 1
              ? 'idle'
              : Math.abs(vel.x) > T.walkSpeed + 1
                ? 'sprint'
                : 'run';
      }
    }
  },
};

/** Resizes the collider keeping the feet in place. Returns false if there is no room to grow. */
function setHeight(pos: { x: number; y: number; prevY: number }, body: BodyData, h: number, grid: TileGrid): boolean {
  if (body.h === h) return true;
  const y = pos.y + body.h - h;
  if (h > body.h && !boxFits({ x: pos.x, y, w: body.w, h }, grid)) return false;
  pos.prevY += y - pos.y;
  pos.y = y;
  body.h = h;
  return true;
}
