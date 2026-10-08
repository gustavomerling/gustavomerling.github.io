import { isGround, isPassable, type Body } from './body.ts'
import type { Mind, Point } from './mind.ts'

/** Cells around a place it couldn't reach that are skipped too. */
const AVOID_RADIUS = 3

/** Recently failed to get here (see Mind.avoid). */
export function avoided(mind: Mind, x: number, y: number): boolean {
  return mind.avoid.some((p) => Math.abs(p.x - x) <= AVOID_RADIUS && Math.abs(p.y - y) <= AVOID_RADIUS)
}

/** Part of its own house (or the one going up): never mined or taken apart. */
export function isHome(mind: Mind, x: number, y: number): boolean {
  const house = mind.home ?? mind.site
  return house !== null && x >= house.x - 1 && x <= house.x + 7 && y >= house.ground - 6 && y <= house.ground
}

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
    for (let d = -r; d <= r; d++) {
      if (test(cx + d, cy - r)) return { x: cx + d, y: cy - r }
      if (test(cx + d, cy + r)) return { x: cx + d, y: cy + r }
      if (test(cx - r, cy + d)) return { x: cx - r, y: cy + d }
      if (test(cx + r, cy + d)) return { x: cx + r, y: cy + d }
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
