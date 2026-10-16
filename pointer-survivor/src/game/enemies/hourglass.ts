import { defineEnemy } from './helpers'
import { hourglassSprite } from './hourglass.sprite'

/** Touching it makes the pointer "busy" (slow) for a moment. */
export const hourglass = defineEnemy({
  id: 'hourglass',
  name: 'Hourglass',
  description: 'Touching it slows the pointer down for 2 seconds.',
  lore: 'Please wait... Please wait... Please wait...',
  status: 'active',
  appears: 'Desktop 2:00+, System32',
  radius: 10,
  hp: 30,
  speed: 45,
  damage: 5,
  xp: 3,
  sprite: hourglassSprite,
  onTouch(_e, world) {
    world.player.slowed = 2
  },
})
