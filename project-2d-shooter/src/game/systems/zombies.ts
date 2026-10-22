import type { Entity, World } from '@engine/ecs/world';
import type { Vec2 } from '@engine/math/vec2';
import type { TileGrid } from '@engine/physics/tilegrid';
import { AI } from '../config';
import type { EnemyDef, ZombieTraits } from '../content/enemies/catalog';
import { Body, Brain, Health, PlayerControl, Position, Velocity, Zombie, type BrainData, type ZombieData } from '../world/components';
import { bodyCenter } from '../world/geometry';
import type { RunContext } from './context';
import { applyDamage } from './damage';
import { spawnBlood, spawnBurstFx } from './effects';

/**
 * Zombie rules shared by every zombie type (modo zumbi). Per-type numbers live in
 * content/enemies/catalog.ts (`zombie: ZombieTraits`); these are the common ones.
 */
export const ZOMBIE = {
  /** Same floor (feet within this many px) for crowding and rushes. */
  sameFloor: 16,
  /** Zombies keep this far apart (centre to centre, px) instead of stacking into one blob. */
  spacing: 9,
  /** Closer than this they stop pushing in; between this and `spacing` they shuffle slowly. */
  spacingHard: 6,
  crowdSlow: 0.3,
  /** Crawlers (legs shot): slower telegraph, a weak bite, never a grab. */
  crawlWindupScale: 1.5,
  crawlDamage: 6,
  crawlKnockback: 90,
  /** Grab: the grabber can't hold you if you get this far away (px) somehow. */
  grabBreakDistance: 26,
  /** Knockback of the bite that ends a grab, and the shove when you break free. */
  biteKnockback: 230,
  breakFreeStagger: 0.6,
  breakFreeShove: 140,
  /** After breaking free (or being bitten) nobody can grab you for this long. */
  grabImmunity: 0.6,
} as const;

/** Seconds of telegraph before this zombie's attack. */
export function zombieWindup(def: EnemyDef, brain: BrainData): number {
  const t = def.zombie?.windup ?? AI.melee.windup;
  return brain.downed ? t * ZOMBIE.crawlWindupScale : t;
}

/** The zombie holding the player, if any. */
export function grabberOf(world: World): Entity | null {
  for (const [e, z, health] of world.query(Zombie, Health)) if (z.grab && health.hp > 0) return e;
  return null;
}

/** Seconds of grab immunity left on the player (after a bite or breaking free). */
const immunity = new WeakMap<World, number>();

/**
 * The attack at the end of the windup. In reach: a grabber that is still on its feet pins you
 * (unless someone already does); everyone else swipes. Missing (you stepped back, slid, rolled)
 * wastes the attack and its cooldown.
 */
export function zombieStrike(world: World, ctx: RunContext, e: Entity, def: EnemyDef, brain: BrainData, playerE: Entity | null, me: Vec2): void {
  const traits = def.zombie!;
  const z = world.get(e, Zombie);
  brain.cooldownLeft = traits.cooldown;
  if (z && z.rush !== 'none') endRush(z, traits);
  if (playerE === null) return;
  const ppos = world.get(playerE, Position);
  const pbody = world.get(playerE, Body);
  const phealth = world.get(playerE, Health);
  if (!ppos || !pbody || !phealth || phealth.hp <= 0) return;
  const pc = bodyCenter(ppos, pbody);
  if (Math.abs(pc.x - me.x) > AI.melee.reach || Math.abs(pc.y - me.y) > 20) return;
  if (phealth.invulnLeft > 0 || ctx.debug?.god) return; // dodged (slide, i-frames)

  const dir = Math.sign(pc.x - me.x) || brain.facing;
  const angle = dir > 0 ? -0.3 : Math.PI + 0.3;
  if (z && traits.grab && !brain.downed && grabberOf(world) === null && (immunity.get(world) ?? 0) <= 0) {
    z.grab = { left: traits.grab.hold, presses: 0 };
    return;
  }
  const amount = brain.downed ? ZOMBIE.crawlDamage : traits.claw;
  const knockback = brain.downed ? ZOMBIE.crawlKnockback : AI.melee.knockback;
  applyDamage(world, ctx, playerE, { amount, zone: brain.downed ? 'leg' : 'torso', at: pc, angle, from: me, by: 'enemy', knockback });
}

