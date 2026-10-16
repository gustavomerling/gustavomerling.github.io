import { playSfx, type SfxName } from '../audio'
import { arenaSize, TASK_MANAGER_KILLS, xpForLevel } from '../config'
import { ENEMY_BY_ID } from '../enemies'
import type { MapDef } from '../maps/types'
import { dist2, rand } from '../math'
import { computeStats } from '../stats'
import type {
  DiscoveryKind,
  Enemy,
  EnemyBullet,
  EnemyDef,
  FloatText,
  Particle,
  Pickup,
  Projectile,
  Stats,
  WeaponInstance,
} from '../types'
import { WEAPON_BY_ID } from '../weapons'

export interface Player {
  x: number
  y: number
  vx: number
  vy: number
  /** facing angle in radians; weapons aim with this */
  heading: number
  hp: number
  level: number
  xp: number
  xpToNext: number
  /** seconds of invulnerability left */
  iframes: number
  /** seconds of slowness left (Hourglass) */
  slowed: number
}

/** The Ctrl+Alt+Del overlay currently on screen. */
export interface TaskManagerFx {
  time: number
  /** boss processes can't be ended ("Access Denied") */
  processes: { name: string; boss: boolean }[]
}

/**
 * All mutable state of one run, plus the helpers weapons/enemies call.
 * No rendering or DOM here — Engine drives it, Renderer reads it.
 */
export class World {
  /** arena size in game units; see arenaSize() */
  width: number
  height: number
  time = 0
  kills = 0
  floppies = 0
  private nextUid = 1

  player: Player = {
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    heading: -Math.PI / 2,
    hp: 100,
    level: 1,
    xp: 0,
    xpToNext: xpForLevel(1),
    iframes: 0,
    slowed: 0,
  }

  stats: Stats
  enemies: Enemy[] = []
  projectiles: Projectile[] = []
  enemyBullets: EnemyBullet[] = []
  pickups: Pickup[] = []
  particles: Particle[] = []
  floatTexts: FloatText[] = []
  weapons: WeaponInstance[] = []
  passives = new Map<string, number>()
  /** level-ups earned but not chosen yet */
  pendingLevelUps = 0
  /** screen shake intensity */
  shake = 0

  boss: Enemy | null = null
  bossSpawned = false
  bossDefeated = false
  /** big centered banner (boss warning etc.) */
  banner: { text: string; sub: string; time: number } | null = null

  /** 0..1 Ctrl+Alt+Del meter */
  taskCharge = 0
  taskFx: TaskManagerFx | null = null

  /** set by the Engine; called the first time something is seen this save */
  onDiscover: (kind: DiscoveryKind, id: string) => void = () => {}
  private readonly seen = new Set<string>()

  readonly map: MapDef
  private readonly shop: Record<string, number>

  constructor(shop: Record<string, number>, map: MapDef, alreadyDiscovered: Iterable<string> = []) {
    this.shop = shop
    this.map = map
    for (const key of alreadyDiscovered) this.seen.add(key)
    const size = arenaSize(800, 500)
    this.width = size.width
    this.height = size.height
    this.player.x = this.width / 2
    this.player.y = this.height / 2
    this.stats = computeStats(shop, this.passives)
    this.player.hp = this.stats.maxHp
  }

  /** Marks something as seen; fires onDiscover only the first time. */
  discover(kind: DiscoveryKind, id: string) {
    const key = `${kind}:${id}`
    if (this.seen.has(key)) return
    this.seen.add(key)
    this.onDiscover(kind, id)
    if (this.time > 0.5) {
      this.floatTexts.push({ x: this.player.x, y: this.player.y - 22, text: 'New glossary entry!', color: '#ffe000', life: 1.4 })
      this.sfx('discover')
    }
  }

  // ---------- loadout ----------

