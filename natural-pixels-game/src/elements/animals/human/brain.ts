import { NIGHT } from '../shared.ts'
import type { Body } from './body.ts'
import { HOUSE_COST, craft, plankWorth, planksToBuild } from './craft.ts'
import { randomName, type TaskName } from './mind.ts'
import { findNearest } from './senses.ts'
import { build, canAfford, newSite, nextHouse, planHouse } from './tasks/build.ts'
import { chop, chopAt } from './tasks/chop.ts'
import { cook } from './tasks/cook.ts'
import { herd } from './tasks/herd.ts'
import { decorate } from './tasks/decor.ts'
import { fight, hide, nearestZombie, scavenge, THREAT_RANGE } from './tasks/combat.ts'
import { plant, water } from './tasks/farm.ts'
import { field } from './tasks/field.ts'
import { gather } from './tasks/gather.ts'
import { level } from './tasks/level.ts'
import { eat, edible, fish, forage } from './tasks/food.ts'
import { mine } from './tasks/mine.ts'
import { relax } from './tasks/relax.ts'
import { inMine, shaft, spawnBat, spawnSkeleton, sproutShroom, tendMine, WORN_OUT, wantsMine } from './tasks/shaft.ts'
import { contains, roofTop } from './house.ts'
import { well, wantsWell } from './tasks/well.ts'
import { sleep } from './tasks/sleep.ts'
import type { Task } from './tasks/types.ts'
import { wander } from './tasks/wander.ts'
import { note } from './skills.ts'
import { meet, welcomeNeighbour } from './village.ts'

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
  shaft,
  well,
  decorate,
  cook,
  herd,
}

/** Tasks that go somewhere: when one fails, that place is avoided for a while. */
const ERRANDS: ReadonlySet<TaskName> = new Set(['forage', 'fish', 'chop', 'gather', 'mine', 'plant', 'water', 'farm', 'scavenge', 'cook'])
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
const EVENING = 0.4
/** Chance, when nothing's pressing, of spending a while at home (never while saving for the house). */
const HOMEBODY = 0.06
/** With nothing else to do: chance of going home rather than for a walk. */
const IDLE_AT_HOME = 0.15
/** Up at night: chance of staying in rather than a stroll with a torch. */
const NIGHT_IN = 0.4
/** The next stage blocked this many times in a row (with no tree to chop): it builds somewhere else. */
const MOVE_AFTER = 12
/**
 * Tiredness: every waking action adds TIRE (tired out after ~6 minutes of easy days), hard work
 * more (the mine adds its own, see shaft.ts); relaxing takes a little off. Past SLEEPY it goes to
 * bed, whatever the time of day (see tasks/sleep.ts).
 */
const TIRE = 0.022
const HARD_WORK: Partial<Record<TaskName, number>> = {
  chop: 0.05,
  mine: 0.05,
  build: 0.035,
  level: 0.035,
  well: 0.04,
  decorate: 0.025,
  herd: 0.03,
  fight: 0.08,
}
const RELAX_OFF = 0.05
export const SLEEPY = 80
/** Chances per action, while it rests, that a skeleton, a bat or a glowing mushroom turns up down its mine. */
const SKELETON_CHANCE = 0.0015
const BAT_CHANCE = 0.002
const SHROOM_CHANCE = 0.003
/** At home in the evening (or at night), its chimney smokes: a puff this often. */
const CHIMNEY_SMOKE = 0.15
const CHIMNEY_LIGHT = 0.55
/** Now and then it goes mining just for treasure (silver and gold). */
const TREASURE_HUNT = 0.15
/** Greets other humans this close, then not again for a while. */
const GREET_RANGE = 6
const GREET_EVERY = 900
const SAY_ACTIONS = 30
/** Faces zombies only feeling this healthy (and brave enough). */
const FIGHT_HEALTH = 50
/** Down the mine it fights on unless it's this hurt. */
const RETREAT_HEALTH = 35
/** Courage below this means it'd rather hide. */
const BRAVE = 0.35
/** Tasks it doesn't drop to go to bed. */
const URGENT: ReadonlySet<TaskName> = new Set(['sleep', 'fight', 'hide', 'shaft'])

/**
 * One action of the human's life. Minecraft survival in priority order:
 * sleep at night → don't starve → (homeless) gather wood, craft tools, mine stone, build →
 * (settled) shelter from rain, grow the house, farm, keep stocks up, spend time at home, explore.
 */
