import { arenaSize, PLAYER_RADIUS, runEarnings, TASK_FX_TIME } from '../config'
import type { MapDef } from '../maps/types'
import { angleDiff, clamp, dist2, rotateToward } from '../math'
import type { DiscoveryKind, HudSnapshot, Projectile, RunResult, UpgradeOption } from '../types'
import { STARTING_WEAPON } from '../weapons'
import { PASSIVE_BY_ID } from '../items/passives'
import { Input } from './input'
import { buildChoices } from './levelUp'
import { renderWorld } from './renderer'
import { Spawner } from './spawner'
import { World } from './World'

export interface EngineEvents {
  onHud(hud: HudSnapshot): void
  onLevelUp(choices: UpgradeOption[]): void
  onEnd(result: RunResult): void
  /** first time an enemy/weapon/item is seen on this save */
  onDiscover(kind: DiscoveryKind, id: string): void
  onBoss(): void
}

/** Seconds between killing the boss and the victory dialog (lets the explosion play). */
const VICTORY_DELAY = 1.6
/** Hourglass slow: speed multiplier while slowed. */
const SLOW_FACTOR = 0.55

const HUD_INTERVAL = 0.1
/** How fast the heading turns toward the movement direction (rad/s). */
const TURN_RATE = 14
/** Homing projectiles only see enemies within this half-angle and range. */
const HOMING_CONE = 0.6
const HOMING_RANGE = 220

/** Owns the loop: input -> update World -> render. React only talks to it through EngineEvents. */
export class Engine {
  readonly world: World
  private readonly input: Input
  private readonly spawner = new Spawner()
  private readonly ctx: CanvasRenderingContext2D
  private raf = 0
  private last = 0
  private hudTimer = 0
  private paused = false
  private choosing = false
  private ended = false
  private scale = 1
  private victoryTimer = -1
  private readonly canvas: HTMLCanvasElement
  private readonly events: EngineEvents

  /** `discovered` = keys like "enemies:bug" already in the save (so they don't re-fire). */
  constructor(
    canvas: HTMLCanvasElement,
    shop: Record<string, number>,
    map: MapDef,
    discovered: Iterable<string>,
    events: EngineEvents,
  ) {
    this.canvas = canvas
    this.events = events
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas 2D not supported')
    this.ctx = ctx
    this.world = new World(shop, map, discovered)
    this.world.onDiscover = (kind, id) => events.onDiscover(kind, id)
    this.world.addWeapon(STARTING_WEAPON)
    this.input = new Input(canvas, this.world)
  }

  start() {
    this.last = performance.now()
    this.raf = requestAnimationFrame(this.frame)
  }

  dispose() {
    cancelAnimationFrame(this.raf)
    this.input.dispose()
  }

  /** Reshape the arena to the CSS box and scale the canvas to fill it. */
  resize(cssW: number, cssH: number) {
    const w = this.world
    const size = arenaSize(cssW, cssH)
    // keep everything at the same relative spot when the window changes shape
    const sx = size.width / w.width
    const sy = size.height / w.height
    if (sx !== 1 || sy !== 1) {
      for (const o of [w.player, ...w.enemies, ...w.pickups]) {
        o.x *= sx
        o.y *= sy
      }
      w.width = size.width
      w.height = size.height
    }
    this.scale = Math.max(0.1, Math.min(cssW / w.width, cssH / w.height))
    const dpr = window.devicePixelRatio || 1
    this.canvas.style.width = `${Math.floor(w.width * this.scale)}px`
    this.canvas.style.height = `${Math.floor(w.height * this.scale)}px`
    this.canvas.width = Math.floor(w.width * this.scale * dpr)
    this.canvas.height = Math.floor(w.height * this.scale * dpr)
    this.render()
  }

  setPaused(paused: boolean) {
    this.paused = paused
    this.last = performance.now()
  }

  /** Give up the current run; still pays out KB like a death. */
  forfeit() {
    this.end(false)
  }

