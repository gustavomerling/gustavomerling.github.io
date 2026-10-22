import type { Entity, World } from '@engine/ecs/world';
import { prefs, type Settings } from '../prefs';
import { Body, Fencer, PlayerControl, Position } from '../world/components';
import type { DamageInfo, DamageResult } from './damage';
import { spawnGuardBreakFx, spawnHeadshotPop } from './effects';

/**
 * Game feel: camera shake and hit-stop. Purely presentational state, one per world (run).
 *
 * - Shake is a render-only offset (camera.offsetX/Y, set by systems/camera.ts): aim and every
 *   gameplay read of the camera ignore it.
 * - Hit-stop briefly scales the step's dt down (systems/time.ts). It counts real seconds and is
 *   driven only by gameplay events, so a replay with the same input stays identical.
 * Neither touches the gameplay RNG. Switches: `settings.shake` / `settings.hitstop` (prefs.ts).
 */
export const JUICE = {
  /** Shake: max offset (world px) at trauma 1, trauma lost per real second, wobble speed (rad/s). */
  shakeMax: 5,
  shakeDecay: 3.2,
  shakeFreq: 55,
  /** Trauma per event. */
  shakeHeavyShot: 0.22,
  shakePlayerHurt: 0.45,
  shakeBurst: 0.6,
  shakeParry: 0.25,
  shakeGuardBreak: 0.4,
  /** Hit-stop lengths (real seconds) and how much time still passes during one. */
  stopMeleeHit: 0.05,
  /** Trauma when a melee blow involving the player connects. */
  shakeMeleeHit: 0.12,
  stopKill: 0.04,
  stopParry: 0.09,
  stopGuardBreak: 0.1,
  stopScale: 0.05,
  /** No new hit-stop this long after one ends (automatic fire must not stutter). */
  stopCooldown: 0.15,
} as const;

export interface JuiceState {
  /** 0..1, squared into the offset. */
  trauma: number;
  /** Direction of the last kick (radians); the shake leans along it. */
  dir: number;
  /** Real seconds left of hit-stop, and the cooldown after it. */
  stop: number;
  cooldown: number;
  /** Real seconds accumulated (shake wobble phase). */
  t: number;
}

const states = new WeakMap<World, JuiceState>();

export function juiceOf(world: World): JuiceState {
  let s = states.get(world);
  if (!s) {
    s = { trauma: 0, dir: 0, stop: 0, cooldown: 0, t: 0 };
    states.set(world, s);
  }
  return s;
}

/** A settings switch (true when storage is unavailable). */
export function fxSetting(key: keyof Pick<Settings, 'shake' | 'particles' | 'hitstop'>): boolean {
  try {
    return prefs().get().settings?.[key] !== false;
  } catch {
    return true;
  }
}

/** Kick the camera: `amount` of trauma (0..1) leaning along `angle` (radians, the push direction). */
export function addShake(world: World, amount: number, angle?: number): void {
  if (!fxSetting('shake')) return;
  const s = juiceOf(world);
  s.trauma = Math.min(1, s.trauma + amount);
  if (angle !== undefined) s.dir = angle;
}

/** Freeze the action for `seconds` of real time (the longer one wins; ignored right after another). */
export function hitStop(world: World, seconds: number): void {
  if (!fxSetting('hitstop')) return;
  const s = juiceOf(world);
  if (s.cooldown > 0 && s.stop <= 0) return;
  s.stop = Math.max(s.stop, seconds);
}

/** Advances shake/hit-stop by real time. Returns the dt multiplier for this step (1 = no hit-stop). */
export function tickJuice(world: World, realDt: number): number {
  const s = juiceOf(world);
  s.t += realDt;
  s.trauma = Math.max(0, s.trauma - JUICE.shakeDecay * realDt);
  if (s.stop > 0) {
    s.stop -= realDt;
    if (s.stop <= 0) s.cooldown = JUICE.stopCooldown;
    return JUICE.stopScale;
  }
  s.cooldown = Math.max(0, s.cooldown - realDt);
  return 1;
}

/** Render offset of the shake (world px). Deterministic wobble, no RNG. */
export function shakeOffset(world: World): { x: number; y: number } {
  const s = juiceOf(world);
  if (s.trauma <= 0) return { x: 0, y: 0 };
  const mag = s.trauma * s.trauma * JUICE.shakeMax;
  const w = s.t * JUICE.shakeFreq;
  // Mostly along the kick, a little across it.
  const along = Math.sin(w) * mag;
  const across = Math.sin(w * 1.37 + 1.1) * mag * 0.35;
  const c = Math.cos(s.dir);
  const n = Math.sin(s.dir);
  return { x: c * along - n * across, y: n * along + c * across };
}

/** True when (x, y) is at the player's hands (their own shots shake the camera). */
export function nearPlayer(world: World, x: number, y: number, radius = 22): boolean {
  const row = world.first(PlayerControl, Position, Body);
  if (!row) return false;
  const [, , pos, body] = row;
  return Math.hypot(pos.x + body.w / 2 - x, pos.y + body.h / 2 - y) <= radius;
}

/**
 * Feedback for every damage outcome (called by applyDamage). Visual only: shakes, hit-stops and
 * the bursts that need the outcome (headshot pop, guard break).
 */
export function damageJuice(world: World, target: Entity, info: DamageInfo, result: DamageResult, toPlayer: boolean): void {
  const involvesPlayer = toPlayer || info.by === 'player';
  if (result === 'parried' || result === 'blocked') {
    const fencer = world.get(target, Fencer);
    const broken = result === 'blocked' && fencer?.phase === 'stunned' && fencer.stamina <= 0;
    if (broken) {
      spawnGuardBreakFx(world, info.at.x, info.at.y);
      if (involvesPlayer) {
        hitStop(world, JUICE.stopGuardBreak);
        addShake(world, JUICE.shakeGuardBreak, info.angle);
      }
    } else if (result === 'parried' && involvesPlayer) {
      hitStop(world, JUICE.stopParry);
      addShake(world, JUICE.shakeParry, info.angle);
    }
    return;
  }
  if (result !== 'hit' && result !== 'killed') return;
  if (toPlayer) addShake(world, JUICE.shakePlayerHurt, info.angle);
  if (info.by === 'player' && info.zone === 'head') {
    const skeleton = world.has(target, Fencer);
    spawnHeadshotPop(world, info.at.x, info.at.y, info.angle ?? 0, result === 'killed', skeleton);
  }
  if (result === 'killed' && info.by === 'player') hitStop(world, JUICE.stopKill);
}

/** A melee blow involving the player connected (sword cut, kick): a short freeze and a nudge. */
export function meleeHitJuice(world: World, angle: number): void {
  hitStop(world, JUICE.stopMeleeHit);
  addShake(world, JUICE.shakeMeleeHit, angle);
}
