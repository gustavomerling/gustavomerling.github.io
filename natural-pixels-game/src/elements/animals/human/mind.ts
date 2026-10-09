import type { JournalEntry, SkillId, Status } from '../../types.ts'
import type { House } from './house.ts'
import type { Decor, DecorKind } from './tasks/decor.ts'
import type { Shaft } from './tasks/shaft.ts'
import { skillsStatus, titleOf } from './skills.ts'

/*
 * A human's mind: what it's doing, what it carries and what it has built.
 * Lives in the feet cell's memory (CellContext.memory), so it must stay JSON-friendly.
 */

export type TaskName =
  | 'idle'
  | 'wander'
  | 'sleep'
  | 'forage'
  | 'fish'
  | 'chop'
  | 'gather'
  | 'mine'
  | 'build'
  | 'plant'
  | 'water'
  | 'relax'
  | 'farm'
  | 'fight'
  | 'hide'
  | 'scavenge'
  | 'level'
  | 'shaft'
  | 'well'
  | 'decorate'
  | 'cook'
  | 'herd'

/** Out in the yard (by something it built) or at home (by a piece of furniture). */
export type RelaxSpot = DecorKind | 'book' | 'tea' | 'plant' | 'window' | 'visit'

/** Something it needs but can't find on its own (shown in its thought bubble so the player can help). */
export type Want = 'wood' | 'stone' | 'food'

export interface Point {
  x: number
  y: number
}

/** Minecraft-style inventory: raw materials, crafted materials and food. */
export interface Inventory {
  log: number
  plank: number
  stone: number
  /** Edible items (fruit, fish). */
  food: number
  /** Seeds kept from eaten fruit and felled trees, for replanting. */
  seed: number
  /** 1 when the bucket is full of water. */
  water: number
  /** Wheat seeds, from cutting grass and harvesting wheat. */
  grain: number
  /** For the musket: found lying around, dropped by zombies, or made from coal, sulfur and saltpeter. */
  gunpowder: number
  /** Earth dug out while levelling the yard (or digging the mine), to fill dips with. */
  earth: number
  /** From the mine: coal makes torches, iron makes tools; silver and gold are treasure. */
  coal: number
  iron: number
  silver: number
  gold: number
  /** Torches to light the mine with (coal + plank). */
  torch: number
  /** From the mine too: with coal, they make gunpowder. */
  sulfur: number
  saltpeter: number
  /** Raw fish: edible, but much better grilled at the campfire (see tasks/cook.ts). */
  fish: number
  /** From skeletons: ground into bone meal for saplings. */
  bone: number
  /** Glimmering treasure from deep down. */
  amethyst: number
  /** Shorn from its sheep: a blanket, and something to sell. */
  wool: number
}

/** 0 = none, 1 = wooden, 2 = stone, 3 = iron. */
export type ToolTier = 0 | 1 | 2 | 3

export interface Tools {
  pickaxe: ToolTier
  axe: ToolTier
  bucket: boolean
  /** 0 = fists, 1 = wooden sword, 2 = stone sword, 3 = iron sword. */
  sword: ToolTier
  /** A musket (needs gunpowder to fire). */
  gun: boolean
  /** Has built a boat at least once (boats stay moored in the world, see materials/boat.ts). */
  boat?: boolean
}

