import { defineEnemy } from './helpers'
import { virusSprite } from './virus.sprite'

/** Zig-zags toward the player, harder to line up shots on. */
export const virus = defineEnemy({
  id: 'virus',
  name: 'Virus',
  description: 'Zig-zags around your shots.',
  lore: 'Arrived as LOVE-LETTER-FOR-YOU.TXT.vbs. You should not have opened it.',
  status: 'active',
  appears: '0:30+',
  radius: 10,
  hp: 22,
  speed: 62,
  damage: 9,
  xp: 2,
  behavior(e, world) {
    const p = world.player
    const dx = p.x - e.x
    const dy = p.y - e.y
    const d = Math.hypot(dx, dy) || 1
    const nx = dx / d
    const ny = dy / d
    // perpendicular sway
    const sway = Math.sin(e.age * 4 + e.uid) * 0.9
    const speed = e.def.speed
    e.vx += ((nx - ny * sway) * speed - e.vx) * 0.15
    e.vy += ((ny + nx * sway) * speed - e.vy) * 0.15
  },
  sprite: virusSprite,
})
