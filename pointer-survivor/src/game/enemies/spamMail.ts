import { defineEnemy } from './helpers'
import { spamMailSprite } from './spamMail.sprite'

/** Splits into two mini spams when it dies. */
export const spamMail = defineEnemy({
  id: 'spamMail',
  name: 'Spam Mail',
  description: 'Splits into two Spam when deleted.',
  lore: "FWD: FWD: FWD: RE: You won't BELIEVE this!!! (forward to 10 friends or bad luck)",
  status: 'active',
  appears: 'World Wide Web',
  radius: 9,
  hp: 20,
  speed: 55,
  damage: 8,
  xp: 2,
  sprite: spamMailSprite,
  onDeath(e, world) {
    world.spawnAround('spam', e.x, e.y, 2, 8)
  },
})