export interface Mind {
  task: TaskName
  target: Point | null
  /** Progress counter for the current action (in actions). */
  timer: number
  /** Progress digging the current block (separate from `timer`, digging happens mid-task). */
  work: number
  /** Actions left before giving up on the current task. */
  patience: number
  /** Sub-step of multi-step tasks (e.g. watering: fetch, then pour). */
  phase: number
  /** Walking direction while wandering or blocked. */
  dir: 1 | -1
  /** Ticks of wall-climbing grip left (no falling meanwhile). */
  climb: number
  /** Ticks until the next action (humans act a few times per second). */
  cooldown: number
  /** 0 = full, 100 = starving. */
  hunger: number
  asleep: boolean
  /** In the water: swimming, or rowing its boat (set by the body every tick). */
  afloat: 'swim' | 'boat' | null
  inv: Inventory
  tools: Tools
  /** Data version (see upgradeMind). */
  v: number
  name: string
  /** Its house as it stands (see house.ts). */
  home: House | null
  /** House (or next house stage) under construction, and how far along it is. */
  site: (House & { step: number; credit?: number; todo?: number }) | null
  /** Where its boat is (the middle of the hull): a new boat replaces it. */
  boatAt?: Point | null
  /** Times in a row it found the next stage of its house blocked (water, rock, a cliff...). */
  blockedChecks?: number
  /**
   * Ladders and bridge planks it put up just to get somewhere (not its house's or its mine's):
   * taken down again, planks back, once it's moved on (see Body.tidyScaffold).
   */
  scaffold?: (Point & { id: 'ladder' | 'plank'; paid: boolean })[]
  /**
   * How tired it is (0..100): every waking action adds a little, hard work more, the mine most;
   * past SLEEPY (brain.ts) it goes to bed, whatever the time of day, and sleeps it off.
   */
  tired?: number
  /** (Old saves: mine fatigue, now just tiredness.) */
  mineTired?: number
  /** The segment of its mine it's in (where segments overlap, the one it came along). */
  mineSeg?: number
  /** Fishing from its pier: the water off the end of it. */
  fishingFrom?: Point | null
  /** Where its fishing line meets the water, while it waits for a bite. */
  cast?: Point | null
  /** Actions left leaving far-off zombies be (after a fight it couldn't get anywhere with). */
  leaveZombies?: number
  /** Its artesian well (the top of the shaft), once drilled; and where it's drilling one. */
  well?: Point | null
  wellAt?: Point | null
  /** What it has built around the house: campfire, statues, workshop... (see tasks/decor.ts). */
  decor?: Decor[]
  /** Where (or how) it's spending its free time (see tasks/relax.ts). */
  relaxAt?: RelaxSpot | null
  /** What it's fighting ('zombie', 'skeleton'). */
  foe?: string
  /** Experience in each skill (see skills.ts). */
  skills?: Partial<Record<SkillId, number>>
  /** Its journal: milestones of its life (see skills.ts). */
  journal?: JournalEntry[]
  /** Someone who isn't a settler: a travelling merchant (see merchant.ts). */
  role?: 'merchant'
  /** Where the merchant leaves the world again. */
  leaveTo?: Point | null
  /** Neighbours it has met, by name: where their house is (to visit). */
  friends?: Record<string, { x: number; ground: number; half: number }>
  /** The neighbour it's visiting (while relaxing at their door). */
  visiting?: string | null
  /** An animal it's carrying home to its pen. */
  carrying?: string | null
  /** A wool blanket on its bed: it sleeps better (heals faster). */
  blanket?: boolean
  /** Monsters it has beaten. */
  wins?: number
  /** Firsts already written down (first house, first fish...). */
  firsts?: string[]
  /** The world's day today (kept up to date each action, for dating journal lines). */
  today?: number
  /** Entrances of mines it has finished with (it opens a new one elsewhere, see tasks/shaft.ts). */
  oldMines?: number[]
  /** Its mine (see tasks/shaft.ts). */
  shaft: Shaft | null
  /** Its wheat field next to the house: columns x0..x1, soil at row `ground`. */
  farm: { x0: number; x1: number; ground: number; fenced: boolean } | null
  /** Something it's saying out loud (a greeting), for `ttl` more actions. */
  say: { text: string; ttl: number } | null
  /** Actions until it feels like greeting someone again. */
  greetIn: number
  /** Family members who have moved in. */
  family: number
  /** 0..100; zombies hurt it, rest heals it. At 0 it wakes up back in bed. */
  health: number
  /** Actions left showing that it got hit. */
  hurt: number
  /** 0..1: how likely it is to face a zombie rather than hide (rolled once). */
  courage: number
  /** Already slept tonight (it doesn't sleep the whole night through). */
  slept: boolean
  /** Planted spots to keep watered until they become trees. */
  saplings: Point[]
  /** Cells dug straight down looking for stone. */
  dug: number
  /** Searched and found no stone: build without a stone foundation. */
  noStone: boolean
  /** What it's missing right now (refreshed each time it picks a task). */
  want: Want | null
  /** Actions in a row it couldn't get any closer to where it's going. */
  stuck: number
  /** Closest it has got to the current goal (key = "x,y"), and actions since it last got closer. */
  progress?: { key: string; best: number; idle: number }
  /**
   * What was in the way the last time it got stuck, for its thought bubble: an element id, or
   * 'high' / 'low' (right above or below, out of reach) or 'edge' (the end of the world).
   */
  blocked?: string | null
  /** Places it recently failed to reach: ignored until `ttl` (actions) runs out. */
  avoid: (Point & { ttl: number })[]
}

