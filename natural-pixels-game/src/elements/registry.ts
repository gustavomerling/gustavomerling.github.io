import { bird } from './animals/index.ts'
import { air } from './core/index.ts'
import { fire } from './fire/index.ts'
import { metal } from './materials/index.ts'
import { fruit, leaf, plant, seed, wood } from './plants/index.ts'
import { ash, sand, soil } from './terrain/index.ts'
import type { ElementDefinition } from './types.ts'
import { cloud, steam, water } from './water/index.ts'

/**
 * Every element in the game. The array position is the numeric id stored in the grid,
 * so `air` must stay first and the list must stay under 256 entries.
 * To add an element: create `elements/<family>/<id>.ts`, export it from that folder's
 * `index.ts` and add it here.
 */
export const ELEMENTS: readonly ElementDefinition[] = [
  air,
  // Toolbar order (hotkeys 1–9, 0):
  sand,
  soil,
  water,
  seed,
  wood,
  fruit,
  bird,
  metal,
  fire,
  steam,
  // Only appear through reactions:
  plant,
  leaf,
  cloud,
  ash,
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
