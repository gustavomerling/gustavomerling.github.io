import { isCreature, isGround, isPassable, type Body } from '../body.ts'
import { halfWidth, MAX_STAGE } from '../house.ts'
import type { Inventory, Mind, Point } from '../mind.ts'
import { groundBelow } from '../senses.ts'
import { ENTRANCE } from './shaft.ts'
import { patienceFor, type Task } from './types.ts'
import { note } from '../skills.ts'

/*
 * Once the house is up, the yard: a campfire, a flower garden, a bench, tiki torches, lamp
 * posts, a stone statue, a scarecrow by the wheat, a workshop with a furnace, a watchtower and,
 * with gold from the mine, a golden statue. One at a time, as the
 * house grows and the materials allow (never eating into what the house or the mine need),
 * each on a flat, clear spot beyond where the house will ever reach, away from the farm, the
 * well and the mine's entrance. They're built bottom up, a block at a time.
 *
 * The human then makes use of them (see relax.ts): it sits by the campfire or on the bench,
 * tinkers in the workshop and climbs the watchtower to keep watch (or to stargaze). It replants
 * the garden as its flowers wither. Moving house, it takes them all down.
 */

export type DecorKind =
  | 'campfire'
  | 'garden'
  | 'bench'
  | 'tiki'
  | 'lamppost'
  | 'statue'
  | 'scarecrow'
  | 'pen'
  | 'pier'
  | 'workshop'
  | 'tower'
  | 'gold_statue'

export interface Decor {
  kind: DecorKind
  /** Middle column, and the row of the ground it stands on. */
  x: number
  ground: number
  /** Parts laid so far. */
  step: number
  /** Trips that didn't get it there (it gives up on the spot after a few). */
  tries?: number
  /** Built mirrored (a pier reaching out to the left). */
  flip?: boolean
}

/** Where a part of `d` goes. */
function partAt(d: Decor, p: Part): Point {
  return { x: d.x + p.dx * (d.flip ? -1 : 1), y: d.ground - p.dy }
}

/** One block: `dx` from the middle, `dy` rows above the ground. */
interface Part {
  dx: number
  dy: number
  id: string
}

interface Design {
  /** House stage it waits for. */
  stage: number
  cost: Partial<Record<keyof Inventory, number>>
  /** How far it reaches either side, and how tall it is (for finding a spot). */
  half: number
  height: number
  parts: Part[]
}

/** A pier's deck reaches this far either side of its middle (it's 2 × PIER_HALF + 1 long). */
const PIER_HALF = 3
/** It looks for a lake shore this far from the house. */
const PIER_SEARCH = 80
/** Lays a block every this many actions. */
const PLACE_EVERY = 2
/** Works from within this many cells of its footprint. */
const WORK_RANGE = 2
/** Gives up on a spot it couldn't get to this many times (and gets its materials back). */
const MAX_TRIES = 3
/** Planks it never spends on decoration (the mine and repairs need them). */
const PLANK_RESERVE = 14
/** Looks for a spot this far from the house at most. */
const SEARCH = 60
/** Room left around each thing it builds (and around the farm, well and mine entrance). */
const MARGIN = 2
/** Ground no higher or lower than the house's by more than this. */
const MAX_RISE = 6
/** Ground cover it builds over. */
const CLEARABLE: ReadonlySet<string | null> = new Set(['air', 'grass', 'flower', 'litter', 'seed', 'mushroom', 'firefly', 'smoke'])

/** The tower's lookout: the top of its ladder (rows above the ground). */
export const LOOKOUT = 11

function shape(rows: Record<number, Record<number, string>>): Part[] {
  const parts: Part[] = []
  for (const [dy, row] of Object.entries(rows)) {
    for (const [dx, id] of Object.entries(row)) parts.push({ dx: Number(dx), dy: Number(dy), id })
  }
  return parts.sort((a, b) => a.dy - b.dy)
}

function campfire(): Part[] {
  return shape({ 1: { [-1]: 'campfire', 0: 'campfire', 1: 'campfire' }, 2: { 0: 'campfire' } })
}

function tiki(): Part[] {
  return shape({ 1: { 0: 'tiki_pole' }, 2: { 0: 'tiki_pole' }, 3: { 0: 'tiki_pole' }, 4: { 0: 'torch' } })
}

/** A row of flowers. */
function garden(): Part[] {
  return shape({ 1: { [-2]: 'flower', [-1]: 'flower', 0: 'flower', 1: 'flower', 2: 'flower' } })
}