  /** Ctrl+Alt+Del, if the meter is full. */
  triggerTaskManager() {
    if (this.paused || this.choosing || this.ended) return
    if (this.world.useTaskManager()) this.emitHud()
  }

  isPaused() {
    return this.paused || this.choosing
  }

  choose(option: UpgradeOption) {
    option.apply(this.world)
    this.world.pendingLevelUps--
    this.world.sfx('click')
    if (this.world.pendingLevelUps > 0) {
      this.events.onLevelUp(buildChoices(this.world))
    } else {
      this.choosing = false
      this.last = performance.now()
    }
    this.emitHud()
  }

  private frame = (now: number) => {
    const dt = Math.min(0.05, (now - this.last) / 1000)
    this.last = now
    if (!this.paused && !this.choosing && !this.ended) this.update(dt)
    this.render()
    this.raf = requestAnimationFrame(this.frame)
  }

  private render() {
    const dpr = window.devicePixelRatio || 1
    const s = this.scale * dpr
    this.ctx.setTransform(s, 0, 0, s, 0, 0)
    this.ctx.imageSmoothingEnabled = false
    renderWorld(this.ctx, this.world, this.input.target)
  }

  private update(dt: number) {
    const w = this.world
    w.time += dt

    this.updatePlayer(dt)
    const hadBoss = w.bossSpawned
    this.spawner.update(w, dt)
    if (!hadBoss && w.bossSpawned) this.events.onBoss()
    for (const weapon of w.weapons) weapon.def.update(weapon.state, weapon.level, w, dt)
    this.updateEnemies(dt)
    this.updateProjectiles(dt)
    this.updateEnemyBullets(dt)
    w.enemies = w.enemies.filter((e) => e.hp > 0)
    this.updatePickups(dt)
    this.updateFx(dt)

    this.hudTimer -= dt
    if (this.hudTimer <= 0) {
      this.hudTimer = HUD_INTERVAL
      this.emitHud()
    }

    if (w.player.hp <= 0) return this.end(false)
    if (w.bossDefeated) {
      if (this.victoryTimer < 0) {
        this.victoryTimer = VICTORY_DELAY
        // clear the field so the last seconds are a victory lap
        for (const e of w.enemies) w.damageEnemy(e, e.hp + 1, e.x, e.y)
        w.enemyBullets = []
      }
      this.victoryTimer -= dt
      if (this.victoryTimer <= 0) return this.end(true)
      return
    }

    if (w.pendingLevelUps > 0) {
      this.choosing = true
      w.sfx('levelUp')
      this.emitHud()
      this.events.onLevelUp(buildChoices(w))
    }
  }

  private updatePlayer(dt: number) {
    const w = this.world
    const p = w.player
    p.slowed = Math.max(0, p.slowed - dt)
    const speed = w.stats.moveSpeed * (p.slowed > 0 ? SLOW_FACTOR : 1)
    let tx = 0
    let ty = 0
    const keys = this.input.keyDirection()
    if (keys) {
      tx = keys.x * speed
      ty = keys.y * speed
      // keyboard takes over until the mouse moves again
      this.input.target = null
    } else if (this.input.target) {
      const dx = this.input.target.x - p.x
      const dy = this.input.target.y - p.y
      const d = Math.hypot(dx, dy)
      if (d > 1.5) {
        // arrive smoothly instead of overshooting
        const s = Math.min(speed, d * 12)
        tx = (dx / d) * s
        ty = (dy / d) * s
      }
    }
    const k = 1 - Math.exp(-dt * 22)
    p.vx += (tx - p.vx) * k
    p.vy += (ty - p.vy) * k
    p.x = clamp(p.x + p.vx * dt, PLAYER_RADIUS, w.width - PLAYER_RADIUS)
    p.y = clamp(p.y + p.vy * dt, PLAYER_RADIUS, w.height - PLAYER_RADIUS)

    // the pointer faces where it's being dragged
    if (Math.hypot(p.vx, p.vy) > 25) {
      p.heading = rotateToward(p.heading, Math.atan2(p.vy, p.vx), TURN_RATE * dt)
    }

    p.iframes = Math.max(0, p.iframes - dt)
    p.hp = Math.min(w.stats.maxHp, p.hp + w.stats.regen * dt)
  }

