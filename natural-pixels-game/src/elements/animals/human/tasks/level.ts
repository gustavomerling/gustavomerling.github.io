import { HEIGHT, isCreature, isGround, type Body } from '../body.ts'
import { halfWidth, type House } from '../house.ts'
import type { Point } from '../mind.ts'
import { avoided } from '../senses.ts'
import { approach, type Task } from './types.ts'

/*
 * Levelling the yard: for 10 columns on each side of the house, the ground is brought to the
 * height of its foundation. Mounds are dug away (the earth goes into the inventory) and dips
 * are filled in with whatever the house stands on (soil, sand, stone...): it drops the earth
 * into the mouth of the dip and lets it fall to the bottom. Dry leaves piled up in the yard
 * are swept away (they aren't kept).
 */

/** Columns levelled on each side of the house. */
const YARD = 10
/** Dips deeper than this are left alone (that's a pond or a ravine, not a dip). */
const MAX_FILL = 4
/** Mounds taller than this are left alone (that's a hill). */
const MAX_DIG = 6

/** Ground it can level with and dig away. */
const EARTH: ReadonlySet<string | null> = new Set(['soil', 'sand', 'mud', 'ash', 'snow', 'stone'])
/** Columns with these nearby are left alone. */
const HANDS_OFF: ReadonlySet<string | null> = new Set([
  'water',
  'wood',
  'plank',
  'backwall',
  'door',
  'fence',
  'wheat',
  'wheat_ripe',
  'boat',
  // What it built in the yard (see decor.ts).
  'campfire',
  'tiki_pole',
  'statue',
  'gold_statue',
  'furnace',
  'workbench',
  'anvil',
  'ladder',
  'scarecrow',
  'bench',
  'lamp',
])

/** Mind.phase for each kind of job. */
const FILL = 0
const DIG = 1
const SWEEP = 2

type Job = { phase: number; at: Point }

/** What the house stands on (most common ground under it); soil if nothing obvious. */
export function yardMaterial(body: Body, house: House): string {
  const counts = new Map<string, number>()
  const half = halfWidth(house.stage)
  for (let dx = -half - 1; dx <= half + 1; dx++) {
    for (let dy = 1; dy <= 3; dy++) {
      const id = body.get(house.x + dx, house.ground + dy)
      if (id && EARTH.has(id)) counts.set(id, (counts.get(id) ?? 0) + 1)
    }
  }
  let best = 'soil'
  let most = 0
  for (const [id, n] of counts) if (n > most) [best, most] = [id, n]
  return best
}

/** The yard columns, nearest to the house first. */
function yard(house: House): number[] {
  const half = halfWidth(house.stage)
  const cols: number[] = []
  for (let n = 1; n <= YARD; n++) cols.push(house.x + half + n, house.x - half - n)
  return cols
}

function untouchable(body: Body, x: number, ground: number): boolean {
  const farm = body.mind.farm
  if (farm && x >= farm.x0 - 1 && x <= farm.x1 + 1) return true
  for (let y = ground - MAX_DIG; y <= ground + MAX_FILL; y++) if (HANDS_OFF.has(body.get(x, y))) return true
  return false
}

/** Dry leaves lying on the ground (a pile counts from its top), not caught up in a tree. */
const SWEEP_ABOVE = 3

/** Dry leaves lying on the ground in the column (the top of the pile), or null. */
function leaves(body: Body, x: number, g: number): Point | null {
  for (let y = g - SWEEP_ABOVE; y <= g + MAX_FILL; y++) {
    if (body.get(x, y) !== 'litter') continue
    // Resting on the ground or on more dry leaves, not on a branch or in the leaves of a tree.
    let below = y + 1
    while (body.get(x, below) === 'litter') below++
    const ground = body.get(x, below)
    return isGround(ground) && ground !== 'leaf' && ground !== 'plank' ? { x, y } : null
  }
  return null
}

/** Someone stands in the column: no dropping earth on their head. */
function occupied(body: Body, x: number, g: number): boolean {
  for (let y = g - HEIGHT; y <= g + MAX_FILL; y++) if (isCreature(body.get(x, y))) return true
  return false
}

/** The next pile of leaves to sweep, mound to dig (topmost cell first) or dip to fill (at its mouth). */
function nextJob(body: Body, house: House): Job | null {
  const g = house.ground
  const { mind } = body
  let fill: Job | null = null
  for (const x of yard(house)) {
    if (avoided(mind, x, g) || untouchable(body, x, g)) continue
    const litter = leaves(body, x, g)
    if (litter) return { phase: SWEEP, at: litter }
    // A mound: ground above the foundation's level (but not a whole hill).
    let top = g
    while (top > g - MAX_DIG - 1 && isGround(body.get(x, top - 1))) top--
    if (top < g) {
      if (top > g - MAX_DIG - 1 && EARTH.has(body.get(x, top))) return { phase: DIG, at: { x, y: top } }
      continue
    }
    // A dip: open space at the foundation's level, with a bottom not too far down.
    if (fill || isGround(body.get(x, g)) || occupied(body, x, g)) continue
    let bottom = g
    while (bottom < g + MAX_FILL && !isGround(body.get(x, bottom + 1))) bottom++
    if (bottom < g + MAX_FILL || isGround(body.get(x, bottom + 1))) fill = { phase: FILL, at: { x, y: g } }
  }
  return fill && mind.inv.earth > 0 ? fill : null
}

/** Level the ground around the house, one cell at a time. */
export const level: Task = {
  start(body) {
    const { mind } = body
    if (!mind.home) return false
    const job = nextJob(body, mind.home)
    if (!job) return false
    mind.target = job.at
    mind.phase = job.phase
    mind.patience = 150
    mind.work = 0
    return true
  },
  run(body) {
    const { mind } = body
    const home = mind.home
    if (!home || !mind.target) return 'failed'
    const status = approach(body)
    if (status !== 'arrived') return status
    const { x, y } = mind.target

    if (mind.phase === SWEEP) {
      if (body.get(x, y) === 'litter') body.set(x, y, 'air')
    } else if (mind.phase === DIG) {
      const id = body.get(x, y)
      if (!EARTH.has(id)) return 'done'
      const result = body.dig(x, y)
      if (result === 'blocked') return 'failed'
      if (result === 'working') return 'running'
      // Stone goes to the stone pile (dig() does that); the rest is earth for filling.
      if (id !== 'stone') mind.inv.earth++
    } else {
      if (isGround(body.get(x, y)) || mind.inv.earth <= 0 || occupied(body, x, home.ground)) return 'done'
      // Dropped into the mouth of the dip, it falls to the bottom by itself.
      body.set(x, y, yardMaterial(body, home))
      mind.inv.earth--
    }
    // Keep going while there's more to do within reach of here.
    const next = nextJob(body, home)
    if (!next || Math.abs(next.at.x - body.x) > 3) return 'done'
    mind.target = next.at
    mind.phase = next.phase
    return 'running'
  },
}
