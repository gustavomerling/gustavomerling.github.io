import { defineWeapon } from './helpers'

const RADIUS = [90, 100, 110, 125, 140, 160]
const DAMAGE = [8, 10, 13, 16, 20, 26]
const COOLDOWN = [3, 2.8, 2.6, 2.4, 2.2, 2]
const TEXT = ['Scrolls a shockwave out from the pointer, pushing enemies away.', '+range, +damage', '+range, +damage, faster', '+range, +damage', '+range, +damage, faster', 'MAX: huge wave']
const DURATION = 0.5
const KNOCKBACK = 240

interface Wave {
  t: number
  x: number
  y: number
  radius: number
  damage: number
  hits: Set<number>
}

/** Expanding ring: damage + strong knockback. Breathing room when swarmed. */
export const scrollWheel = defineWeapon<{ timer: number; waves: Wave[] }>({
  id: 'scrollWheel',
  name: 'Scroll Wheel',
  icon: 'scroll',
  maxLevel: RADIUS.length,
  description: 'A shockwave that shoves every enemy around you back.',
  levelText: (level) => TEXT[level - 1] ?? '',
  create: () => ({ timer: 1.5, waves: [] }),
  update(state, level, world, dt) {
    for (const w of state.waves) {
      w.t += dt
      if (w.t < 0) continue
      // follow the pointer so the ring stays centered on it
      w.x = world.player.x
      w.y = world.player.y
      const r = w.radius * Math.min(1, w.t / DURATION)
      for (const e of world.enemies) {
        if (w.hits.has(e.uid)) continue
        const d = Math.hypot(e.x - w.x, e.y - w.y)
        if (d > r + e.def.radius) continue
        w.hits.add(e.uid)
        world.damageEnemy(e, w.damage, w.x, w.y, KNOCKBACK)
      }
    }
    state.waves = state.waves.filter((w) => w.t < DURATION + 0.15)

    state.timer -= dt
    if (state.timer > 0) return
    const i = level - 1
    state.timer = COOLDOWN[i] * world.stats.cooldown
    const n = 1 + world.stats.amount
    for (let k = 0; k < n; k++) {
      state.waves.push({
        t: -k * 0.25,
        x: world.player.x,
        y: world.player.y,
        radius: RADIUS[i] * world.stats.area,
        damage: DAMAGE[i] * world.stats.damage,
        hits: new Set(),
      })
    }
  },
  draw(ctx, state) {
    for (const w of state.waves) {
      if (w.t < 0) continue
      const p = Math.min(1, w.t / DURATION)
      const r = w.radius * p
      ctx.save()
      ctx.globalAlpha = 0.7 * (1 - Math.max(0, (w.t - DURATION) / 0.15))
      ctx.strokeStyle = '#ffffff'
      ctx.lineWidth = 2
      ctx.setLineDash([6, 4])
      ctx.lineDashOffset = -w.t * 60
      ctx.beginPath()
      ctx.arc(w.x, w.y, r, 0, Math.PI * 2)
      ctx.stroke()
      ctx.restore()
    }
  },
})
