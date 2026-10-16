import { bossEnter, defineEnemy, seek } from './helpers'
import { y2kBugSprite } from './y2kBug.sprite'

const CHARGE_EVERY = 4
const WINDUP = 0.7
const DASH = 0.6
const DASH_SPEED = 360

/** Boss of System32. Spirals 0s and 1s, winds up and charges, drops hourglasses. */
export const y2kBug = defineEnemy({
  id: 'y2kBug',
  name: 'Y2K Bug',
  description: 'Spins out a spiral of digits, then winds up and charges. 99 → 00.',
  lore: 'At midnight on 12/31/1999 every two-digit year rolls back to 1900. Planes will fall. Toasters will revolt.',
  status: 'active',
  appears: 'System32 boss, 4:00',
  boss: true,
  radius: 26,
  hp: 6000,
  speed: 40,
  damage: 30,
  xp: 0,
  knockbackResist: 1,
  sprite: y2kBugSprite,
  behavior(e, world, dt) {
    if (bossEnter(e, world)) return
    const d = e.data
    d.charge = (d.charge ?? CHARGE_EVERY) - dt
    if (d.charge > 0) {
      seek(e, world, dt)
      // digit spiral
      d.spiral = (d.spiral ?? 0) - dt
      if (d.spiral <= 0) {
        d.spiral = e.hp < e.maxHp / 2 ? 0.09 : 0.13
        d.spin = (d.spin ?? 0) + 0.45
        d.bit = d.bit ? 0 : 1
        world.fireBullet(e.x, e.y, d.spin, 120, { color: '#7aff4a', radius: 5, damage: 10, glyph: d.bit ? '1' : '0' })
      }
    } else if (d.charge > -WINDUP) {
      e.vx *= 0.85
      e.vy *= 0.85
      e.flash = Math.floor(-d.charge * 12) % 2 ? 0.05 : 0
      world.shake = Math.max(world.shake, 2)
      const dx = world.player.x - e.x
      const dy = world.player.y - e.y
      const len = Math.hypot(dx, dy) || 1
      d.ax = dx / len
      d.ay = dy / len
    } else if (d.charge > -WINDUP - DASH) {
      e.vx = d.ax * DASH_SPEED
      e.vy = d.ay * DASH_SPEED
    } else {
      d.charge = CHARGE_EVERY
    }
    d.minions = (d.minions ?? 8) - dt
    if (d.minions <= 0) {
      d.minions = 10
      world.spawnAround('hourglass', e.x, e.y, 2, 40, 3)
    }
  },
})
