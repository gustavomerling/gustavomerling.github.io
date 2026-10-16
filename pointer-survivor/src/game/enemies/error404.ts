import { rand } from '../math'
import { error404Sprite } from './error404.sprite'
import { bossEnter, defineEnemy, seek } from './helpers'

const TELEPORT_EVERY = 4
const TELEGRAPH = 0.7
const BULLET = { color: '#ffffff', radius: 6, damage: 11, glyph: '?' }

/** Boss of the Web. Sparkles where it will appear, teleports next to you, then bursts. */
export const error404 = defineEnemy({
  id: 'error404',
  name: 'Error 404',
  description: 'Vanishes and reappears near you, bursting into broken links. Forwards spam.',
  lore: 'The page cannot be found. The page you are looking for might have been removed, had its name changed, or is temporarily unavailable.',
  status: 'active',
  appears: 'World Wide Web boss, 4:00',
  boss: true,
  radius: 32,
  hp: 5000,
  speed: 45,
  damage: 22,
  xp: 0,
  knockbackResist: 1,
  sprite: error404Sprite,
  behavior(e, world, dt) {
    if (bossEnter(e, world)) return
    seek(e, world, dt)
    const d = e.data
    const hurt = e.hp < e.maxHp / 2
    d.tp = (d.tp ?? TELEPORT_EVERY) - dt
    if (d.tp <= TELEGRAPH && !d.aimed) {
      // pick the destination and start sparkling there
      const a = rand(0, Math.PI * 2)
      const r = rand(140, 180)
      const m = e.def.radius + 4
      d.tx = Math.max(m, Math.min(world.width - m, world.player.x + Math.cos(a) * r))
      d.ty = Math.max(m, Math.min(world.height - m, world.player.y + Math.sin(a) * r))
      d.aimed = 1
    }
    if (d.aimed && d.tp > 0) world.burst(d.tx, d.ty, '#a6caf0', 2, 60)
    if (d.tp <= 0) {
      world.burst(e.x, e.y, '#ffffff', 30, 160)
      e.x = d.tx
      e.y = d.ty
      e.vx = 0
      e.vy = 0
      d.aimed = 0
      d.tp = hurt ? TELEPORT_EVERY * 0.7 : TELEPORT_EVERY
      world.sfx('teleport')
      world.fireRing(e.x, e.y, hurt ? 14 : 10, 130, BULLET, rand(0, 1))
    }
    d.spam = (d.spam ?? 6) - dt
    if (d.spam <= 0) {
      d.spam = 7
      world.spawnAround('spamMail', e.x, e.y, 3, 40, 2)
    }
  },
})
