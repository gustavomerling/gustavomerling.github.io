import type { Entity, World } from '@engine/ecs/world';
import type { Vec2 } from '@engine/math/vec2';
import { AI, FOCUS, IMPACT, type HitZone } from '../config';
import { Body, Brain, Focus, Health, PlayerControl, Rig, Velocity, type Team } from '../world/components';
import type { RunContext } from './context';

export interface DamageInfo {
  amount: number;
  zone: HitZone;
  /** Where it landed. */
  at: Vec2;
  /** Direction the damage travels (radians): knockback goes this way. */
  angle?: number;
  /** Where it came from (enemies turn towards it). */
  from?: Vec2;
  /** Who dealt it: player damage feeds hit markers and focus. */
  by?: Team;
  /** Overrides the damage-based knockback speed (px/s). */
  knockback?: number;
}

export type DamageResult = 'hit' | 'killed' | 'dodged' | 'none';

/**
 * Single entry point for hurting anyone (bullets, melee). Applies damage and its consequences:
 * knockback, stagger, rig flinch, i-frames, hit marker, focus. Returns 'dodged' when
 * invulnerable, so a bullet can pass through a dodging player.
 */
export function applyDamage(world: World, ctx: RunContext, target: Entity, info: DamageInfo): DamageResult {
  const health = world.get(target, Health);
  if (!health || info.amount <= 0 || health.hp <= 0) return 'none';
  const isPlayer = world.has(target, PlayerControl);

  if (health.invulnLeft > 0 || (isPlayer && ctx.debug.god)) return 'dodged';

  health.hp -= info.amount;
  const killed = health.hp <= 0;

  // Knockback.
  const dirX = info.angle !== undefined ? Math.cos(info.angle) : 0;
  const dirY = info.angle !== undefined ? Math.sin(info.angle) : 0;
  const knock = info.knockback ?? Math.min(IMPACT.maxKnockback, info.amount * IMPACT.knockbackPerDamage);
  const vel = world.get(target, Velocity);
  if (vel && world.has(target, Body) && info.angle !== undefined) {
    vel.x += dirX * knock;
    vel.y += Math.min(0, dirY * knock * 0.5) - (isPlayer ? 0 : 40);
  }
  health.lastHit = { vx: dirX * knock * 1.5, vy: dirY * knock * 1.5 - 60, zone: info.zone };

  const rig = world.get(target, Rig);
  if (rig && info.angle !== undefined) rig.animator.flinch(info.zone, Math.sign(dirX || 1) * rig.animator.facing);

  // Interrupt enemies: no shooting/running/punching for a moment.
  const brain = world.get(target, Brain);
  if (brain) {
    brain.alert = AI.memory;
    brain.staggerLeft = IMPACT.stagger + (info.zone === 'head' ? IMPACT.headshotStagger : 0);
    brain.windupLeft = 0;
    brain.crouching = false;
    if (info.from) brain.lastSeen = { ...info.from };
  }

  if (isPlayer) health.invulnLeft = IMPACT.playerIFrames;

  if (info.by === 'player' && !isPlayer && killed) {
    ctx.stats.kills++;
    if (info.zone === 'head') ctx.stats.headshots++;
  }
  if (info.by === 'player') {
    ctx.feedback.hitMarker = 0.15;
    ctx.feedback.hitHead = info.zone === 'head';
    ctx.feedback.hitKill = killed;
    const focus = world.first(Focus)?.[1];
    if (focus) {
      const gain = killed ? (info.zone === 'head' ? FOCUS.perHeadshotKill : FOCUS.perKill) : info.zone === 'head' ? FOCUS.perHeadshot : 0;
      focus.value = Math.min(1, focus.value + gain);
    }
  }
  return killed ? 'killed' : 'hit';
}
