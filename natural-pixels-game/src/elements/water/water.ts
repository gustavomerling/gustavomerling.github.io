import { Droplets } from 'lucide-react'
import type { ElementDefinition } from '../types.ts'

/** Chance per tick that open water in full sun evaporates (closes the rain cycle). */
const EVAPORATION = 0.0002

export const water: ElementDefinition = {
  id: 'water',
  name: 'Water',
  description: 'Flows and levels out. Soaks into soil, boils at 100 °C and freezes at 0 °C.',
  category: 'water',
  matter: 'liquid',
  density: 10,
  color: { base: '#3d9bff', variation: 0.05, alpha: 0.85 },
  icon: Droplets,
  movement: { spread: 5 },
  // Boils gradually: boiling water holds at 100 °C and turns to steam a little at a time.
  thermal: {
    conductivity: 0.3,
    above: { temp: 100, into: 'steam', chance: 0.01 },
    below: { temp: 0, into: 'ice', chance: 0.02 },
  },
  update(ctx) {
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
