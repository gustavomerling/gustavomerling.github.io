/*
 * A human's mind: what it's doing, what it carries and what it has built.
 * Lives in the feet cell's memory (CellContext.memory), so it must stay JSON-friendly.
 */

export type TaskName = 'idle' | 'wander' | 'sleep' | 'forage' | 'fish' | 'chop' | 'mine' | 'build' | 'plant' | 'water'

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
}

/** 0 = none, 1 = wooden, 2 = stone. */
export type ToolTier = 0 | 1 | 2

export interface Tools {
  pickaxe: ToolTier
  axe: ToolTier
  bucket: boolean
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
  inv: Inventory
  tools: Tools
  /** Finished house: left x and ground row. */
  home: { x: number; ground: number } | null
  /** House under construction. */
  site: { x: number; ground: number; step: number } | null
  /** Planted spots to keep watered until they become trees. */
  saplings: Point[]
  /** Cells dug straight down looking for stone. */
  dug: number
  /** Searched and found no stone: build without a stone foundation. */
  noStone: boolean
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
    inv: { log: 0, plank: 0, stone: 0, food: 1, seed: 0, water: 0 },
    tools: { pickaxe: 0, axe: 0, bucket: false },
    home: null,
    site: null,
    saplings: [],
    dug: 0,
    noStone: false,
  }
}

const ACTIVITY: Record<TaskName, string> = {
  idle: 'Thinking',
  wander: 'Exploring',
  sleep: 'Sleeping',
  forage: 'Picking fruit',
  fish: 'Fishing',
  chop: 'Chopping a tree',
  mine: 'Mining',
  build: 'Building a house',
  plant: 'Planting a tree',
  water: 'Watering a sapling',
}

const TIER = ['', 'wooden', 'stone'] as const

/** Hover text: activity, hunger, inventory and tools. */
export function describeMind(mind: Mind): string {
  const { inv, tools } = mind
  const items = (['log', 'plank', 'stone', 'food', 'seed'] as const)
    .filter((k) => inv[k] > 0)
    .map((k) => `${inv[k]} ${k}${inv[k] === 1 ? '' : 's'}`)
  const gear = [
    tools.axe ? `${TIER[tools.axe]} axe` : '',
    tools.pickaxe ? `${TIER[tools.pickaxe]} pickaxe` : '',
    tools.bucket ? (inv.water ? 'full bucket' : 'bucket') : '',
  ].filter(Boolean)
  const parts = [
    mind.asleep ? 'Sleeping' : ACTIVITY[mind.task],
    `hunger ${Math.round(mind.hunger)}%`,
    items.length ? items.join(', ') : 'empty-handed',
  ]
  if (gear.length) parts.push(gear.join(', '))
  if (mind.home) parts.push('has a home')
  return parts.join(' · ')
}
