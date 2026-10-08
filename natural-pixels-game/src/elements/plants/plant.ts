import { Sprout } from 'lucide-react'
import type { CellContext } from '../../engine/context.ts'
import { CROWN_LEAF } from './leaf.ts'
import { TISSUE_GROUP, drinkFromSoil } from './tissue.ts'
import type { ElementDefinition } from '../types.ts'
import { WOOD_TREE, trunkTop } from './wood.ts'

/*
 * Plant `data` layout:
 *   bits 0-5  height above the seed (1 = sprout)
 *   bit 6     GROW_TIP  – the growing top of the stem
 *   bit 7     MATURE    – the crown formed; the stem is turning into wood
 */
const HEIGHT_MASK = 0x3f
export const GROW_TIP = 0x40
const MATURE = 0x80

const CAPACITY = 200
const ROOT_RATE = 4
/** Water spent to add one cell to the stem. */
const GROW_COST = 40
const GROW_CHANCE = 0.06
/** Below this height the plant never turns into a tree. */
const MIN_TREE_HEIGHT = 9
const SIDE_LEAF_CHANCE = 0.25
const WOOD_CHANCE = 0.03

export const plant: ElementDefinition = {
  id: 'plant',
  name: 'Plant',
  description: 'A growing stem. Keep it watered and it becomes a tree.',
  category: 'plants',
  matter: 'static',
  density: 20,
  color: { base: '#5fbf4a', variation: 0.12 },
  icon: Sprout,
  moisture: { capacity: CAPACITY, group: TISSUE_GROUP, absorbs: 'water', flow: 0.6, bias: 'up' },
  thermal: { conductivity: 0.05, burn: { at: 220, temp: 550, rate: 0.03 } },
  hidden: true,
  update(ctx) {
    drinkFromSoil(ctx, ROOT_RATE, CAPACITY)
    const data = ctx.data(0, 0)

    if (data & MATURE) {
      lignify(ctx)
    } else if (crownAbove(ctx)) {
      ctx.setData(0, 0, data | MATURE)
    } else if (data & GROW_TIP) {
      grow(ctx, data)
    }
  },
}

/** The tip climbs one cell at a time, paying water; tall enough, it forms a crown. */
function grow(ctx: CellContext, data: number) {
  const water = ctx.water(0, 0)
  if (water < GROW_COST || ctx.random() >= GROW_CHANCE) return
  const height = data & HEIGHT_MASK

  // Buried tips push straight up through the soil; only open air counts towards height.
  const buried = ctx.get(0, -1) === 'soil'

  // Taller plants are ever more likely to stop and become a tree (never underground).
  if (!buried && height >= MIN_TREE_HEIGHT && ctx.random() < (height - MIN_TREE_HEIGHT + 1) * 0.1) {
    ctx.set(0, 0, 'wood', { water: water - GROW_COST, data: trunkTop(height) })
    if (ctx.get(0, -1) === 'air') ctx.set(0, -1, 'leaf', { water: GROW_COST, data: CROWN_LEAF })
    return
  }

  const r = ctx.random()
  const dx = buried || r < 0.7 ? 0 : r < 0.85 ? -1 : 1
  const target = ctx.get(dx, -1)
  if (target !== 'air' && target !== 'soil') return

  // The stem takes the soil cell's place and keeps its moisture.
  const soaked = target === 'soil' ? ctx.water(dx, -1) : 0
  const nextHeight = buried ? height : Math.min(height + 1, HEIGHT_MASK)
  ctx.set(dx, -1, 'plant', { water: Math.min(CAPACITY, (GROW_COST >> 1) + soaked), data: GROW_TIP | nextHeight })
  ctx.setData(0, 0, data & ~GROW_TIP)
  ctx.setWater(0, 0, water - GROW_COST)
  if (buried) return

  // Young stems sprout small leaves on their sides.
  if (height >= 2 && ctx.random() < SIDE_LEAF_CHANCE) {
    const side = ctx.random() < 0.5 ? -1 : 1
    if (ctx.get(side, 0) === 'air') ctx.set(side, 0, 'leaf', { water: 10, data: 0 })
  }
}

/** True when wood (the crown base) or an already-mature stem sits right above. */
function crownAbove(ctx: CellContext): boolean {
  for (let dx = -1; dx <= 1; dx++) {
    const above = ctx.get(dx, -1)
    if (above === 'wood' || (above === 'plant' && ctx.data(dx, -1) & MATURE)) return true
  }
  return false
}

/**
 * Mature stem turns into wood from the ground up: only once wood or soil is below
 * (diagonals count, since stems can grow slanted).
 */
function lignify(ctx: CellContext) {
  if (ctx.random() >= WOOD_CHANCE) return
  for (let dx = -1; dx <= 1; dx++) {
    const below = ctx.get(dx, 1)
    if (below === 'soil' || below === 'wood') {
      ctx.set(0, 0, 'wood', { water: ctx.water(0, 0), data: WOOD_TREE })
      return
    }
  }
}
