import { bird } from './animals/index.ts'
import { air } from './core/index.ts'
import { fire } from './fire/index.ts'
import { metal } from './materials/index.ts'
import { fruit, grass, leaf, litter, plant, seed, wood } from './plants/index.ts'
import { ash, mud, sand, soil } from './terrain/index.ts'
import type { ElementDefinition } from './types.ts'
import { cloud, steam, water } from './water/index.ts'

/**
 * Every element in the game. The array position is the numeric id stored in the grid,
 * so `air` must stay first and the list must stay under 256 entries.
 * Grouped by family in sidebar order, so hotkeys 1–9, 0 follow what's on screen.
 * To add an element: create `elements/<family>/<id>.ts`, export it from that folder's
 * `index.ts` and add it here.
 */
export const ELEMENTS: readonly ElementDefinition[] = [
  air,
  // Terrain
  sand,
  soil,
  mud,
  ash,
  // Water
  water,
  steam,
  cloud,
  // Plants
  seed,
  grass,
  wood,
  fruit,
  plant,
  leaf,
  litter,
  // Animals
  bird,
  // Fire
  fire,
  // Materials
  metal,
]

export const EMPTY = 0

const INDEX_BY_ID = new Map(ELEMENTS.map((el, i) => [el.id, i]))

export function elementIndex(id: string): number {
  const index = INDEX_BY_ID.get(id)
  if (index === undefined) throw new Error(`Unknown element "${id}"`)
  return index
}

/** Elements the player can pick from the toolbar, in registry order. */
export const PALETTE = ELEMENTS.filter((el) => !el.hidden)