  private updateEnemies(dt: number) {
    const w = this.world
    const p = w.player
    const list = w.enemies
    const steer = Math.min(1, dt * 4)
    for (const e of list) {
      e.age += dt
      e.flash = Math.max(0, e.flash - dt)
      if (e.def.behavior) {
        e.def.behavior(e, w, dt)
      } else {
        const dx = p.x - e.x
        const dy = p.y - e.y
        const d = Math.hypot(dx, dy) || 1
        e.vx += ((dx / d) * e.def.speed - e.vx) * steer
        e.vy += ((dy / d) * e.def.speed - e.vy) * steer
      }
      e.x += e.vx * dt
      e.y += e.vy * dt
      if (e.vx !== 0 || e.vy !== 0) e.angle = Math.atan2(e.vy, e.vx)

      const r = e.def.radius + PLAYER_RADIUS
      if (dist2(e.x, e.y, p.x, p.y) < r * r && w.hurtPlayer(e.def.damage)) e.def.onTouch?.(e, w)
    }

    // soft separation so swarms don't stack into one blob
    for (let i = 0; i < list.length; i++) {
      const a = list[i]
      for (let j = i + 1; j < list.length; j++) {
        const b = list[j]
        const dx = b.x - a.x
        const dy = b.y - a.y
        const min = a.def.radius + b.def.radius
        const d2 = dx * dx + dy * dy
        if (d2 >= min * min || d2 === 0) continue
        const d = Math.sqrt(d2)
        const push = ((min - d) / d) * 0.5
        a.x -= dx * push
        a.y -= dy * push
        b.x += dx * push
        b.y += dy * push
      }
    }
  }

  private updateProjectiles(dt: number) {
    const w = this.world
    const margin = 20
    w.projectiles = w.projectiles.filter((pr) => {
      if (pr.homing) this.steerProjectile(pr, dt)
      pr.x += pr.vx * dt
      pr.y += pr.vy * dt
      pr.life -= dt
      if (pr.life <= 0 || pr.x < -margin || pr.y < -margin || pr.x > w.width + margin || pr.y > w.height + margin) {
        return false
      }
      for (const e of w.enemies) {
        if (e.hp <= 0 || pr.hits.has(e.uid)) continue
        const r = pr.radius + e.def.radius
        if (dist2(pr.x, pr.y, e.x, e.y) > r * r) continue
        pr.hits.add(e.uid)
        w.damageEnemy(e, pr.damage, pr.x - pr.vx, pr.y - pr.vy, pr.knockback)
        w.burst(pr.x, pr.y, '#000080', 3, 60)
        pr.pierce--
        if (pr.pierce < 0) return false
      }
      return true
    })
  }

  private updateEnemyBullets(dt: number) {
    const w = this.world
    const p = w.player
    const margin = 40
    w.enemyBullets = w.enemyBullets.filter((b) => {
      b.x += b.vx * dt
      b.y += b.vy * dt
      b.life -= dt
      if (b.life <= 0 || b.x < -margin || b.y < -margin || b.x > w.width + margin || b.y > w.height + margin) return false
      const r = b.radius + PLAYER_RADIUS * 0.6
      if (dist2(b.x, b.y, p.x, p.y) < r * r) {
        w.hurtPlayer(b.damage)
        return false
      }
      return true
    })
  }

