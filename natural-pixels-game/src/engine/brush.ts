import { ELEMENTS, EMPTY } from '../elements/registry.ts'
import { AMBIENT_TEMP } from './constants.ts'
import type { Grid } from './grid.ts'
import type { Random } from './random.ts'

/** Share of cells filled per frame when the element doesn't set `brushFill`. */
function defaultFill(type: number): number {
  if (type === EMPTY) return 1
  return ELEMENTS[type].matter === 'static' ? 1 : 0.25
}

/**
 * Paints a disc of `type`. Elements only fill empty cells; the eraser (EMPTY) clears anything.
 */
export function paintDisc(grid: Grid, cx: number, cy: number, radius: number, type: number, random: Random) {
  const fill = ELEMENTS[type].brushFill ?? defaultFill(type)
  const temp = ELEMENTS[type].thermal?.initialTemp ?? AMBIENT_TEMP
  const r2 = radius * radius + radius
  const x0 = Math.round(cx)
  const y0 = Math.round(cy)

  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      if (dx * dx + dy * dy > r2) continue
      const x = x0 + dx
      const y = y0 + dy
      if (!grid.inBounds(x, y)) continue
      if (fill < 1 && random() >= fill) continue

      const i = y * grid.width + x
      if (type !== EMPTY && grid.type[i] !== EMPTY) continue
      grid.place(i, type, 0, 0, temp)
      grid.shade[i] = (random() * 256) | 0
    }
  }
}

/** Paints discs along a line so fast strokes don't leave gaps. */
export function paintStroke(
  grid: Grid,
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  radius: number,
  type: number,
  random: Random,
) {
  const distance = Math.hypot(toX - fromX, toY - fromY)
  const spacing = Math.max(1, radius * 0.5)
  const steps = Math.max(1, Math.ceil(distance / spacing))
  for (let s = 0; s <= steps; s++) {
    const k = s / steps
    paintDisc(grid, fromX + (toX - fromX) * k, fromY + (toY - fromY) * k, radius, type, random)
  }
}
