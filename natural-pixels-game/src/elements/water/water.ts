import { Droplets } from 'lucide-react'
import type { CellContext } from '../../engine/context.ts'
import type { ElementDefinition } from '../types.ts'

/** Chance per tick that open water in full sun evaporates (closes the rain cycle). */
const EVAPORATION = 0.0002
/*
 * Water `data` = algae, 0..255: dry leaves rotting in it turn it green (see litter.ts). The
 * green spreads through the water and fades away very slowly.
 */
export const MAX_ALGAE = 255
const ALGAE_MIX = 0.1
const ALGAE_FADE = 0.002
const SIDES = [
  [-1, 0],
  [1, 0],
  [0, -1],
  [0, 1],
] as const

export const water: ElementDefinition = {
  id: 'water',
  name: 'Water',
  description: 'Flows and levels out. Soaks into soil, boils at 100 °C and freezes at 0 °C.',
  category: 'water',
  matter: 'liquid',
  density: 10,
  // Turns murky green with algae (`data`).
  color: { base: '#3d9bff', wet: '#4f9c6a', variation: 0.05, alpha: 0.85 },
  icon: Droplets,
  movement: { spread: 5 },
  // Boils gradually: boiling water holds at 100 °C and turns to steam a little at a time.
  thermal: {
    conductivity: 0.3,
    above: { temp: 100, into: 'steam', chance: 0.01 },
    below: { temp: 0, into: 'ice', chance: 0.02 },
  },
  update(ctx) {
    const algae = ctx.data(0, 0)
    if (algae > 0) spreadAlgae(ctx, algae)
    // Puddles and lakes slowly evaporate under the sun, rising as steam to make new clouds.
    if (ctx.get(0, -1) !== 'air') return
    if (ctx.random() >= EVAPORATION * ctx.light() * (1 - ctx.rain())) return
    // Flowing over grass: the grass shows again and the steam rises above it.
    if (ctx.under(0, 0)) {
      ctx.reveal(0, 0)
      ctx.set(0, -1, 'steam', { temp: 40 })
    } else ctx.set(0, 0, 'steam', { temp: 40 })
  },
}

/** Algae mixes with a neighbouring water cell and slowly dies off. */
function spreadAlgae(ctx: CellContext, algae: number) {
  if (ctx.random() < ALGAE_FADE) ctx.setData(0, 0, --algae)
  if (ctx.random() >= ALGAE_MIX) return
  const [dx, dy] = SIDES[(ctx.random() * SIDES.length) | 0]
  if (ctx.get(dx, dy) !== 'water') return
  const total = algae + ctx.data(dx, dy)
  ctx.setData(0, 0, total >> 1)
  ctx.setData(dx, dy, total - (total >> 1))
}
