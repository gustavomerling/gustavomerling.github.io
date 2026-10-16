import { defineWeapon } from './helpers'

const COUNT = [2, 2, 3, 3, 4, 5]
const DAMAGE = [9, 12, 12, 15, 15, 20]
const PIERCE = [0, 0, 1, 1, 2, 2]
const COOLDOWN = [0.7, 0.6, 0.6, 0.5, 0.5, 0.4]
const TEXT = ['Fires a fan of clicks BEHIND the pointer.', '+damage, faster', '+1 click, pierce 1', '+damage, faster', '+1 click, pierce 2', 'MAX: +1 click, +damage, faster']
const SPREAD = 0.28
const SPEED = 420

/** Covers your back: shoots opposite to where the pointer faces. */
export const rightClick = defineWeapon<{ timer: number }>({
  id: 'rightClick',
  name: 'Right Click',
  icon: 'rightClick',
  maxLevel: COUNT.length,
  description: 'Shoots behind you — perfect for running away.',
  levelText: (level) => TEXT[level - 1] ?? '',
  create: () => ({ timer: 0.4 }),
  update(state, level, world, dt) {
    state.timer -= dt
    if (state.timer > 0) return
    const i = level - 1
    const { stats, player } = world
    state.timer = COOLDOWN[i] * stats.cooldown
    const back = player.heading + Math.PI
    const count = COUNT[i] + stats.amount
    const speed = SPEED * stats.projectileSpeed
    for (let k = 0; k < count; k++) {
      const a = back + (k - (count - 1) / 2) * SPREAD
      const cos = Math.cos(a)
      const sin = Math.sin(a)
      world.addProjectile({
        x: player.x + cos * 8,
        y: player.y + sin * 8,
        vx: cos * speed,
        vy: sin * speed,
        radius: 3 * stats.area,
        damage: DAMAGE[i] * stats.damage,
        pierce: PIERCE[i],
        life: 0.9,
        hits: new Set(),
        color: '#800000',
        knockback: 70,
      })
    }
  },
})