/** Two legs and a seat. */
function bench(): Part[] {
  return shape({ 1: { [-1]: 'bench', 1: 'bench' }, 2: { [-1]: 'bench', 0: 'bench', 1: 'bench' } })
}

/** A wooden post with a lamp on top. */
function lamppost(): Part[] {
  return shape({ 1: { 0: 'fence' }, 2: { 0: 'fence' }, 3: { 0: 'fence' }, 4: { 0: 'lamp' } })
}

/** A pole with arms out and a straw head. */
function scarecrow(): Part[] {
  return shape({ 1: { 0: 'scarecrow' }, 2: { 0: 'scarecrow' }, 3: { [-1]: 'scarecrow', 0: 'scarecrow', 1: 'scarecrow' }, 4: { 0: 'scarecrow' } })
}

/**
 * A pier: a plank deck just above the water (its `ground` is the water's surface row), from the
 * shore (dx -3) out over the lake, with a lamp post at the far end.
 */
function pier(): Part[] {
  const parts: Part[] = []
  for (let dx = -PIER_HALF; dx <= PIER_HALF; dx++) parts.push({ dx, dy: 1, id: 'plank' })
  parts.push({ dx: PIER_HALF, dy: 2, id: 'fence' }, { dx: PIER_HALF, dy: 3, id: 'fence' }, { dx: PIER_HALF, dy: 4, id: 'lamp' })
  return parts
}

/** A fenced pen for sheep and cows: posts two high at both ends, a roof over one corner with hay under it. */
function pen(): Part[] {
  const parts: Part[] = []
  for (const dx of [-6, 6]) for (let dy = 1; dy <= 2; dy++) parts.push({ dx, dy, id: 'fence' })
  for (const dx of [4, 5]) parts.push({ dx, dy: 1, id: 'hay' })
  parts.push({ dx: 5, dy: 2, id: 'hay' })
  for (let dy = 1; dy <= 3; dy++) parts.push({ dx: 3, dy, id: 'fence' })
  for (let dx = 2; dx <= 7; dx++) parts.push({ dx, dy: 4, id: 'plank' })
  return parts.sort((a, b) => a.dy - b.dy)
}

/** A figure on a pedestal: legs, body, arms out, head. */
function statue(figure: string): Part[] {
  return shape({
    1: { [-1]: 'statue', 0: 'statue', 1: 'statue' },
    2: { [-1]: figure, 1: figure },
    3: { 0: figure },
    4: { [-1]: figure, 0: figure, 1: figure },
    5: { 0: figure },
  })
}

/** A plank shed: a furnace with its chimney through the roof, a workbench, an anvil and a torch. */
function workshop(): Part[] {
  const parts: Part[] = []
  const add = (dx: number, dy: number, id: string) => parts.push({ dx, dy, id })
  const inside: Record<string, string> = {
    '-3,1': 'furnace',
    '-2,1': 'furnace_fire',
    '-1,1': 'furnace',
    '-3,2': 'furnace',
    '-2,2': 'furnace',
    '-1,2': 'furnace',
    '-2,3': 'furnace',
    '-2,4': 'furnace',
    '1,1': 'workbench',
    '2,1': 'anvil',
    '2,3': 'torch',
  }
  for (let dy = 1; dy <= 4; dy++) {
    add(-4, dy, 'plank')
    add(4, dy, 'plank')
    for (let dx = -3; dx <= 3; dx++) add(dx, dy, inside[`${dx},${dy}`] ?? 'backwall')
  }
  for (let dx = -5; dx <= 5; dx++) add(dx, 5, dx === -2 ? 'furnace' : 'plank')
  for (let dx = -3; dx <= 3; dx++) add(dx, 6, dx === -2 ? 'furnace' : 'plank')
  add(-2, 7, 'furnace')
  return parts
}

/** Fence legs, a ladder up the middle to a lookout platform with a railing, and a roof over it. */
function tower(): Part[] {
  const parts: Part[] = []
  const add = (dx: number, dy: number, id: string) => parts.push({ dx, dy, id })
  for (let dy = 1; dy <= LOOKOUT; dy++) {
    add(0, dy, 'ladder')
    if (dy < LOOKOUT - 1) {
      add(-2, dy, 'fence')
      add(2, dy, 'fence')
    }
  }
  for (const dx of [-2, -1, 1, 2]) add(dx, LOOKOUT - 1, 'plank')
  for (let dy = LOOKOUT; dy <= LOOKOUT + 2; dy++) {
    add(-2, dy, 'fence')
    add(2, dy, 'fence')
  }
  add(-1, LOOKOUT + 2, 'torch')
  for (let dx = -3; dx <= 3; dx++) add(dx, LOOKOUT + 3, 'plank')
  for (let dx = -1; dx <= 1; dx++) add(dx, LOOKOUT + 4, 'plank')
  return parts.sort((a, b) => a.dy - b.dy)
}

