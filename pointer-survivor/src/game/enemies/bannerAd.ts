import { bannerAdSprite } from './bannerAd.sprite'
import { defineEnemy } from './helpers'

const WINDUP = 0.6
const DASH = 0.5
const DASH_SPEED = 230

/** Drifts slowly, then flashes and lunges at the pointer. */
export const bannerAd = defineEnemy({
  id: 'bannerAd',
  name: 'Banner Ad',
  description: 'Slow, wide and tanky. Every few seconds it flashes and lunges at you.',
  lore: 'PUNCH THE MONKEY AND WIN $20!!!',
  status: 'active',
  appears: 'World Wide Web, 1:30+',
  radius: 14,
  hp: 70,
  speed: 30,
  damage: 12,
  xp: 6,
  knockbackResist: 0.8,
  sprite: bannerAdSprite,
  behavior(e, world, dt) {
    const d = e.data
    d.t = (d.t ?? 2 + Math.random() * 2) - dt
    const dx = world.player.x - e.x
    const dy = world.player.y - e.y
    const len = Math.hypot(dx, dy) || 1
    if (d.t > 0) {
      const k = Math.min(1, dt * 3)
      e.vx += ((dx / len) * e.def.speed - e.vx) * k
      e.vy += ((dy / len) * e.def.speed - e.vy) * k
    } else if (d.t > -WINDUP) {
      // wind-up: stop and flash
      e.vx *= 0.8
      e.vy *= 0.8
      e.flash = Math.floor(-d.t * 10) % 2 ? 0.05 : 0
      d.ax = dx / len
      d.ay = dy / len
    } else if (d.t > -WINDUP - DASH) {
      e.vx = d.ax * DASH_SPEED
      e.vy = d.ay * DASH_SPEED
    } else {
      d.t = 3
    }
  },
})
