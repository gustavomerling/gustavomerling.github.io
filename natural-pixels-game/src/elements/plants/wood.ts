import { Axe } from 'lucide-react'
import type { CellContext } from '../../engine/context.ts'
import { CROWN, CROWN_LEAF, POLLINATED } from './leaf.ts'
import { TISSUE_GROUP, absorbWater, drinkFromSoil, sunlight } from './tissue.ts'
import type { ElementDefinition } from '../types.ts'
import { soakPuddles } from '../materials/soak.ts'

/*
 * Wood `data` layout:
 *   bit 0     WOOD_TREE – grown by a tree: alive, has roots, absorbs water. Painted wood is inert.
 *   bit 1     WOOD_TOP  – the growing top of a trunk or branch
 *   bit 2     BRANCH    – a branch top (doesn't fork again)
 *   bits 3-7  height of the trunk in cells (0..31)
 *
 * The trunk grows tall, thin and nearly straight with just a tuft of leaves on top; up high
 * it forks into branches that spread outwards, and the full crown grows around them.
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
/** Trunks only fork once they're this tall: the crown is up top. */
export const BRANCH_MIN_HEIGHT = 20
const BRANCH_CHANCE = 0.3
/** How often the main trunk leans a cell sideways as it grows. */
const TRUNK_LEAN = 0.08
/** How often a branch keeps heading outwards (otherwise it grows straight up for a cell). */
const BRANCH_SPREAD = 0.6
/** A young trunk carries only a small tuft of leaves (generations to spread). */
const TUFT = CROWN | 1

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
    // Puddles against a trunk (or a wooden pile) soak in.
    soakPuddles(ctx)
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
  if (water < TRUNK_COST || ctx.random() >= TRUNK_CHANCE * sunlight(ctx)) return

  const isBranch = (data & BRANCH) !== 0
  // Branches keep heading the way they forked off; the trunk only rarely leans.
  let dx = 0
  if (isBranch) {
    if (ctx.random() < BRANCH_SPREAD) dx = outwards(ctx)
  } else if (ctx.random() < TRUNK_LEAN) dx = ctx.random() < 0.5 ? -1 : 1
  // Bare trunk below, full crown up top.
  const crown = isBranch || height >= BRANCH_MIN_HEIGHT ? CROWN_LEAF : TUFT

  // Fully grown (or blocked): spend the water keeping the crown full instead,
  // replacing old leaves as they fall.
  if (height >= MAX_HEIGHT || !canGrowInto(ctx.get(dx, -1))) {
    renewCrown(ctx, 0, -1, CROWN_LEAF)
    ctx.setWater(0, 0, water - (TRUNK_COST >> 1))
    return
  }

  ctx.set(dx, -1, 'wood', { water: TRUNK_COST >> 1, data: trunkTop(height + 1, isBranch) })
  ctx.setData(0, 0, data & ~WOOD_TOP)
  ctx.setWater(0, 0, water - TRUNK_COST)
  renewCrown(ctx, dx, -2, crown)
  // Below the crown the trunk stays bare: the tuft it just outgrew dries up and drops.
  if (crown === TUFT) {
    for (const side of [-1, 1]) {
      for (const dy of [0, 1]) if (ctx.get(side, dy) === 'leaf') ctx.set(side, dy, 'litter')
    }
  }

  if (!isBranch && height >= BRANCH_MIN_HEIGHT && ctx.random() < BRANCH_CHANCE) {
    const side = ctx.random() < 0.5 ? -1 : 1
    if (canGrowInto(ctx.get(side, -1))) {
      ctx.set(side, -1, 'wood', { water: TRUNK_COST >> 1, data: trunkTop(height + 1, true) })
      renewCrown(ctx, side, -2, CROWN_LEAF)
    }
  }
}

/** The way a branch has been heading: away from the wood it grew out of. */
function outwards(ctx: CellContext): number {
  const tree = (dx: number) => ctx.get(dx, 1) === 'wood' && (ctx.data(dx, 1) & WOOD_TREE) !== 0
  if (tree(1) && !tree(-1)) return -1
  if (tree(-1) && !tree(1)) return 1
  return ctx.random() < 0.5 ? -1 : 1
}

function canGrowInto(id: string | null): boolean {
  return id === 'air' || id === 'leaf'
}

/** Plants a fresh crown leaf (or recharges an existing one) so the canopy follows the top. */
function renewCrown(ctx: CellContext, dx: number, dy: number, leaf: number) {
  const id = ctx.get(dx, dy)
  if (id === 'air') ctx.set(dx, dy, 'leaf', { water: 20, data: leaf })
  else if (id === 'leaf') ctx.setData(dx, dy, leaf | (ctx.data(dx, dy) & POLLINATED))
}
