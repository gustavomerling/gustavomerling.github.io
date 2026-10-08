import { Sparkle } from 'lucide-react'
import type { ElementDefinition } from '../types.ts'

/*
 * Fireflies come out of the grass on warm nights, blink around low over the meadows,
 * and are gone by morning (or when it rains).
 */
const MOVE_CHANCE = 0.3
const GONE_CHANCE = 0.01
/** They stay this low over the ground. */
const MAX_HEIGHT = 8

const FLY_THROUGH: ReadonlySet<string | null> = new Set(['air', 'leaf', 'grass', 'flower', 'plant', 'wheat'])

export const firefly: ElementDefinition = {
  id: 'firefly',
  name: 'Firefly',
  description: 'Glows over the meadows at night. Comes out of the grass after dark.',
  category: 'animals',
  matter: 'static',
  density: 1,
  color: { base: '#dfff6a', variation: 0.1, emissive: 1 },
  icon: Sparkle,
  brushFill: 0.01,
  thermal: { conductivity: 0.05, above: { temp: 60, into: 'air' } },
  update(ctx) {
    if ((ctx.light() > 0.35 || ctx.rain() > 0.2) && ctx.random() < GONE_CHANCE) {
      ctx.set(0, 0, ctx.under(0, 0) ?? 'air')
      return true
    }
    if (ctx.random() >= MOVE_CHANCE) return true
    // Drift randomly, sinking back towards the ground when too high.
    let high = true
    for (let k = 1; k <= MAX_HEIGHT && high; k++) if (!FLY_THROUGH.has(ctx.get(0, k))) high = false
    const dx = Math.floor(ctx.random() * 3) - 1
    const dy = high ? 1 : Math.floor(ctx.random() * 3) - 1
    if (FLY_THROUGH.has(ctx.get(dx, dy)) && !ctx.under(dx, dy)) ctx.moveOver(dx, dy)
    return true
  },
}
