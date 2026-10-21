import { boxFits } from '@engine/physics/collide';
import { isBlocking, Tile, type TileGrid } from '@engine/physics/tilegrid';
import { approach, clamp, lerp, sign } from '@engine/math/math';
import { IMPACT, PLAYER_TUNING as T } from '../config';
import { Body, Health, PlayerControl, Position, Velocity, type BodyData } from '../world/components';
import type { RunSystem } from './context';

/**
 * Turns input into the player's velocity and stance: walk/sprint, crouch, slide,
 * jump (coyote time + buffer + variable height), ladders, wall jumps, ledge mantles
 * and drop-through. Integration and collision happen afterwards in the physics system.
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
        body.climbing = false;
        body.mantling = false;
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
      pc.wallJumpLockLeft = Math.max(0, pc.wallJumpLockLeft - dt);
      pc.mantleCooldownLeft = Math.max(0, pc.mantleCooldownLeft - dt);

      // Scripted ledge pull-up. Y first, then X, so the body clears the lip before moving in.
      if (body.mantling) {
        pc.mantleLeft -= dt;
        const t = pc.mantleTotal > 0 ? clamp(1 - pc.mantleLeft / pc.mantleTotal, 0, 1) : 1;
        const up = smoothstep(clamp(t / 0.7, 0, 1));
        const across = smoothstep(clamp((t - 0.3) / 0.7, 0, 1));
        pos.x = lerp(pc.mantleFromX, pc.mantleToX, across);
        pos.y = lerp(pc.mantleFromY, pc.mantleToY, up);
        vel.x = 0;
        vel.y = 0;
        pc.state = 'mantle';
        if (pc.mantleLeft <= 0) {
          pos.x = pc.mantleToX;
          pos.y = pc.mantleToY;
          body.mantling = false;
          body.climbing = false;
          body.onGround = true;
          body.onOneWay = false;
          pc.state = 'idle';
          pc.mantleCooldownLeft = T.mantleCooldown;
        }
        continue;
      }

      // Ladders: overlap + up/down grabs them; releasing the keys keeps the player hanging.
      // While attached, A/D is ignored and the body drifts to the ladder centre.
      const onLadder = touchingLadder(ctx.grid, pos, body);
      body.climbing = onLadder && (body.climbing || input.isDown('up') || (input.isDown('down') && !grounded));
      if (body.climbing && grounded && !input.isDown('up')) body.climbing = false;
      if (body.climbing) {
        const climbDir = input.isDown('up') ? -1 : input.isDown('down') ? 1 : 0;
        vel.y = climbDir * T.climbSpeed;
        vel.x = 0;
        const center = ladderCenterX(ctx.grid, pos, body);
        if (center !== null) pos.x = approach(pos.x, center - body.w / 2, T.climbSnapSpeed * dt);
        pc.coyoteLeft = 0;
        pc.jumpBufferLeft = 0;
        pc.state = 'climb';
        // Space (or W after releasing up) jumps off the ladder.
        if (input.pressed('jump') && !input.isDown('up')) {
          body.climbing = false;
          vel.y = -T.jumpSpeed;
          pc.state = 'air';
        }
        continue;
      }

      // Wall contact: used for wall slides, wall jumps and ledge detection.
      const wallSide = airborneWallSide(ctx.grid, pos, body, grounded ? 0 : moveX);

      // Jumping while airborne next to a wall kicks away from it.
      if (!grounded && wallSide !== 0 && pc.jumpBufferLeft > 0 && pc.wallJumpLockLeft <= 0) {
        vel.y = -T.wallJumpSpeed;
        vel.x = -wallSide * T.wallJumpSpeedX;
        pc.jumpBufferLeft = 0;
        pc.coyoteLeft = 0;
        pc.slideQueued = false;
        pc.wallJumpLockLeft = T.wallJumpLock;
        pc.wallJumpDir = -wallSide as 1 | -1;
        pc.facing = pc.wallJumpDir;
        pc.state = 'air';
        continue;
      }

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
        // After a wall jump the impulse owns horizontal motion for a moment.
        const control = pc.wallJumpLockLeft > 0 ? 0 : moveX;
        // A queued air-slide keeps its horizontal momentum untouched.
        if (!pc.slideQueued) vel.x = approach(vel.x, control * speed, accel * dt);
        low = crouching;
      }

      // Pressing into a wall while falling slows the descent.
      if (!grounded && wallSide !== 0 && moveX === wallSide && vel.y > 0) {
        vel.y = Math.min(vel.y, T.wallSlideSpeed);
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

      // Ledge vault: pulling towards a nearby lip starts a short scripted pull-up.
      if (pc.state !== 'slide' && !input.isDown('down') && moveX !== 0 && pc.mantleCooldownLeft <= 0) {
        const target = ledgeTarget(ctx.grid, pos, body, moveX as 1 | -1);
        if (target) {
          body.mantling = true;
          body.climbing = false;
          body.onGround = false;
          body.onOneWay = false;
          vel.x = 0;
          vel.y = 0;
          pc.mantleFromX = pos.x;
          pc.mantleFromY = pos.y;
          pc.mantleToX = target.x;
          pc.mantleToY = target.y;
          pc.mantleTotal = T.mantleTime;
          pc.mantleLeft = T.mantleTime;
          pc.jumpBufferLeft = 0;
          pc.slideQueued = false;
          pc.state = 'mantle';
          continue;
        }
      }

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

const smoothstep = (t: number): number => t * t * (3 - 2 * t);

/** True while the body overlaps at least one ladder tile. */
function touchingLadder(grid: TileGrid, pos: { x: number; y: number }, body: BodyData): boolean {
  return ladderCenterX(grid, pos, body) !== null;
}

