import { NIGHT } from '../shared.ts'
import type { Body } from './body.ts'
import { HOUSE_COST, craft, plankWorth, planksToBuild } from './craft.ts'
import { halfWidth, MAX_STAGE } from './house.ts'
import { randomName, type TaskName } from './mind.ts'
import { findNearest } from './senses.ts'
import { build, canAfford, nextHouse, planHouse } from './tasks/build.ts'
import { chop, chopAt } from './tasks/chop.ts'
import { fight, hide, nearestZombie, scavenge, THREAT_RANGE } from './tasks/combat.ts'
import { plant, water } from './tasks/farm.ts'
import { field } from './tasks/field.ts'
import { gather } from './tasks/gather.ts'
import { level } from './tasks/level.ts'
import { eat, fish, forage } from './tasks/food.ts'
import { mine } from './tasks/mine.ts'
import { relax } from './tasks/relax.ts'
import { sleep } from './tasks/sleep.ts'
import type { Task } from './tasks/types.ts'
import { wander } from './tasks/wander.ts'

const idle: Task = { start: () => true, run: () => 'done' }

const TASKS: Record<TaskName, Task> = {
  idle,
  wander,
  sleep,
  forage,
  fish,
  chop,
  gather,
  mine,
  build,
  plant,
  water,
  relax,
  farm: field,
  fight,
  hide,
  scavenge,
  level,
}

/** Tasks that go somewhere: when one fails, that place is avoided for a while. */
const ERRANDS: ReadonlySet<TaskName> = new Set(['forage', 'fish', 'chop', 'gather', 'mine', 'plant', 'water', 'farm', 'scavenge'])
/** Actions a place it couldn't reach is avoided (~50 s). */
const AVOID_ACTIONS = 600
const MAX_AVOID = 8

/** Eats when this hungry (and carrying food); goes looking for food a bit later. */
const EAT_AT = 50
const HUNT_AT = 60
/** Stock it likes to keep once settled (more when saving up for the next house stage). */
const PLANK_STOCK = 20
const STONE_STOCK = 12
const FOOD_STOCK = 4
/** Rain heavier than this sends it home; from this light on in the evening it heads home too. */
const SHELTER_RAIN = 0.3
const EVENING = 0.55
/** Chance, when nothing's pressing, of spending a while at home. */
const HOMEBODY = 0.2
/** Greets other humans this close, then not again for a while. */
const GREET_RANGE = 6
const GREET_EVERY = 900
const SAY_ACTIONS = 30
/** Faces zombies only feeling this healthy (and brave enough). */
const FIGHT_HEALTH = 50
/** Courage below this means it'd rather hide. */
const BRAVE = 0.35
/** Morning: a new day, a new night's sleep ahead. */
const DAYTIME = 0.5

/**
 * One action of the human's life. Minecraft survival in priority order:
 * sleep at night → don't starve → (homeless) gather wood, craft tools, mine stone, build →
 * (settled) shelter from rain, grow the house, farm, keep stocks up, spend time at home, explore.
 */
