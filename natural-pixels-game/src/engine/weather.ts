import { EMPTY, elementIndex } from '../elements/registry.ts'
import { DAY_PHASE_TICKS, NIGHT_PHASE_TICKS } from './daylight.ts'
import type { Simulation } from './simulation.ts'

/*
 * Weather: it rains for 10% of every day, starting at a random time. Rain comes from clouds
 * spawned along the top of the sky (each cloud cell rains one drop, see cloud.ts); some rains
 * are storms with lightning. The sky darkens while it rains (`overcast`), lightning flashes
 * (`flash`), and a rainbow shows for a while once the rain stops (`rainbow`). A wind comes and
 * goes (`wind`), stronger in storms: gases drift with it.
 */

/** One full day and night, in ticks. */
export const DAY_TICKS = DAY_PHASE_TICKS + NIGHT_PHASE_TICKS
/** Rain lasts 10% of the day. */
const RAIN_TICKS = Math.round(DAY_TICKS * 0.1)
/** Rain fades in and out over this many ticks. */
const RAMP_TICKS = 240
const STORM_CHANCE = 0.3
/** Clouds spawned per tick at full rain, per 100 columns. */
const CLOUDS_PER_TICK = 0.35
/** Clouds form in this many rows at the top of the sky. */
const CLOUD_ROWS = 6
/** Chance per tick of a lightning strike during a storm at full strength. */
const LIGHTNING_CHANCE = 1 / 240
const RAINBOW_TICKS = 1800
/** Chance a rainbow comes with a second one. */
const DOUBLE_RAINBOW = 0.3
/** The wind picks a new direction and strength about this often, and eases into it. */
const WIND_CHANGE_TICKS = 3600
const WIND_EASE = 0.002

const CLOUD = elementIndex('cloud')
const LIGHTNING = elementIndex('lightning')

export class Weather {
  /** Rain on/off (Settings). Off = always clear skies. */
  enabled = true
  /** Rain strength 0..1 right now (smoothly ramps in and out). */
  rain = 0
  /** Lightning flash 0..1, decays quickly. */
  flash = 0
  /** Rainbow visibility 0..1 after a rain. */
  rainbow = 0
  /** This rainbow comes with a second, fainter one outside it. */
  doubleRainbow = false
  /** Wind -1 (blowing left) .. 1 (blowing right): smoke, steam and clouds drift with it. */
  wind = 0
  private windTarget = 0
  /** Today's rain: start tick, and whether it's a storm. */
  private start = 0
  private storm = false
  private dayStart = -1
  private rainbowLeft = 0

  /** Overcast 0..1: how much the sky darkens. */
  get overcast(): number {
    return this.rain * (this.storm ? 0.85 : 0.65)
  }

  get stormy(): boolean {
    return this.storm && this.rain > 0.5
  }

  tick(sim: Simulation) {
    const { tick } = sim
    this.flash *= 0.85
    if (tick % WIND_CHANGE_TICKS === 0) this.windTarget = (sim.random() * 2 - 1) * (this.storm && this.rain > 0 ? 1 : 0.6)
    this.wind += (this.windTarget - this.wind) * WIND_EASE

    // A new day: roll today's rain.
    if (this.dayStart < 0 || tick - this.dayStart >= DAY_TICKS) {
      this.dayStart = tick
      this.start = tick + Math.floor(sim.random() * (DAY_TICKS - RAIN_TICKS))
      this.storm = sim.random() < STORM_CHANCE
    }

    const into = tick - this.start
    const raining = this.enabled && into >= 0 && into < RAIN_TICKS
    const target = raining ? Math.min(1, into / RAMP_TICKS, (RAIN_TICKS - into) / RAMP_TICKS) : 0
    if (this.rain > 0.3 && target === 0 && this.rainbowLeft === 0 && !this.storm) {
      this.rainbowLeft = RAINBOW_TICKS
      this.doubleRainbow = sim.random() < DOUBLE_RAINBOW
    }
    this.rain = target

    if (this.rainbowLeft > 0) {
      this.rainbowLeft--
      const t = this.rainbowLeft / RAINBOW_TICKS
      this.rainbow = Math.min(1, (1 - t) * 6, t * 3) * sim.daylight
    } else this.rainbow = 0

    if (this.rain > 0) {
      this.spawnClouds(sim)
      if (this.storm && sim.random() < LIGHTNING_CHANCE * this.rain) this.strike(sim)
    }
  }

  /** Jumps to a fresh, dry day (loading a scene, clearing). */
  reset() {
    this.rain = this.flash = this.rainbow = 0
    this.rainbowLeft = 0
    this.dayStart = -1
  }

  private spawnClouds(sim: Simulation) {
    const { grid } = sim
    let count = (CLOUDS_PER_TICK * this.rain * grid.width) / 100
    while (count > 0) {
      if (count < 1 && sim.random() >= count) break
      count--
      const x = Math.floor(sim.random() * grid.width)
      const y = Math.floor(sim.random() * Math.min(CLOUD_ROWS, grid.height))
      const i = y * grid.width + x
      if (grid.type[i] === EMPTY) grid.place(i, CLOUD, 0, 0, 10)
    }
  }

  /** A jagged bolt from the sky down to the first solid thing, which gets struck hot. */
  private strike(sim: Simulation) {
    const { grid } = sim
    let x = Math.floor(sim.random() * grid.width)
    for (let y = 0; y < grid.height; y++) {
      const i = y * grid.width + x
      const t = grid.type[i]
      if (t !== EMPTY && t !== CLOUD && !sim.fluid[t]) {
        // The strike point burns: trees, grass and houses catch fire.
        grid.temp[i] = Math.max(grid.temp[i], 900)
        break
      }
      if (t === EMPTY || t === CLOUD) grid.place(i, LIGHTNING, 0, 0, 3000)
      if (sim.random() < 0.35) x = Math.min(grid.width - 1, Math.max(0, x + (sim.random() < 0.5 ? -1 : 1)))
    }
    this.flash = 1
  }
}
