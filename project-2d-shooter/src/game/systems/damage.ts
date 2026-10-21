import type { Entity, World } from '@engine/ecs/world';
import type { Vec2 } from '@engine/math/vec2';
import { AI, FOCUS, IMPACT, type HitZone } from '../config';
import { ENEMIES } from '../content/enemies/catalog';
import { Body, Brain, Focus, Guard, Health, Npc, PlayerControl, Position, Rig, Velocity, type Team } from '../world/components';
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

export type DamageResult = 'hit' | 'killed' | 'dodged' | 'blocked' | 'none';

/**
 * Single entry point for hurting anyone (bullets, melee). Applies damage and its consequences:
 * knockback, stagger, rig flinch, i-frames, hit marker, focus. Returns 'dodged' when
 * invulnerable, so a bullet can pass through a dodging player.
 */
export function applyDamage(world: World, ctx: RunContext, target: Entity, info: DamageInfo): DamageResult {
  const health = world.get(target, Health);
  if (!health || info.amount <= 0 || health.hp <= 0) return 'none';
  const isPlayer = world.has(target, PlayerControl);
  const npc = world.get(target, Npc);
  const def = npc ? ENEMIES.get(npc.defId) : null;
  const brain = world.get(target, Brain);

  if (health.invulnLeft > 0 || (isPlayer && ctx.debug.god)) return 'dodged';

  // Shields: a magic bubble blocks every direction; a raised shield blocks what comes from the front.
  const guard = world.get(target, Guard);
  if (guard) {
    guard.flash = Math.max(guard.flash, 0.18);
    if (guard.magicLeft > 0) return 'blocked';
    const body = world.get(target, Body);
    const pos = world.get(target, Position);
    if (guard.raised && body && pos) {
      const center = { x: pos.x + body.w / 2, y: pos.y + body.h / 2 };
      const facing = world.get(target, PlayerControl)?.facing ?? brain?.facing ?? 1;
      let source: Vec2 | null = info.from ? { ...info.from } : null;
      if (!source && info.angle !== undefined) source = { x: center.x - Math.cos(info.angle), y: center.y - Math.sin(info.angle) };
      if (source && (source.x - center.x) * facing > -1 && Math.abs(source.y - center.y) < body.h) return 'blocked';
    }
  }

  // Undead: only the head is lethal. Every other hit stops at the last point of health.
  if (def?.headshotOnly) health.hp = info.zone === 'head' ? 0 : Math.max(1, health.hp - info.amount);
  else health.hp -= info.amount;
  const killed = health.hp <= 0;

  // A leg hit takes the legs out: the collider drops to a crawling height and the AI drags on.
  if (def?.crawlsWhenLegShot && info.zone === 'leg' && !killed && brain && !brain.downed) {
    brain.downed = true;
    brain.windupLeft = 0;
    const body = world.get(target, Body);
    const pos = world.get(target, Position);
    if (body && pos) {
      const crawlH = Math.max(10, Math.round(def.size.h * 0.5));
      if (body.h > crawlH) {
        const delta = body.h - crawlH;
        pos.y += delta;
        pos.prevY += delta;
        body.h = crawlH;
      }
    }
  }

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