export function think(body: Body) {
  const { mind } = body
  mind.name ||= randomName(() => body.random())
  mind.today = body.ctx.day()
  if (mind.courage < 0) mind.courage = body.random()
  if (mind.hurt > 0) mind.hurt--
  // (Old saves: mine fatigue is just tiredness now.)
  if (mind.mineTired !== undefined) {
    mind.tired = Math.max(mind.tired ?? 0, mind.mineTired)
    delete mind.mineTired
  }
  // Worn out: to bed, day or night (never in the middle of a fight; the mine sends it up itself).
  if ((mind.tired ?? 0) >= SLEEPY && !URGENT.has(mind.task)) {
    begin(body, 'sleep')
    mind.want = null
  }
  // A zombie! Fight it or run home (and wake up for it).
  if (mind.leaveZombies) mind.leaveZombies--
  // (After a fight it couldn't win, it only reacts to zombies right next to it for a while.)
  if (mind.task !== 'fight' && mind.task !== 'hide' && nearestZombie(body, mind.leaveZombies ? 3 : THREAT_RANGE)) {
    mind.asleep = false
    const armed = mind.tools.sword > 0 || (mind.tools.gun && mind.inv.gunpowder > 0)
    // Well armed (a stone or iron sword, a loaded musket), it stands its ground whatever its
    // nerve; and down the mine there's nowhere to hide anyway: it fights its way out.
    const wellArmed = mind.tools.sword >= 2 || (mind.tools.gun && mind.inv.gunpowder > 0)
    const inTheMine = !!mind.shaft && inMine(mind.shaft, body.x, body.y)
    const brave =
      (mind.health >= FIGHT_HEALTH && ((mind.courage >= BRAVE && (armed || !mind.home)) || wellArmed)) ||
      (inTheMine && mind.health >= RETREAT_HEALTH)
    if (!(brave && begin(body, 'fight')) && !begin(body, 'hide')) begin(body, 'fight')
  }
  if (mind.hunger >= EAT_AT) eat(mind)
  // Awake, it tires (hard work more); a quiet while at home takes a little off.
  const resting = mind.task === 'relax' || mind.task === 'sleep' || mind.asleep
  const down = !!mind.shaft && inMine(mind.shaft, body.x, body.y)
  if (!mind.asleep) {
    const tiring = mind.task === 'relax' ? -RELAX_OFF : TIRE + (HARD_WORK[mind.task] ?? 0)
    mind.tired = Math.min(100, Math.max(0, (mind.tired ?? 0) + tiring))
  }
  if (down) tendMine(body)
  // While it rests, the dark down there comes to life: skeletons, bats, glowing mushrooms.
  if (resting && !down && mind.shaft) {
    if (body.random() < SKELETON_CHANCE) spawnSkeleton(body)
    if (body.random() < BAT_CHANCE) spawnBat(body)
    if (body.random() < SHROOM_CHANCE) sproutShroom(body)
  }
  chimney(body, resting)
  welcomeNeighbour(body)
  body.tidyScaffold()
  socialize(body)
  if (mind.task === 'idle') choose(body)

  for (const p of mind.avoid) p.ttl--
  mind.avoid = mind.avoid.filter((p) => p.ttl > 0)

  const task = mind.task
  const status = TASKS[task].run(body)
  if (status !== 'running') {
    // Worn out down the mine: up and home to bed.
    const worn = task === 'shaft' && (mind.tired ?? 0) >= WORN_OUT
    if (status === 'failed' && mind.target && ERRANDS.has(task)) {
      mind.avoid = [...mind.avoid.slice(1 - MAX_AVOID), { ...mind.target, ttl: AVOID_ACTIONS }]
    }
    mind.stuck = 0
    mind.task = 'idle'
    mind.target = null
    mind.timer = 0
    mind.phase = 0
    // Pick the next task right away, so it's never caught thinking about nothing.
    if ((worn || (mind.tired ?? 0) >= SLEEPY) && begin(body, 'sleep')) return
    choose(body)
  }
}

function begin(body: Body, task: TaskName): boolean {
  if (!TASKS[task].start(body)) return false
  body.mind.task = task
  return true
}

