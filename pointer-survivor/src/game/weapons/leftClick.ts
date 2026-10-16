import { defineWeapon } from './helpers'

interface Tier {
  damage: number
  count: number
  pierce: number
  cooldown: number
  text: string
}

const TIERS: Tier[] = [
  { damage: 10, count: 1, pierce: 0, cooldown: 0.38, text: 'Fires a click where the pointer points.' },
  { damage: 13, count: 1, pierce: 0, cooldown: 0.38, text: '+30% damage' },
  { damage: 13, count: 2, pierce: 0, cooldown: 0.38, text: '+1 click (double-click!)' },
  { damage: 13, count: 2, pierce: 1, cooldown: 0.34, text: 'Pierces 1 enemy, faster' },
  { damage: 17, count: 3, pierce: 1, cooldown: 0.34, text: '+1 click, +30% damage' },
  { damage: 17, count: 3, pierce: 2, cooldown: 0.3, text: 'Pierces 2 enemies, faster' },
  { damage: 22, count: 4, pierce: 2, cooldown: 0.3, text: '+1 click, +30% damage' },
  { damage: 28, count: 5, pierce: 3, cooldown: 0.25, text: 'MAX: triple-click frenzy' },
]

const SPREAD = 0.13
const SPEED = 520

/** Starting weapon: shoots along the cursor's heading. */
export const leftClick = defineWeapon<{ timer: number }>({
  id: 'leftClick',
  name: 'Left Click',
  icon: 'cursor',
  maxLevel: TIERS.length,
  description: 'Shoots in the direction the pointer is facing.',
  levelText: (level) => TIERS[level - 1]?.text ?? '',
  create: () => ({ timer: 0.2 }),
  update(state, level, world, dt) {
    state.timer -= dt
    if (state.timer > 0) return
    const t = TIERS[level - 1]
    const { stats, player } = world
    state.timer = t.cooldown * stats.cooldown
    const speed = SPEED * stats.projectileSpeed
    const count = t.count + stats.amount
    for (let i = 0; i < count; i++) {
      const a = player.heading + (i - (count - 1) / 2) * SPREAD
      const cos = Math.cos(a)
      const sin = Math.sin(a)
      world.addProjectile({
        x: player.x + cos * 10,
        y: player.y + sin * 10,
        vx: cos * speed,
        vy: sin * speed,
        radius: 3 * stats.area,
        damage: t.damage * stats.damage,
        pierce: t.pierce,
        life: 1.2,
        hits: new Set(),
        color: '#000080',
        knockback: 90,
        homing: 3,
      })
    }
    world.sfx('shoot')
  },
})
