import { NIGHT } from '../shared.ts'
import type { Body } from './body.ts'
import { HOUSE_COST, craft, plankWorth } from './craft.ts'
import type { TaskName } from './mind.ts'
import { build, canAffordHouse } from './tasks/build.ts'
import { chop } from './tasks/chop.ts'
import { plant, water } from './tasks/farm.ts'
import { eat, fish, forage } from './tasks/food.ts'
import { mine } from './tasks/mine.ts'
import { sleep } from './tasks/sleep.ts'
import type { Task } from './tasks/types.ts'
import { wander } from './tasks/wander.ts'

const idle: Task = { start: () => true, run: () => 'done' }

const TASKS: Record<TaskName, Task> = { idle, wander, sleep, forage, fish, chop, mine, build, plant, water }

/** Eats when this hungry (and carrying food); goes looking for food a bit later. */
const EAT_AT = 50
const HUNT_AT = 60
/** Planks to collect before building: the house plus a couple of tools. */
const PLANKS_TO_BUILD = HOUSE_COST.plank + 6
/** Stock it likes to keep once settled. */
const PLANK_STOCK = 20
const STONE_STOCK = 12
const FOOD_STOCK = 4

/**
 * One action of the human's life. Minecraft survival in priority order:
 * sleep at night → don't starve → (homeless) gather wood, craft tools, mine stone, build →
 * (settled) farm, keep stocks up, explore.
 */
export function think(body: Body) {
  const { mind } = body
  const night = body.light() < NIGHT

  if (night && mind.task !== 'sleep') begin(body, 'sleep')
  if (mind.hunger >= EAT_AT) eat(mind)
  if (mind.task === 'idle') choose(body)

  const status = TASKS[mind.task].run(body)
  if (status !== 'running') {
    mind.task = 'idle'
    mind.target = null
    mind.timer = 0
    mind.phase = 0
  }
}

function begin(body: Body, task: TaskName): boolean {
  if (!TASKS[task].start(body)) return false
  body.mind.task = task
  return true
}

function choose(body: Body) {
  const { mind } = body
  craft(mind)

  if (mind.hunger >= HUNT_AT && mind.inv.food === 0 && (begin(body, 'forage') || begin(body, 'fish'))) return

  if (!mind.home) {
    if ((mind.site || canAffordHouse(mind)) && begin(body, 'build')) return
    if (plankWorth(mind) < PLANKS_TO_BUILD && begin(body, 'chop')) return
    if (mind.inv.stone < HOUSE_COST.stone && !mind.noStone && begin(body, 'mine')) return
    if (begin(body, 'plant')) return
    begin(body, 'wander')
    return
  }

  // Settled: tend the saplings, keep stocks up, otherwise explore.
  const options: TaskName[] = ['water']
  if (mind.inv.seed > 0) options.push('plant')
  if (mind.inv.food < FOOD_STOCK) options.push(body.random() < 0.5 ? 'forage' : 'fish')
  if (plankWorth(mind) < PLANK_STOCK) options.push('chop')
  if (mind.inv.stone < STONE_STOCK) options.push('mine')
  for (const task of options) if (begin(body, task)) return
  begin(body, 'wander')
}