  addWeapon(id: string) {
    const def = WEAPON_BY_ID[id]
    if (!def) return
    this.discover('weapons', id)
    const owned = this.weapons.find((w) => w.def.id === id)
    if (owned) owned.level = Math.min(def.maxLevel, owned.level + 1)
    else this.weapons.push({ def, level: 1, state: def.create() })
  }

  addPassive(id: string) {
    this.discover('items', id)
    this.passives.set(id, (this.passives.get(id) ?? 0) + 1)
    this.recomputeStats()
  }

  recomputeStats() {
    const oldMax = this.stats.maxHp
    this.stats = computeStats(this.shop, this.passives)
    // gaining max HP also heals that amount
    if (this.stats.maxHp > oldMax) this.player.hp += this.stats.maxHp - oldMax
    this.player.hp = Math.min(this.player.hp, this.stats.maxHp)
  }

  // ---------- spawning ----------

  spawnEnemy(def: EnemyDef, x: number, y: number, hpScale = 1): Enemy {
    const hp = def.hp * hpScale
    const e: Enemy = { uid: this.nextUid++, def, x, y, vx: 0, vy: 0, hp, maxHp: hp, flash: 0, age: 0, angle: 0, data: {} }
    this.enemies.push(e)
    this.discover('enemies', def.id)
    return e
  }

