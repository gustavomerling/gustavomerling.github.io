import type { Entity, World } from '@engine/ecs/world';
import { clamp } from '@engine/math/math';
import type { Vec2 } from '@engine/math/vec2';
import {
  BLADE_LENGTH,
  bladeAngle,
  bladePose,
  FENCING_KITS,
  RIPOSTE_MULTIPLIER,
  type BladeKey,
  type FencePhase,
  type FencingKit,
  type SwingDef,
} from '../content/blades/kits';
import { Body, Brain, Faction, Fencer, Health, Intent, PlayerControl, Position, Rig, Velocity, type BodyData, type FencerData, type PlayerState } from '../world/components';
import { bodyCenter, shoulder } from '../world/geometry';
import type { RunContext, RunSystem } from './context';
import { applyDamage, type DamageInfo } from './damage';
import { spawnBlood, spawnShieldFx } from './effects';
import { meleeHitJuice } from './juice';
import { ENEMY } from '../render/palette';

/** Moves that need both hands: the fighter can't swing or block during them. */
const HANDS_BUSY: ReadonlySet<PlayerState> = new Set(['climb', 'mantle', 'roll']);
const SWINGING: ReadonlySet<FencePhase> = new Set(['windup', 'strike', 'recover']);
/** Pushed back when the cut hits a shield / gets parried (px/s). */
const BOUNCE = 70;
const PARRIED_PUSH = 140;

/**
 * Sword and shield, for anyone with a Fencer and an Intent (the player's mouse or the AI):
 * fire = attack, block = shield. One state machine per fighter:
 *
 *   ready -> windup -> strike -> recover -> ready      (attack; clicks during it chain the combo)
 *   ready <-> block                                    (hold; a hit right after raising it is parried)
 *   stunned (guard broken / parried) and hurt (took a hit) lock the fighter for a moment.
 *
 * Runs after the AI and before physics: it owns the lunge and locks the facing mid-swing.
 */