const DESIGNS: Record<DecorKind, Design> = {
  campfire: { stage: 1, cost: { plank: 3 }, half: 1, height: 2, parts: campfire() },
  garden: { stage: 1, cost: {}, half: 2, height: 1, parts: garden() },
  bench: { stage: 1, cost: { plank: 3 }, half: 1, height: 2, parts: bench() },
  lamppost: { stage: 2, cost: { plank: 3, stone: 1 }, half: 0, height: 4, parts: lamppost() },
  scarecrow: { stage: 2, cost: { plank: 4 }, half: 1, height: 4, parts: scarecrow() },
  pen: { stage: 2, cost: { plank: 14 }, half: 7, height: 4, parts: pen() },
  pier: { stage: 2, cost: { plank: 10, stone: 1 }, half: PIER_HALF, height: 4, parts: pier() },
  tiki: { stage: 2, cost: { plank: 2, torch: 1 }, half: 0, height: 4, parts: tiki() },
  statue: { stage: 2, cost: { stone: 10 }, half: 1, height: 5, parts: statue('statue') },
  workshop: { stage: 2, cost: { plank: 26, stone: 10, iron: 1 }, half: 5, height: 7, parts: workshop() },
  tower: { stage: 3, cost: { plank: 48, torch: 1 }, half: 3, height: LOOKOUT + 4, parts: tower() },
  gold_statue: { stage: 3, cost: { stone: 3, gold: 7 }, half: 1, height: 5, parts: statue('gold_statue') },
}

/** What it builds, in order (two tiki torches, two lamp posts). */
const PLAN: readonly DecorKind[] = [
  'campfire',
  'garden',
  'bench',
  'tiki',
  'tiki',
  'lamppost',
  'lamppost',
  'statue',
  'scarecrow',
  'pen',
  'pier',
  'workshop',
  'tower',
  'gold_statue',
]
/** A garden this many flowers short gets replanted. */
const REPLANT = 2

/** Every block it builds around the house (the farm, level and well tasks keep off them). */
export const DECOR_PARTS: ReadonlySet<string | null> = new Set([
  'campfire',
  'tiki_pole',
  'statue',
  'gold_statue',
  'furnace',
  'furnace_fire',
  'workbench',
  'anvil',
  'scarecrow',
  'bench',
  'hay',
])

/** What a block gives back when taken down. */
const REFUND: Partial<Record<string, Partial<Record<keyof Inventory, number>>>> = {
  plank: { plank: 1 },
  fence: { plank: 1 },
  ladder: { plank: 1 },
  tiki_pole: { plank: 1 },
  statue: { stone: 1 },
  furnace: { stone: 1 },
  gold_statue: { gold: 1 },
  scarecrow: { plank: 1 },
  bench: { plank: 1 },
}

/** Its things of a kind, built or being built. */
export function decorOf(mind: Mind, kind: DecorKind): Decor[] {
  return (mind.decor ?? []).filter((d) => d.kind === kind)
}

/** Finished ones only. */
export function builtDecor(mind: Mind, kind: DecorKind): Decor[] {
  return decorOf(mind, kind).filter((d) => d.step >= DESIGNS[kind].parts.length)
}

function canPay(mind: Mind, design: Design): boolean {
  const { inv } = mind
  for (const [item, n] of Object.entries(design.cost) as [keyof Inventory, number][]) {
    const keep = item === 'plank' ? PLANK_RESERVE : 0
    if (inv[item] < n + keep) return false
  }
  return true
}

function pay(mind: Mind, design: Design) {
  for (const [item, n] of Object.entries(design.cost) as [keyof Inventory, number][]) mind.inv[item] -= n
}

/**
 * The next thing it'd like to build (its house is big enough, it can pay for it, it's not built
 * yet) and where: the first in the plan it finds a spot for.
 */
