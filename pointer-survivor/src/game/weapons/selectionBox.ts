import { defineWeapon } from './helpers'

const SIZE = [70, 80, 90, 100, 115, 130]
const DAMAGE = [5, 6, 8, 9, 11, 14]
const TICK = 0.5

/** Marching-ants selection rectangle around the pointer; damages everything inside. */
export const selectionBox = defineWeapon<{ timer: number; pulse: number }>({
  id: 'selectionBox',
  name: 'Selection Box',
  icon: 'select',
  maxLevel: SIZE.length,
  description: 'A dashed selection area that hurts everything inside it.',
  levelText: (level) => (level === 1 ? 'Damages enemies around you.' : 'Bigger box, more damage'),
  create: () => ({ timer: TICK, pulse: 0 }),
  update(state, level, world, dt) {
    state.pulse = Math.max(0, state.pulse - dt * 4)
    state.timer -= dt
    if (state.timer > 0) return
    state.timer = TICK * world.stats.cooldown
    state.pulse = 1
    const half = (SIZE[level - 1] * world.stats.area) / 2
    const { x, y } = world.player
    const dmg = DAMAGE[level - 1] * world.stats.damage
    for (const e of world.enemies) {
      if (Math.abs(e.x - x) < half + e.def.radius && Math.abs(e.y - y) < half + e.def.radius) {
        world.damageEnemy(e, dmg, x, y, 30)
      }
    }
  },
  draw(ctx, state, level, world) {
    const size = SIZE[level - 1] * world.stats.area
    const { x, y } = world.player
    ctx.save()
    ctx.fillStyle = `rgba(10, 36, 106, ${0.08 + state.pulse * 0.15})`
    ctx.fillRect(x - size / 2, y - size / 2, size, size)
    ctx.strokeStyle = '#000'
    ctx.lineWidth = 1
    ctx.setLineDash([2, 2])
    ctx.lineDashOffset = -world.time * 12
    ctx.strokeRect(Math.round(x - size / 2) + 0.5, Math.round(y - size / 2) + 0.5, Math.round(size), Math.round(size))
    ctx.restore()
  },
})
