import { isGround, isPassable, type Body } from './body.ts'
import { contains, halfWidth, MAX_STAGE } from './house.ts'
import type { Mind, Point } from './mind.ts'

/** Cells around a place it couldn't reach that are skipped too. */
const AVOID_RADIUS = 3

/** Recently failed to get here (see Mind.avoid). */
export function avoided(mind: Mind, x: number, y: number): boolean {
  return mind.avoid.some((p) => Math.abs(p.x - x) <= AVOID_RADIUS && Math.abs(p.y - y) <= AVOID_RADIUS)
}

/** Rows under a house's foundation that hold it up (where dips under it were filled in). */
const UNDER_HOUSE = 6

/**
 * Part of its own house (or the one going up), or the ground right under it: never mined or
 * taken apart.
 */
export function isHome(mind: Mind, x: number, y: number): boolean {
  // The whole footprint the house will ever take (it only grows).
  for (const house of [mind.home, mind.site]) {
    if (!house) continue
    if (contains({ ...house, stage: MAX_STAGE }, x, y)) return true
    if (y > house.ground && y <= house.ground + UNDER_HOUSE && Math.abs(x - house.x) <= halfWidth(MAX_STAGE) + 1) return true
  }
  return false
}

/** Search radius that covers the whole world (rings stop once they leave it). */
export const ANYWHERE = 4096

/**
 * Nearest cell around the human's chest (by rings, closest first) within `radius`
 * that matches, skipping places it recently failed to reach. Coordinates are absolute.
 */
export function findNearest(body: Body, radius: number, match: (x: number, y: number) => boolean): Point | null {
  const cx = body.x
  const cy = body.y - 1
  const { mind } = body
  const test = mind.avoid.length ? (x: number, y: number) => !avoided(mind, x, y) && match(x, y) : match
  for (let r = 1; r <= radius; r++) {
    // Sides of the ring that are outside the world are skipped; all four out = searched it all.
    const top = body.get(cx, cy - r) !== null
    const bottom = body.get(cx, cy + r) !== null
    const left = body.get(cx - r, cy) !== null
    const right = body.get(cx + r, cy) !== null
    if (!top && !bottom && !left && !right) return null
    for (let d = -r; d <= r; d++) {
      if (top && test(cx + d, cy - r)) return { x: cx + d, y: cy - r }
      if (bottom && test(cx + d, cy + r)) return { x: cx + d, y: cy + r }
      if (left && test(cx - r, cy + d)) return { x: cx - r, y: cy + d }
      if (right && test(cx + r, cy + d)) return { x: cx + r, y: cy + d }
    }
  }
  return null
}

/** First ground row at or below `fromY` in column `x` (within `depth`), or null. */
export function groundBelow(body: Body, x: number, fromY: number, depth: number): number | null {
  for (let y = fromY; y <= fromY + depth; y++) {
    const id = body.get(x, y)
    if (id === null) return null
    if (isGround(id)) return y
  }
  return null
}

/** Whether something can be reached standing on the ground: ground at most `HEIGHT` cells below it. */
export function reachableFromGround(body: Body, p: Point): boolean {
  for (let k = 1; k <= 4; k++) {
    const id = body.get(p.x, p.y + k)
    if (isGround(id)) return true
    if (!isPassable(id)) return false
  }
  return false
}

/** True if the cell touches open space (so it can be worked on). */
export function exposed(body: Body, p: Point): boolean {
  return (
    isPassable(body.get(p.x - 1, p.y)) ||
    isPassable(body.get(p.x + 1, p.y)) ||
    isPassable(body.get(p.x, p.y - 1)) ||
    isPassable(body.get(p.x, p.y + 1))
  )
}

/** Water this close to a boat isn't worth going for: the moored boat is in the way. */
const BOAT_CLEAR_X = 4
const BOAT_CLEAR_Y = 2

/**
 * Water it can go and fill its bucket from (or fish in): at the surface (open above, so it can
 * reach it from the bank or the shallows), and not right by a moored boat.
 */
export function freeWater(body: Body, x: number, y: number): boolean {
  if (body.get(x, y) !== 'water') return false
  const above = body.get(x, y - 1)
  if (above === 'water' || !isPassable(above)) return false
  for (let dy = -BOAT_CLEAR_Y; dy <= BOAT_CLEAR_Y; dy++) {
    for (let dx = -BOAT_CLEAR_X; dx <= BOAT_CLEAR_X; dx++) if (body.get(x + dx, y + dy) === 'boat') return false
  }
  return true
}