function nextDecor(body: Body): Decor | null {
  const { mind } = body
  const stage = mind.home?.stage ?? 0
  const have = new Map<DecorKind, number>()
  for (const d of mind.decor ?? []) have.set(d.kind, (have.get(d.kind) ?? 0) + 1)
  for (const kind of PLAN) {
    const n = have.get(kind) ?? 0
    if (n > 0) {
      have.set(kind, n - 1)
      continue
    }
    if (DESIGNS[kind].stage > stage || !canPay(mind, DESIGNS[kind])) continue
    const spot = findSpot(body, kind)
    if (spot) return spot
  }
  return null
}

/** A garden that has lost a few flowers: replanted (it starts over; flowers still there stay). */
function tendGarden(mind: Mind, body: Body): Decor | null {
  for (const d of mind.decor ?? []) {
    if (d.kind !== 'garden' || d.step < DESIGNS.garden.parts.length) continue
    const missing = DESIGNS.garden.parts.filter((p) => body.get(partAt(d, p).x, partAt(d, p).y) !== 'flower').length
    if (missing >= REPLANT) {
      d.step = 0
      return d
    }
  }
  return null
}

/** Columns [a, b] taken up by something else (the house, farm, well, mine entrance, other things). */
function reserved(mind: Mind): [number, number][] {
  const home = mind.home!
  const out: [number, number][] = []
  const house = halfWidth(MAX_STAGE) + 1
  out.push([home.x - house, home.x + house])
  const { farm, shaft, well } = mind
  // The farm, with room for the well past its far end.
  if (farm) out.push([farm.x0 - MARGIN - 6, farm.x1 + MARGIN + 6])
  if (well) out.push([well.x - 3, well.x + 3])
  // The mine's entrance (wherever it is, or either place it could go).
  const entrances = shaft ? [shaft.x] : [home.x - ENTRANCE, home.x + ENTRANCE]
  for (const x of entrances) out.push([x - 4 - MARGIN, x + 4 + MARGIN])
  for (const d of mind.decor ?? []) {
    const half = DESIGNS[d.kind].half + MARGIN
    out.push([d.x - half, d.x + half])
  }
  return out
}

/** A flat, clear spot for it near the house (nearest first, either side), or null. */
function findSpot(body: Body, kind: DecorKind): Decor | null {
  const { mind } = body
  const home = mind.home!
  const design = DESIGNS[kind]
  if (kind === 'scarecrow') return scarecrowSpot(body)
  if (kind === 'pier') return pierSpot(body)
  const taken = reserved(mind)
  const first = body.random() < 0.5 ? 1 : -1
  for (let d = halfWidth(MAX_STAGE) + 2 + design.half; d <= SEARCH; d++) {
    for (const side of [first, -first]) {
      const x = home.x + side * d
      const x0 = x - design.half
      const x1 = x + design.half
      if (taken.some(([a, b]) => x1 >= a && x0 <= b)) continue
      const ground = groundBelow(body, x, home.ground - MAX_RISE - design.height, MAX_RISE * 2 + design.height)
      if (ground === null || Math.abs(ground - home.ground) > MAX_RISE) continue
      if (kind === 'garden' && !soilUnder(body, design, x, ground)) continue
      if (clearSpot(body, design, x, ground)) return { kind, x, ground, step: 0 }
    }
  }
  return null
}

/** Soil to grow flowers in. */
function soilUnder(body: Body, design: Design, x: number, ground: number): boolean {
  for (let dx = -design.half; dx <= design.half; dx++) if (body.get(x + dx, ground) !== 'soil') return false
  return true
}

/**
 * A lake shore near the house: dry ground right at the water's edge, with open water (deep
 * enough, nothing on it, no boat about) for the whole deck out from it.
 */
function pierSpot(body: Body): Decor | null {
  const home = body.mind.home!
  for (let d = halfWidth(MAX_STAGE) + 2; d <= PIER_SEARCH; d++) {
    for (const side of [1, -1]) {
      const shore = home.x + side * d
      const ground = groundBelow(body, shore, home.ground - 20, 40)
      if (ground === null || body.get(shore, ground) === 'water') continue
      for (const out of [1, -1] as const) {
        // The water's surface just past the shore, level with the ground (or a row lower).
        let surface = -1
        for (const y of [ground, ground + 1]) if (body.get(shore + out, y) === 'water' && body.get(shore + out, y - 1) === 'air') surface = y
        if (surface < 0) continue
        let ok = true
        for (let k = 1; k <= 2 * PIER_HALF + 1 && ok; k++) {
          const x = shore + out * k
          ok = body.get(x, surface) === 'water' && body.get(x, surface + 1) === 'water'
          for (let dy = 1; dy <= 4 && ok; dy++) ok = body.get(x, surface - dy) === 'air'
        }
        for (let k = -2; k <= 2 * PIER_HALF + 6 && ok; k++) for (let dy = -1; dy <= 2 && ok; dy++) ok = body.get(shore + out * k, surface - dy) !== 'boat'
        if (ok) return { kind: 'pier', x: shore + out * (PIER_HALF + 1), ground: surface, step: 0, flip: out < 0 }
      }
    }
  }
  return null
}

