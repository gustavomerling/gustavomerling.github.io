import { NIGHT } from '../shared.ts'
import type { Body } from './body.ts'
import { HOUSE_COST, craft, plankWorth, planksToBuild } from './craft.ts'
import type { TaskName } from './mind.ts'
import { build, canAffordHouse } from './tasks/build.ts'
import { chop } from './tasks/chop.ts'
import { gather } from './tasks/gather.ts'
import { plant, water } from './tasks/farm.ts'
import { eat, fish, forage } from './tasks/food.ts'
import { mine } from './tasks/mine.ts'
import { sleep } from './tasks/sleep.ts'
import type { Task } from './tasks/types.ts'
import { wander } from './tasks/wander.ts'

const idle: Task = { start: () => true, run: () => 'done' }

const TASKS: Record<TaskName, Task> = { idle, wander, sleep, forage, fish, chop, gather, mine, build, plant, water }

/** Tasks that go somewhere: when one fails, that place is avoided for a while. */
const ERRANDS: ReadonlySet<TaskName> = new Set(['forage', 'fish', 'chop', 'gather', 'mine', 'plant', 'water'])
/** Actions a place it couldn't reach is avoided (~50 s). */
const AVOID_ACTIONS = 600
const MAX_AVOID = 8

/** Eats when this hungry (and carrying food); goes looking for food a bit later. */
const EAT_AT = 50
const HUNT_AT = 60
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

  if (night && mind.task !== 'sleep') {
    begin(body, 'sleep')
    mind.want = null
  }
  if (mind.hunger >= EAT_AT) eat(mind)
  if (mind.task === 'idle') choose(body)

  for (const p of mind.avoid) p.ttl--
  mind.avoid = mind.avoid.filter((p) => p.ttl > 0)

  const status = TASKS[mind.task].run(body)
  if (status !== 'running') {
    if (status === 'failed' && mind.target && ERRANDS.has(mind.task)) {
      mind.avoid = [...mind.avoid.slice(1 - MAX_AVOID), { ...mind.target, ttl: AVOID_ACTIONS }]
    }
    mind.stuck = 0
    mind.task = 'idle'
    mind.target = null
    mind.timer = 0
    mind.phase = 0
    // Pick the next task right away, so it's never caught thinking about nothing.
    if (!night) choose(body)
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
  mind.want = null

  if (mind.hunger >= HUNT_AT && mind.inv.food === 0) {
    if (begin(body, 'forage') || begin(body, 'fish')) return
    mind.want = 'food'
  }

  if (!mind.home) {
    if ((mind.site || canAffordHouse(mind)) && begin(body, 'build')) return
    if (plankWorth(mind) < planksToBuild(mind)) {
      // Wood the player painted comes first: it's a gift, and closer than any tree.
      if (begin(body, 'gather') || begin(body, 'chop')) return
      mind.want ??= 'wood'
    }
    if (mind.inv.stone < HOUSE_COST.stone && !mind.noStone) {
      if (begin(body, 'mine')) return
      if (mind.tools.pickaxe > 0) mind.want ??= 'stone'
    }
    if (begin(body, 'plant')) return
    begin(body, 'wander')
    return
  }

  // Settled: tend the saplings, keep stocks up, otherwise explore.
  const options: TaskName[] = ['water']
  if (mind.inv.seed > 0) options.push('plant')
  if (mind.inv.food < FOOD_STOCK) options.push(body.random() < 0.5 ? 'forage' : 'fish')
  if (plankWorth(mind) < PLANK_STOCK) options.push('gather', 'chop')
  if (mind.inv.stone < STONE_STOCK) options.push('mine')
  for (const task of options) if (begin(body, task)) return
  begin(body, 'wander')
}
