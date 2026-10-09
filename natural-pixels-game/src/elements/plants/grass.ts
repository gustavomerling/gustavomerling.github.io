import { Clover } from 'lucide-react'
import { fertilityAt, fertilityBoost } from '../terrain/fertility.ts'
import type { ElementDefinition } from '../types.ts'
import { sunlight } from './tissue.ts'

/*
 * Grass is a thin carpet on top of soil. `data` = blade part: 1 = base (sits on soil),
 * 2 = tip (sits on a base). Only bases spread and grow tips.
 */
const BASE = 1
const TIP = 2

/** Soil moisture grass needs to spread; below DRY it slowly dies back. */
const SPREAD_MOISTURE = 40
const DRY = 10
const SPREAD_CHANCE = 0.004
/** Spreads up to this many times faster on the most fertile soil (on top of 1×). */
const FERTILE_SPREAD_BOOST = 3
const TIP_CHANCE = 0.002
/** Now and then a flower blooms on sunny grass, and fireflies come out of it at night. */
const FLOWER_CHANCE = 0.00002
const FIREFLY_CHANCE = 0.00002
const FIREFLY_NIGHT = 0.25
const WILT_CHANCE = 0.0005
/** In the rain, now and then a snail comes out of it. */
const SNAIL_CHANCE = 0.00015
const SNAIL_RAIN = 0.3
/** Water taken from the soil each time it spreads. */
const SPREAD_COST = 4

export const grass: ElementDefinition = {
  id: 'grass',
  name: 'Grass',
  description: 'Carpets wet soil and spreads by itself, faster on fertile soil. Burns quickly.',
  category: 'plants',
  matter: 'static',
  density: 20,
  color: { base: '#6cc24a', variation: 0.2 },
  icon: Clover,
  brushFill: 0.4,
  thermal: { conductivity: 0.05, burn: { at: 180, temp: 450, rate: 0.08 } },
  update(ctx) {
    const below = ctx.get(0, 1)
    const above = ctx.get(0, -1)

    if (ctx.data(0, 0) === TIP) {
      if (below !== 'grass') ctx.set(0, 0, 'air')
      return
    }

    // A worm passing just under its roots (or poking up through it): it waits.
    if (below === 'worm') return
    // Lost its soil, or buried under falling powder: it dies.
    if (below !== 'soil' || above === 'soil' || above === 'sand') {
      ctx.set(0, 0, 'air')
      return
    }
    if (ctx.data(0, 0) !== BASE) ctx.setData(0, 0, BASE)

    const moisture = ctx.water(0, 1)
    if (moisture < DRY) {
      if (ctx.random() < WILT_CHANCE) ctx.set(0, 0, 'air')
      return
    }

    // In the rain, a snail comes out (on top of the blade, if it has grown one).
    if (ctx.rain() > SNAIL_RAIN && ctx.random() < SNAIL_CHANCE) {
      const top = above === 'air' ? -1 : above === 'grass' && ctx.get(0, -2) === 'air' ? -2 : 0
      if (top) ctx.set(0, top, 'snail')
    }
    if (above === 'air') {
      const r = ctx.random()
      if (r < TIP_CHANCE) ctx.set(0, -1, 'grass', { data: TIP })
      else if (r < TIP_CHANCE + FLOWER_CHANCE * sunlight(ctx)) ctx.set(0, -1, 'flower')
      else if (r < TIP_CHANCE + FLOWER_CHANCE + FIREFLY_CHANCE && ctx.light() < FIREFLY_NIGHT && ctx.rain() < 0.1) {
        ctx.set(0, -1, 'firefly')
      }
    }

    const chance = SPREAD_CHANCE * fertilityBoost(fertilityAt(ctx, 0, 1), FERTILE_SPREAD_BOOST) * sunlight(ctx)
    if (moisture < SPREAD_MOISTURE || ctx.random() >= chance) return

    // Spread to a nearby patch of exposed soil (same level, a step up or a step down).
    const dx = ctx.random() < 0.5 ? -1 : 1
    const dy = Math.floor(ctx.random() * 3) - 1
    if (ctx.get(dx, dy) !== 'air' || ctx.get(dx, dy + 1) !== 'soil') return
    ctx.set(dx, dy, 'grass', { data: BASE })
    ctx.setWater(0, 1, moisture - SPREAD_COST)
  },
}
