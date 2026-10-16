import { defineEnemy } from './helpers'
import { bugSprite } from './bug.sprite'

/** Small, fast, fragile. The basic swarm enemy. */
export const bug = defineEnemy({
  id: 'bug',
  name: 'Bug',
  description: 'Small and quick. Comes in swarms.',
  lore: 'Nobody knows where they come from. Every fix seems to spawn two more.',
  status: 'active',
  appears: '0:00+',
  radius: 8,
  hp: 10,
  speed: 70,
  damage: 5,
  xp: 1,
  sprite: bugSprite,
})
