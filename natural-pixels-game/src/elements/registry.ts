import {
  cow,
  sheep,
  sheepShorn,
  bat,
  bee,
  beehive,
  bird,
  butterfly,
  chick,
  chicken,
  duck,
  egg,
  firefly,
  fish,
  frog,
  human,
  humanBody,
  humanHead,
  humanTorch,
  merchantBody,
  rabbit,
  skeleton,
  skeletonBody,
  skeletonHead,
  snail,
  worm,
  zombie,
  zombieBody,
  zombieHead,
} from './animals/index.ts'
import { air } from './core/index.ts'
import { acid, gunpowder, nitrogen, oil } from './chemistry/index.ts'
import { fire, lava, lightning, meteor, meteorite, shot } from './fire/index.ts'
import {
  anvil,
  backWindow,
  bench,
  hay,
  backwall,
  bed,
  boat,
  bookshelf,
  campfire,
  chair,
  door,
  fence,
  flowerpot,
  furnace,
  furnaceFire,
  glass,
  goldStatue,
  ladder,
  lamp,
  metal,
  mineWall,
  minePost,
  painting,
  plank,
  scarecrow,
  smoke,
  statue,
  table,
  tikiPole,
  torch,
  workbench,
} from './materials/index.ts'
import { flower, fruit, glowShroom, grass, seaweed, leaf, litter, mushroom, plant, seed, wheat, wheatRipe, wood } from './plants/index.ts'
import { amethyst, ash, coal, goldOre, ironOre, mud, saltpeter, sand, silverOre, soil, stone, sulfurOre } from './terrain/index.ts'
import type { ElementDefinition } from './types.ts'
import { cloud, ice, spring, steam, water } from './water/index.ts'

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
  stone,
  coal,
  ironOre,
  silverOre,
  goldOre,
  sulfurOre,
  saltpeter,
  amethyst,
  mud,
  ash,
  // Water
  water,
  spring,
  ice,
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
  wheat,
  wheatRipe,
  flower,
  mushroom,
  glowShroom,
  seaweed,
  // Animals
  bird,
  bee,
  beehive,
  butterfly,
  fish,
  worm,
  rabbit,
  frog,
  duck,
  snail,
  bat,
  sheep,
  sheepShorn,
  cow,
  chicken,
  chick,
  egg,
  firefly,
  human,
  humanBody,
  humanTorch,
  merchantBody,
  humanHead,
  zombie,
  zombieBody,
  zombieHead,
  skeleton,
  skeletonBody,
  skeletonHead,
  // Fire
  fire,
  smoke,
  campfire,
  lava,
  lightning,
  shot,
  meteor,
  meteorite,
  // Chemistry
  oil,
  acid,
  nitrogen,
  gunpowder,
  // Materials
  metal,
  glass,
  plank,
  backwall,
  mineWall,
  minePost,
  torch,
  door,
  ladder,
  fence,
  lamp,
  bed,
  backWindow,
  painting,
  table,
  chair,
  bookshelf,
  flowerpot,
  boat,
  furnace,
  furnaceFire,
  workbench,
  anvil,
  tikiPole,
  statue,
  goldStatue,
  scarecrow,
  bench,
  hay,
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
