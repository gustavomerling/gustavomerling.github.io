import type { Entity, World } from '@engine/ecs/world';
import { DEG2RAD } from '@engine/math/math';
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
import { applyDamage } from './damage';

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
      if (health.hp <= 0) continue;

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
      // Pathing enemies always know where the player is; the route gets them there.
      if (def.pathing && player) {
        brain.alert = AI.memory;
        brain.lastSeen = { ...player.center };
      }
      if (brain.alert > 0 && brain.lastSeen) brain.facing = brain.lastSeen.x < eye.x ? -1 : 1;

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
      }
    }

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
      vel.x = Math.sign(brain.lastSeen.x - eye.x) * def.moveSpeed * ADVANCE_SPEED;
      if (body.onGround && body.hitWall) vel.y = -AI.melee.jumpSpeed;
    }
    return;
  }

  // Seeing the player: get behind cover if some is close in their direction.
  const cover = coverSpot(ctx.grid, pos, body, brain.facing);
  if (cover === null) {
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
  // Imperfect aim on top of the gun's own spread.
  aim.angle += ctx.rng.range(-AI.aimErrorDeg, AI.aimErrorDeg) * DEG2RAD;
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

  if (brain.windupLeft > 0) {
    vel.x = 0;
    brain.windupLeft -= dt;
    if (animator) animator.meleeWindup = 1 - brain.windupLeft / M.windup;
    if (brain.windupLeft > 0) return;
    // Strike.
    animator?.punch();
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
    if (brain.cooldownLeft <= 0) brain.windupLeft = M.windup;
    return;
  }
  if (!sees && Math.abs(dx) < 4) {
    // Reached the last known position: lose interest.
    vel.x = 0;
    brain.lastSeen = null;
    return;
  }
  if (def.pathing) {
    // Follow the route over the floor: walk, jump up where it says so, drop off ledges.
    const feet = { x: me.x, y: pos.y + body.h };
    const goal = { x: target.x, y: target.y + PLAYER_TUNING.standHeight / 2 };
    const step = ctx.nav.step(def.id, { moveSpeed: def.moveSpeed, jumpSpeed: M.jumpSpeed }, feet, goal);
    if (step) {
      const sx = step.x - me.x;
      vel.x = Math.abs(sx) < 2 ? 0 : Math.sign(sx) * def.moveSpeed;
      if (step.up && body.onGround) vel.y = -M.jumpSpeed;
      return;
    }
  }

  vel.x = Math.sign(dx) * def.moveSpeed;
  // Bumped into an obstacle: hop over it.
  if (body.onGround && body.hitWall) vel.y = -M.jumpSpeed;
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
