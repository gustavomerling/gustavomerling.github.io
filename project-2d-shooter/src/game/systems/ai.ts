import type { Entity, World } from '@engine/ecs/world';
import { approach, DEG2RAD } from '@engine/math/math';
import type { Vec2 } from '@engine/math/vec2';
import { isBlocking, Tile, type TileGrid } from '@engine/physics/tilegrid';
import { ENEMIES, type EnemyDef } from '../content/enemies/catalog';
import { AI, PLAYER_TUNING, TILE } from '../config';
import {
  Arsenal,
  Aim,
  Body,
  Brain,
  Health,
  Intent,
  Npc,
  PlayerControl,
  Position,
  Rig,
  Velocity,
  emptyIntent,
  type BodyData,
  type BrainData,
  type IntentData,
} from '../world/components';
import { bodyCenter } from '../world/geometry';
import type { RunContext, RunSystem } from './context';
import { inCameraView } from './camera';
import { applyDamage } from './damage';
import { fencerBrain } from './fencerAi';
import { spaceZombies, tickZombieTimers, zombieHold, zombiePace, zombieStrike, zombieWindup } from './zombies';

interface Target {
  e: Entity;
  center: Vec2;
  head: Vec2;
}

type Pos = { x: number; y: number };

/** Alerting nearby allies when spotting the player. */
const SHOUT_RADIUS = 140;
const PATROL_SPEED = 0.35;
const ADVANCE_SPEED = 0.7;
/** Shooters step back when the player gets this close (px, horizontally). */
const BACK_OFF_DISTANCE = 48;
/** How far (tiles) a shooter looks for cover towards the player. */
const COVER_SEARCH_TILES = 4;
/**
 * Enemies only turn when the target is clearly to a side. Without this, a target straight
 * above/below makes the facing flip back and forth every step (the "spinning in place" bug).
 */
const FACE_DEADZONE = 2;
/** Melee chase stops this close to the target's x: no pacing back and forth when it can't be reached. */
const CHASE_DEADZONE = 4;
/** Pathing enemies grab a ladder this close (px) to its centre line. */
const LADDER_GRAB = 6;

/**
 * Enemy behaviour. Perception (sight cone + line of sight through walls, hearing
 * shots, being hit, allies shouting) feeds a small memory (Brain); the enemy's `brain`
 * type decides what to do. Output is Intent/Aim/Velocity, so weapons and physics treat
 * enemies like the player.
 */
