import type { Behavior } from './types.ts'

/** Rises (through air and heavier fluids) and drifts sideways, mostly the way the wind blows. */
export const gas: Behavior = (sim, x, y, i, t) => {
  if (sim.random() < sim.rise[t]) {
    if (sim.tryMove(i, t, x, y - 1, -1)) return
    const dir = sim.random() < 0.5 + sim.weather.wind * 0.3 ? 1 : -1
    if (sim.tryMove(i, t, x + dir, y - 1, -1)) return
    if (sim.tryMove(i, t, x - dir, y - 1, -1)) return
  }
  if (sim.random() < sim.drift[t]) {
    sim.tryMove(i, t, x + (sim.random() < 0.5 + sim.weather.wind * 0.4 ? 1 : -1), y, 0)
  }
}
