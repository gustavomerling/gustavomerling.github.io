import type { Simulation } from '../simulation.ts'
import type { Behavior } from './types.ts'

/** Falls, slides diagonally, then flows sideways up to `spread` cells to level out. */
export const liquid: Behavior = (sim, x, y, i, t) => {
  if (sim.random() < sim.viscosity[t]) return
  if (sim.tryMove(i, t, x, y + 1, 1)) return

  const dir = sim.random() < 0.5 ? -1 : 1
  if (sim.tryMove(i, t, x + dir, y + 1, 1)) return
  if (sim.tryMove(i, t, x - dir, y + 1, 1)) return

  if (flow(sim, x, y, i, t, dir)) return
  flow(sim, x, y, i, t, -dir)
}

/** Moves to the farthest reachable cell in `dir`, stopping early at a ledge to fall off. */
function flow(sim: Simulation, x: number, y: number, i: number, t: number, dir: number): boolean {
  const { width, height } = sim.grid
  const reach = sim.spread[t]
  let target = -1

  for (let k = 1; k <= reach; k++) {
    const nx = x + dir * k
    if (nx < 0 || nx >= width) break
    const j = y * width + nx
    if (!sim.canEnter(t, j, 0)) break
    target = j
    if (y + 1 < height && sim.canEnter(t, j + width, 1)) break
  }

  if (target < 0) return false
  sim.swap(i, target)
  return true
}
