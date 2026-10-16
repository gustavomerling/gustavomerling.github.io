import { rand } from '../math'
import { corruptedFileSprite } from './corruptedFile.sprite'
import { defineEnemy } from './helpers'

/** Glitches out and reappears near the pointer every few seconds. */
export const corruptedFile = defineEnemy({
  id: 'corruptedFile',
  name: 'Corrupted File',
  description: 'Teleports next to you without warning.',
  lore: 'The file or directory is corrupted and unreadable. Please run Chkdsk.',
  status: 'active',
  appears: 'System32',
  radius: 9,
  hp: 30,
  speed: 50,
  damage: 10,
  xp: 3,
  sprite: corruptedFileSprite,
  behavior(e, world, dt) {
    e.data.t = (e.data.t ?? rand(2, 4)) - dt
    const p = world.player
    if (e.data.t <= 0) {
      e.data.t = rand(3, 5)
      world.burst(e.x, e.y, '#ff00ff', 10, 90)
      const a = rand(0, Math.PI * 2)
      const d = rand(70, 120)
      e.x = Math.max(10, Math.min(world.width - 10, p.x + Math.cos(a) * d))
      e.y = Math.max(10, Math.min(world.height - 10, p.y + Math.sin(a) * d))
      world.burst(e.x, e.y, '#00ffff', 10, 90)
      world.sfx('teleport')
    }
    const dx = p.x - e.x
    const dy = p.y - e.y
    const len = Math.hypot(dx, dy) || 1
    const k = Math.min(1, dt * 4)
    e.vx += ((dx / len) * e.def.speed - e.vx) * k
    e.vy += ((dy / len) * e.def.speed - e.vy) * k
  },
})