/**
 * Holding the player (called by the AI every step for zombies). Pins the player in place; the
 * bite lands when the hold runs out. Ways out: mash A/D/Space, or hit the grabber (any shot or
 * kick staggers it and it lets go). Returns true while it keeps holding (the AI skips the rest).
 */
export function zombieHold(world: World, ctx: RunContext, e: Entity, def: EnemyDef, brain: BrainData, me: Vec2, vel: Vec2, playerE: Entity | null, dt: number): boolean {
  const z = world.get(e, Zombie);
  if (!z?.grab) return false;
  const traits = def.zombie!;
  const ppos = playerE !== null ? world.get(playerE, Position) : undefined;
  const pbody = playerE !== null ? world.get(playerE, Body) : undefined;
  const phealth = playerE !== null ? world.get(playerE, Health) : undefined;
  const pvel = playerE !== null ? world.get(playerE, Velocity) : undefined;
  if (playerE === null || !ppos || !pbody || !phealth || !pvel || phealth.hp <= 0 || brain.staggerLeft > 0 || brain.downed || !traits.grab) {
    z.grab = null;
    return false;
  }
  const pc = bodyCenter(ppos, pbody);
  if (Math.abs(pc.x - me.x) > ZOMBIE.grabBreakDistance || Math.abs(pc.y - me.y) > ZOMBIE.grabBreakDistance) {
    z.grab = null;
    return false;
  }

  const dir = Math.sign(pc.x - me.x) || brain.facing;
  brain.facing = dir > 0 ? 1 : -1;
  vel.x = 0;
  // Pinned: no walking off, no jumping out.
  pvel.x = 0;
  if (pvel.y < 0) pvel.y = 0;

  const input = ctx.input;
  if (input && (input.pressed('left') || input.pressed('right') || input.pressed('jump'))) z.grab.presses++;
  if (z.grab.presses >= traits.grab.struggle) {
    // Broke free: it reels back and nobody grabs again for a moment.
    z.grab = null;
    brain.staggerLeft = ZOMBIE.breakFreeStagger;
    brain.cooldownLeft = traits.cooldown;
    vel.x = -dir * ZOMBIE.breakFreeShove;
    immunity.set(world, ZOMBIE.grabImmunity);
    return true;
  }

  z.grab.left -= dt;
  if (z.grab.left > 0) return true;
  // The bite.
  z.grab = null;
  brain.cooldownLeft = traits.cooldown;
  immunity.set(world, ZOMBIE.grabImmunity);
  const angle = dir > 0 ? -0.3 : Math.PI + 0.3;
  applyDamage(world, ctx, playerE, { amount: traits.grab.bite, zone: 'torso', at: pc, angle, from: me, by: 'enemy', knockback: ZOMBIE.biteKnockback });
  return true;
}

/** Counts the grab immunity down (once per step, world time). */
export function tickZombieTimers(world: World, dt: number): void {
  const left = immunity.get(world);
  if (left !== undefined && left > 0) immunity.set(world, Math.max(0, left - dt));
}

/**
 * Speed multiplier for a chasing zombie this step. Runners rush: on your floor, in range and in
 * sight, they stop and tense up (`tell`, the cue to turn and aim), then sprint for a while and
 * fall back to a shamble. 0 = stand still.
 */
