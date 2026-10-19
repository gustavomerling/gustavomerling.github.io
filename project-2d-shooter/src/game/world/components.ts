import { defineComponent } from '@engine/ecs/world';
import type { HitZone } from '../config';
import type { HumanoidAnimator } from '../character/animator';
import type { RigStyle } from '../character/draw';
import type { HumanoidProportions } from '../character/humanoid';
import type { VerletBody } from '@engine/physics/verlet';
import type { AssembledWeapon } from '../content/weapons/assemble';
import type { WeaponBehavior } from '../content/weapons/types';

/**
 * Position in world pixels. For entities with a Body it is the top-left of the collider;
 * for points (projectiles, effects) it is the point itself. `prev*` feed render interpolation.
 */
export const Position = defineComponent<{ x: number; y: number; prevX: number; prevY: number }>('Position');

export const Velocity = defineComponent<{ x: number; y: number }>('Velocity');

export interface BodyData {
  w: number;
  h: number;
  gravityScale: number;
  /** 0 = stop on impact, 0.4 = bouncy grenade. */
  bounce: number;
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
}
export const Body = defineComponent<BodyData>('Body');

export type PlayerState = 'idle' | 'run' | 'sprint' | 'crouch' | 'slide' | 'air';

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
}
export const PlayerControl = defineComponent<PlayerControlData>('PlayerControl');

/**
 * What a character wants to do this step. Filled by the player's input or by AI;
 * weapon/item systems only read this, so they work the same for everyone.
 */
export interface IntentData {
  fireHeld: boolean;
  firePressed: boolean;
  reload: boolean;
  switchBy: number;
  throwPressed: boolean;
  nextItem: boolean;
}
export const Intent = defineComponent<IntentData>('Intent');

export const emptyIntent = (): IntentData => ({
  fireHeld: false,
  firePressed: false,
  reload: false,
  switchBy: 0,
  throwPressed: false,
  nextItem: false,
});

/** Where the entity aims, world pixels. */
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
  /** Spare rounds (Infinity for enemies). Reloading takes from here. */
  reserve: number;
}

export interface ArsenalData {
  weapons: WeaponState[];
  active: number;
  items: { itemId: string; count: number }[];
  activeItem: number;
}
export const Arsenal = defineComponent<ArsenalData>('Arsenal');

/** 
eutral = props (lamps, extinguishers): anyone's bullets hit them. */
export type Team = 'player' | 'enemy' | 'neutral';
export const Faction = defineComponent<{ team: Team }>('Faction');

export interface HealthData {
  hp: number;
  max: number;
  stunLeft: number;
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
  /** Where it was fired from (damage direction indicator). */
  origin: { x: number; y: number };
}
export const Projectile = defineComponent<ProjectileData>('Projectile');

/** A thrown item (grenade/flashbang) ticking down. */
export const Thrown = defineComponent<{ itemId: string; fuseLeft: number }>('Thrown');

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

/** Short-lived visual effect. `text` = floating damage number; `intensity` scales flashes. */
export const Effect = defineComponent<{
  kind: 'ring' | 'flash' | 'text';
  life: number;
  maxLife: number;
  radius: number;
  color: string;
  text?: string;
  intensity?: number;
}>('Effect');

/** Wireframe look until sprites exist; the render system only knows about this. */
export type VisualData =
  | { kind: 'box'; color: string; fill?: string }
  | { kind: 'dot'; color: string; size: number }
  | { kind: 'trail'; color: string; length: number };
export const Visual = defineComponent<VisualData>('Visual');

/** The player's money. */
export const Wallet = defineComponent<{ money: number }>('Wallet');

/** Bullet-time meter, 0..1. */
export const Focus = defineComponent<{ value: number }>('Focus');

export type PickupKind = 'health' | 'money' | 'ammo' | 'weapon';
/** Something on the floor to collect. Weapons need F; the rest is magnetised. */
export const Pickup = defineComponent<{ kind: PickupKind; amount: number; weapon?: WeaponState; age: number }>('Pickup');

export type BreakableKind = 'crate' | 'door' | 'barrel';
/** Destructible prop occupying Breakable tiles (blocks movement, bullets and sight until broken). */
export const Breakable = defineComponent<{ kind: BreakableKind; tiles: number[]; w: number; h: number }>('Breakable');

export type HazardKind = 'lamp' | 'extinguisher';
/** Non-blocking prop that reacts to being shot (falls / releases smoke). */
export const Hazard = defineComponent<{ kind: HazardKind; triggered: boolean }>('Hazard');

/** Cloud that blocks enemy line of sight. */
export const Smoke = defineComponent<{ radius: number; life: number }>('Smoke');

/** Dead body simulated with verlet physics. */
export const Ragdoll = defineComponent<{ body: VerletBody; props: HumanoidProportions; style: RigStyle; age: number }>('Ragdoll');

export const CameraTarget = defineComponent<{ lookahead: number }>('CameraTarget');

/** Skeletal body (drawn instead of the collider box). Driven by the rig system. */
export const Rig = defineComponent<{ animator: HumanoidAnimator; style: RigStyle }>('Rig');
