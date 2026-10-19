/** Virtual resolution: everything is drawn at this size and integer-upscaled (480x270 -> 1920x1080 at 4x). */
export const VIEW = { width: 480, height: 270 } as const;

/** Tile size in pixels. */
export const TILE = 16;

/** Player movement tuning (pixels, seconds). Tweak here, not in systems. */
export const PLAYER_TUNING = {
  width: 10,
  standHeight: 24,
  crouchHeight: 14,

  walkSpeed: 95,
  sprintSpeed: 155,
  crouchSpeed: 45,
  groundAccel: 1500,
  airAccel: 950,
  groundFriction: 1700,

  gravity: 980,
  maxFallSpeed: 430,
  jumpSpeed: 330,
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
} as const;

/** Damage multiplier and floating-number colour per body region (hit-tested on the rig bones). */
export const HIT_ZONES = {
  head: { multiplier: 2, color: '#ff4a4a' },
  torso: { multiplier: 1, color: '#ffffff' },
  arm: { multiplier: 0.75, color: '#c8c8c8' },
  leg: { multiplier: 0.6, color: '#9a9a9a' },
} as const;

export type HitZone = keyof typeof HIT_ZONES;

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
  /** Real-time freeze on headshot / kill. */
  headshotHitStop: 0.035,
  killHitStop: 0.06,
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

/** Drops and pickups. */
export const PICKUPS = {
  magnetRadius: 48,
  magnetSpeed: 260,
  /** Weapons need F within this distance. */
  interactRadius: 18,
  health: 20,
  /** Ammo pickup refills this many magazines of every gun you carry. */
  ammoMagazines: 1,
  /** Magazines in reserve when you get a gun. */
  startingReserveMagazines: 3,
  maxWeapons: 2,
  despawnSeconds: 30,
} as const;

/** Destructible props placed by room templates. */
export const PROPS = {
  crate: { hp: 30, w: 1, h: 1, color: '#b08850' },
  door: { hp: 70, w: 1, h: 3, color: '#8a6a4a' },
  barrel: { hp: 18, w: 1, h: 1, color: '#d94a3a', radius: 60, damage: 70 },
  lamp: { hp: 8, damage: 45 },
  extinguisher: { hp: 6, smokeRadius: 44, smokeSeconds: 7 },
} as const;

/** Bullet time ("E"). The player is slowed less than the world, so they feel fast. */
export const SLOWMO = {
  worldScale: 0.3,
  playerScale: 0.6,
  rampPerSecond: 6,
} as const;
