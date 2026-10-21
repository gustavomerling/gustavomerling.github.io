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

export type PlayerState =
  | 'idle'
  | 'run'
  | 'sprint'
  | 'crouch'
  | 'slide'
  /** Jump anticipation: a few frames crouching before leaving the ground. */
  | 'takeoff'
  | 'air'
  | 'wallSlide'
  /** Kicking off a wall (short, then 'air'). */
  | 'wallJump'
  /** Landing roll after a long fall. */
  | 'roll'
  | 'climb'
  | 'mantle'
  /** Legs destroyed: dragging the body along the floor. */
  | 'crawl';

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
  /** Wall contact grace: a wall jump still works this long after leaving the wall. */
  wallCoyoteLeft: number;
  /** Side of the last wall touched (-1 left, 1 right). */
  wallSide: -1 | 1;
  /** > 0 while the wall-jump kick animation plays. */
  wallKickLeft: number;
  /** > 0 during the jump anticipation; the jump launches when it runs out. */
  takeoffLeft: number;
  /** Jump released during the anticipation: launch a short hop. */
  takeoffCut: boolean;
  /** Highest feet Y since leaving the ground (fall height on landing). */
  fallTopY: number;
  wasGrounded: boolean;
  rollLeft: number;
  rollDir: 1 | -1;
  /** Kick in progress (seconds left) and cooldown. */
  kickLeft: number;
  kickCooldownLeft: number;
  mantleLeft: number;
  mantleTotal: number;
  mantleFromX: number;
  mantleFromY: number;
  mantleToX: number;
  mantleToY: number;
  /** World corner of the lip being climbed (hands plant there). */
  mantleLedgeX: number;
  mantleLedgeY: number;
  mantleDir: 1 | -1;
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
  /** Direct weapon slot (0-based), -1 = none. */
  select: number;
}
export const Intent = defineComponent<IntentData>('Intent');

export const emptyIntent = (): IntentData => ({ fireHeld: false, firePressed: false, reload: false, switchBy: 0, select: -1 });

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
  /** Penetration left (bodies cost some each; at 0 the bullet drops). */
  power: number;
  /** Entities already hit (a bullet passing through must not hit the same one twice). */
  hit: Set<number>;
  /** Where it was fired from. */
  origin: { x: number; y: number };
  /** Shared by the pellets of one trigger pull, for accuracy (counted once). */
  shot?: { hit: boolean };
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
  /** Legs destroyed: the body is low and it can only drag itself towards the target. */
  downed: boolean;
  /** Patrol: seconds left standing still before walking again. */
  idleLeft: number;
}
export const Brain = defineComponent<BrainData>('Brain');

/** Skeletal body, animated procedurally and drawn instead of the collider. Driven by the rig system. */
export const Rig = defineComponent<{ animator: HumanoidAnimator; style: RigStyle }>('Rig');

/** Dead body simulated with verlet physics. */
export const Ragdoll = defineComponent<{ body: VerletBody; props: HumanoidProportions; style: RigStyle; age: number }>('Ragdoll');

/**
 * Loose bits with simple physics: spent casings, dropped magazines. `shape` is a polygon
 * around (x, y) in world units; it bounces, then rests on the floor and fades out.
 */
export interface DebrisData {
  x: number;
  y: number;
  prevX: number;
  prevY: number;
  vx: number;
  vy: number;
  angle: number;
  prevAngle: number;
  spin: number;
  shape: readonly number[];
  color: string;
  age: number;
  life: number;
  resting: boolean;
}
export const Debris = defineComponent<DebrisData>('Debris');

/** Gunshot visuals: a muzzle flash (a few frames) or a smoke puff (rises, grows, fades). */
export interface FxData {
  kind: 'flash' | 'smoke' | 'spark' | 'dust';
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  size: number;
  age: number;
  life: number;
}
export const Fx = defineComponent<FxData>('Fx');

/** A gun lying in the world (dropped by a dead enemy or swapped out). `x, y` = its centre. */
export interface PickupData {
  weapon: AssembledWeapon;
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  spin: number;
  resting: boolean;
}
export const Pickup = defineComponent<PickupData>('Pickup');

/** Bullet hole on a wall (world point). Kept until the cap pushes the oldest out. */
export const Decal = defineComponent<{ x: number; y: number; r: number }>('Decal');

/** Bullet-time meter, 0..1. */
export const Focus = defineComponent<{ value: number }>('Focus');

export const CameraTarget = defineComponent<{ lookahead: number }>('CameraTarget');