export const aiSystem: RunSystem = {
  name: 'ai',
  update(world, ctx) {
    const dt = ctx.clock.dt;
    if (dt <= 0) return;
    const p = world.first(Position, Body, PlayerControl, Health);
    const player: Target | null =
      p && p[4].hp > 0 ? { e: p[0], center: bodyCenter(p[1], p[2]), head: { x: p[1].x + p[2].w / 2, y: p[1].y + 3 } } : null;
    const shouts: Vec2[] = [];

    for (const [e, pos, vel, body, npc, brain, intent, aim, health] of world.query(Position, Velocity, Body, Npc, Brain, Intent, Aim, Health)) {
      Object.assign(intent, emptyIntent());
      const def = ENEMIES.get(npc.defId);
      const animator = world.get(e, Rig)?.animator;
      brain.cooldownLeft = Math.max(0, brain.cooldownLeft - dt);
      // Knocked off a ladder (hit, legs shot, killed): let go and fall.
      if (brain.climb && (health.hp <= 0 || brain.staggerLeft > 0 || brain.downed)) letGo(brain, body);
      if (health.hp <= 0) continue;
      // A zombie holding the player keeps holding until the bite, a break-free or a hit.
      if (def.zombie && zombieHold(world, ctx, e, def, brain, bodyCenter(pos, body), vel, player?.e ?? null, dt)) continue;

      // Staggered by a hit: can't act, slides with the knockback.
      if (brain.staggerLeft > 0) {
        brain.staggerLeft = Math.max(0, brain.staggerLeft - dt);
        brain.windupLeft = 0;
        brain.crouching = false;
        if (animator) animator.meleeWindup = 0;
        continue;
      }

      const eye = { x: pos.x + body.w / 2, y: pos.y + (brain.crouching ? 12 : 4) };
      const wasSeeing = brain.seeTime > 0;
      perceive(ctx, def, brain, eye, player, dt);
      const sees = brain.seeTime > 0;
      if (sees && !wasSeeing && player) shouts.push(player.center);
      // Pathing enemies, once they notice you (in range, a gunshot, a hit), never lose track; the route gets them there.
      if (def.pathing && player && brain.alert > 0) {
        brain.alert = AI.memory;
        brain.lastSeen = { ...player.center };
      }
      if (brain.climb) {
        climbLadder(ctx.grid, brain, pos, vel, body, def, dt);
        continue;
      }
      if (brain.alert > 0 && brain.lastSeen) faceTarget(brain, eye.x, brain.lastSeen.x);

      if (brain.alert <= 0) {
        patrol(ctx, brain, pos, vel, body, def, dt);
        aim.angle = brain.facing > 0 ? 0 : Math.PI;
        continue;
      }

      switch (def.brain) {
        case 'shooter':
        case 'tank':
          shooter(world, e, ctx, def, brain, intent, aim, pos, vel, body, eye, player, sees, dt);
          break;
        case 'melee':
          melee(world, e, ctx, def, brain, aim, pos, vel, body, player, sees, dt);
          break;
        case 'fencer':
          fencerBrain(world, e, ctx, def, brain, intent, aim, pos, vel, body, player, sees, dt);
          break;
      }
    }

    // Zombies walking into each other queue up instead of stacking.
    spaceZombies(world);
    tickZombieTimers(world, dt);

    // Spotting the player alerts allies nearby ("ele tá aqui!").
    for (const spot of shouts) {
      for (const [, pos, body, brain] of world.query(Position, Body, Brain)) {
        const c = bodyCenter(pos, body);
        if (Math.hypot(c.x - spot.x, c.y - spot.y) > SHOUT_RADIUS) continue;
        brain.alert = AI.memory;
        if (brain.seeTime === 0) brain.lastSeen = { ...spot };
      }
    }

    // Noises are produced later in the step (weapons); consumed here on the next one.
    ctx.noises.length = 0;
  },
};

function perceive(ctx: RunContext, def: EnemyDef, brain: BrainData, eye: Vec2, player: Target | null, dt: number): void {
  brain.alert = Math.max(0, brain.alert - dt);

  // Hearing: gunshots (the silencer shrinks this radius a lot).
  for (const n of ctx.noises) {
    if (Math.hypot(n.x - eye.x, n.y - eye.y) <= n.radius) {
      brain.alert = AI.memory;
      if (brain.seeTime === 0) brain.lastSeen = { x: n.x, y: n.y };
    }
  }

  let sees = false;
  if (player) {
    const dx = player.center.x - eye.x;
    const dist = Math.hypot(dx, player.center.y - eye.y);
    const inFront = def.omniscient || Math.sign(dx) === brain.facing || dist < AI.closeSense || brain.alert > 0;
    sees =
      dist <= def.sightRange &&
      inFront &&
      (def.omniscient ||
        lineOfSight(ctx.grid, eye.x, eye.y, player.center.x, player.center.y) ||
        lineOfSight(ctx.grid, eye.x, eye.y, player.head.x, player.head.y));
  }

  if (sees && player) {
    brain.seeTime += dt;
    brain.alert = AI.memory;
    brain.lastSeen = { ...player.center };
  } else {
    brain.seeTime = 0;
  }
}

