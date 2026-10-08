import type { Behavior } from './types.ts'

/** Falls straight down; when blocked, may slide diagonally (forms piles). */
export const powder: Behavior = (sim, x, y, i, t) => {
  if (sim.tryMove(i, t, x, y + 1, 1)) return
  if (sim.random() >= sim.slide[t]) return

  const dir = sim.random() < 0.5 ? -1 : 1
  if (sim.tryMove(i, t, x + dir, y + 1, 1)) return
  sim.tryMove(i, t, x - dir, y + 1, 1)
}
