import { createMind, type Mind } from '../elements/animals/human/mind.ts'
import { note } from '../elements/animals/human/skills.ts'
import type { JournalKind } from '../elements/types.ts'
import { EMPTY, elementIndex } from '../elements/registry.ts'
import type { Simulation } from './simulation.ts'

/*
 * Rare events, rolled once a day: a solar eclipse (the day goes dark for a while), an aurora
 * (curtains of light in the night sky), a meteor shower (lots of shooting stars, and a few real
 * meteors that fall and leave a glowing fallen star), and a travelling merchant who walks in from
 * the edge of the world to trade (see human/merchant.ts). Everyone in the world writes the sky
 * events down in their journal. The renderers draw the eclipse, aurora and meteor shower from
 * `eclipse`, `aurora` and `meteors`; the weather does the double rainbow.
 */

/** Chances per day. */
const ECLIPSE_CHANCE = 0.1
const AURORA_CHANCE = 0.15
const SHOWER_CHANCE = 0.15
const MERCHANT_CHANCE = 0.3
/** The eclipse: when in the day (time of day) and for how long. */
const ECLIPSE_FROM = 0.35
const ECLIPSE_SPAN = 0.3
const ECLIPSE_LENGTH = 0.05
/** How dark the world gets at the height of an eclipse. */
export const ECLIPSE_DARK = 0.85
/** A meteor falls this often (per tick) during a shower, at its height. */
const METEOR_CHANCE = 1 / 200
/** The merchant turns up this far into the day (time of day). */
const MERCHANT_AT = 0.33

const HUMAN = elementIndex('human')
const METEOR = elementIndex('meteor')
const MERCHANT_NAMES = ['Ambrose', 'Belmira', 'Cosmo', 'Dalva', 'Euclides', 'Filomena']

export class Events {
  /** 0..1, how far the moon covers the sun right now. */
  eclipse = 0
  /** 0..1, the aurora in tonight's sky. */
  aurora = 0
  /** 0..1, how strong tonight's meteor shower is. */
  meteors = 0
  private day = 0
  private eclipseAt = -1
  private auroraTonight = false
  private showerTonight = false
  private merchantToday = false
  private told = new Set<string>()

  tick(sim: Simulation) {
    // A new day: roll today's events.
    if (sim.day !== this.day) {
      this.day = sim.day
      this.eclipseAt = sim.random() < ECLIPSE_CHANCE ? ECLIPSE_FROM + sim.random() * ECLIPSE_SPAN : -1
      this.auroraTonight = sim.random() < AURORA_CHANCE
      this.showerTonight = !this.auroraTonight && sim.random() < SHOWER_CHANCE
      this.merchantToday = sim.random() < MERCHANT_CHANCE
      this.told.clear()
    }
    if (!sim.dayCycle) {
      this.eclipse = this.aurora = this.meteors = 0
      return
    }
    const time = sim.timeOfDay
    const night = time < 0.22 || time > 0.78
    const nightPart = night ? Math.sin(((time + 0.22) % 1) / 0.44 * Math.PI) : 0

    // The eclipse: a quick rise and fall around its middle.
    const e = this.eclipseAt < 0 ? 0 : 1 - Math.abs(time - this.eclipseAt) / ECLIPSE_LENGTH
    this.eclipse = Math.max(0, Math.min(1, e * 1.6))
    if (this.eclipse > 0.5) this.tell(sim, 'eclipse', 'The sun went dark in the middle of the day: an eclipse!', 'event')

    this.aurora = this.auroraTonight ? Math.max(0, nightPart) : 0
    if (this.aurora > 0.4) this.tell(sim, 'aurora', 'Lights danced across the night sky: an aurora!', 'event')

    this.meteors = this.showerTonight ? Math.max(0, nightPart) : 0
    if (this.meteors > 0.4) {
      this.tell(sim, 'meteors', 'Shooting stars all night long: a meteor shower!', 'event')
      if (sim.random() < METEOR_CHANCE * this.meteors) this.meteor(sim)
    }

    if (this.merchantToday && time > MERCHANT_AT && time < MERCHANT_AT + 0.05) {
      this.merchantToday = false
      this.merchant(sim)
    }
  }

  /** Jumps to a fresh day (loading a scene, clearing). */
  reset() {
    this.eclipse = this.aurora = this.meteors = 0
    this.day = 0
  }

  /** Writes an event down in everyone's journal (once). */
  private tell(sim: Simulation, key: string, text: string, kind: JournalKind) {
    if (this.told.has(key)) return
    this.told.add(key)
    for (const mind of minds(sim)) if (mind.role !== 'merchant') note(mind, text, kind)
  }

  /** A meteor starting high up, heading down at a slant. */
  private meteor(sim: Simulation) {
    const { grid } = sim
    const x = Math.floor(sim.random() * grid.width)
    const i = x
    if (grid.type[i] === EMPTY) grid.place(i, METEOR, 0, sim.random() < 0.5 ? 1 : 0)
  }

  /** The travelling merchant walks in from the edge of the world nearest someone's house. */
  private merchant(sim: Simulation) {
    const { grid } = sim
    const homes = minds(sim).filter((m) => m.home && m.role !== 'merchant')
    if (!homes.length) return
    const home = homes[Math.floor(sim.random() * homes.length)].home!
    const x = home.x < grid.width / 2 ? 1 : grid.width - 2
    let y = 0
    while (y < grid.height - 1 && grid.type[(y + 1) * grid.width + x] === EMPTY) y++
    const i = y * grid.width + x
    if (y < 3 || grid.type[i] !== EMPTY) return
    grid.place(i, HUMAN)
    const key = sim.newMemoryKey()
    grid.life[i] = key
    const mind = createMind()
    mind.role = 'merchant'
    mind.name = MERCHANT_NAMES[Math.floor(sim.random() * MERCHANT_NAMES.length)]
    mind.leaveTo = { x, y }
    mind.today = sim.day
    sim.memory.set(key, mind)
    this.tell(sim, 'merchant', `A travelling merchant, ${mind.name}, came by to trade.`, 'friend')
  }
}

/** The minds of everyone in the world (humans). */
function minds(sim: Simulation): Mind[] {
  const { type, life, size } = sim.grid
  const found: Mind[] = []
  for (let i = 0; i < size; i++) {
    if (type[i] !== HUMAN) continue
    const mind = sim.memory.get(life[i]) as Mind | undefined
    if (mind) found.push(mind)
  }
  return found
}