  /** Spawn by id around a point (minions, splits). */
  spawnAround(id: string, x: number, y: number, count: number, spread = 14, hpScale = 1) {
    const def = ENEMY_BY_ID[id]
    if (!def) return
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2 + rand(-0.3, 0.3)
      const e = this.spawnEnemy(def, x + Math.cos(a) * spread, y + Math.sin(a) * spread, hpScale)
      e.vx = Math.cos(a) * 80
      e.vy = Math.sin(a) * 80
    }
  }

  spawnBoss(def: EnemyDef, x: number, y: number) {
    this.boss = this.spawnEnemy(def, x, y)
    this.bossSpawned = true
    this.banner = { text: 'WARNING', sub: `${def.name} has appeared!`, time: 3 }
    this.shake = 8
    this.sfx('warning')
  }

  addProjectile(p: Projectile) {
    this.projectiles.push(p)
  }

  fireBullet(x: number, y: number, angle: number, speed: number, opts: Partial<EnemyBullet> = {}) {
    this.enemyBullets.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      radius: 5,
      damage: 10,
      life: 5,
      color: '#ffffff',
      ...opts,
    })
  }

  /** `count` bullets evenly around a point. */
  fireRing(x: number, y: number, count: number, speed: number, opts: Partial<EnemyBullet> = {}, offset = 0) {
    for (let i = 0; i < count; i++) this.fireBullet(x, y, offset + (i / count) * Math.PI * 2, speed, opts)
  }

  /** `count` bullets in a fan aimed at the player. */
  fireAimed(x: number, y: number, count: number, spread: number, speed: number, opts: Partial<EnemyBullet> = {}) {
    const base = Math.atan2(this.player.y - y, this.player.x - x)
    for (let i = 0; i < count; i++) {
      const a = base + (count === 1 ? 0 : (i / (count - 1) - 0.5) * spread)
      this.fireBullet(x, y, a, speed, opts)
    }
  }

  dropPickup(kind: Pickup['kind'], x: number, y: number, value: number) {
    this.pickups.push({ kind, x, y, value, magnetized: false, age: 0 })
  }

  burst(x: number, y: number, color: string, count = 6, speed = 80) {
    for (let i = 0; i < count; i++) {
      const a = rand(0, Math.PI * 2)
      const s = rand(speed * 0.3, speed)
      const life = rand(0.2, 0.5)
      this.particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life, maxLife: life, color, size: rand(1.5, 3) })
    }
  }

  floatText(x: number, y: number, text: string, color = '#ffffff') {
    this.floatTexts.push({ x, y, text, color, life: 0.6 })
  }

  sfx(name: SfxName) {
    playSfx(name)
  }

  // ---------- combat ----------

  /** Deal damage; (fromX, fromY) is where the hit came from, for knockback. */
  damageEnemy(e: Enemy, amount: number, fromX: number, fromY: number, knockback = 0) {
    if (e.hp <= 0) return
    e.hp -= amount
    e.flash = 0.08
    this.floatText(e.x, e.y - e.def.radius, String(Math.round(amount)))
    if (knockback > 0) {
      const dx = e.x - fromX
      const dy = e.y - fromY
      const d = Math.hypot(dx, dy) || 1
      const k = knockback * (1 - (e.def.knockbackResist ?? 0))
      e.vx += (dx / d) * k
      e.vy += (dy / d) * k
    }
    if (e.hp <= 0) this.killEnemy(e)
    else this.sfx('hit')
  }

  private killEnemy(e: Enemy) {
    this.kills++
    this.burst(e.x, e.y, '#ffffff', e.def.boss ? 60 : 8, e.def.boss ? 260 : 110)
    e.def.onDeath?.(e, this)
    if (e.def.boss) {
      this.bossDefeated = true
      this.shake = 12
      this.sfx('boom')
      return
    }
    if (!this.taskFx) this.taskCharge = Math.min(1, this.taskCharge + 1 / TASK_MANAGER_KILLS)
    this.dropPickup('xp', e.x, e.y, e.def.xp)
    const r = Math.random()
    const luck = this.stats.luck
    if (r < 0.015 * luck) this.dropPickup('floppy', e.x + 4, e.y, 1)
    else if (r < 0.022 * luck) this.dropPickup('heart', e.x + 4, e.y, 25)
    this.sfx('kill')
  }

  hurtPlayer(amount: number) {
    const p = this.player
    if (p.iframes > 0) return false
    const dmg = Math.max(1, amount - this.stats.armor)
    p.hp -= dmg
    p.iframes = this.stats.invuln
    this.shake = 4
    this.floatText(p.x, p.y - 12, `-${Math.round(dmg)}`, '#ff4040')
    this.sfx('hurt')
    return true
  }

  gainXp(amount: number) {
    const p = this.player
    p.xp += amount * this.stats.growth
    while (p.xp >= p.xpToNext) {
      p.xp -= p.xpToNext
      p.level++
      p.xpToNext = xpForLevel(p.level)
      this.pendingLevelUps++
    }
  }

  /** Ctrl+Alt+Del: ends every non-boss "process" on screen; bosses lose 10% HP. */
  useTaskManager(): boolean {
    if (this.taskCharge < 1 || this.taskFx) return false
    this.taskCharge = 0
    const counts = new Map<EnemyDef, number>()
    for (const e of this.enemies) counts.set(e.def, (counts.get(e.def) ?? 0) + 1)
    this.taskFx = {
      time: 0,
      processes: [...counts]
        // bosses first: they're the ones that refuse to close
        .sort(([a], [b]) => Number(!!b.boss) - Number(!!a.boss))
        .map(([def, c]) => ({
          name: `${def.name.toLowerCase().replace(/[^a-z0-9]/g, '')}.exe${c > 1 ? ` (${c})` : ''}`,
          boss: !!def.boss,
        })),
    }
    for (const e of [...this.enemies]) {
      if (e.def.boss) this.damageEnemy(e, e.maxHp * 0.1, this.player.x, this.player.y)
      else this.damageEnemy(e, e.hp + 1, this.player.x, this.player.y)
    }
    this.enemyBullets = []
    this.shake = 10
    this.sfx('taskManager')
    return true
  }

  nearestEnemy(x: number, y: number, maxDist = Infinity): Enemy | null {
    let best: Enemy | null = null
    let bestD = maxDist * maxDist
    for (const e of this.enemies) {
      if (e.hp <= 0) continue
      const d = dist2(x, y, e.x, e.y)
      if (d < bestD) {
        bestD = d
        best = e
      }
    }
    return best
  }
}
