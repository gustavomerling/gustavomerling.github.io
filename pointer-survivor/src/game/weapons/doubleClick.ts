import { dist2, rand } from '../math'
import { defineWeapon } from './helpers'

const DAMAGE = [18, 24, 24, 32, 32, 44]
const COUNT = [1, 1, 2, 2, 3, 3]
const RADIUS = [34, 38, 38, 44, 44, 52]
const COOLDOWN = [1.6, 1.5, 1.5, 1.35, 1.35, 1.2]
const TEXT = ['Double-clicks the nearest enemy: two blasts.', '+damage, bigger', '+1 target', '+damage, bigger, faster', '+1 target', 'MAX: bigger, faster']
const RANGE = 280
/** delay between the two "clicks" */
const GAP = 0.18

interface Blast {
  x: number
  y: number
  /** seconds since the blast started (negative = waiting for its click) */
  t: number
  radius: number
  damage: number
  hit: boolean
}

/** Picks targets and pops two quick AoE blasts on each — click, click. */
export const doubleClick = defineWeapon<{ timer: number; blasts: Blast[] }>({
  id: 'doubleClick',
  name: 'Double Click',
  icon: 'doubleClick',
  maxLevel: DAMAGE.length,
  description: 'Two quick explosions on enemies near you.',
  levelText: (level) => TEXT[level - 1] ?? '',
  create: () => ({ timer: 0.8, blasts: [] }),
  update(state, level, world, dt) {
    for (const b of state.blasts) {
      b.t += dt
      if (b.t >= 0 && !b.hit) {
        b.hit = true
        world.sfx('boom')
        for (const e of world.enemies) {
          const r = b.radius + e.def.radius
          if (dist2(b.x, b.y, e.x, e.y) < r * r) world.damageEnemy(e, b.damage, b.x, b.y, 60)
        }
      }
    }
    state.blasts = state.blasts.filter((b) => b.t < 0.3)

    state.timer -= dt
    if (state.timer > 0) return
    const i = level - 1
    state.timer = COOLDOWN[i] * world.stats.cooldown
    const { x, y } = world.player
    const candidates = world.enemies.filter((e) => dist2(x, y, e.x, e.y) < RANGE * RANGE)
    candidates.sort((a, b) => dist2(x, y, a.x, a.y) - dist2(x, y, b.x, b.y))
    const n = COUNT[i] + world.stats.amount
    const radius = RADIUS[i] * world.stats.area
    const damage = DAMAGE[i] * world.stats.damage
    for (let k = 0; k < n; k++) {
      const target = candidates[k]
      if (!target) break
      const tx = target.x + rand(-4, 4)
      const ty = target.y + rand(-4, 4)
      state.blasts.push({ x: tx, y: ty, t: -0.05 * k, radius, damage, hit: false })
      state.blasts.push({ x: tx, y: ty, t: -0.05 * k - GAP, radius, damage, hit: false })
    }
  },
  draw(ctx, state) {
    for (const b of state.blasts) {
      if (b.t < 0) continue
      const p = b.t / 0.3
      ctx.save()
      ctx.globalAlpha = 1 - p
      ctx.strokeStyle = '#ffffff'
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.arc(b.x, b.y, b.radius * (0.3 + p * 0.7), 0, Math.PI * 2)
      ctx.stroke()
      ctx.strokeStyle = '#0a246a'
      ctx.lineWidth = 1
      ctx.stroke()
      ctx.fillStyle = `rgba(255,255,255,${0.35 * (1 - p)})`
      ctx.fill()
      ctx.restore()
    }
  },
})
