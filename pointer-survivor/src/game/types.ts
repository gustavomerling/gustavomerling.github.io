import type { World } from './engine/World'
import type { SpriteDef } from './sprites'

export interface Vec {
  x: number
  y: number
}

/** Every number the player/weapons read. Built fresh from base + shop + passives. */
export interface Stats {
  maxHp: number
  /** HP per second */
  regen: number
  /** px per second */
  moveSpeed: number
  /** damage multiplier */
  damage: number
  /** cooldown multiplier (lower = faster) */
  cooldown: number
  /** projectile speed multiplier */
  projectileSpeed: number
  /** area/size multiplier */
  area: number
  /** pickup attraction radius in px */
  magnet: number
  /** flat damage reduction per hit */
  armor: number
  /** KB earned multiplier */
  greed: number
  /** extra projectiles/orbiters/blasts for weapons that fire several */
  amount: number
  /** XP gain multiplier */
  growth: number
  /** drop-chance multiplier for floppies and hearts */
  luck: number
  /** seconds of invulnerability after a hit */
  invuln: number
}

/** Anything that changes Stats by level: shop upgrades and in-run passive items share this. */
export interface StatModifierDef {
  id: string
  name: string
  icon: IconName
  maxLevel: number
  /** Short description of what one level does. */
  description: string
  apply(stats: Stats, level: number): void
}

export interface ShopUpgradeDef extends StatModifierDef {
  /** Cost to buy the next level (current level passed in). */
  cost(level: number): number
}

export type PassiveDef = StatModifierDef

// ---------- Enemies ----------

export interface Enemy {
  uid: number
  def: EnemyDef
  x: number
  y: number
  vx: number
  vy: number
  hp: number
  maxHp: number
  /** seconds left of white hit flash */
  flash: number
  age: number
  /** facing angle (radians) */
  angle: number
  /** free per-enemy scratch space for behaviors */
  data: Record<string, number>
}

export interface EnemyDef {
  id: string
  name: string
  /** One-line gameplay summary. */
  description: string
  /** Flavor text for the Monster Glossary. */
  lore?: string
  /**
   * 'active' enemies can spawn. 'concept' enemies only appear in the Monster Glossary,
   * so their look and stats can be designed before they enter the game.
   */
  status?: 'active' | 'concept'
  /** Glossary hint for where it shows up, e.g. "0:30+" or "Boss". */
  appears?: string
  radius: number
  hp: number
  /** px per second */
  speed: number
  /** contact damage per hit */
  damage: number
  xp: number
  /** 0..1, how much knockback is ignored */
  knockbackResist?: number
  /** Bosses get an HP bar, ignore Ctrl+Alt+Del and end the run when killed. */
  boss?: boolean
  /** Custom steering. Default: walk straight toward the player. */
  behavior?(e: Enemy, world: World, dt: number): void
  /** Called when it touches the player (after contact damage). */
  onTouch?(e: Enemy, world: World): void
  /** Called once when it dies. */
  onDeath?(e: Enemy, world: World): void
  /** Pixel-art look. Drawn centered, facing right, mirrored when moving left. */
  sprite?: SpriteDef
  /** Custom drawing; overrides `sprite` when present. */
  draw?(ctx: CanvasRenderingContext2D, e: Enemy, time: number): void
}

// ---------- Weapons ----------

export interface WeaponDef<S = unknown> {
  id: string
  name: string
  icon: IconName
  maxLevel: number
  description: string
  /** What the given level adds (shown on level-up cards). */
  levelText(level: number): string
  create(): S
  update(state: S, level: number, world: World, dt: number): void
  /** Optional world-space drawing (auras, orbiting things). Projectiles are drawn by the engine. */
  draw?(ctx: CanvasRenderingContext2D, state: S, level: number, world: World): void
}

export interface WeaponInstance {
  // the registry holds weapons with different state shapes
  def: WeaponDef<any>
  level: number
  state: unknown
}

export interface Projectile {
  x: number
  y: number
  vx: number
  vy: number
  radius: number
  damage: number
  /** how many extra enemies it can pass through */
  pierce: number
  /** seconds left */
  life: number
  hits: Set<number>
  color: string
  knockback: number
  /** optional: turn toward enemies inside a forward cone, in rad/s */
  homing?: number
}

/** Hostile bullet (boss attacks). Hurts the player on contact. */
export interface EnemyBullet {
  x: number
  y: number
  vx: number
  vy: number
  radius: number
  damage: number
  life: number
  color: string
  /** short text drawn on the bullet, e.g. "0E", "404" */
  glyph?: string
}

// ---------- Pickups / FX ----------

export type PickupKind = 'xp' | 'floppy' | 'heart'

export interface Pickup {
  kind: PickupKind
  x: number
  y: number
  value: number
  /** once true, flies to the player regardless of distance */
  magnetized: boolean
  age: number
}

export interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  maxLife: number
  color: string
  size: number
}

export interface FloatText {
  x: number
  y: number
  text: string
  life: number
  color: string
}

// ---------- Level-up ----------

export interface UpgradeOption {
  key: string
  title: string
  subtitle: string
  description: string
  icon: IconName
  apply(world: World): void
}

// ---------- Run / HUD ----------

export interface HudSnapshot {
  hp: number
  maxHp: number
  xp: number
  xpToNext: number
  level: number
  time: number
  kills: number
  floppies: number
  weapons: { id: string; name: string; icon: IconName; level: number }[]
  passives: { id: string; name: string; icon: IconName; level: number }[]
  /** seconds until the boss shows up; 0 once it has */
  bossIn: number
  /** 0..1 Ctrl+Alt+Del meter */
  taskCharge: number
}

export interface RunResult {
  mapId: string
  victory: boolean
  time: number
  kills: number
  level: number
  floppies: number
  earned: number
}

export type IconName =
  | 'cursor'
  | 'computer'
  | 'controlPanel'
  | 'help'
  | 'recycle'
  | 'floppy'
  | 'ram'
  | 'cpu'
  | 'clock'
  | 'mouse'
  | 'magnet'
  | 'shield'
  | 'heart'
  | 'scandisk'
  | 'license'
  | 'select'
  | 'folder'
  | 'fonts'
  | 'warning'
  | 'bug'
  | 'popup'
  | 'virus'
  | 'doubleClick'
  | 'rightClick'
  | 'dragDrop'
  | 'scroll'
  | 'monitors'
  | 'cache'
  | 'clover'
  | 'screensaver'
  | 'drive'
  | 'globe'
  | 'terminal'
  | 'lock'
  | 'taskManager'
  | 'notFound'
  | 'note'

// ---------- Discovery (glossary unlocks) ----------

export type DiscoveryKind = 'enemies' | 'weapons' | 'items'
