import { EMPTY } from '../../elements/registry.ts'
import type { Behavior } from './types.ts'

/** Flickers upwards through open air only (flames don't push through water or sand). */
export const energy: Behavior = (sim, x, y, i) => {
  if (sim.random() >= 0.6) return
  const r = sim.random()
  const tx = r < 0.5 ? x : r < 0.75 ? x - 1 : x + 1
  if (!sim.grid.inBounds(tx, y - 1)) return
  const to = (y - 1) * sim.grid.width + tx
  if (sim.grid.type[to] === EMPTY) sim.swap(i, to)
}
