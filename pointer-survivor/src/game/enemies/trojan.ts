import { defineEnemy } from './helpers'
import { trojanSprite } from './trojan.sprite'

/** Tanky; releases a squad of bugs when destroyed. */
export const trojan = defineEnemy({
  id: 'trojan',
  name: 'Trojan Horse',
  description: 'Slow and tough. Something is hiding inside.',
  lore: 'FREE_SCREENSAVER.EXE — totally safe, trust me.',
  status: 'active',
  appears: 'System32, 1:30+',
  radius: 13,
  hp: 90,
  speed: 32,
  damage: 14,
  xp: 6,
  knockbackResist: 0.7,
  sprite: trojanSprite,
  onDeath(e, world) {
    world.spawnAround('bug', e.x, e.y, 4, 12, 2)
  },
})
