import { rand } from '../math'
import { cookieSprite } from './cookie.sprite'
import { defineEnemy } from './helpers'

/** Fast and twitchy: re-picks a jittered heading every half second. */
export const cookie = defineEnemy({
  id: 'cookie',
  name: 'Tracking Cookie',
  description: 'Fast and erratic. Follows you everywhere.',
  lore: 'This site uses cookies to improve your experience. And to follow you. Forever.',
  status: 'active',
  appears: 'World Wide Web',
  radius: 7,
  hp: 12,
  speed: 95,
  damage: 5,
  xp: 1,
  sprite: cookieSprite,
  behavior(e, world, dt) {
    e.data.t = (e.data.t ?? 0) - dt
    if (e.data.t <= 0) {
      e.data.t = rand(0.3, 0.6)
      e.data.jitter = rand(-1.1, 1.1)
    }
    const a = Math.atan2(world.player.y - e.y, world.player.x - e.x) + e.data.jitter
    const k = Math.min(1, dt * 6)
    e.vx += (Math.cos(a) * e.def.speed - e.vx) * k
    e.vy += (Math.sin(a) * e.def.speed - e.vy) * k
  },
})