/** Calm: walk back and forth, turning at walls and ledges, with pauses. */
function patrol(ctx: RunContext, brain: BrainData, pos: Pos, vel: Pos, body: BodyData, def: EnemyDef, dt: number): void {
  brain.crouching = false;
  if (brain.idleLeft > 0) {
    // Standing.
    vel.x = 0;
    brain.idleLeft -= dt;
    if (brain.idleLeft <= 0) brain.idleLeft = -ctx.rng.range(1.5, 3.5);
    return;
  }
  // Walking (idleLeft counts up to 0).
  brain.idleLeft += dt;
  if (brain.idleLeft >= 0) {
    brain.idleLeft = ctx.rng.range(1, 2.5);
    if (ctx.rng.chance(0.4)) brain.facing = brain.facing > 0 ? -1 : 1;
    vel.x = 0;
    return;
  }
  if (body.onGround && (body.hitWall || ledgeAhead(ctx.grid, pos, body, brain.facing))) brain.facing = brain.facing > 0 ? -1 : 1;
  vel.x = brain.facing * def.moveSpeed * PATROL_SPEED;
}

function shooter(
  world: World,
  e: Entity,
  ctx: RunContext,
  def: EnemyDef,
  brain: BrainData,
  intent: IntentData,
  aim: { x: number; y: number; angle: number },
  pos: Pos,
  vel: Pos,
  body: BodyData,
  eye: Vec2,
  player: Target | null,
  sees: boolean,
  dt: number,
): void {
  const target = sees && player ? player.center : brain.lastSeen;
  const desired = target ? Math.atan2(target.y - eye.y, target.x - eye.x) : brain.facing > 0 ? 0 : Math.PI;
  // Track the target at a limited turn rate (and slower in bullet time, since dt is world time).
  const maxTurn = AI.turnRate * dt;
  const diff = Math.atan2(Math.sin(desired - aim.angle), Math.cos(desired - aim.angle));
  aim.angle = Math.abs(diff) <= maxTurn ? desired : aim.angle + Math.sign(diff) * maxTurn;
  aim.x = eye.x + Math.cos(aim.angle) * 64;
  aim.y = eye.y + Math.sin(aim.angle) * 64;
  vel.x = 0;

  const arsenal = world.get(e, Arsenal);
  const ws = arsenal?.weapons[arsenal.active];
  if (!ws) return;
  if (ws.ammo < brain.lastAmmo) brain.burstLeft -= brain.lastAmmo - ws.ammo;
  brain.lastAmmo = ws.ammo;
  if (ws.ammo === 0) intent.reload = true;

  if (!sees) {
    // Lost sight: go check the last known position.
    brain.crouching = false;
    if (brain.lastSeen && Math.abs(brain.lastSeen.x - eye.x) > 16) {
      if (def.routes && followRoute(ctx, brain, def, pos, body, vel, bodyCenter(pos, body), brain.lastSeen)) return;
      vel.x = Math.sign(brain.lastSeen.x - eye.x) * def.moveSpeed * ADVANCE_SPEED;
      if (body.onGround && body.hitWall) vel.y = -AI.melee.jumpSpeed;
    }
    return;
  }

  // Fair fights: gunmen don't shoot from off screen. Out of view they walk into it, and the
  // reaction time only starts counting once they are visible (skeleton archers keep their own rules).
  if (!def.skeleton && !inCameraView(ctx.camera, eye.x, eye.y, AI.onScreenMargin)) {
    brain.seeTime = Math.min(brain.seeTime, dt);
    brain.crouching = false;
    if (player) vel.x = Math.sign(player.center.x - eye.x) * def.moveSpeed * ADVANCE_SPEED;
    if (body.onGround && body.hitWall) vel.y = -AI.melee.jumpSpeed;
    return;
  }

  // Tanks don't hide: they keep walking at you between bursts.
  const tank = def.brain === 'tank';
  // Seeing the player: get behind cover if some is close in their direction.
  const cover = tank ? null : coverSpot(ctx.grid, pos, body, brain.facing);
  if (cover === null && !tank) {
    const towards = findCoverAhead(ctx.grid, pos, body, brain.facing);
    if (towards !== null && brain.pauseLeft > 0) {
      vel.x = Math.sign(towards - (pos.x + body.w / 2)) * def.moveSpeed;
      brain.crouching = false;
      return;
    }
  }

  // Short-range guns walk up to the player first.
  if (def.closeIn && player && Math.abs(player.center.x - eye.x) > def.closeIn && brain.pauseLeft <= 0) {
    vel.x = Math.sign(player.center.x - eye.x) * def.moveSpeed * ADVANCE_SPEED;
    if (body.onGround && body.hitWall) vel.y = -AI.melee.jumpSpeed;
    brain.crouching = false;
    return;
  }

  // Too close for a gunfight (and not a close-range gun): back off while still aiming.
  const dx = player ? player.center.x - eye.x : 0;
  const tooClose = !def.closeIn && player !== null && Math.abs(dx) < BACK_OFF_DISTANCE;
  if (tooClose && body.onGround && !ledgeAhead(ctx.grid, pos, body, (dx > 0 ? -1 : 1) as 1 | -1)) {
    vel.x = -Math.sign(dx) * def.moveSpeed * ADVANCE_SPEED;
  }

  if (brain.seeTime < (def.reaction ?? AI.reactionTime) || Math.abs(diff) > 0.35) return;
  if (brain.pauseLeft > 0) {
    brain.pauseLeft -= dt;
    if (tank) {
      brain.crouching = false;
      const towards = (dx > 0 ? 1 : -1) as 1 | -1;
      if (player && Math.abs(dx) > AI.tankStopDistance && body.onGround && !ledgeAhead(ctx.grid, pos, body, towards)) {
        vel.x = towards * def.moveSpeed * AI.tankAdvance;
      }
      return;
    }
    brain.crouching = cover !== null; // duck between bursts
    // Out in the open: shuffle sideways between bursts so they aren't a still target.
    if (cover === null && !tooClose && body.onGround) {
      const side = Math.sin(brain.pauseLeft * 7 + pos.x) > 0 ? 1 : -1;
      if (!ledgeAhead(ctx.grid, pos, body, side as 1 | -1)) vel.x = side * def.moveSpeed * PATROL_SPEED;
    }
    return;
  }
  if (brain.burstLeft <= 0) {
    brain.burstLeft = ctx.rng.int(AI.burstShots.min, AI.burstShots.max);
    brain.pauseLeft = ctx.rng.range(AI.burstPause.min, AI.burstPause.max);
    return;
  }
  brain.crouching = false;
  // Imperfect aim on top of the gun's own spread: wider on the first shots, settling while they keep you in sight.
  const settle = Math.min(1, Math.max(0, (brain.seeTime - (def.reaction ?? AI.reactionTime)) / AI.aimSettleTime));
  const error = AI.aimErrorDeg * (AI.firstShotErrorScale + (1 - AI.firstShotErrorScale) * settle);
  aim.angle += ctx.rng.range(-error, error) * DEG2RAD;
  intent.fireHeld = true;
  intent.firePressed = true;
}

