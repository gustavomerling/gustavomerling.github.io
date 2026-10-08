import { EMPTY, elementIndex } from '../elements/registry.ts'
import { AMBIENT_TEMP } from './constants.ts'
import type { Simulation } from './simulation.ts'

/** Share of the temperature gap two touching cells even out per tick (× conductivity). */
const EXCHANGE = 0.25
/** Share of the gap to ambient a cell loses per tick for each side touching air. */
const AIR_LOSS = 0.004
/** Moist cells (soil, plants) above this temperature dry out. */
const DRY_TEMP = 100
/** Flammable cells only ignite when at most this wet: living, watered plants resist fire. */
const BURN_MAX_WATER = 30
/** Chance per tick a burning cell gives off a flame into the air next to it. */
const FLAME_CHANCE = 0.25

const FIRE = elementIndex('fire')
const WATER = elementIndex('water')

/**
 * Heat pass, run once per tick after movement:
 * sources → conduction with touching cells → cooling by air → drying → burning → phase changes.
 * Air holds no heat: it's a constant ambient sink.
 */
export function updateThermal(sim: Simulation) {
  const { width, height, type, temp, water } = sim.grid

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x
      const t = type[i]
      if (t === EMPTY) continue

      if (sim.heatSource[t] > 0) temp[i] = sim.heatSource[t]

      // Each pair conducts once: this cell handles its right and bottom neighbours.
      let airSides = 0
      if (x + 1 < width) {
        if (type[i + 1] === EMPTY) airSides++
        else conduct(sim, i, i + 1)
      }
      if (y + 1 < height) {
        if (type[i + width] === EMPTY) airSides++
        else conduct(sim, i, i + width)
      }
      if (x > 0 && type[i - 1] === EMPTY) airSides++
      if (y > 0 && type[i - width] === EMPTY) airSides++
      if (airSides > 0) temp[i] += (AMBIENT_TEMP - temp[i]) * AIR_LOSS * airSides * sim.airExposure[t]

      if (sim.capacity[t] > 0 && temp[i] > DRY_TEMP && water[i] > 0) water[i]--

      if (sim.burnAt[t] > 0 && temp[i] >= sim.burnAt[t] && water[i] <= BURN_MAX_WATER) {
        if (burn(sim, x, y, i, t)) continue
      }

      if (temp[i] > sim.aboveTemp[t]) {
        if (sim.random() < sim.aboveChance[t]) sim.transform(i, sim.aboveInto[t])
        else temp[i] = sim.aboveTemp[t]
      } else if (temp[i] < sim.belowTemp[t]) {
        if (sim.random() < sim.belowChance[t]) sim.transform(i, sim.belowInto[t])
        else temp[i] = sim.belowTemp[t]
      }
    }
  }
}

function conduct(sim: Simulation, i: number, j: number) {
  const { type, temp } = sim.grid
  const rate = Math.min(sim.conductivity[type[i]], sim.conductivity[type[j]]) * EXCHANGE
  if (rate === 0) return
  const heat = (temp[i] - temp[j]) * rate
  temp[i] -= heat
  temp[j] += heat
}

/** One tick of burning. Returns true if the cell burnt away. */
function burn(sim: Simulation, x: number, y: number, i: number, t: number): boolean {
  const { grid } = sim
  const { width, type, temp } = grid

  // Water touching it puts the fire out.
  if (
    (x > 0 && type[i - 1] === WATER) ||
    (x + 1 < width && type[i + 1] === WATER) ||
    (y > 0 && type[i - width] === WATER) ||
    (y + 1 < grid.height && type[i + width] === WATER)
  ) {
    temp[i] = Math.min(temp[i], DRY_TEMP)
    return false
  }

  // Burning keeps itself hot, so fire spreads through dry fuel.
  temp[i] += (sim.burnTemp[t] - temp[i]) * 0.2

  if (sim.random() < FLAME_CHANCE) {
    const r = sim.random()
    const fx = r < 0.5 ? x : r < 0.75 ? x - 1 : x + 1
    const fy = r < 0.5 ? y - 1 : y
    if (grid.inBounds(fx, fy)) {
      const j = fy * width + fx
      if (type[j] === EMPTY) {
        grid.place(j, FIRE, 0, 0, sim.heatSource[FIRE])
        grid.stamp[j] = sim.tick
      }
    }
  }

  if (sim.random() < sim.burnRate[t]) {
    sim.transform(i, sim.burnInto[t])
    return true
  }
  return false
}