function choose(body: Body) {
  const { mind } = body
  const before = { ...mind.tools, blanket: mind.blanket }
  craft(mind)
  crafted(mind, before)
  mind.want = null

  if (mind.hunger >= HUNT_AT && edible(mind) === 0) {
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
    if (body.random() < NIGHT_IN && begin(body, 'relax')) return
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
  let saving = false
  if (next) {
    const plan = planHouse(body, next)
    if (canAfford(mind, plan) && begin(body, 'build')) return
    if (plan.tree && chopAt(body, plan.tree)) {
      mind.task = 'chop'
      return
    }
    if (!plan.blocked) {
      mind.blockedChecks = 0
      plankGoal = Math.max(plankGoal, plan.plank + 6)
      stoneGoal = Math.max(stoneGoal, plan.stone + 2)
      saving = true
    } else if (!plan.tree && (mind.blockedChecks = (mind.blockedChecks ?? 0) + 1) >= MOVE_AFTER) {
      // Water, rock or a cliff where the house would grow: build the next one somewhere better.
      const site = newSite(body)
      if (site) {
        const move = planHouse(body, site)
        if (canAfford(mind, move)) {
          mind.site = { ...site, step: 0 }
          if (begin(body, 'build')) return
          mind.site = null
        }
        plankGoal = Math.max(plankGoal, move.plank + 6)
        stoneGoal = Math.max(stoneGoal, move.stone + 2)
        saving = true
      }
    }
  }

  // Everything else it could get on with, tried in a random order: some days it farms first,
  // some days it goes down the mine, some days it tidies the yard.
  const options: TaskName[] = ['scavenge', 'level', 'farm', 'water']
  if (mind.inv.seed > 0) options.push('plant')
  if (edible(mind) < FOOD_STOCK) options.push(body.random() < 0.5 ? 'forage' : 'fish')
  else if (body.random() < 0.2) options.push('forage')
  if (mind.inv.fish > 0) options.push('cook')
  options.push('herd')
  if (plankWorth(mind) < plankGoal) options.push('gather', 'chop')
  if (mind.inv.stone < stoneGoal) options.push('mine')
  if (wantsWell(body)) options.push('well')
  // The yard (campfire, statues, workshop...) only when it isn't saving up for the house.
  if (!saving) options.push('decorate')
  if (wantsMine(mind, stoneGoal) || body.random() < TREASURE_HUNT) options.push('shaft')
  shuffle(options, body)
  if (!saving && body.random() < HOMEBODY) options.unshift('relax')
  for (const task of options) if (begin(body, task)) return
  if (body.random() < IDLE_AT_HOME && begin(body, 'relax')) return
  begin(body, 'wander')
}

const TIERS = ['', 'wooden', 'stone', 'iron']

/** New tools it just made go in its journal. */
function crafted(mind: Body['mind'], before: Body['mind']['tools'] & { blanket?: boolean }) {
  const { tools } = mind
  for (const tool of ['pickaxe', 'axe', 'sword'] as const) {
    if (tools[tool] > before[tool]) note(mind, `Made myself a${tools[tool] === 3 ? 'n' : ''} ${TIERS[tools[tool]]} ${tool}.`, 'craft')
  }
  if (tools.gun && !before.gun) note(mind, 'Made a musket!', 'craft')
  if (tools.bucket && !before.bucket) note(mind, 'Made a bucket.', 'craft')
  if (mind.blanket && !before.blanket) note(mind, 'Made a wool blanket for my bed. Cozy!', 'craft')
}

/** At home of an evening (or asleep): a puff of smoke from the top of the roof now and then. */
function chimney(body: Body, resting: boolean) {
  const home = body.mind.home
  if (!home || !resting || body.light() > CHIMNEY_LIGHT || body.random() >= CHIMNEY_SMOKE) return
  if (!contains(home, body.x, body.y, 0)) return
  const y = roofTop(home) - 1
  if (body.get(home.x, y) === 'air') body.set(home.x, y, 'smoke')
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
  // Neighbours: remember where they live, and swap what one has plenty of.
  if (friend) meet(mind, friend)
}

/** Shuffles the list in place (Fisher–Yates). */
function shuffle<T>(list: T[], body: Body) {
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(body.random() * (i + 1))
    ;[list[i], list[j]] = [list[j], list[i]]
  }
}
