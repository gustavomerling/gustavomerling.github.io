import { Axe } from 'lucide-react'
import type { CellContext } from '../../engine/context.ts'
import { CROWN_LEAF, POLLINATED } from './leaf.ts'
import { TISSUE_GROUP, absorbWater, drinkFromSoil } from './tissue.ts'
import type { ElementDefinition } from '../types.ts'

/*
 * Wood `data` layout:
 *   bit 0     WOOD_TREE – grown by a tree: alive, has roots, absorbs water. Painted wood is inert.
 *   bit 1     WOOD_TOP  – the growing top of a trunk or branch
 *   bit 2     BRANCH    – a branch top (doesn't fork again)
 *   bits 3-7  height of the trunk in cells (0..31)
 */
export const WOOD_TREE = 0x01
const WOOD_TOP = 0x02
const BRANCH = 0x04
const HEIGHT_SHIFT = 3
const MAX_HEIGHT = 31

const CAPACITY = 220
const ROOT_RATE = 4
/** Water spent to add one cell to the trunk. Slower and pricier than a sapling. */
const TRUNK_COST = 60
const TRUNK_CHANCE = 0.025
/** Trunks only fork once they're this tall. */
const BRANCH_MIN_HEIGHT = 14
const BRANCH_CHANCE = 0.15

/** Data for the top of a trunk (or branch) at `height`. */
export function trunkTop(height: number, branch = false): number {
  return WOOD_TREE | WOOD_TOP | (branch ? BRANCH : 0) | (Math.min(height, MAX_HEIGHT) << HEIGHT_SHIFT)
}

export const wood: ElementDefinition = {
  id: 'wood',
  name: 'Wood',
  description: 'Solid timber. Trees grow it; you can build with it too.',
  category: 'plants',
  matter: 'static',
  density: 30,
  color: { base: '#7a5230', variation: 0.14 },
  icon: Axe,
  moisture: { capacity: CAPACITY, group: TISSUE_GROUP, flow: 0.6, bias: 'up' },
  // Burns slowly into ash. Living (wet) wood must dry out first.
  thermal: { conductivity: 0.05, burn: { at: 280, temp: 650, rate: 0.004, into: 'ash' } },
  update(ctx) {
    const data = ctx.data(0, 0)
    if (!(data & WOOD_TREE)) return
    drinkFromSoil(ctx, ROOT_RATE, CAPACITY)
    absorbWater(ctx, CAPACITY)
    if (data & WOOD_TOP) growTrunk(ctx, data)
  },
}

/**
 * While the tree has water, the trunk top keeps climbing (through its own leaves),
 * renewing the crown above it and sometimes forking a branch.
 */
function growTrunk(ctx: CellContext, data: number) {
  const water = ctx.water(0, 0)
  const height = data >> HEIGHT_SHIFT
  if (water < TRUNK_COST || ctx.random() >= TRUNK_CHANCE) return

  const isBranch = (data & BRANCH) !== 0
  const r = ctx.random()
  // Branches lean outwards more than the main trunk.
  const straight = isBranch ? 0.5 : 0.8
  const dx = r < straight ? 0 : r < (1 + straight) / 2 ? -1 : 1

  // Fully grown (or blocked): spend the water keeping the crown full instead,
  // replacing old leaves as they fall.
  if (height >= MAX_HEIGHT || !canGrowInto(ctx.get(dx, -1))) {
    renewCrown(ctx, 0, -1)
    ctx.setWater(0, 0, water - (TRUNK_COST >> 1))
    return
  }

  ctx.set(dx, -1, 'wood', { water: TRUNK_COST >> 1, data: trunkTop(height + 1, isBranch) })
  ctx.setData(0, 0, data & ~WOOD_TOP)
  ctx.setWater(0, 0, water - TRUNK_COST)
  renewCrown(ctx, dx, -2)

  if (!isBranch && height >= BRANCH_MIN_HEIGHT && ctx.random() < BRANCH_CHANCE) {
    const side = ctx.random() < 0.5 ? -1 : 1
    if (canGrowInto(ctx.get(side, -1))) {
      ctx.set(side, -1, 'wood', { water: TRUNK_COST >> 1, data: trunkTop(height + 1, true) })
      renewCrown(ctx, side, -2)
    }
  }
}

function canGrowInto(id: string | null): boolean {
  return id === 'air' || id === 'leaf'
}

/** Plants a fresh crown leaf (or recharges an existing one) so the canopy follows the top. */
function renewCrown(ctx: CellContext, dx: number, dy: number) {
  const id = ctx.get(dx, dy)
  if (id === 'air') ctx.set(dx, dy, 'leaf', { water: 20, data: CROWN_LEAF })
  else if (id === 'leaf') ctx.setData(dx, dy, CROWN_LEAF | (ctx.data(dx, dy) & POLLINATED))
}
