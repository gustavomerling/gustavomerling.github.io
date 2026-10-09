import { isCreature, isGround, type Body } from '../body.ts'
import type { Point } from '../mind.ts'
import { groundBelow } from '../senses.ts'
import { approach, patienceFor, type Task } from './types.ts'
import { note } from '../skills.ts'

/*
 * The artesian well: once it has a farm, it drills a narrow well just past the far end of it.
 * A column dug straight down, lined with stone on both sides, with a plank rim at the top and
 * an artesian spring at the bottom (see water/spring.ts): the water rises by itself up to the
 * rim and refills as it's drawn, so watering the wheat is a short walk.
 *
 * It drills from the top (a borehole), one block or one swing per action.
 */

/** Depth of the shaft below the ground, down to the spring. */
const DEPTH = 6
/** How far past the end of the farm the well goes. */
const GAP = 2
/** It drills standing this far to the side (never on the well or its lining). */
const STAND_OFF = 3
/** What it takes: stone lining both sides all the way down, and two planks for the rim. */
export const WELL_COST = { stone: 2 * (DEPTH + 1), plank: 2 }
/** Actions per block: earth by hand, rock by pickaxe (each tier divides it). */
const SOFT_ACTIONS = 1
const ROCK_ACTIONS = 8

const SOFT: ReadonlySet<string | null> = new Set(['soil', 'sand', 'mud', 'ash', 'snow', 'grass', 'flower', 'litter', 'seed'])
const ROCK: ReadonlySet<string | null> = new Set(['stone', 'ice', 'coal', 'iron_ore', 'silver_ore', 'gold_ore', 'sulfur_ore', 'saltpeter', 'amethyst'])
/** Never drilled through: it'd ruin something (or flood). */
const NOT_HERE: ReadonlySet<string | null> = new Set(['water', 'wood', 'plank', 'backwall', 'fence', 'wheat', 'wheat_ripe', 'mine_wall', 'mine_post', 'ladder', 'boat', 'campfire', 'tiki_pole', 'statue', 'gold_statue', 'furnace', 'workbench', 'anvil', 'scarecrow', 'bench'])

/** One step of the work: what goes where. */
interface Job extends Point {
  /** 'air' = dig it out. */
  id: 'air' | 'stone' | 'plank' | 'spring'
}

/** Where the well goes (just past the far end of the farm), or null if it can't go there. */
function site(body: Body): Point | null {
  const { home, farm } = body.mind
  if (!home || !farm) return null
  const right = (farm.x0 + farm.x1) / 2 > home.x
  const x = right ? farm.x1 + GAP + 1 : farm.x0 - GAP - 1
  const ground = groundBelow(body, x, farm.ground - 8, 16)
  if (ground === null) return null
  for (let dx = -1; dx <= 1; dx++) {
    for (let y = ground - 1; y <= ground + DEPTH; y++) if (NOT_HERE.has(body.get(x + dx, y))) return null
  }
  return { x, y: ground }
}

/** Everything to do, in order: line and dig each row down, the spring, then the rim. */
function jobs(at: Point): Job[] {
  const list: Job[] = []
  for (let k = 0; k < DEPTH; k++) {
    const y = at.y + k
    list.push({ x: at.x - 1, y, id: 'stone' }, { x: at.x + 1, y, id: 'stone' }, { x: at.x, y, id: 'air' })
  }
  const bottom = at.y + DEPTH
  list.push(
    { x: at.x - 1, y: bottom, id: 'stone' },
    { x: at.x + 1, y: bottom, id: 'stone' },
    { x: at.x, y: bottom, id: 'spring' },
    { x: at.x - 1, y: at.y - 1, id: 'plank' },
    { x: at.x + 1, y: at.y - 1, id: 'plank' },
  )
  return list
}

/** Has a farm, but no well yet, and the stone and planks for one. */
export function wantsWell(body: Body): boolean {
  const { mind } = body
  return !!mind.farm && !mind.well && mind.inv.stone >= WELL_COST.stone && mind.inv.plank >= WELL_COST.plank
}

export const well: Task = {
  start(body) {
    const { mind } = body
    if (!wantsWell(body)) return false
    const at = site(body)
    if (!at || !mind.farm) return false
    mind.wellAt = at
    const away = Math.sign(at.x - (mind.farm.x0 + mind.farm.x1) / 2) || 1
    mind.target = { x: at.x + away * STAND_OFF, y: at.y - 1 }
    mind.patience = patienceFor(body, mind.target)
    mind.phase = 0
    mind.work = 0
    mind.timer = 0
    return true
  },
  run(body) {
    const { mind } = body
    const at = mind.wellAt
    if (!mind.target || !at) return 'failed'
    const status = approach(body)
    if (status !== 'arrived') return status
    const list = jobs(at)
    const job = list[mind.phase]
    if (!job) {
      mind.well = at
      note(mind, 'Drilled an artesian well: fresh water by the farm.', 'home')
      return 'done'
    }
    const id = body.get(job.x, job.y)
    if (isCreature(id)) return 'running'
    if (id === job.id) {
      mind.phase++
      return 'running'
    }
    // Whatever's there comes out first (rock takes a few swings).
    if (job.id !== 'air' || isGround(id)) {
      if (NOT_HERE.has(id)) return 'failed'
      const cost = ROCK.has(id) ? Math.ceil(ROCK_ACTIONS / Math.max(1, mind.tools.pickaxe)) : SOFT.has(id) || !isGround(id) ? SOFT_ACTIONS : 0
      if (!cost) return 'failed'
      if (++mind.work < cost) return 'running'
      mind.work = 0
      if (id === 'stone') mind.inv.stone++
    }
    if (job.id === 'stone') {
      if (mind.inv.stone < 1) return 'failed'
      mind.inv.stone--
    } else if (job.id === 'plank') {
      if (mind.inv.plank < 1) return 'failed'
      mind.inv.plank--
    }
    body.set(job.x, job.y, job.id)
    mind.phase++
    return 'running'
  },
}
