import { Shovel } from 'lucide-react'
import type { CellContext } from '../../engine/context.ts'
import type { ElementDefinition } from '../types.ts'

const CAPACITY = 200
/** Moisture a cell of soil holds at most (humans watering saplings soak it up to this). */
export const SOIL_CAPACITY = CAPACITY
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

/** Mushrooms sprout on damp soil under trees. */
const MUSHROOM_CHANCE = 0.00002
const MUSHROOM_MOISTURE = 60
const SHADE_HEIGHT = 12

/** Leaves somewhere overhead. */
function shaded(ctx: CellContext): boolean {
  for (let k = 2; k <= SHADE_HEIGHT; k++) if (ctx.get(0, -k) === 'leaf') return true
  return false
}

/** Now and then a zombie claws its way out of dark soil at night, away from houses. */
const ZOMBIE_CHANCE = 0.00001
const ZOMBIE_DARK = 0.15
const SAFE_RADIUS = 14
const MAX_ZOMBIES = 2
const SETTLED: ReadonlySet<string | null> = new Set(['backwall', 'lamp', 'door', 'plank', 'fence', 'human_torch'])

function zombieCanRise(ctx: CellContext): boolean {
  if (ctx.get(0, -2) !== 'air' || ctx.get(0, -3) !== 'air') return false
  let zombies = 0
  for (let dy = -SAFE_RADIUS; dy <= SAFE_RADIUS; dy++) {
    for (let dx = -SAFE_RADIUS * 2; dx <= SAFE_RADIUS * 2; dx++) {
      const id = ctx.get(dx, dy)
      if (SETTLED.has(id)) return false
      if (id === 'zombie' && ++zombies >= MAX_ZOMBIES) return false
    }
  }
  return true
}

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

    const above = ctx.get(0, -1)
    if (above === 'grass' && ctx.light() < ZOMBIE_DARK && ctx.random() < ZOMBIE_CHANCE && zombieCanRise(ctx)) {
      ctx.set(0, -1, 'zombie')
      return
    }
    if (above !== 'air') return
    if (ctx.random() < WILD_GRASS_CHANCE && water >= WILD_GRASS_MOISTURE) {
      ctx.set(0, -1, 'grass', { data: 1 })
    } else if (water >= MUSHROOM_MOISTURE && ctx.random() < MUSHROOM_CHANCE && shaded(ctx)) {
      ctx.set(0, -1, 'mushroom')
    } else if (ctx.light() < ZOMBIE_DARK && ctx.random() < ZOMBIE_CHANCE && zombieCanRise(ctx)) {
      ctx.set(0, -1, 'zombie')
    }
  },
}
