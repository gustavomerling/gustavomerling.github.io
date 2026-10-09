import { Anvil, Armchair, Shirt, Wheat, Cloudy, Flame, Hammer, Landmark, TentTree, Warehouse } from 'lucide-react'
import type { ElementDefinition } from '../types.ts'

/*
 * What humans build around their homes once the house is up (see tasks/decor.ts): a campfire,
 * tiki torches, statues, a workshop with a furnace, a watchtower. Humans walk in front of all of it (like the back
 * wall); everything else treats it as solid. The fires give light and smoke but no heat: they
 * never set anything alight. None of it is in the palette: humans build it.
 */

const wooden = { conductivity: 0.05, burn: { at: 260, temp: 650, rate: 0.006, into: 'ash' } }
/** No heat at all: these fires are just for show (and light). */
const COLD = { conductivity: 0 }

/** Chance per tick a campfire's flame (or a chimney top) puffs out some smoke. */
const CAMPFIRE_SMOKE = 0.012
const CHIMNEY_SMOKE = 0.03

/** Smoke from campfires and chimneys: rises, drifts and fades away. Never turns into water. */
export const smoke: ElementDefinition = {
  id: 'smoke',
  name: 'Smoke',
  description: 'Rises from fires and chimneys, drifts with the wind and fades away. Not water: it never rains down.',
  category: 'fire',
  matter: 'gas',
  density: 0.4,
  color: { base: '#77716b', variation: 0.12, alpha: 0.45 },
  icon: Cloudy,
  movement: { rise: 0.6, drift: 0.5 },
  brushFill: 0.3,
  thermal: { conductivity: 0.02 },
  lifetime: { min: 150, max: 300 },
}

/** A campfire's flames: light and smoke, no heat. */
export const campfire: ElementDefinition = {
  id: 'campfire',
  name: 'Campfire',
  description: 'A cosy campfire: lights up the night and smokes, but never burns anything.',
  category: 'fire',
  matter: 'static',
  density: 30,
  color: { base: '#ff9a3a', variation: 0.35, emissive: 1 },
  icon: TentTree,
  hidden: true,
  thermal: COLD,
  update(ctx) {
    if (ctx.get(0, -1) === 'air' && ctx.random() < CAMPFIRE_SMOKE) ctx.set(0, -1, 'smoke')
  },
}

/** Stone furnace (and its chimney): the top of the chimney smokes. */
export const furnace: ElementDefinition = {
  id: 'furnace',
  name: 'Furnace',
  description: 'A stone furnace in the workshop. Its chimney smokes.',
  category: 'materials',
  matter: 'static',
  density: 40,
  color: { base: '#6a625c', variation: 0.18 },
  icon: Warehouse,
  hidden: true,
  thermal: COLD,
  update(ctx) {
    // Only the top of a chimney (furnace below it, open air above).
    if (ctx.get(0, -1) === 'air' && ctx.get(0, 1) === 'furnace' && ctx.random() < CHIMNEY_SMOKE) ctx.set(0, -1, 'smoke')
  },
}

/** The glowing mouth of the furnace. */
export const furnaceFire: ElementDefinition = {
  id: 'furnace_fire',
  name: 'Furnace',
  description: 'The fire inside a furnace. Glows, but stays put.',
  category: 'materials',
  matter: 'static',
  density: 40,
  color: { base: '#ff7a2a', variation: 0.3, emissive: 1 },
  icon: Flame,
  hidden: true,
  thermal: COLD,
}

export const workbench: ElementDefinition = {
  id: 'workbench',
  name: 'Workbench',
  description: 'Where tools get made.',
  category: 'materials',
  matter: 'static',
  density: 25,
  color: { base: '#9a6a38', variation: 0.2 },
  icon: Hammer,
  hidden: true,
  thermal: wooden,
}

export const anvil: ElementDefinition = {
  id: 'anvil',
  name: 'Anvil',
  description: 'An iron anvil, for forging.',
  category: 'materials',
  matter: 'static',
  density: 70,
  color: { base: '#4a4d55', variation: 0.1 },
  icon: Anvil,
  hidden: true,
  thermal: { conductivity: 0.5 },
}

/** The pole of a tiki torch (a torch burns on top). */
export const tikiPole: ElementDefinition = {
  id: 'tiki_pole',
  name: 'Tiki Torch',
  description: 'A bamboo pole with a torch on top.',
  category: 'materials',
  matter: 'static',
  density: 20,
  color: { base: '#b08a4a', variation: 0.25 },
  icon: Flame,
  hidden: true,
  thermal: wooden,
}

export const statue: ElementDefinition = {
  id: 'statue',
  name: 'Statue',
  description: 'A stone statue on a pedestal.',
  category: 'materials',
  matter: 'static',
  density: 50,
  color: { base: '#d2cdc2', variation: 0.1 },
  icon: Landmark,
  hidden: true,
  thermal: { conductivity: 0.2 },
}

export const goldStatue: ElementDefinition = {
  id: 'gold_statue',
  name: 'Golden Statue',
  description: 'A statue of solid gold: treasure from the mine.',
  category: 'materials',
  matter: 'static',
  density: 80,
  color: { base: '#e8c040', variation: 0.22, emissive: 0.2 },
  icon: Landmark,
  hidden: true,
  thermal: { conductivity: 0.5 },
}

/** A straw scarecrow by the wheat field: rabbits keep away from the wheat near it. */
export const scarecrow: ElementDefinition = {
  id: 'scarecrow',
  name: 'Scarecrow',
  description: 'Stands by the wheat field. Rabbits keep away from the wheat near it.',
  category: 'materials',
  matter: 'static',
  density: 20,
  color: { base: '#d9b45a', variation: 0.3 },
  icon: Shirt,
  hidden: true,
  thermal: wooden,
}

/** A wooden bench in the yard, for sitting on. */
export const bench: ElementDefinition = {
  id: 'bench',
  name: 'Bench',
  description: 'A wooden bench in the yard.',
  category: 'materials',
  matter: 'static',
  density: 25,
  color: { base: '#a4703f', variation: 0.12 },
  icon: Armchair,
  hidden: true,
  thermal: wooden,
}

/** A bale of hay in an animal pen's shelter. */
export const hay: ElementDefinition = {
  id: 'hay',
  name: 'Hay',
  description: 'Hay for the animals, under the roof of their pen.',
  category: 'materials',
  matter: 'static',
  density: 15,
  color: { base: '#e2c25e', variation: 0.22 },
  icon: Wheat,
  hidden: true,
  thermal: { conductivity: 0.05, burn: { at: 180, temp: 450, rate: 0.06, into: 'ash' } },
}
