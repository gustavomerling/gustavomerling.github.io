import type { Point } from './mind.ts'

/*
 * A human's house grows in stages, wider and taller each time (built over the old one):
 *
 *   stage 1 — 7 wide, one floor, door on the right (humans walk through doors, zombies can't)
 *   stage 2 — 11 wide, two floors joined by a ladder, doors on both sides
 *   stage 3 — 15 wide, two floors, glass windows upstairs
 *   stage 4 — 19 wide, three floors
 *
 * Every floor is 4 rows high with a plank slab on top; inside, a back wall fills it in with
 * windows (see-through to the sky) and paintings along it, a lamp hangs from the ceiling, and
 * every floor is furnished: the ground floor has the bed and a table with chairs; upper floors
 * have a bookshelf, a reading corner and a potted plant. A stone foundation sits under it all
 * and a stepped plank roof on top. Coordinates are absolute: `x` is the middle column and
 * `ground` the foundation row.
 */

export interface House {
  x: number
  ground: number
  stage: number
}

export type HouseBlock =
  | 'stone'
  | 'plank'
  | 'backwall'
  | 'ladder'
  | 'lamp'
  | 'bed'
  | 'glass'
  | 'door'
  | 'back_window'
  | 'painting'
  | 'table'
  | 'chair'
  | 'bookshelf'
  | 'flowerpot'

export interface Block extends Point {
  id: HouseBlock
}

export const MAX_STAGE = 4
/** Rows per floor: 4 inside + the slab (or roof) above. */
const STORY = 5

export function halfWidth(stage: number): number {
  return 1 + 2 * stage
}

export function floorCount(stage: number): number {
  return stage >= 4 ? 3 : stage >= 2 ? 2 : 1
}

/** Feet row of someone standing on floor `f` (0 = ground floor). */
export function floorFeet(house: House, f: number): number {
  return house.ground - 1 - STORY * f
}

/** Column of the ladder between floors (just inside the left wall). */
export function ladderX(house: House): number {
  return house.x - halfWidth(house.stage) + 1
}

/** Where its owner sleeps: the middle of the bed. */
export function bedSpot(house: House): Point {
  return { x: house.x + halfWidth(house.stage) - 2, y: house.ground - 1 }
}

/** Topmost row of the roof. */
export function roofTop(house: House): number {
  const half = halfWidth(house.stage)
  return house.ground - STORY * floorCount(house.stage) - Math.floor((half + 1) / 2)
}

/** Inside the house's outline (with a margin around it). */
export function contains(house: House, x: number, y: number, margin = 1): boolean {
  const half = halfWidth(house.stage) + 1 + margin
  return Math.abs(x - house.x) <= half && y <= house.ground && y >= roofTop(house) - margin
}

/** Every block of the house at its stage, in building order (outside first, then the inside). */
export function blueprint(house: House): Block[] {
  const { x: cx, ground: g, stage } = house
  const half = halfWidth(stage)
  const floors = floorCount(stage)
  const lx = ladderX(house)
  const blocks: Block[] = []
  const add = (dx: number, y: number, id: HouseBlock) => blocks.push({ x: cx + dx, y, id })

  for (let dx = -half; dx <= half; dx++) add(dx, g, 'stone')

  // Walls: doorways on the ground floor (right only at first), windows upstairs from stage 3.
  for (let f = 0; f < floors; f++) {
    const base = g - STORY * f
    for (const side of [-1, 1]) {
      for (let k = 1; k <= 4; k++) {
        const door = f === 0 && k <= 3 && (side === 1 || stage >= 2)
        const window = f > 0 && stage >= 3 && (k === 2 || k === 3)
        add(side * half, base - k, door ? 'door' : window ? 'glass' : 'plank')
      }
    }
  }

  // Floor slabs between stories, with the ladder going through them.
  for (let f = 1; f < floors; f++) {
    for (let dx = -half + 1; dx <= half - 1; dx++) add(dx, g - STORY * f, cx + dx === lx ? 'ladder' : 'plank')
  }

  // Roof: an overhanging slab, then a stepped gable.
  const roof = g - STORY * floors
  for (let dx = -half - 1; dx <= half + 1; dx++) add(dx, roof, 'plank')
  for (let k = 1, span = half - 1; span >= 0; k++, span -= 2) {
    for (let dx = -span; dx <= span; dx++) add(dx, roof - k, 'plank')
  }

  // Inside: back wall, the ladder, a lamp per floor, the bed, and furniture and decoration.
  const bed = bedSpot(house)
  for (let f = 0; f < floors; f++) {
    const base = g - STORY * f
    for (let k = 1; k <= 4; k++) {
      for (let dx = -half + 1; dx <= half - 1; dx++) {
        const x = cx + dx
        const y = base - k
        let id: HouseBlock = 'backwall'
        if (x === lx && floors > 1 && f < floors - 1) id = 'ladder'
        else if (dx === 0 && k === 4) id = 'lamp'
        else if (f === 0 && k === 1 && Math.abs(x - bed.x) <= 1) id = 'bed'
        else id = furnish(half, f, dx, k) ?? 'backwall'
        add(dx, y, id)
      }
    }
  }
  return blocks
}

/**
 * What goes at column `dx`, `k` rows up from floor `f` (besides the ladder, lamp and bed):
 * two-pane windows and paintings take turns along the wall; the ground floor has a
 * table with chairs, upper floors a bookshelf in the corner, a chair by a little table and a
 * potted plant next to the ladder.
 */
function furnish(half: number, f: number, dx: number, k: number): HouseBlock | null {
  // Along the wall, at eye level: a two-pane window, a painting, a window...
  if (k === 2 || k === 3) {
    const n = dx + half - 3
    if (n >= 0 && dx <= half - 2) {
      if (n % 8 <= 1) return 'back_window'
      if (n % 8 === 4) return 'painting'
    }
  }
  if (f === 0) {
    if (k !== 1) return null
    if (dx === -1) return 'table'
    if (dx === -2 || dx === 0) return 'chair'
    if (half >= 5 && dx === -half + 2) return 'flowerpot'
    return null
  }
  if (dx >= half - 2 && k <= 2) return 'bookshelf'
  if (k !== 1) return null
  if (dx === 0) return 'chair'
  if (dx === 1) return 'table'
  if (dx === -half + 2) return 'flowerpot'
  return null
}

/** A random spot to hang out in: some floor, away from the ladder. */
export function spotInside(house: House, random: () => number): Point {
  const half = halfWidth(house.stage)
  const f = Math.floor(random() * floorCount(house.stage))
  // From just right of the ladder to just left of the right wall.
  const x = house.x - half + 2 + Math.floor(random() * (2 * half - 3))
  return { x, y: floorFeet(house, f) }
}
