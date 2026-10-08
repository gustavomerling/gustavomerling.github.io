import { isGround, type Body } from '../body.ts'
import { halfWidth, type House } from '../house.ts'
import type { Point } from '../mind.ts'
import { avoided } from '../senses.ts'
import { approach, type Task } from './types.ts'

/*
 * Levelling the yard: for 10 columns on each side of the house, the ground is brought to the
 * height of its foundation. Mounds are dug away (the earth goes into the inventory) and dips
 * are filled in with whatever the house stands on (soil, sand, stone...).
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
])

type Job = { dig: boolean; at: Point }

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

/** The next mound to dig (topmost cell first) or dip to fill (lowest cell first). */
function nextJob(body: Body, house: House): Job | null {
  const g = house.ground
  const { mind } = body
  let fill: Job | null = null
  for (const x of yard(house)) {
    if (avoided(mind, x, g) || untouchable(body, x, g)) continue
    // A mound: ground above the foundation's level (but not a whole hill).
    let top = g
    while (top > g - MAX_DIG - 1 && isGround(body.get(x, top - 1))) top--
    if (top < g) {
      if (top > g - MAX_DIG - 1 && EARTH.has(body.get(x, top))) return { dig: true, at: { x, y: top } }
      continue
    }
    // A dip: open space at or below the foundation's level.
    if (fill || isGround(body.get(x, g))) continue
    let bottom = g
    while (bottom < g + MAX_FILL && !isGround(body.get(x, bottom + 1))) bottom++
    if (bottom < g + MAX_FILL || isGround(body.get(x, bottom + 1))) fill = { dig: false, at: { x, y: bottom } }
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
    mind.phase = job.dig ? 1 : 0
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

    if (mind.phase === 1) {
      const id = body.get(x, y)
      if (!EARTH.has(id)) return 'done'
      const result = body.dig(x, y)
      if (result === 'blocked') return 'failed'
      if (result === 'working') return 'running'
      // Stone goes to the stone pile (dig() does that); the rest is earth for filling.
      if (id !== 'stone') mind.inv.earth++
    } else {
      if (isGround(body.get(x, y)) || mind.inv.earth <= 0) return 'done'
      body.set(x, y, yardMaterial(body, home))
      mind.inv.earth--
    }
    // Keep going while there's more to do within reach of here.
    const next = nextJob(body, home)
    if (!next || Math.abs(next.at.x - body.x) > 3) return 'done'
    mind.target = next.at
    mind.phase = next.dig ? 1 : 0
    return 'running'
  },
}
