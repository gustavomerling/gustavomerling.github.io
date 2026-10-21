/**
 * The view is always `height` world units tall (4x at 1080p) and as wide as the window's aspect
 * ratio allows, never narrower than `width` (16:9 shows 480).
 */
export const VIEW = { width: 480, height: 270 } as const;

/** Tile size in world units. */
export const TILE = 16;

/** Player movement tuning (pixels, seconds). Tweak here, not in systems. */
export const PLAYER_TUNING = {
  width: 10,
  standHeight: 24,
  crouchHeight: 14,

  walkSpeed: 55,
  /** Horizontal speed steered in the air (without sprint): keeps jump distances independent of the walk. */
  airSpeed: 95,
  sprintSpeed: 155,
  crouchSpeed: 45,
  groundAccel: 1500,
  airAccel: 950,
  groundFriction: 1700,

  gravity: 980,
  maxFallSpeed: 430,
  jumpSpeed: 330,
  /** Jump anticipation (crouch before leaving the ground); 0 = instant jump. */
  takeoffTime: 0.05,
  /** Releasing jump early multiplies upward speed by this (variable jump height). */
  jumpCutMultiplier: 0.45,
  /** Grace period to still jump after walking off a ledge. */
  coyoteTime: 0.1,
  /** Jump pressed slightly before landing still counts. */
  jumpBuffer: 0.12,
  dropThroughTime: 0.22,

  slideSpeed: 235,
  slideDuration: 0.45,
  slideFriction: 260,
  slideCooldown: 0.3,
  /** Minimum horizontal speed to start a slide instead of crouching. */
  slideMinSpeed: 80,

  /** Vertical ladder speed. */
  climbSpeed: 60,
  /** While climbing, the body drifts to the ladder's centre line this fast. */
  climbSnapSpeed: 180,

  /** Wall jump: launch away from the wall with this vertical / horizontal speed. */
  wallJumpSpeed: 340,
  wallJumpSpeedX: 210,
  /** After a wall jump, air control is disabled this long so the impulse reads. */
  wallJumpLock: 0.16,
  /** Falling speed while pressing into a wall. */
  wallSlideSpeed: 110,
  /** A wall jump still works this long after losing wall contact. */
  wallCoyoteTime: 0.1,
  /** Walls this close (px) count as touched. */
  wallProbe: 3,
  /** Kick-off animation length. */
  wallKickTime: 0.24,

  /** Ledge mantle/vault: scripted pull-up duration and re-trigger cooldown. */
  mantleTime: 0.3,
  mantleCooldown: 0.18,

  /** Landing after falling more than this (px, feet to feet; 4 tiles) turns into a roll. */
  rollMinFall: 64,
  rollTime: 0.42,
  /** Minimum horizontal speed of the roll; it eases down to half of it. */
  rollSpeed: 130,
  rollFriction: 160,
} as const;

/** Player kick (Q): a front kick that shoves and staggers. */
export const KICK = {
  time: 0.32,
  /** Fraction of `time` when the foot lands. */
  hitAt: 0.35,
  cooldown: 0.45,
  damage: 12,
  knockback: 280,
  /** Reach in front of the body (px) and vertical tolerance around hip height. */
  reach: 18,
  height: 16,
} as const;

/** Damage multiplier per body region (hit-tested on the rig bones, see character/hitbox.ts). */
export const HIT_ZONES = {
  head: { multiplier: 3 },
  torso: { multiplier: 1 },
  arm: { multiplier: 0.75 },
  leg: { multiplier: 0.6 },
} as const;

export type HitZone = keyof typeof HIT_ZONES;

/** Bullets going through bodies. */
export const BALLISTICS = {
  /** Penetration spent crossing each body part (bone and meat). */
  partCost: { head: 0.55, torso: 0.5, arm: 0.2, leg: 0.3 },
  /** After crossing a body: damage and speed kept. */
  damageKept: 0.7,
  speedKept: 0.8,
  /** Headshots shove harder (knockback multiplier). */
  headshotKnock: 1.6,
} as const;

/** Bullets glancing off a wall: they bounce when the angle to the surface is below the limit. */
export const RICOCHET = {
  maxGrazeDeg: 45,
  /** Max bounces for regular bullets / with ricochet ammo (which also bounces at any angle). */
  bounces: 2,
  ricochetAmmoBounces: 4,
  /** Damage kept after each bounce. */
  damageKept: 0.75,
} as const;

/** Enemy behaviour tuning. */
export const AI = {
  /** Seconds of continuous sight before the first shot. */
  reactionTime: 0.45,
  /** Seconds an enemy stays alert after losing sight / hearing a shot. */
  memory: 3,
  /** Sees behind its back within this distance. */
  closeSense: 40,
  /** Aim tracking speed, radians per second (world time: slow-mo makes them sluggish). */
  turnRate: 5,
  aimErrorDeg: 4,
  burstShots: { min: 2, max: 4 },
  burstPause: { min: 0.6, max: 1.3 },
  /** Enemy bullets deal this fraction of the gun's damage. */
  damageScale: 0.5,
  melee: { range: 14, reach: 20, windup: 0.32, damage: 12, cooldown: 0.9, knockback: 220, jumpSpeed: 300 },
} as const;

/** Hit impact on the target. */
export const IMPACT = {
  /** Knockback speed (px/s) per point of damage, capped. */
  knockbackPerDamage: 9,
  maxKnockback: 260,
  /** Enemy can't shoot/run/punch for this long after a hit (+ extra on headshot). */
  stagger: 0.28,
  headshotStagger: 0.2,
  /** Player: invulnerability after taking damage, and from the start of a slide (dodge). */
  playerIFrames: 0.35,
  slideIFrames: 0.3,
} as const;

/** Bullet-time meter: drains while active, refilled by kills. */
export const FOCUS = {
  drainPerSecond: 0.22,
  regenPerSecond: 0.02,
  minToActivate: 0.15,
  perHeadshot: 0.05,
  perKill: 0.15,
  perHeadshotKill: 0.25,
} as const;

/** Bullet time ("E"). The player is slowed less than the world, so they feel fast. */
export const SLOWMO = {
  worldScale: 0.3,
  playerScale: 0.6,
  rampPerSecond: 6,
} as const;