export function think(body: Body) {
  const { mind } = body
  const night = body.light() < NIGHT
  mind.name ||= randomName(() => body.random())
  if (mind.courage < 0) mind.courage = body.random()
  if (mind.hurt > 0) mind.hurt--
  if (body.light() > DAYTIME) mind.slept = false

  if (night && !mind.slept && mind.task !== 'sleep' && mind.task !== 'fight' && mind.task !== 'hide') {
    begin(body, 'sleep')
    mind.want = null
  }
  // A zombie! Fight it or run home (and wake up for it).
  if (mind.task !== 'fight' && mind.task !== 'hide' && nearestZombie(body, THREAT_RANGE)) {
    mind.asleep = false
    const armed = mind.tools.sword > 0 || (mind.tools.gun && mind.inv.gunpowder > 0)
    const brave = mind.courage >= BRAVE && mind.health >= FIGHT_HEALTH && (armed || !mind.home)
    if (!(brave && begin(body, 'fight')) && !begin(body, 'hide')) begin(body, 'fight')
  }
  if (mind.hunger >= EAT_AT) eat(mind)
  socialize(body)
  if (mind.task === 'idle') choose(body)

  for (const p of mind.avoid) p.ttl--
  mind.avoid = mind.avoid.filter((p) => p.ttl > 0)

  const task = mind.task
  const status = TASKS[task].run(body)
  if (status !== 'running') {
    if (status === 'failed' && mind.target && ERRANDS.has(task)) {
      mind.avoid = [...mind.avoid.slice(1 - MAX_AVOID), { ...mind.target, ttl: AVOID_ACTIONS }]
    }
    if (status === 'done' && task === 'build') welcomeFamily(body)
    mind.stuck = 0
    mind.task = 'idle'
    mind.target = null
    mind.timer = 0
    mind.phase = 0
    // Pick the next task right away, so it's never caught thinking about nothing.
    if (!night || mind.slept) choose(body)
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
    if (begin(body, 'farm') || begin(body, 'forage') || begin(body, 'fish')) return
    mind.want = 'food'
  }

  if (!mind.home) {
    // Missing stone can be made up for with planks (a wooden foundation).
    const stoneShort = mind.noStone ? 0 : Math.max(0, HOUSE_COST.stone - mind.inv.stone)
    const affordable = plankWorth(mind) >= HOUSE_COST.plank + stoneShort
    if ((mind.site || affordable) && begin(body, 'build')) return
    if (plankWorth(mind) < planksToBuild(mind)) {
      // Wood the player painted comes first: it's a gift, and closer than any tree.
      if (begin(body, 'gather') || begin(body, 'chop')) return
      mind.want ??= 'wood'
    }
    if (mind.inv.stone < HOUSE_COST.stone && !mind.noStone && plankWorth(mind) < planksToBuild(mind) + HOUSE_COST.stone) {
      if (begin(body, 'mine')) return
      if (mind.tools.pickaxe > 0) mind.want ??= 'stone'
    }
    if (begin(body, 'plant')) return
    begin(body, 'wander')
    return
  }

  // Settled. Up at night: mostly at home, sometimes a stroll with a torch.
  const light = body.light()
  if (light < NIGHT) {
    if (body.random() < 0.6 && begin(body, 'relax')) return
    begin(body, 'wander')
    return
  }
  // Rain or evening: home.
  if ((body.rain() > SHELTER_RAIN || light < EVENING) && begin(body, 'relax')) return

  // Grow the house when it can; otherwise save up for it (and clear trees out of the way).
  let plankGoal = PLANK_STOCK
  let stoneGoal = STONE_STOCK
  if (mind.site && begin(body, 'build')) return
  const next = nextHouse(body)
  if (next) {
    const plan = planHouse(body, next)
    if (canAfford(mind, plan) && begin(body, 'build')) return
    if (plan.tree && chopAt(body, plan.tree)) {
      mind.task = 'chop'
      return
    }
    if (!plan.blocked) {
      plankGoal = Math.max(plankGoal, plan.plank + 6)
      stoneGoal = Math.max(stoneGoal, plan.stone + 2)
    }
  }

  const options: TaskName[] = ['scavenge', 'level', 'farm', 'water']
  if (mind.inv.seed > 0) options.push('plant')
  if (mind.inv.food < FOOD_STOCK) options.push(body.random() < 0.5 ? 'forage' : 'fish')
  if (plankWorth(mind) < plankGoal) options.push('gather', 'chop')
  if (mind.inv.stone < stoneGoal) options.push('mine')
  if (body.random() < HOMEBODY) options.unshift('relax')
  for (const task of options) if (begin(body, task)) return
  if (body.random() < 0.35 && begin(body, 'relax')) return
  begin(body, 'wander')
}

/** Says hi to another human nearby (by name), now and then. */
function socialize(body: Body) {
  const { mind } = body
  if (mind.say && --mind.say.ttl <= 0) mind.say = null
  if (mind.greetIn > 0) {
    mind.greetIn--
    return
  }
  const self = { x: body.x, y: body.y }
  const other = findNearest(body, GREET_RANGE, (x, y) => (x !== self.x || y !== self.y) && body.get(x, y) === 'human')
  if (!other) return
  const friend = body.mindAt(other.x, other.y)
  mind.say = { text: friend?.name ? `Hi, ${friend.name}!` : 'Hello!', ttl: SAY_ACTIONS }
  mind.greetIn = GREET_EVERY
}

/** A bigger house draws family: from stage 3 on, someone new moves in with each stage. */
function welcomeFamily(body: Body) {
  const { mind } = body
  const home = mind.home
  if (!home || home.stage < 3 || mind.family >= home.stage - 2) return
  const x = home.x - halfWidth(home.stage) + 3
  const y = home.ground - 1
  if (body.get(x, y) !== 'backwall' && body.get(x, y) !== 'air') return
  body.cover(x, y, 'human')
  const newcomer = body.mindAt(x, y)
  if (!newcomer) return
  newcomer.home = { ...home }
  do newcomer.name = randomName(() => body.random())
  while (newcomer.name === mind.name)
  newcomer.inv.food = 2
  newcomer.tools = { ...mind.tools }
  newcomer.say = { text: `Hi, I'm ${newcomer.name}!`, ttl: SAY_ACTIONS * 2 }
  mind.family++
  // Only the founder of the house welcomes newcomers.
  newcomer.family = MAX_STAGE
  mind.say = { text: `Welcome, ${newcomer.name}!`, ttl: SAY_ACTIONS * 2 }
}
