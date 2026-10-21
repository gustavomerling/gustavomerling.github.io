import { defineComponent } from '@engine/ecs/world';
import type { VerletBody } from '@engine/physics/verlet';
import type { HumanoidAnimator } from '../character/animator';
import type { RigStyle } from '../character/draw';
import type { HumanoidProportions } from '../character/humanoid';
import type { HitZone } from '../config';
import type { AssembledWeapon } from '../content/weapons/assemble';
import type { WeaponBehavior } from '../content/weapons/types';

/**
 * Position in world units. For entities with a Body it is the top-left of the collider;
 * for points (projectiles) it is the point itself. `prev*` feed render interpolation.
 */
export const Position = defineComponent<{ x: number; y: number; prevX: number; prevY: number }>('Position');

export const Velocity = defineComponent<{ x: number; y: number }>('Velocity');

export interface BodyData {
  w: number;
  h: number;
  gravityScale: number;
  /** Horizontal slow-down on the ground, px/s² (0 = none; the player controller does its own). */
  groundFriction: number;
  /** Integrate with the player's clock (less affected by slow motion). */
  playerTime: boolean;
  onGround: boolean;
  onOneWay: boolean;
  /** Bumped into a wall during the last move. */
  hitWall: boolean;
  /** > 0 while falling through one-way platforms. */
  dropTimer: number;
  /** Hanging on a ladder: gravity is skipped and up/down drive velocity. */
  climbing: boolean;
  /** Scripted ledge pull-up: physics is paused while the movement system drives the position. */
  mantling: boolean;
}
export const Body = defineComponent<BodyData>('Body');

export type PlayerState = 'idle' | 'run' | 'sprint' | 'crouch' | 'slide' | 'air' | 'climb' | 'mantle';

export interface PlayerControlData {
  state: PlayerState;
  facing: 1 | -1;
  coyoteLeft: number;
  jumpBufferLeft: number;
  slideLeft: number;
  slideCooldownLeft: number;
  slideDir: 1 | -1;
  /** Crouch pressed in the air: keep momentum and slide on landing. */
  slideQueued: boolean;
  /** > 0: no air control (the wall jump impulse owns the horizontal velocity). */
  wallJumpLockLeft: number;
  /** Direction pushed by the last wall jump (away from the wall). */
  wallJumpDir: 1 | -1;
  mantleLeft: number;
  mantleTotal: number;
  mantleFromX: number;
  mantleFromY: number;
  mantleToX: number;
  mantleToY: number;
  mantleCooldownLeft: number;
}
export const PlayerControl = defineComponent<PlayerControlData>('PlayerControl');

/**
 * What a character wants to do this step. Filled by the player's input or by AI;
 * the weapon system only reads this, so it works the same for everyone.
 */
export interface IntentData {
  fireHeld: boolean;
  firePressed: boolean;
  reload: boolean;
  switchBy: number;
}
export const Intent = defineComponent<IntentData>('Intent');

export const emptyIntent = (): IntentData => ({ fireHeld: false, firePressed: false, reload: false, switchBy: 0 });

/** Where the entity aims, world units. */
export const Aim = defineComponent<{ x: number; y: number; angle: number }>('Aim');

export interface WeaponState {
  weapon: AssembledWeapon;
  ammo: number;
  /** Seconds until reload completes; 0 = not reloading. */
  reloadLeft: number;
  /** Seconds until the next shot is allowed. */
  cooldown: number;
  burstLeft: number;
  /** Extra spread from sustained fire, decays over time. */
  bloom: number;
  /** Spare rounds (Infinity = endless). Reloading takes from here. */
  reserve: number;
}

export interface ArsenalData {
  weapons: WeaponState[];
  active: number;
}
export const Arsenal = defineComponent<ArsenalData>('Arsenal');

export type Team = 'player' | 'enemy';
export const Faction = defineComponent<{ team: Team }>('Faction');

export interface HealthData {
  hp: number;
  max: number;
  /** > 0: damage is ignored (after a hit, during a dodge). */
  invulnLeft: number;
  /** Velocity and body region of the last hit (pushes the ragdoll on death). */
  lastHit: { vx: number; vy: number; zone: HitZone } | null;
}
export const Health = defineComponent<HealthData>('Health');

export interface ProjectileData {
  team: Team;
  damage: number;
  distanceLeft: number;
  behaviors: ReadonlySet<WeaponBehavior>;
  bouncesLeft: number;
  /** Ricochet ammo: bounces at any angle. */
  alwaysRicochet: boolean;
  piercesLeft: number;
  /** Entities already hit (pierce must not hit the same one twice). */
  hit: Set<number>;
  /** Where it was fired from. */
  origin: { x: number; y: number };
}
export const Projectile = defineComponent<ProjectileData>('Projectile');

/** Content id of an NPC (enemy registry). */
export const Npc = defineComponent<{ defId: string }>('Npc');

/** AI memory/state for an enemy. Behaviour lives in systems/ai.ts, keyed by the enemy's `brain`. */
export interface BrainData {
  facing: 1 | -1;
  /** Seconds of alertness left (> 0 = looks in every direction, chases last known position). */
  alert: number;
  /** Seconds the player has been continuously visible. */
  seeTime: number;
  lastSeen: { x: number; y: number } | null;
  burstLeft: number;
  pauseLeft: number;
  lastAmmo: number;
  /** Melee: > 0 while winding up a hit. */
  windupLeft: number;
  cooldownLeft: number;
  /** > 0 after being hit: no shooting, running or punching. */
  staggerLeft: number;
  /** Ducking behind cover (shooters, between bursts). */
  crouching: boolean;
  /** Patrol: seconds left standing still before walking again. */
  idleLeft: number;
}
export const Brain = defineComponent<BrainData>('Brain');

/** Skeletal body, animated procedurally and drawn instead of the collider. Driven by the rig system. */
export const Rig = defineComponent<{ animator: HumanoidAnimator; style: RigStyle }>('Rig');

/** Dead body simulated with verlet physics. */
export const Ragdoll = defineComponent<{ body: VerletBody; props: HumanoidProportions; style: RigStyle; age: number }>('Ragdoll');

/** Bullet-time meter, 0..1. */
export const Focus = defineComponent<{ value: number }>('Focus');

export const CameraTarget = defineComponent<{ lookahead: number }>('CameraTarget');