/** Its pier, if it has one: where to stand at the end of it, and the water below. */
export function pierEnd(mind: Mind): { stand: Point; water: Point } | null {
  const d = builtDecor(mind, 'pier')[0]
  if (!d) return null
  const out = d.flip ? -1 : 1
  const x = d.x + out * PIER_HALF
  return { stand: { x: x - out, y: d.ground - 2 }, water: { x, y: d.ground } }
}

/** Just outside the field's fence (either end, or a little further out past the well), clear of the house. */
function scarecrowSpot(body: Body): Decor | null {
  const { home, farm, well } = body.mind
  if (!home || !farm) return null
  const design = DESIGNS.scarecrow
  const house = halfWidth(MAX_STAGE) + 1
  for (const x of [farm.x0 - 3, farm.x1 + 3, farm.x1 + 7, farm.x0 - 7]) {
    if (Math.abs(x - home.x) <= house + design.half) continue
    if (well && Math.abs(well.x - x) <= 2 + design.half) continue
    if ((body.mind.decor ?? []).some((d) => Math.abs(d.x - x) <= DESIGNS[d.kind].half + design.half + MARGIN)) continue
    const ground = groundBelow(body, x, farm.ground - 8, 16)
    if (ground === null || Math.abs(ground - farm.ground) > 1) continue
    if (clearSpot(body, design, x, ground)) return { kind: 'scarecrow', x, ground, step: 0 }
  }
  return null
}

/** Flat ground under all of it, nothing in the way, no tree or water anywhere near. */
function clearSpot(body: Body, design: Design, x: number, ground: number): boolean {
  for (let dx = -design.half; dx <= design.half; dx++) {
    const id = body.get(x + dx, ground)
    if (!isGround(id) || id === 'water' || DECOR_PARTS.has(id)) return false
    if (!CLEARABLE.has(body.get(x + dx, ground - 1)) && !isCreature(body.get(x + dx, ground - 1))) return false
    for (let dy = 1; dy <= design.height + 1; dy++) {
      const above = body.get(x + dx, ground - dy)
      if (above === null || above === 'water' || above === 'wood' || above === 'leaf' || isGround(above)) return false
    }
  }
  for (const p of design.parts) {
    const id = body.get(x + p.dx, ground - p.dy)
    if (!CLEARABLE.has(id) && !isCreature(id)) return false
  }
  return true
}

/** Where it stands to build `d`. */
function workSpot(d: Decor): Point {
  // (A pier is built from the shore.)
  if (d.kind === 'pier') return { x: d.x - (d.flip ? -1 : 1) * (PIER_HALF + 1), y: d.ground - 1 }
  return { x: d.x + DESIGNS[d.kind].half + 1, y: d.ground - 1 }
}

/** Lays the next part (false while it has to wait). */
function lay(body: Body, d: Decor, p: Part): boolean {
  const { x, y } = partAt(d, p)
  const id = body.get(x, y)
  if (id === p.id) return true
  // Someone standing right there: it goes behind them if they could stand in it anyway.
  if (isCreature(id)) {
    if (isPassable(p.id)) body.setBehind(x, y, p.id)
    return isPassable(p.id)
  }
  // Something's grown or fallen there since: only ground cover gets built over.
  if (!CLEARABLE.has(id)) return true
  body.set(x, y, p.id)
  return true
}

/** Gives up on one it couldn't get to: what's up comes down, and all it paid comes back. */
function abandon(body: Body, d: Decor) {
  const { mind } = body
  const design = DESIGNS[d.kind]
  for (const p of design.parts.slice(0, d.step)) {
    const { x, y } = partAt(d, p)
    if (body.get(x, y) === p.id) body.set(x, y, 'air')
  }
  for (const [item, n] of Object.entries(design.cost) as [keyof Inventory, number][]) mind.inv[item] += n
  mind.decor = (mind.decor ?? []).filter((x) => x !== d)
}

