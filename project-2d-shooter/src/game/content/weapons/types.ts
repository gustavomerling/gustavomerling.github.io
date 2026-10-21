export type WeaponClass = 'pistol' | 'smg' | 'rifle' | 'shotgun';
export type FireMode = 'semi' | 'burst' | 'auto';

/** Numbers an attachment can modify. */
export interface WeaponStats {
  /** Damage per projectile. */
  damage: number;
  /** Shots per second. */
  fireRate: number;
  magazine: number;
  /** Seconds. */
  reloadTime: number;
  /** Half-angle of random spread, degrees. */
  spreadDeg: number;
  /** Pixels per second. */
  projectileSpeed: number;
  /** Max travel distance, pixels. */
  range: number;
  /** Projectiles per shot (shotguns fan them across the spread). */
  pellets: number;
  /** Camera kick / spread bloom per shot, 0..1. */
  recoil: number;
  /** Radius (px) in which enemies hear the shot. */
  noise: number;
  /**
   * Bullet power for going through bodies: each body part crossed costs some
   * (see BALLISTICS.partCost). Whatever is left carries on, weaker; at 0 it drops.
   */
  penetration: number;
}

/**
 * Gameplay-changing flags. Stats tweak numbers; behaviours change *how* the gun plays.
 * Each one is implemented once in the weapon/projectile systems.
 */
export type WeaponBehavior =
  | 'silenced' // enemies outside a small radius don't hear it
  | 'laserSight' // visible aim line, reveals intent to enemies
  | 'ricochet' // bullets bounce off walls once
  | 'pierce' // armour piercing: extra penetration (see the ap-rounds modifiers)
  | 'knockback'; // pushes enemies

export type AttachmentSlot = 'muzzle' | 'underbarrel' | 'magazine' | 'ammo' | 'conversion';

export interface WeaponDef {
  readonly id: string;
  readonly name: string;
  /** In-world joke line (inventory tooltip). */
  readonly flavor: string;
  readonly weaponClass: WeaponClass;
  /** Art and hold (gun model registry id, see models.ts). */
  readonly model: string;
  readonly fireMode: FireMode;
  /** Shots per trigger pull in burst mode. */
  readonly burstCount?: number;
  readonly stats: WeaponStats;
  readonly slots: readonly AttachmentSlot[];
}
