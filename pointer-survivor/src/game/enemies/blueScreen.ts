import { pick } from '../math'
import { blueScreenSprite } from './blueScreen.sprite'
import { bossEnter, defineEnemy, seek } from './helpers'

const HEX = ['0E', 'FF', 'C0', '1E', 'DE', 'AD']
const BULLET = { color: '#5a8cff', radius: 6, damage: 10 }

/** Boss of the Desktop. Sprays hex-code fans and rings; calls in bugs when hurt. */
export const blueScreen = defineEnemy({
  id: 'blueScreen',
  name: 'Blue Screen',
  description: 'Fires fans of hex codes and full rings. Below half HP it calls in bugs.',
  lore: 'A fatal exception 0E has occurred at 0028:C0011E36. The current application will be terminated.',
  status: 'active',
  appears: 'Desktop boss, 4:00',
  boss: true,
  radius: 34,
  hp: 3000,
  speed: 30,
  damage: 25,
  xp: 0,
  knockbackResist: 1,
  sprite: blueScreenSprite,
  behavior(e, world, dt) {
    if (bossEnter(e, world)) return
    seek(e, world, dt)
    const d = e.data
    const hurt = e.hp < e.maxHp / 2
    d.fan = (d.fan ?? 1.5) - dt
    d.ring = (d.ring ?? 5) - dt
    if (d.fan <= 0) {
      d.fan = hurt ? 1.6 : 2.2
      world.fireAimed(e.x, e.y, 5, 0.7, 150, { ...BULLET, glyph: pick(HEX) })
    }
    if (d.ring <= 0) {
      d.ring = 6
      world.fireRing(e.x, e.y, 16, 110, { ...BULLET, glyph: pick(HEX) }, e.age)
    }
    if (hurt) {
      d.minions = (d.minions ?? 0) - dt
      if (d.minions <= 0) {
        d.minions = 8
        world.spawnAround('bug', e.x, e.y, 6, 40, 2)
      }
    }
  },
})