  /** Gentle curve toward the closest enemy roughly in front — forgives imperfect aim. */
  private steerProjectile(pr: Projectile, dt: number) {
    const dir = Math.atan2(pr.vy, pr.vx)
    let best = Infinity
    let target = 0
    for (const e of this.world.enemies) {
      const d2 = dist2(pr.x, pr.y, e.x, e.y)
      if (d2 > HOMING_RANGE * HOMING_RANGE || d2 >= best || pr.hits.has(e.uid)) continue
      const diff = angleDiff(dir, Math.atan2(e.y - pr.y, e.x - pr.x))
      if (Math.abs(diff) > HOMING_CONE) continue
      best = d2
      target = diff
    }
    if (best === Infinity) return
    const turn = Math.sign(target) * Math.min(Math.abs(target), (pr.homing ?? 0) * dt)
    const speed = Math.hypot(pr.vx, pr.vy)
    pr.vx = Math.cos(dir + turn) * speed
    pr.vy = Math.sin(dir + turn) * speed
  }

  private updatePickups(dt: number) {
    const w = this.world
    const p = w.player
    const magnet2 = w.stats.magnet * w.stats.magnet
    w.pickups = w.pickups.filter((pk) => {
      pk.age += dt
      const d2 = dist2(pk.x, pk.y, p.x, p.y)
      if (d2 < magnet2) pk.magnetized = true
      if (pk.magnetized) {
        const d = Math.sqrt(d2) || 1
        const s = Math.min(d, (300 + pk.age * 200) * dt)
        pk.x += ((p.x - pk.x) / d) * s
        pk.y += ((p.y - pk.y) / d) * s
      }
      if (d2 > 12 * 12) return true
      switch (pk.kind) {
        case 'xp':
          w.gainXp(pk.value)
          break
        case 'floppy':
          w.floppies += pk.value
          w.floatText(p.x, p.y - 14, '+floppy', '#ffe000')
          break
        case 'heart':
          p.hp = Math.min(w.stats.maxHp, p.hp + pk.value)
          w.floatText(p.x, p.y - 14, `+${pk.value}`, '#40ff80')
          break
      }
      w.sfx('pickup')
      return false
    })
  }

  private updateFx(dt: number) {
    const w = this.world
    w.particles = w.particles.filter((pt) => {
      pt.x += pt.vx * dt
      pt.y += pt.vy * dt
      pt.vx *= 0.9
      pt.vy *= 0.9
      pt.life -= dt
      return pt.life > 0
    })
    w.floatTexts = w.floatTexts.filter((f) => {
      f.y -= 30 * dt
      f.life -= dt
      return f.life > 0
    })
    w.shake = Math.max(0, w.shake - dt * 20)
    if (w.banner) {
      w.banner.time -= dt
      if (w.banner.time <= 0) w.banner = null
    }
    if (w.taskFx) {
      w.taskFx.time += dt
      if (w.taskFx.time >= TASK_FX_TIME) w.taskFx = null
    }
  }

  private end(victory: boolean) {
    if (this.ended) return
    this.ended = true
    const w = this.world
    w.sfx(victory ? 'win' : 'death')
    this.emitHud()
    const base = {
      mapId: w.map.id,
      victory,
      time: w.time,
      kills: w.kills,
      level: w.player.level,
      floppies: w.floppies,
    }
    this.events.onEnd({ ...base, earned: Math.floor(runEarnings(base, w.map.tier) * w.stats.greed) })
  }

  private emitHud() {
    const w = this.world
    this.events.onHud({
      hp: Math.max(0, w.player.hp),
      maxHp: w.stats.maxHp,
      xp: w.player.xp,
      xpToNext: w.player.xpToNext,
      level: w.player.level,
      time: w.time,
      kills: w.kills,
      floppies: w.floppies,
      weapons: w.weapons.map((x) => ({ id: x.def.id, name: x.def.name, icon: x.def.icon, level: x.level })),
      passives: [...w.passives].map(([id, level]) => {
        const def = PASSIVE_BY_ID[id]
        return { id, name: def.name, icon: def.icon, level }
      }),
      bossIn: w.bossSpawned ? 0 : Math.max(0, w.map.boss.at - w.time),
      taskCharge: w.taskCharge,
    })
  }
}
