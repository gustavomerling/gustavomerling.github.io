import type { Entity, World } from '@engine/ecs/world';
import type { Vec2 } from '@engine/math/vec2';
import { AI, FOCUS, HIT_ZONES, IMPACT, type HitZone } from '../config';
import { fx } from '../fx/emitters';
import { Body, Brain, Breakable, Focus, Health, PlayerControl, Rig, Velocity, type Team } from '../world/components';
import { spawnDamageNumber, spawnEffect } from '../world/prefabs';
import type { RunContext } from './context';

export interface DamageInfo {
  amount: number;
  zone: HitZone;
  /** Where it landed (numbers, particles). */
  at: Vec2;
  /** Direction the damage travels (radians): knockback, blood and flinch go this way. */
  angle?: number;
  /** Where it came from (player's damage direction indicator). */
  from?: Vec2;
  /** Who dealt it: player damage feeds hit markers and focus. */
  by?: Team;
  /** Overrides the damage-based knockback speed (px/s). */
  knockback?: number;
}

export type DamageResult = 'hit' | 'killed' | 'dodged' | 'none';

/**
 * Single entry point for hurting anything (bullets, melee, explosions, falling lamps).
 * Applies damage and every consequence: numbers, particles, knockback, stagger, rig flinch,
 * i-frames, hit markers, hit-stop, focus. Returns 'dodged' when invulnerable, so a bullet
 * can pass through a dodging player.
 */
export function applyDamage(world: World, ctx: RunContext, target: Entity, info: DamageInfo): DamageResult {
  const health = world.get(target, Health);
  if (!health || info.amount <= 0 || health.hp <= 0) return 'none';
  const isPlayer = world.has(target, PlayerControl);

  if (health.invulnLeft > 0 || (isPlayer && ctx.debug.god)) {
    const pc = world.get(target, PlayerControl);
    if (pc?.state === 'slide') spawnDamageNumber(world, { x: info.at.x, y: info.at.y - 6 }, 'esquiva', '#9fd3ff');
    return 'dodged';
  }

  const amount = info.amount;
  health.hp -= amount;
  const killed = health.hp <= 0;
  const dirX = info.angle !== undefined ? Math.cos(info.angle) : 0;
  const dirY = info.angle !== undefined ? Math.sin(info.angle) : 0;

  // Knockback (characters only; props don't move).
  const vel = world.get(target, Velocity);
  const knock = info.knockback ?? Math.min(IMPACT.maxKnockback, amount * IMPACT.knockbackPerDamage);
  if (vel && world.has(target, Body) && info.angle !== undefined) {
    vel.x += dirX * knock;
    vel.y += Math.min(0, dirY * knock * 0.5) - (isPlayer ? 0 : 40);
  }
  health.lastHit = { vx: dirX * knock * 1.5, vy: dirY * knock * 1.5 - 60, zone: info.zone };

  // Interrupt enemies: no shooting/running/punching for a moment.
  const brain = world.get(target, Brain);
  if (brain) {
    brain.alert = AI.memory;
    brain.staggerLeft = IMPACT.stagger + (info.zone === 'head' ? IMPACT.headshotStagger : 0);
    brain.windupLeft = 0;
    brain.crouching = false;
    if (info.from) brain.lastSeen = { ...info.from };
  }

  const rig = world.get(target, Rig);
  if (rig && info.angle !== undefined) rig.animator.flinch(info.zone, Math.sign(dirX || 1) * rig.animator.facing);

  // Visuals and sound.
  const label = `${Math.max(1, Math.round(amount))}${info.zone === 'head' ? '!' : ''}`;
  spawnDamageNumber(world, { x: info.at.x + ctx.rng.range(-3, 3), y: info.at.y - 4 }, label, isPlayer ? '#ff3030' : HIT_ZONES[info.zone].color);
  if (rig) {
    fx.bodyHit(ctx.particles, info.at, info.angle ?? -Math.PI / 2, amount);
    ctx.sfx.bodyHit(info.zone === 'head', ctx.clock.scale);
  } else if (world.has(target, Breakable)) {
    fx.debris(ctx.particles, info.at, 4, 4, '#8a6a4a', 3);
  }

  if (isPlayer) {
    health.invulnLeft = IMPACT.playerIFrames;
    ctx.camera.addTrauma(0.35);
    spawnEffect(world, 'flash', info.at, 0, 0.3, '#ff0000', 0.35);
    ctx.sfx.playerHurt();
    if (info.from) ctx.feedback.damageDirs.push({ angle: Math.atan2(info.from.y - info.at.y, info.from.x - info.at.x), life: 0.8 });
  }

  if (info.by === 'player') {
    ctx.feedback.hitMarker = 0.15;
    ctx.feedback.hitHead = info.zone === 'head';
    ctx.feedback.hitKill = killed;
    if (info.angle !== undefined) ctx.camera.kick(dirX * 1.5, dirY * 1.5);
    const focus = world.first(Focus)?.[1];
    if (killed && rig) {
      ctx.clock.hitStop(IMPACT.killHitStop);
      if (focus) focus.value = Math.min(1, focus.value + (info.zone === 'head' ? FOCUS.perHeadshotKill : FOCUS.perKill));
    } else if (info.zone === 'head' && rig) {
      ctx.clock.hitStop(IMPACT.headshotHitStop);
      if (focus) focus.value = Math.min(1, focus.value + FOCUS.perHeadshot);
    }
  }
  return killed ? 'killed' : 'hit';
}