/** Centre X of the overlapped ladder column closest to the body centre, if any. */
function ladderCenterX(grid: TileGrid, pos: { x: number; y: number }, body: BodyData): number | null {
  const ts = grid.tileSize;
  const c0 = Math.floor(pos.x / ts);
  const c1 = Math.floor((pos.x + body.w - 0.001) / ts);
  const r0 = Math.floor(pos.y / ts);
  const r1 = Math.floor((pos.y + body.h - 0.001) / ts);
  const center = pos.x + body.w / 2;
  let best: number | null = null;
  for (let r = r0; r <= r1; r++) {
    for (let c = c0; c <= c1; c++) {
      if (grid.get(c, r) !== Tile.Ladder) continue;
      const x = c * ts + ts / 2;
      if (best === null || Math.abs(x - center) < Math.abs(best - center)) best = x;
    }
  }
  return best;
}

/** -1/1 when a wall is within a couple of pixels on that side. `bias` picks a side when both are close. */
function airborneWallSide(grid: TileGrid, pos: { x: number; y: number }, body: BodyData, bias: number): -1 | 0 | 1 {
  const left = !boxFits({ x: pos.x - 2, y: pos.y, w: body.w, h: body.h }, grid);
  const right = !boxFits({ x: pos.x + 2, y: pos.y, w: body.w, h: body.h }, grid);
  if (left && right) return bias < 0 ? -1 : 1;
  if (left) return -1;
  if (right) return 1;
  return 0;
}

/**
 * Finds a standable lip next to the body: a solid tile whose top is within reach
 * (roughly chest height) and whose target body box plus the pull-up path are free.
 */
function ledgeTarget(
  grid: TileGrid,
  pos: { x: number; y: number },
  body: BodyData,
  dir: 1 | -1,
): { x: number; y: number } | null {
  const ts = grid.tileSize;
  const col = dir > 0 ? Math.floor((pos.x + body.w + 1.5) / ts) : Math.floor((pos.x - 1.5) / ts);
  if (!grid.inBounds(col, 0)) return null;
  const topRow = Math.floor(pos.y / ts);
  const bottomRow = Math.floor((pos.y + body.h - 0.001) / ts);

  for (let row = Math.max(0, topRow); row <= bottomRow; row++) {
    if (!isBlocking(grid.get(col, row))) continue;
    let surface = row;
    while (surface > 0 && isBlocking(grid.get(col, surface - 1))) surface--;
    if (surface < topRow) continue; // wall continues above the body: no lip to grab
    const surfaceY = surface * ts;
    if (surfaceY < pos.y - 6 || surfaceY > pos.y + body.h - 4) continue;

    const target = { x: col * ts + (ts - body.w) / 2, y: surfaceY - body.h };
    if (!clearPullUp(grid, pos, body, target)) continue;
    return target;
  }
  return null;
}

/** The mantle is scripted (physics off), so ensure the vertical and horizontal sweeps are clear. */
function clearPullUp(
  grid: TileGrid,
  pos: { x: number; y: number },
  body: BodyData,
  target: { x: number; y: number },
): boolean {
  const steps = 5;
  for (let i = 1; i <= steps; i++) {
    const y = lerp(pos.y, target.y, i / steps);
    if (!boxFits({ x: pos.x, y, w: body.w, h: body.h }, grid)) return false;
  }
  for (let i = 1; i <= steps; i++) {
    const x = lerp(pos.x, target.x, i / steps);
    if (!boxFits({ x, y: target.y, w: body.w, h: body.h }, grid)) return false;
  }
  return true;
}

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
