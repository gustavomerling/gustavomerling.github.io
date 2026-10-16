import { dist2 } from '../math'
import { defineWeapon } from './helpers'

const COUNT = [1, 1, 2, 2, 3, 3]
const DAMAGE = [14, 18, 18, 24, 24, 32]
const COOLDOWN = [2.2, 2.0, 2.0, 1.8, 1.8, 1.6]
const RANGE = [150, 160, 160, 180, 180, 210]
const TEXT = ['Drags a file out and drops it back — hits twice.', '+damage, farther', '+1 file', '+damage, farther', '+1 file', 'MAX: +damage, farther, faster']
const SPEED = 280

interface File {
  x: number
  y: number
  dx: number
  dy: number
  traveled: number
  range: number
  returning: boolean
  hits: Set<number>
  spin: number
  damage: number
}

/** Boomerang files: fly toward enemies, then come back to the pointer. */
export const dragDrop = defineWeapon<{ timer: number; files: File[] }>({
  id: 'dragDrop',
  name: 'Drag & Drop',
  icon: 'dragDrop',
  maxLevel: COUNT.length,
  description: 'Throws files that fly out and come back, piercing everything.',
  levelText: (level) => TEXT[level - 1] ?? '',
  create: () => ({ timer: 1, files: [] }),
  update(state, level, world, dt) {
    const p = world.player
    const speed = SPEED * world.stats.projectileSpeed
    const hitR = 9 * world.stats.area
    for (const f of state.files) {
      f.spin += dt * 10
      if (!f.returning) {
        f.x += f.dx * speed * dt
        f.y += f.dy * speed * dt
        f.traveled += speed * dt
        if (f.traveled >= f.range) {
          f.returning = true
          // each pass can hit the same enemy again
          f.hits.clear()
        }
      } else {
        const dx = p.x - f.x
        const dy = p.y - f.y
        const d = Math.hypot(dx, dy) || 1
        f.x += (dx / d) * speed * 1.2 * dt
        f.y += (dy / d) * speed * 1.2 * dt
        if (d < 10) f.traveled = -1
      }
      for (const e of world.enemies) {
        if (f.hits.has(e.uid)) continue
        const r = hitR + e.def.radius
        if (dist2(f.x, f.y, e.x, e.y) > r * r) continue
        f.hits.add(e.uid)
        world.damageEnemy(e, f.damage, f.x, f.y, 90)
      }
    }
    state.files = state.files.filter((f) => f.traveled >= 0)

    state.timer -= dt
    if (state.timer > 0) return
    const i = level - 1
    state.timer = COOLDOWN[i] * world.stats.cooldown
    const n = COUNT[i] + world.stats.amount
    const target = world.nearestEnemy(p.x, p.y, 400)
    const base = target ? Math.atan2(target.y - p.y, target.x - p.x) : p.heading
    for (let k = 0; k < n; k++) {
      const a = base + (k - (n - 1) / 2) * 0.5
      state.files.push({
        x: p.x,
        y: p.y,
        dx: Math.cos(a),
        dy: Math.sin(a),
        traveled: 0,
        range: RANGE[i] * world.stats.area,
        returning: false,
        hits: new Set(),
        spin: 0,
        damage: DAMAGE[i] * world.stats.damage,
      })
    }
  },
  draw(ctx, state, _level, world) {
    const s = world.stats.area
    for (const f of state.files) {
      ctx.save()
      ctx.translate(Math.round(f.x), Math.round(f.y))
      ctx.rotate(f.spin)
      ctx.scale(s, s)
      // a little document with a folded corner
      ctx.fillStyle = '#000'
      ctx.fillRect(-6, -8, 12, 16)
      ctx.fillStyle = '#fff'
      ctx.fillRect(-5, -7, 10, 14)
      ctx.fillStyle = '#c0c0c0'
      ctx.fillRect(2, -7, 3, 3)
      ctx.fillStyle = '#0a246a'
      ctx.fillRect(-3, -2, 6, 1)
      ctx.fillRect(-3, 1, 6, 1)
      ctx.fillRect(-3, 4, 4, 1)
      ctx.restore()
    }
  },
})