function melee(
  world: World,
  e: Entity,
  ctx: RunContext,
  def: EnemyDef,
  brain: BrainData,
  aim: { x: number; y: number; angle: number },
  pos: Pos,
  vel: Pos,
  body: BodyData,
  player: Target | null,
  sees: boolean,
  dt: number,
): void {
  const M = AI.melee;
  const me = bodyCenter(pos, body);
  const animator = world.get(e, Rig)?.animator;
  aim.angle = brain.facing > 0 ? 0 : Math.PI;
  if (animator && brain.windupLeft <= 0) animator.meleeWindup = 0;

  const windup = def.zombie ? zombieWindup(def, brain) : M.windup;
  if (brain.windupLeft > 0) {
    vel.x = 0;
    brain.windupLeft -= dt;
    if (animator) animator.meleeWindup = 1 - brain.windupLeft / windup;
    if (brain.windupLeft > 0) return;
    // Strike.
    animator?.punch();
    if (def.zombie) {
      zombieStrike(world, ctx, e, def, brain, player?.e ?? null, me);
      return;
    }
    brain.cooldownLeft = M.cooldown;
    const angle = brain.facing > 0 ? -0.3 : Math.PI + 0.3;
    if (player && Math.abs(player.center.x - me.x) <= M.reach && Math.abs(player.center.y - me.y) <= 20) {
      applyDamage(world, ctx, player.e, { amount: M.damage, zone: 'torso', at: player.center, angle, from: me, by: 'enemy', knockback: M.knockback });
    }
    return;
  }

  const target = sees && player ? player.center : brain.lastSeen;
  if (!target) {
    vel.x = 0;
    return;
  }
  const dx = target.x - me.x;
  const close = sees && player && Math.abs(dx) <= M.range && Math.abs(target.y - me.y) <= 20;
  if (close) {
    // In reach of the player: wind up a punch.
    vel.x = 0;
    if (brain.cooldownLeft <= 0) brain.windupLeft = windup;
    return;
  }
  if (!sees && Math.abs(dx) < 4) {
    // Reached the last known position: lose interest.
    vel.x = 0;
    brain.lastSeen = null;
    return;
  }
  if (brain.downed) {
    // Legs are gone: drag along the route at a crawl (walking and dropping only: no jumps, no
    // ladders), or straight at the target when the route needs either.
    const step = def.pathing
      ? ctx.nav.step(def.id, { moveSpeed: def.moveSpeed, jumpSpeed: M.jumpSpeed }, { x: me.x, y: pos.y + body.h }, { x: target.x, y: target.y + PLAYER_TUNING.standHeight / 2 })
      : null;
    const walkable = step !== null && step.ladderX === undefined && !step.up;
    const sx = (walkable ? step.x : target.x) - me.x;
    vel.x = Math.abs(sx) <= (walkable ? 2 : CHASE_DEADZONE) ? 0 : Math.sign(sx) * def.moveSpeed * AI.crawlSpeed;
    return;
  }
  // Zombies: runners stop to tense up (0), then sprint (> 1).
  const pace = def.zombie ? zombiePace(world, e, ctx, def, brain, me, pos.y + body.h, sees && player ? player.center : null, dt) : 1;
  if (pace === 0) {
    vel.x = 0;
    if (animator) animator.meleeWindup = 0.5;
    return;
  }
  if (def.pathing && followRoute(ctx, brain, def, pos, body, vel, me, target)) {
    vel.x *= pace;
    return;
  }

  vel.x = Math.abs(dx) <= CHASE_DEADZONE ? 0 : Math.sign(dx) * def.moveSpeed * pace;
  // Bumped into an obstacle: hop over it.
  if (vel.x !== 0 && body.onGround && body.hitWall) vel.y = -M.jumpSpeed;
}