/** Takes down everything it built around the old house (moving house), keeping the materials. */
export function demolishDecor(body: Body) {
  const { mind } = body
  for (const d of mind.decor ?? []) {
    for (const p of DESIGNS[d.kind].parts) {
      const { x, y } = partAt(d, p)
      if (body.get(x, y) !== p.id) continue
      body.set(x, y, 'air')
      for (const [item, n] of Object.entries(REFUND[p.id] ?? {}) as [keyof Inventory, number][]) mind.inv[item] += n
    }
  }
  mind.decor = []
}

/** Builds the next thing for the yard (or carries on with the one it started). */
export const decorate: Task = {
  start(body) {
    const { mind } = body
    if (!mind.home || mind.site) return false
    let d = (mind.decor ?? []).find((x) => x.step < DESIGNS[x.kind].parts.length)
    if (d && (d.tries ?? 0) >= MAX_TRIES) {
      abandon(body, d)
      d = undefined
    }
    d ??= tendGarden(mind, body) ?? undefined
    if (!d) {
      const spot = nextDecor(body)
      if (!spot) return false
      pay(mind, DESIGNS[spot.kind])
      ;(mind.decor ??= []).push(spot)
      d = spot
    }
    mind.target = workSpot(d)
    mind.patience = patienceFor(body, mind.target, 300)
    mind.timer = 0
    return true
  },
  run(body) {
    const { mind } = body
    const d = (mind.decor ?? []).find((x) => x.step < DESIGNS[x.kind].parts.length)
    if (!d || !mind.target) return 'done'
    const design = DESIGNS[d.kind]
    if (Math.abs(body.x - d.x) > design.half + WORK_RANGE || Math.abs(body.y - (d.ground - 1)) > 2) {
      const result = body.walkTo(mind.target)
      mind.patience -= result === 'stuck' ? 5 : 1
      if (mind.patience > 0) return 'running'
      d.tries = (d.tries ?? 0) + 1
      return 'failed'
    }
    if (++mind.timer % PLACE_EVERY !== 0) return 'running'
    if (!lay(body, d, design.parts[d.step])) return 'running'
    if (++d.step < design.parts.length) return 'running'
    mind.say = { text: DONE[d.kind], ttl: 25 }
    note(mind, JOURNAL[d.kind], 'craft')
    return 'done'
  },
}

const DONE: Record<DecorKind, string> = {
  campfire: 'A campfire!',
  garden: 'Flowers!',
  bench: 'A bench!',
  lamppost: 'Let there be light!',
  scarecrow: 'Shoo, rabbits!',
  pen: 'A pen for animals!',
  pier: 'A pier to fish from!',
  tiki: 'Tiki torch!',
  statue: 'A statue!',
  workshop: 'My workshop!',
  tower: 'A watchtower!',
  gold_statue: 'Solid gold!',
}

/** What it writes in its journal when it's done. */
const JOURNAL: Record<DecorKind, string> = {
  campfire: 'Made a campfire in the yard.',
  garden: 'Planted flowers in the garden.',
  bench: 'Made a bench to sit on.',
  tiki: 'Put up a tiki torch.',
  lamppost: 'Put up a lamp post.',
  statue: 'Carved a stone statue.',
  scarecrow: 'Made a scarecrow for the field.',
  pen: 'Built a pen for sheep and cows.',
  pier: 'Built a pier out over the lake.',
  workshop: 'Built a workshop, furnace and all!',
  tower: 'Built a watchtower!',
  gold_statue: 'Cast a statue of solid gold!',
}

/** Thought bubble while building. */
export const DECOR_LABEL: Record<DecorKind, string> = {
  campfire: 'Making a campfire',
  garden: 'Planting flowers',
  bench: 'Making a bench',
  lamppost: 'Putting up a lamp post',
  scarecrow: 'Making a scarecrow',
  pen: 'Building a pen for animals',
  pier: 'Building a pier',
  tiki: 'Putting up a tiki torch',
  statue: 'Carving a statue',
  workshop: 'Building a workshop',
  tower: 'Building a watchtower',
  gold_statue: 'Casting a golden statue',
}

/** Progress (0..1) of what it's building now, and what it is. */
export function decorProgress(mind: Mind): { kind: DecorKind; done: number } | null {
  const d = (mind.decor ?? []).find((x) => x.step < DESIGNS[x.kind].parts.length)
  return d ? { kind: d.kind, done: d.step / DESIGNS[d.kind].parts.length } : null
}