export const fencingSystem: RunSystem = {
  name: 'fencing',
  update(world, ctx) {
    for (const [e, , vel, body, fencer, intent, health] of world.query(Position, Velocity, Body, Fencer, Intent, Health)) {
      const dt = body.playerTime ? ctx.playerDt : ctx.clock.dt;
      if (dt <= 0) continue;
      const kit = FENCING_KITS.get(fencer.kitId);
      fencer.flash = Math.max(0, fencer.flash - dt);
      fencer.parryFlash = Math.max(0, fencer.parryFlash - dt);
      fencer.sinceBlocked += dt;
      if (fencer.phase !== 'block') fencer.downFor += dt;
      const pc = world.get(e, PlayerControl);
      const brain = world.get(e, Brain);
      if (health.hp <= 0 || (pc && HANDS_BUSY.has(pc.state))) {
        enter(fencer, 'ready');
        fencer.moveScale = 1;
        continue;
      }

      fencer.regenDelay = Math.max(0, fencer.regenDelay - dt);
      if (fencer.regenDelay <= 0) {
        const rate = kit.staminaRegen * (fencer.phase === 'block' ? 0.35 : 1);
        fencer.stamina = Math.min(kit.stamina, fencer.stamina + rate * dt);
      }
      fencer.comboLeft = Math.max(0, fencer.comboLeft - dt);
      fencer.t += dt;
      if (intent.firePressed && SWINGING.has(fencer.phase)) fencer.queued = true;

      const facing = pc?.facing ?? brain?.facing ?? fencer.facing;
      const done = fencer.duration > 0 && fencer.t >= fencer.duration;
      const p = fencer.duration > 0 ? clamp(fencer.t / fencer.duration, 0, 1) : 0;
      const swing = kit.swings[fencer.swing]!;
      const next = fencer.swing + 1 < kit.swings.length ? fencer.swing + 1 : -1;
      const wantsBlock = fencer.shield && intent.blockHeld;
      // Pulling back a wind-up (shield button): a feint. Without a shield it just lowers the blade.
      const cancels = intent.blockHeld && !fencer.queued && !swing.armor;

      switch (fencer.phase) {
        case 'ready':
          if (intent.firePressed) startSwing(fencer, kit, fencer.opener >= 0 ? fencer.opener : fencer.comboLeft > 0 && next >= 0 ? next : 0, facing);
          else if (wantsBlock) enter(fencer, 'block');
          break;
        case 'block':
          // Attacking drops the shield straight into a swing.
          if (intent.firePressed) startSwing(fencer, kit, fencer.opener >= 0 ? fencer.opener : 0, facing);
          else if (!wantsBlock) enter(fencer, 'ready');
          break;
        case 'windup':
          // Holding the shield during the wind-up cancels the attack (a feint).
          if (cancels) enter(fencer, wantsBlock ? 'block' : 'ready');
          else if (done) {
            enter(fencer, 'strike', swing.active);
            fencer.hit.clear();
          }
          break;
        case 'strike':
          if (body.onGround) vel.x = fencer.facing * swing.lunge * (1 - p);
          // Done: follow through. Stopped by a shield or a parry, cut() already moved it on.
          if (!cut(world, ctx, e, fencer, kit, swing, dt) && done && fencer.phase === 'strike') enter(fencer, 'recover', swing.recover);
          break;
        case 'recover':
          // Clicked again: the next cut of the combo starts as soon as the blade comes around.
          if (fencer.queued && next >= 0 && p >= 0.35) startSwing(fencer, kit, next, facing);
          else if (wantsBlock && p >= 0.5) enter(fencer, 'block');
          else if (done) {
            // Clicked during the finisher: a new combo starts right away.
            if (fencer.queued) startSwing(fencer, kit, 0, facing);
            else {
              fencer.comboLeft = next >= 0 ? kit.comboWindow : 0;
              enter(fencer, 'ready');
            }
          }
          break;
        case 'stunned':
        case 'hurt':
          if (done) enter(fencer, 'ready');
          break;
      }

      // Mid-swing the body keeps facing where the cut started.
      if (SWINGING.has(fencer.phase)) {
        if (pc) pc.facing = fencer.facing;
        if (brain) brain.facing = fencer.facing;
      } else {
        fencer.facing = facing;
      }
      fencer.moveScale =
        fencer.phase === 'block' ? kit.blockMoveScale : SWINGING.has(fencer.phase) ? kit.swingMoveScale : fencer.phase === 'ready' ? 1 : 0;
    }
  },
};

/** Switches phase; `duration` 0 = until something else changes it. */
export function enter(fencer: FencerData, phase: FencePhase, duration = 0): void {
  if (fencer.phase === 'block' && phase !== 'block') fencer.downFor = 0;
  // A raise parries only if the shield was down long enough before it (no parrying by mashing).
  if (phase === 'block' && fencer.phase !== 'block') fencer.parryOpen = fencer.downFor >= FENCING_KITS.get(fencer.kitId).parryRearm;
  fencer.phase = phase;
  fencer.t = 0;
  fencer.duration = duration;
  if (!SWINGING.has(phase)) fencer.queued = false;
}

function startSwing(fencer: FencerData, kit: FencingKit, index: number, facing: 1 | -1): void {
  const swing = kit.swings[index]!;
  fencer.swing = index;
  fencer.facing = facing;
  fencer.queued = false;
  fencer.comboLeft = 0;
  fencer.opener = -1;
  // Swinging spends the stamina the shield runs on: attacking non-stop leaves the guard weak.
  if (swing.staminaCost) {
    fencer.stamina = Math.max(0, fencer.stamina - swing.staminaCost);
    fencer.regenDelay = Math.max(fencer.regenDelay, kit.regenDelay * 0.5);
  }
  enter(fencer, 'windup', swing.windup);
}

/**
 * The shield's answer to a blow (applyDamage asks before any damage). Raised and facing the
 * blow: 'parried' if it went up just in time (free; the attacker reels), else 'blocked' for
 * stamina (amount x blockCost x guardDamage). Out of stamina the guard breaks: stunned.
 * null = the shield isn't in the way.
 */