/**
 * Follows the nav route over the floor towards `target`: walks, jumps where it says so,
 * drops off ledges, and grabs ladders on the way. Returns false when there is no route.
 */
function followRoute(
  ctx: RunContext,
  brain: BrainData,
  def: EnemyDef,
  pos: Pos,
  body: BodyData,
  vel: Pos,
  me: Vec2,
  target: Vec2,
): boolean {
  const feet = { x: me.x, y: pos.y + body.h };
  const goal = { x: target.x, y: target.y + PLAYER_TUNING.standHeight / 2 };
  const step = ctx.nav.step(def.id, { moveSpeed: def.moveSpeed, jumpSpeed: AI.melee.jumpSpeed }, feet, goal);
  if (!step) return false;
  if (step.ladderX !== undefined) {
    // Walk to the ladder; close enough (still over the floor beside a hole), grab it.
    const lx = step.ladderX - me.x;
    if (Math.abs(lx) < LADDER_GRAB) brain.climb = { x: step.ladderX, y: step.y, exitX: step.x };
    vel.x = Math.abs(lx) < 1 ? 0 : Math.sign(lx) * def.moveSpeed;
    return true;
  }
  const sx = step.x - me.x;
  vel.x = Math.abs(sx) < 2 ? 0 : Math.sign(sx) * def.moveSpeed;
  if (step.up && body.onGround) vel.y = -AI.melee.jumpSpeed;
  return true;
}

/**
 * Pathing up a ladder (brain.climb): snap to its centre and climb until the feet reach the
 * floor of the exit, then step sideways onto it. Gravity stays off until the body is over
 * that floor, so it doesn't drop back down the shaft.
 */
