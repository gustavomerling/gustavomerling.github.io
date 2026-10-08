import { EMPTY } from '../elements/registry.ts'
import { WATER_CELL_UNITS } from './constants.ts'
import type { Simulation } from './simulation.ts'

/**
 * Runs for every cell whose element has `moisture`:
 * 1. soaks up an adjacent liquid cell (soil drinking a puddle);
 * 2. evens moisture out with one of its 8 neighbours of the same group, biased down or up.
 */
export function updateMoisture(sim: Simulation, x: number, y: number, i: number, t: number) {
  const { type, water, stamp } = sim.grid
  const capacity = sim.capacity[t]

  const absorbs = sim.absorbs[t]
  if (absorbs > 0 && water[i] + WATER_CELL_UNITS <= capacity) {
    const j = neighbor(sim, x, y, sim.random() * 4)
    if (j >= 0 && type[j] === absorbs) {
      sim.grid.place(j, EMPTY)
      stamp[j] = sim.tick
      water[i] += WATER_CELL_UNITS
    }
  }

  if (water[i] < 2) return
  const j = neighbor(sim, x, y, pickDirection(sim.random(), sim.risesUp[t] === 1))
  if (j < 0) return
  const u = type[j]
  if (sim.moistureGroup[u] !== sim.moistureGroup[t]) return

  const diff = water[i] - water[j]
  if (diff < 2) return
  const amount = Math.min(Math.max(1, (diff * sim.moistureFlow[t]) >> 1), sim.capacity[u] - water[j])
  if (amount <= 0) return
  water[i] -= amount
  water[j] += amount
}

/*
 * Neighbour slots: 0-3 are orthogonal (used to soak up liquid), 4-7 diagonal.
 * Diagonals matter: stems and trunks often grow slanted, and sap must follow them.
 */
const DX = [0, -1, 1, 0, -1, 1, -1, 1]
const DY = [1, 0, 0, -1, 1, 1, -1, -1]

/** Cumulative weights per slot. Soil drains mostly down; sap mostly rises. */
const DOWN_WEIGHTS = cumulative([0.35, 0.15, 0.15, 0.05, 0.1, 0.1, 0.05, 0.05])
const UP_WEIGHTS = cumulative([0.05, 0.15, 0.15, 0.35, 0.05, 0.05, 0.1, 0.1])

function cumulative(weights: number[]): Float32Array {
  let sum = 0
  return Float32Array.from(weights, (w) => (sum += w))
}

function pickDirection(r: number, up: boolean): number {
  const weights = up ? UP_WEIGHTS : DOWN_WEIGHTS
  let slot = 0
  while (slot < weights.length - 1 && r >= weights[slot]) slot++
  return slot
}

function neighbor(sim: Simulation, x: number, y: number, slot: number): number {
  const s = slot | 0
  const nx = x + DX[s]
  const ny = y + DY[s]
  return sim.grid.inBounds(nx, ny) ? ny * sim.grid.width + nx : -1
}
