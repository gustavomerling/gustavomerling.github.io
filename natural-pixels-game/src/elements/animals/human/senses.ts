import { isGround, isPassable, type Body } from './body.ts'
import type { Point } from './mind.ts'

/**
 * Nearest cell around the human's chest (by rings, closest first) within `radius`
 * that matches. Coordinates are absolute.
 */
export function findNearest(body: Body, radius: number, match: (x: number, y: number) => boolean): Point | null {
  const cx = body.x
  const cy = body.y - 1
  for (let r = 1; r <= radius; r++) {
    for (let d = -r; d <= r; d++) {
      if (match(cx + d, cy - r)) return { x: cx + d, y: cy - r }
      if (match(cx + d, cy + r)) return { x: cx + d, y: cy + r }
      if (match(cx - r, cy + d)) return { x: cx - r, y: cy + d }
      if (match(cx + r, cy + d)) return { x: cx + r, y: cy + d }
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