export function createMind(): Mind {
  return {
    task: 'idle',
    target: null,
    timer: 0,
    work: 0,
    patience: 0,
    phase: 0,
    dir: 1,
    climb: 0,
    cooldown: 0,
    hunger: 20,
    asleep: false,
    afloat: null,
    inv: { log: 0, plank: 0, stone: 0, food: 1, seed: 0, water: 0, grain: 0, gunpowder: 0, earth: 0, coal: 0, iron: 0, silver: 0, gold: 0, torch: 0, sulfur: 0, saltpeter: 0, fish: 0, bone: 0, amethyst: 0, wool: 0 },
    tools: { pickaxe: 0, axe: 0, bucket: false, sword: 0, gun: false },
    v: MIND_VERSION,
    name: '',
    home: null,
    site: null,
    farm: null,
    shaft: null,
    say: null,
    greetIn: 0,
    family: 0,
    health: 100,
    hurt: 0,
    courage: -1,
    slept: false,
    saplings: [],
    dug: 0,
    noStone: false,
    want: null,
    stuck: 0,
    avoid: [],
  }
}

const MIND_VERSION = 5

/** Minds saved by older versions miss newer fields: fill them in (and convert old houses). */
export function upgradeMind(mind: Mind): Mind {
  if (mind.v === MIND_VERSION) return mind
  const fresh = createMind()
  const old = mind as unknown as { home: { x: number; ground: number; stage?: number } | null }
  Object.assign(mind, { ...fresh, ...(mind as object), v: MIND_VERSION, site: null })
  mind.inv = { ...fresh.inv, ...mind.inv }
  mind.tools = { ...fresh.tools, ...mind.tools }
  // Version 1 houses were stored by their left edge, and were all stage 1.
  if (old.home && old.home.stage === undefined) mind.home = { x: old.home.x + 3, ground: old.home.ground, stage: 1 }
  return mind
}

const NAMES = ['Ana', 'Bento', 'Caio', 'Dani', 'Eli', 'Flor', 'Gabi', 'Hugo', 'Iara', 'Juca', 'Kai', 'Lia', 'Malu', 'Nico', 'Otto', 'Pia', 'Rui', 'Sol', 'Teo', 'Vivi', 'Zeca']

export function randomName(random: () => number): string {
  return NAMES[Math.floor(random() * NAMES.length)]
}

const ACTIVITY: Record<TaskName, string> = {
  idle: 'Thinking',
  wander: 'Exploring',
  sleep: 'Sleeping',
  forage: 'Picking fruit',
  fish: 'Fishing',
  chop: 'Chopping a tree',
  gather: 'Collecting wood',
  mine: 'Mining',
  build: 'Building a house',
  plant: 'Planting a tree',
  water: 'Watering a sapling',
  relax: 'At home',
  farm: 'Farming',
  fight: 'Fighting a monster',
  hide: 'Hiding from a monster',
  scavenge: 'Picking up gunpowder',
  level: 'Levelling the yard',
  shaft: 'Digging a mine',
  well: 'Drilling a well',
  decorate: 'Building in the yard',
  cook: 'Cooking',
  herd: 'Looking after the animals',
}

const TIER = ['', 'wooden', 'stone', 'iron'] as const
const ITEM = {
  log: 'log',
  plank: 'plank',
  stone: 'stone',
  food: 'food',
  seed: 'tree seed',
  grain: 'wheat seed',
  gunpowder: 'gunpowder',
  earth: 'earth',
  coal: 'coal',
  iron: 'iron',
  silver: 'silver',
  gold: 'gold',
  torch: 'torch',
  sulfur: 'sulfur',
  saltpeter: 'saltpeter',
  fish: 'raw fish',
  bone: 'bone',
  amethyst: 'amethyst',
  wool: 'wool',
} as const
/** Inventory slots shown, in order (the bucket's water shows with the bucket). */
const SHOWN = ['log', 'plank', 'stone', 'coal', 'iron', 'silver', 'gold', 'amethyst', 'sulfur', 'saltpeter', 'torch', 'fish', 'bone', 'wool', 'food', 'seed', 'grain', 'gunpowder', 'earth'] as const

