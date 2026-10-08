import { Shovel } from 'lucide-react'
import type { ElementDefinition } from '../types.ts'

const CAPACITY = 200
/** Soil this wet, with more water lying on it, turns into mud. */
export const MUD_WATER = 190
const MUD_CHANCE = 0.004
/** Wet soil exposed to air very occasionally sprouts wild grass. */
const WILD_GRASS_CHANCE = 0.00002
const WILD_GRASS_MOISTURE = 60

const MUD_SIDES = [
  [0, -1],
  [-1, 0],
  [1, 0],
] as const

/** Soil `data` = fertility (see fertility.ts). */
export const soil: ElementDefinition = {
  id: 'soil',
  name: 'Soil',
  description: 'Heavy earth that soaks up water. Seeds sprout in wet soil; ash makes it fertile.',
  category: 'terrain',
  matter: 'powder',
  density: 15,
  color: { base: '#8a5a3b', wet: '#4a2e1d', variation: 0.12 },
  icon: Shovel,
  movement: { slide: 0.15, sink: 0.35 },
  thermal: { conductivity: 0.1 },
  // Two water cells saturate one soil cell; extra water pools on top.
  moisture: { capacity: CAPACITY, group: 'soil', absorbs: 'water', flow: 0.5, bias: 'down' },
  update(ctx) {
    const water = ctx.water(0, 0)

    // Saturated soil with even more water on it turns into mud.
    if (water >= MUD_WATER && ctx.random() < MUD_CHANCE) {
      for (const [dx, dy] of MUD_SIDES) {
        if (ctx.get(dx, dy) !== 'water') continue
        ctx.set(dx, dy, 'air')
        ctx.set(0, 0, 'mud')
        return
      }
    }

    if (ctx.random() < WILD_GRASS_CHANCE && water >= WILD_GRASS_MOISTURE && ctx.get(0, -1) === 'air') {
      ctx.set(0, -1, 'grass', { data: 1 })
    }
  },
}
