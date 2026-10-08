import { Wheat } from 'lucide-react'
import type { CellContext } from '../../engine/context.ts'
import type { ElementDefinition } from '../types.ts'
import { sunlight } from './tissue.ts'

/*
 * Wheat: a crop humans farm (it also grows wherever it's painted on soil). Two cells tall:
 * the stalk on the soil and an ear on top. Grows by day while the soil is wet, then ripens
 * golden and waits to be harvested.
 *
 * Wheat `data`: bit 7 = EAR (the top cell); bits 0-6 = growth 0..RIPE (stalk only).
 */
export const EAR = 0x80
const GROWTH_MASK = 0x7f
const RIPE = 100
/** Grows the ear once it's this far along. */
const EAR_AT = 40
const GROW_CHANCE = 0.03
/** Soil moisture it needs to grow, and what it drinks now and then. */
const THIRSTY = 15
const DRINK_CHANCE = 0.2

/** The stalk under an ear (or a ripe one): if it's gone, so is the ear. */
function stalkBelow(ctx: CellContext): boolean {
  const below = ctx.get(0, 1)
  return (below === 'wheat' || below === 'wheat_ripe') && (ctx.data(0, 1) & EAR) === 0
}

export const wheat: ElementDefinition = {
  id: 'wheat',
  name: 'Wheat',
  description: 'A crop: grows on wet soil by day and ripens golden. Humans farm it for bread.',
  category: 'plants',
  matter: 'static',
  density: 20,
  color: { base: '#86c25a', variation: 0.12 },
  icon: Wheat,
  brushFill: 0.3,
  thermal: { conductivity: 0.05, burn: { at: 180, temp: 450, rate: 0.08 } },
  update(ctx) {
    const data = ctx.data(0, 0)
    if (data & EAR) {
      if (!stalkBelow(ctx)) ctx.set(0, 0, 'air')
      return
    }
    if (ctx.get(0, 1) !== 'soil') {
      ctx.set(0, 0, 'air')
      return
    }
    if (ctx.water(0, 1) < THIRSTY || ctx.random() >= GROW_CHANCE * sunlight(ctx)) return
    if (ctx.random() < DRINK_CHANCE) ctx.setWater(0, 1, ctx.water(0, 1) - 1)

    const growth = (data & GROWTH_MASK) + 1
    if (growth >= EAR_AT && ctx.get(0, -1) === 'air') ctx.set(0, -1, 'wheat', { data: EAR })
    if (growth < RIPE) {
      ctx.setData(0, 0, growth)
      return
    }
    // Ripe: stalk and ear turn golden.
    ctx.set(0, 0, 'wheat_ripe')
    if (ctx.get(0, -1) === 'wheat') ctx.set(0, -1, 'wheat_ripe', { data: EAR })
  },
}

/** Ripe wheat, ready to harvest (rabbits like it too). */
export const wheatRipe: ElementDefinition = {
  id: 'wheat_ripe',
  name: 'Ripe Wheat',
  description: 'Golden, ripe wheat ready for harvest.',
  category: 'plants',
  matter: 'static',
  density: 20,
  color: { base: '#e3b94b', variation: 0.1 },
  icon: Wheat,
  hidden: true,
  thermal: { conductivity: 0.05, burn: { at: 170, temp: 450, rate: 0.1 } },
  update(ctx) {
    if (ctx.data(0, 0) & EAR) {
      if (!stalkBelow(ctx)) ctx.set(0, 0, 'air')
    } else if (ctx.get(0, 1) !== 'soil') ctx.set(0, 0, 'air')
  },
}