/** How the player can help with each want. */
export const WANT_HINT: Record<Want, string> = {
  wood: 'paint Wood near it',
  stone: 'paint Stone near it',
  food: 'paint Fruit near it',
}

/** Inventory as words: "3 planks", "1 wheat seed"... */
function itemList(mind: Mind): string[] {
  const { inv } = mind
  return SHOWN.filter((k) => k !== 'earth' && inv[k] > 0)
    .map((k) => `${inv[k]} ${ITEM[k]}${inv[k] === 1 ? '' : 's'}`)
}

function gearList(mind: Mind): string[] {
  const { inv, tools } = mind
  return [
    tools.axe ? `${TIER[tools.axe]} axe` : '',
    tools.pickaxe ? `${TIER[tools.pickaxe]} pickaxe` : '',
    tools.bucket ? (inv.water ? 'full bucket' : 'bucket') : '',
    tools.sword ? `${TIER[tools.sword]} sword` : '',
    tools.gun ? 'musket' : '',
  ].filter(Boolean)
}

/** Status card for the top bar. */
export function statusOf(mind: Mind): Status {
  const { inv, tools } = mind
  const items = SHOWN.filter((k) => inv[k] > 0)
    .map((k) => ({ id: k, label: ITEM[k], count: inv[k] }))
  const held: Status['tools'] = []
  if (tools.axe) held.push({ id: 'axe', label: `${TIER[tools.axe]} axe`, tier: tools.axe })
  if (tools.pickaxe) held.push({ id: 'pickaxe', label: `${TIER[tools.pickaxe]} pickaxe`, tier: tools.pickaxe })
  if (tools.sword) held.push({ id: 'sword', label: `${TIER[tools.sword]} sword`, tier: tools.sword })
  if (tools.gun) held.push({ id: 'gun', label: 'musket' })
  if (tools.bucket) held.push({ id: inv.water ? 'bucket-full' : 'bucket', label: inv.water ? 'bucket of water' : 'bucket' })
  if (tools.boat) held.push({ id: 'boat', label: 'boat builder' })
  const facts: Status['facts'] = [
    { label: 'Home', value: mind.home ? `house, stage ${mind.home.stage} of 4` : mind.site ? 'building one' : 'none yet' },
  ]
  if (mind.family && mind.family < 4) facts.push({ label: 'Family', value: `${mind.family + 1} people` })
  if (mind.farm) facts.push({ label: 'Farm', value: `${mind.farm.x1 - mind.farm.x0 + 1} columns of wheat${mind.farm.fenced ? ', fenced' : ''}` })
  if (mind.want) facts.push({ label: 'Needs', value: `${mind.want} (${WANT_HINT[mind.want]})` })
  return {
    name: mind.role === 'merchant' ? `${mind.name} the merchant` : mind.name || 'Human',
    activity: mind.role === 'merchant' ? 'Trading' : mind.asleep ? 'Sleeping' : mind.afloat ? (mind.afloat === 'boat' ? 'Rowing a boat' : 'Swimming') : ACTIVITY[mind.task],
    meters: [
      { label: 'Health', value: Math.max(0, Math.round(mind.health)), good: true },
      { label: 'Hunger', value: Math.round(mind.hunger), good: false },
      { label: 'Tiredness', value: Math.round(mind.tired ?? 0), good: false },
    ],
    items,
    tools: held,
    facts,
    title: titleOf(mind),
    skills: skillsStatus(mind),
    journal: mind.journal ?? [],
  }
}

/** Hover text: activity, hunger, inventory and tools. */
export function describeMind(mind: Mind): string {
  const items = itemList(mind)
  const gear = gearList(mind)
  const parts = [
    ...(mind.name ? [mind.name] : []),
    mind.asleep ? 'Sleeping' : ACTIVITY[mind.task],
    ...(mind.afloat ? [mind.afloat === 'boat' ? 'rowing' : 'swimming'] : []),
    `health ${Math.max(0, Math.round(mind.health))}%`,
    `hunger ${Math.round(mind.hunger)}%`,
    items.length ? items.join(', ') : 'empty-handed',
  ]
  if (gear.length) parts.push(gear.join(', '))
  if (mind.home) parts.push(`house stage ${mind.home.stage}`)
  if (mind.family && mind.family < 4) parts.push(`family of ${mind.family + 1}`)
  if (mind.want) parts.push(`needs ${mind.want}: ${WANT_HINT[mind.want]}`)
  return parts.join(' · ')
}