export function zombiePace(world: World, e: Entity, ctx: RunContext, def: EnemyDef, brain: BrainData, me: Vec2, feetY: number, target: Vec2 | null, dt: number): number {
  const rush = def.zombie?.rush;
  const z = world.get(e, Zombie);
  if (!z || !rush) return 1;
  if (brain.downed) {
    z.rush = 'none';
    return 1;
  }
  z.rushCooldown = Math.max(0, z.rushCooldown - dt);
  if (z.rush === 'tell') {
    z.rushLeft -= dt;
    if (z.rushLeft > 0) return 0;
    z.rush = 'run';
    z.rushLeft = rush.duration;
  }
  if (z.rush === 'run') {
    z.rushLeft -= dt;
    if (z.rushLeft <= 0) endRush(z, def.zombie!);
    else return rush.speed / def.moveSpeed;
  }
  if (z.rushCooldown > 0 || !target) return 1;
  const sameFloor = Math.abs(target.y + 12 - feetY) <= ZOMBIE.sameFloor;
  if (sameFloor && Math.abs(target.x - me.x) <= rush.range && clearLine(ctx.grid, me, target)) {
    z.rush = 'tell';
    z.rushLeft = rush.tell;
    brain.facing = target.x < me.x ? -1 : 1;
    return 0;
  }
  return 1;
}

function endRush(z: ZombieData, traits: ZombieTraits): void {
  z.rush = 'none';
  z.rushLeft = 0;
  z.rushCooldown = traits.rush?.cooldown ?? 0;
}

function clearLine(grid: TileGrid, a: Vec2, b: Vec2): boolean {
  const steps = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / 4));
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    if (grid.isSolidAtPixel(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t)) return false;
  }
  return true;
}

/**
 * Crowd spacing (after the AI decided its moves): a zombie walking into another one on the same
 * floor slows down, and stops when they'd overlap. The horde forms a readable line instead of
 * one stacked blob where every head is in the same spot.
 */
export function spaceZombies(world: World): void {
  const crowd: { e: Entity; x: number; feet: number; vel: Vec2 }[] = [];
  for (const [e, , pos, body, vel, health, brain] of world.query(Zombie, Position, Body, Velocity, Health, Brain)) {
    if (health.hp <= 0 || brain.climb || !body.onGround) continue;
    crowd.push({ e, x: pos.x + body.w / 2, feet: pos.y + body.h, vel });
  }
  for (const a of crowd) {
    if (a.vel.x === 0) continue;
    for (const b of crowd) {
      if (a === b || Math.abs(a.feet - b.feet) > ZOMBIE.sameFloor / 2) continue;
      const dx = b.x - a.x;
      // Exactly on top of each other: the older one has the right of way.
      const ahead = dx === 0 ? a.e > b.e : Math.sign(dx) === Math.sign(a.vel.x);
      if (!ahead || Math.abs(dx) >= ZOMBIE.spacing) continue;
      a.vel.x = Math.abs(dx) < ZOMBIE.spacingHard ? 0 : a.vel.x * ZOMBIE.crowdSlow;
      if (a.vel.x === 0) break;
    }
  }
}

/**
 * A bloater bursting at `at`: zombies within `radius` die with it (the kills count, chain
 * bursts included); the player, within `playerRadius`, is hurt and thrown back.
 */
export function zombieBurst(world: World, ctx: RunContext, at: Vec2, traits: ZombieTraits): void {
  const burst = traits.burst;
  if (!burst) return;
  spawnBlood(world, at.x, at.y, -Math.PI / 2, 40, true);
  spawnBurstFx(world, at.x, at.y, burst.radius);
  for (const [e, , pos, body, health] of world.query(Zombie, Position, Body, Health)) {
    if (health.hp <= 0) continue;
    const c = bodyCenter(pos, body);
    if (Math.hypot(c.x - at.x, c.y - at.y) > burst.radius) continue;
    const angle = Math.atan2(c.y - at.y - 6, c.x - at.x);
    const result = applyDamage(world, ctx, e, { amount: 999, zone: 'head', at: c, angle, from: at, knockback: burst.knockback });
    if (result === 'killed') ctx.stats.kills++;
  }
  const p = world.first(Position, Body, Health, PlayerControl);
  if (!p || p[3].hp <= 0) return;
  const c = bodyCenter(p[1], p[2]);
  if (Math.hypot(c.x - at.x, c.y - at.y) > burst.playerRadius) return;
  const angle = Math.atan2(c.y - at.y - 6, c.x - at.x);
  applyDamage(world, ctx, p[0], { amount: burst.damage, zone: 'torso', at: c, angle, from: at, by: 'enemy', knockback: burst.knockback });
}
