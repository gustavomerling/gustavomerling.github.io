import { defineEnemy } from './helpers'
import { popupSprite } from './popup.sprite'

/** Slow, tanky pop-up ad window. */
export const popup = defineEnemy({
  id: 'popup',
  name: 'Pop-up Ad',
  description: 'Slow and stubborn. Takes a few clicks to close.',
  lore: 'CONGRATULATIONS! You are the 1,000,000th visitor! Click here to claim your prize!',
  status: 'active',
  appears: '1:00+',
  radius: 14,
  hp: 45,
  speed: 38,
  damage: 12,
  xp: 4,
  knockbackResist: 0.6,
  sprite: popupSprite,
})