export function guardAgainst(world: World, target: Entity, info: DamageInfo): 'blocked' | 'parried' | null {
  const fencer = world.get(target, Fencer);
  if (fencer?.phase !== 'block' || !fromFront(world, target, info)) return null;
  const kit = FENCING_KITS.get(fencer.kitId);
  fencer.flash = 0.18;
  if (fencer.parryOpen && fencer.t <= kit.parryWindow) {
    fencer.parryFlash = 0.4;
    return 'parried';
  }
  fencer.stamina -= info.amount * kit.blockCost * (info.guardDamage ?? 1);
  fencer.regenDelay = kit.regenDelay;
  fencer.sinceBlocked = 0;
  const vel = world.get(target, Velocity);
  if (vel && info.angle !== undefined) vel.x += Math.cos(info.angle) * (info.knockback ?? 80) * 0.4;
  if (fencer.stamina <= 0) {
    fencer.stamina = 0;
    enter(fencer, 'stunned', kit.guardBreakStun);
  }
  return 'blocked';
}

/** The blow comes from the side the target faces (where its shield points). */
function fromFront(world: World, target: Entity, info: DamageInfo): boolean {
  const body = world.get(target, Body);
  const pos = world.get(target, Position);
  if (!body || !pos) return false;
  const facing = world.get(target, PlayerControl)?.facing ?? world.get(target, Brain)?.facing ?? 1;
  const cx = pos.x + body.w / 2;
  const sourceX = info.from ? info.from.x : info.angle !== undefined ? cx - Math.cos(info.angle) : cx;
  return (sourceX - cx) * facing > -1;
}

/**
 * The swing can't be stopped by this hit: an armoured swing (wind-up or cut), or a committed one
 * (past kit.commitAt of the wind-up, or cutting) against a light hit.
 */
function armored(fencer: FencerData, heavy: boolean): boolean {
  if (fencer.phase !== 'windup' && fencer.phase !== 'strike') return false;
  const kit = FENCING_KITS.get(fencer.kitId);
  if (kit.swings[fencer.swing]?.armor) return true;
  if (heavy || kit.commitAt === undefined) return false;
  return fencer.phase === 'strike' || fencer.t >= fencer.duration * kit.commitAt;
}

/** Current blade pose of a fighter (what the rig draws and the cut tests). */
export function fencerPose(fencer: FencerData, at = fencer.t): BladeKey {
  const kit = FENCING_KITS.get(fencer.kitId);
  const p = fencer.duration > 0 ? clamp(at / fencer.duration, 0, 1) : 0;
  return bladePose(kit.swings[fencer.swing]!, fencer.phase, p);
}

/** The blade in world space: from the sword hand (placed by the pose) to the tip (at 90° to the forearm). */
export function bladeSegment(pos: Vec2, body: BodyData, scale: number, facing: 1 | -1, pose: BladeKey): { hand: Vec2; tip: Vec2 } {
  const from = shoulder(pos, body);
  const hand = { x: from.x + Math.cos(pose.angle) * facing * pose.reach * scale, y: from.y + Math.sin(pose.angle) * pose.reach * scale };
  const blade = bladeAngle(pose);
  const len = BLADE_LENGTH * scale;
  return { hand, tip: { x: hand.x + Math.cos(blade) * facing * len, y: hand.y + Math.sin(blade) * len } };
}

/**
 * Tests this step's sweep of the blade (where it is now, and the arcs the tip and the middle
 * travelled since the last step) against every enemy body. Returns true when the cut is
 * stopped: it hit a shield or was parried.
 */