function climbLadder(grid: TileGrid, brain: BrainData, pos: Pos, vel: Pos, body: BodyData, def: EnemyDef, dt: number): void {
  const climb = brain.climb!;
  const centre = pos.x + body.w / 2;
  const feet = pos.y + body.h;
  body.climbing = true;
  if (feet > climb.y + 0.5) {
    // Going up. Lost the ladder (knocked aside, end of the rungs): give up and fall.
    if (grid.atPixel(climb.x, feet - 1) !== Tile.Ladder && grid.atPixel(climb.x, pos.y + 1) !== Tile.Ladder) {
      letGo(brain, body);
      return;
    }
    pos.x = approach(pos.x, climb.x - body.w / 2, PLAYER_TUNING.climbSnapSpeed * dt);
    vel.x = 0;
    vel.y = -Math.min(PLAYER_TUNING.climbSpeed, def.moveSpeed);
    return;
  }
  // At the top: hold the height and step off towards the exit.
  pos.y = climb.y - body.h;
  vel.y = 0;
  const dir = climb.exitX > climb.x ? 1 : -1;
  brain.facing = dir;
  vel.x = dir * def.moveSpeed;
  if (Math.abs(centre - climb.x) >= (TILE - body.w) / 2 + 2 || body.hitWall) letGo(brain, body);
}

function letGo(brain: BrainData, body: BodyData): void {
  brain.climb = null;
  body.climbing = false;
}

/** Turns towards a target, ignoring tiny offsets (straight above/below is not a side to face). */
function faceTarget(brain: BrainData, x: number, targetX: number): void {
  const dx = targetX - x;
  if (Math.abs(dx) > FACE_DEADZONE) brain.facing = dx < 0 ? -1 : 1;
}

const feetRow = (pos: Pos, body: BodyData) => Math.floor((pos.y + body.h - 1) / TILE);

/** No floor in front of the feet. */
function ledgeAhead(grid: TileGrid, pos: Pos, body: BodyData, facing: 1 | -1): boolean {
  const x = facing > 0 ? pos.x + body.w + 2 : pos.x - 2;
  const below = grid.atPixel(x, pos.y + body.h + 2);
  return !isBlocking(below) && below !== Tile.OneWay;
}

/** A low (1-tile) block right in front: crouching behind it hides the body. */
function coverSpot(grid: TileGrid, pos: Pos, body: BodyData, facing: 1 | -1): number | null {
  const row = feetRow(pos, body);
  const col = Math.floor((facing > 0 ? pos.x + body.w + 3 : pos.x - 3) / TILE);
  return isBlocking(grid.get(col, row)) && !isBlocking(grid.get(col, row - 1)) ? col : null;
}

/** X (px) to stand at, behind the nearest low block towards `facing`, or null. */
function findCoverAhead(grid: TileGrid, pos: Pos, body: BodyData, facing: 1 | -1): number | null {
  const row = feetRow(pos, body);
  const start = Math.floor((pos.x + body.w / 2) / TILE);
  for (let i = 1; i <= COVER_SEARCH_TILES; i++) {
    const col = start + facing * i;
    if (isBlocking(grid.get(col, row - 1))) return null; // tall wall: not cover
    if (isBlocking(grid.get(col, row))) return facing > 0 ? col * TILE - body.w / 2 - 1 : (col + 1) * TILE + body.w / 2 + 1;
    if (!isBlocking(grid.get(col, row + 1)) && grid.get(col, row + 1) !== Tile.OneWay) return null; // gap
  }
  return null;
}

/** Tile ray: walls block sight, one-way platforms and ladders don't. */
export function lineOfSight(grid: TileGrid, x0: number, y0: number, x1: number, y1: number): boolean {
  const dist = Math.hypot(x1 - x0, y1 - y0);
  const steps = Math.max(1, Math.ceil(dist / 4));
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    if (grid.isSolidAtPixel(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t)) return false;
  }
  return true;
}
