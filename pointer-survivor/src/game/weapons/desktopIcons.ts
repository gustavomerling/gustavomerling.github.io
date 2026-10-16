import { dist2 } from '../math'
import { defineWeapon } from './helpers'

const COUNT = [2, 2, 3, 3, 4, 5]
const DAMAGE = [8, 11, 11, 14, 14, 18]
const RADIUS = 52
const HIT_COOLDOWN = 0.45

interface State {
  angle: number
  /** enemy uid -> time of last hit */
  lastHit: Map<number, number>
}

function iconPositions(state: State, level: number, x: number, y: number, area: number, amount: number) {
  const n = COUNT[level - 1] + amount
  const r = RADIUS * area
  const out: { x: number; y: number }[] = []
  for (let i = 0; i < n; i++) {
    const a = state.angle + (i / n) * Math.PI * 2
    out.push({ x: x + Math.cos(a) * r, y: y + Math.sin(a) * r })
  }
  return out
}

/** Folder icons orbiting the pointer. */
export const desktopIcons = defineWeapon<State>({
  id: 'desktopIcons',
  name: 'Desktop Icons',
  icon: 'folder',
  maxLevel: COUNT.length,
  description: 'Folders orbit the pointer and bonk enemies.',
  levelText: (level) => {
    if (level === 1) return '2 folders orbit around you.'
    return COUNT[level - 1] > COUNT[level - 2] ? '+1 folder' : '+damage'
  },
  create: () => ({ angle: 0, lastHit: new Map() }),
  update(state, level, world, dt) {
    state.angle += dt * 3.2 / world.stats.cooldown
    const dmg = DAMAGE[level - 1] * world.stats.damage
    const hitR = 9 * world.stats.area
    for (const pos of iconPositions(state, level, world.player.x, world.player.y, world.stats.area, world.stats.amount)) {
      for (const e of world.enemies) {
        const r = hitR + e.def.radius
        if (dist2(pos.x, pos.y, e.x, e.y) > r * r) continue
        const last = state.lastHit.get(e.uid) ?? -Infinity
        if (world.time - last < HIT_COOLDOWN) continue
        state.lastHit.set(e.uid, world.time)
        world.damageEnemy(e, dmg, world.player.x, world.player.y, 140)
      }
    }
    // forget dead enemies now and then
    if (state.lastHit.size > 400) state.lastHit.clear()
  },
  draw(ctx, state, level, world) {
    const s = world.stats.area
    for (const pos of iconPositions(state, level, world.player.x, world.player.y, s, world.stats.amount)) {
      ctx.save()
      ctx.translate(Math.round(pos.x), Math.round(pos.y))
      ctx.scale(s, s)
      // folder tab + body
      ctx.fillStyle = '#000'
      ctx.fillRect(-8, -6, 16, 13)
      ctx.fillStyle = '#e8c860'
      ctx.fillRect(-7, -5, 6, 2)
      ctx.fillStyle = '#ffe080'
      ctx.fillRect(-7, -3, 14, 9)
      ctx.fillStyle = '#c8a040'
      ctx.fillRect(-7, 4, 14, 2)
      ctx.restore()
    }
  },
})
