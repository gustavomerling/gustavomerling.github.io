import { defineEnemy } from './helpers'
import { spamSprite } from './spam.sprite'

/** What a Spam Mail leaves behind. */
export const spam = defineEnemy({
  id: 'spam',
  name: 'Spam',
  description: 'Tiny, fast and everywhere.',
  lore: 'Unsubscribing only confirms your address is real.',
  status: 'active',
  appears: 'When Spam Mail dies',
  radius: 6,
  hp: 7,
  speed: 90,
  damage: 4,
  xp: 1,
  sprite: spamSprite,
})
