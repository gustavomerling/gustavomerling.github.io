import { defineEnemy } from './helpers'
import { wormSprite } from './worm.sprite'

/** Slithers toward the player in a wide sine. */
export const worm = defineEnemy({
  id: 'worm',
  name: 'Worm',
  description: 'Quick and slithery. Travels in packs.',
  lore: 'It said it loved you. It said that to everyone in your address book.',
  status: 'active',
  appears: 'System32',
  radius: 8,
  hp: 18,
  speed: 88,
  damage: 7,
  xp: 2,
  sprite: wormSprite,
  behavior(e, world, dt) {
    const a = Math.atan2(world.player.y - e.y, world.player.x - e.x) + Math.sin(e.age * 3 + e.uid) * 0.8
    const k = Math.min(1, dt * 5)
    e.vx += (Math.cos(a) * e.def.speed - e.vx) * k
    e.vy += (Math.sin(a) * e.def.speed - e.vy) * k
  },
})
