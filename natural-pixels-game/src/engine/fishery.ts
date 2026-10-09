import { elementIndex } from '../elements/registry.ts'
import type { Simulation } from './simulation.ts'

/*
 * Fish come to any big enough body of water: every few seconds the water is mapped into bodies
 * (cells of water, seaweed and fish joined side by side), and each body gets FISH_PER_BLOCK fish
 * per WATER_BLOCK cells (5 in 30 cells, 10 in 60...), one more at a time while it has fewer. So new
 * lakes, flooded hollows and big rain pools fill with fish on their own (and fished-out lakes
 * restock).
 */

/** How often the water is looked over (ticks). */
const EVERY = 600
const WATER_BLOCK = 30
const FISH_PER_BLOCK = 5

const WATER = elementIndex('water')
const SEAWEED = elementIndex('seaweed')
const FISH = elementIndex('fish')

export function stockFish(sim: Simulation) {
  if (sim.tick % EVERY !== 0) return
  const { grid } = sim
  const { width, height, type, size } = grid
  const seen = new Uint8Array(size)
  const stack: number[] = []
  const cells: number[] = []
  for (let start = 0; start < size; start++) {
    const t = type[start]
    if (seen[start] || (t !== WATER && t !== SEAWEED && t !== FISH)) continue
    // One body of water: flood it.
    cells.length = 0
    let fish = 0
    stack.push(start)
    seen[start] = 1
    while (stack.length) {
      const i = stack.pop()!
      const here = type[i]
      if (here === FISH) fish++
      else if (here === WATER) cells.push(i)
      const x = i % width
      const y = (i - x) / width
      for (const j of [x > 0 ? i - 1 : -1, x < width - 1 ? i + 1 : -1, y > 0 ? i - width : -1, y < height - 1 ? i + width : -1]) {
        if (j < 0 || seen[j]) continue
        const u = type[j]
        if (u !== WATER && u !== SEAWEED && u !== FISH) continue
        seen[j] = 1
        stack.push(j)
      }
    }
    const volume = cells.length + fish
    const wanted = Math.floor(volume / WATER_BLOCK) * FISH_PER_BLOCK
    if (fish >= wanted || cells.length === 0) continue
    // A new fish somewhere under the surface (water above it), if there's such a spot.
    for (let tries = 0; tries < 8; tries++) {
      const i = cells[Math.floor(sim.random() * cells.length)]
      if (i < width || type[i - width] !== WATER) continue
      grid.place(i, FISH, 0, sim.random() < 0.5 ? 1 : 0)
      break
    }
  }
}