function cut(world: World, ctx: RunContext, e: Entity, fencer: FencerData, kit: FencingKit, swing: SwingDef, dt: number): boolean {
  const pos = world.get(e, Position)!;
  const body = world.get(e, Body)!;
  const vel = world.get(e, Velocity)!;
  const team = world.get(e, Faction)?.team ?? 'enemy';
  const scale = world.get(e, Rig)?.animator.s ?? body.h / 24;
  const now = bladeSegment(pos, body, scale, fencer.facing, fencerPose(fencer));
  const before = bladeSegment(pos, body, scale, fencer.facing, fencerPose(fencer, Math.max(0, fencer.t - dt)));
  const mid = (s: { hand: Vec2; tip: Vec2 }) => ({ x: (s.hand.x + s.tip.x) / 2, y: (s.hand.y + s.tip.y) / 2 });
  const sweeps: [Vec2, Vec2][] = [
    [now.hand, now.tip],
    [before.tip, now.tip],
    [mid(before), mid(now)],
  ];
  const origin = bodyCenter(pos, body);

  for (const [t, tpos, tbody, health, faction] of world.query(Position, Body, Health, Faction)) {
    if (t === e || faction.team === team || health.hp <= 0 || fencer.hit.has(t)) continue;
    const box = { x: tpos.x - 1, y: tpos.y - 1, w: tbody.w + 2, h: tbody.h + 2 };
    const at = sweeps.map(([a, b]) => segmentHitsRect(a, b, box)).find((h) => h !== null);
    if (!at) continue;
    fencer.hit.add(t);

    const foe = world.get(t, Fencer);
    const riposte = foe?.phase === 'stunned';
    // A swing that won't be stopped (armoured / committed) barely gives ground either.
    const holds = foe !== undefined && armored(foe, swing.hitStun !== undefined);
    const angle = fencer.facing > 0 ? -0.25 : Math.PI + 0.25;
    const result = applyDamage(world, ctx, t, {
      amount: swing.damage * (riposte ? RIPOSTE_MULTIPLIER : 1),
      zone: 'torso',
      at,
      angle,
      from: origin,
      by: team,
      knockback: swing.knockback * (riposte ? 1.4 : holds ? 0.2 : 1),
      guardDamage: swing.guardDamage,
    });
    if (result === 'parried') {
      // Caught on the shield at the right moment: the attacker reels, wide open.
      spawnShieldFx(world, at.x, at.y, angle, true);
      enter(fencer, 'stunned', kit.parriedStun);
      vel.x = -fencer.facing * PARRIED_PUSH;
      return true;
    }
    if (result === 'blocked') {
      // The blade bounces off: a slow, open follow-through (the blocker's moment to counter).
      spawnShieldFx(world, at.x, at.y, angle, false);
      vel.x = -fencer.facing * BOUNCE;
      enter(fencer, 'recover', swing.recover * kit.blockedRecover);
      return true;
    }
    if (result === 'hit' || result === 'killed') {
      spawnBlood(world, at.x, at.y, angle, swing.damage * 0.5, false, foe ? ENEMY.skeleton.chips : undefined);
      if (team === 'player' || world.has(t, PlayerControl)) meleeHitJuice(world, angle);
      // Staggered, its swing or guard interrupted (unless mid armoured cut).
      if (foe && result === 'hit' && !holds) enter(foe, 'hurt', Math.max(FENCING_KITS.get(foe.kitId).hurtTime, swing.hitStun ?? 0));
    }
  }
  return false;
}

/** First point where segment a-b enters the rect (Liang-Barsky), or null. */
function segmentHitsRect(a: Vec2, b: Vec2, r: { x: number; y: number; w: number; h: number }): Vec2 | null {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  let t0 = 0;
  let t1 = 1;
  const clip = (p: number, q: number): boolean => {
    if (p === 0) return q >= 0;
    const t = q / p;
    if (p < 0) {
      if (t > t1) return false;
      if (t > t0) t0 = t;
    } else {
      if (t < t0) return false;
      if (t < t1) t1 = t;
    }
    return true;
  };
  if (clip(-dx, a.x - r.x) && clip(dx, r.x + r.w - a.x) && clip(-dy, a.y - r.y) && clip(dy, r.y + r.h - a.y)) {
    return { x: a.x + dx * t0, y: a.y + dy * t0 };
  }
  return null;
}
