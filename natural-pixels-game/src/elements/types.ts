import type { LucideIcon } from 'lucide-react'
import type { CellContext } from '../engine/context.ts'

/** Default movement behaviour the engine applies to a cell every tick. */
export type Matter = 'empty' | 'static' | 'powder' | 'liquid' | 'gas' | 'energy'

/** Element family. Each one is a folder in `src/elements/`. */
export type ElementCategory = 'core' | 'terrain' | 'water' | 'plants' | 'animals' | 'fire' | 'materials'

export interface ElementColor {
  /** Base color as hex (`#rrggbb`). */
  base: string
  /** Brightness jitter between cells (0 = flat, 0.15 = very grainy). */
  variation?: number
  /** Opacity 0..1 (liquids and gases look better slightly transparent). */
  alpha?: number
  /** Color when fully soaked; blends from `base` as moisture rises. */
  wet?: string
}

export interface ElementMovement {
  /** Powder: chance per tick to slide diagonally when blocked (1 = loose sand, low = sticky soil). */
  slide?: number
  /** Liquid: how many cells it can flow sideways in a single tick. */
  spread?: number
  /** Gas: chance per tick to rise (steam shoots up, clouds barely climb). */
  rise?: number
  /** Gas: chance per tick to drift one cell sideways. */
  drift?: number
  /** Chance per tick to sink through (or rise through) another fluid. Acts like drag. */
  sink?: number
}

export interface ElementMoisture {
  /** Max water units the cell holds (≤ 255). One water cell is worth `WATER_CELL_UNITS` (engine/constants.ts). */
  capacity: number
  /** Moisture only spreads between cells of the same group (e.g. 'soil', 'plant'). */
  group: string
  /** Id of a liquid this element soaks up from neighbours (e.g. 'water'). */
  absorbs?: string
  /** Share (0..1) of the moisture difference evened out per exchange. */
  flow?: number
  /** Which way moisture prefers to travel: soil drains down, plant sap rises. */
  bias?: 'down' | 'up'
}

export interface PhaseChange {
  temp: number
  into: string
  /**
   * Chance per tick to change once past `temp` (default 1). Until it does, the cell is held
   * at `temp`, soaking up the extra heat — latent heat: boiling water stays at 100 °C.
   */
  chance?: number
}

export interface ElementThermal {
  /** How well heat passes through it, 0..1 (metal 0.9, wood 0.05). Default 0.1. */
  conductivity?: number
  /** Temperature when placed (°C). Defaults to ambient. */
  initialTemp?: number
  /** Heat source: the cell is held at this temperature (fire). */
  source?: number
  /** Turns into another element when hotter than `temp` (water → steam at 100). */
  above?: PhaseChange
  /** Turns into another element when colder than `temp`. */
  below?: PhaseChange
  /**
   * Flammable: ignites at `at` °C if dry, keeps itself burning at `temp`, gives off fire
   * and is consumed with chance `rate` per tick into `into` (default air).
   */
  burn?: { at: number; temp?: number; rate: number; into?: string }
}

export interface ElementLifetime {
  /** Ticks (60 = 1 s). The actual lifetime is random between min and max. */
  min: number
  max: number
  /** What it becomes when time runs out (default air). */
  into?: string
}

export interface ElementDefinition {
  /** Stable id used in code and saves (e.g. `'water'`). */
  id: string
  /** Display name (English, shown in the UI). */
  name: string
  /** One-line tooltip text. */
  description: string
  category: ElementCategory
  matter: Matter
  /** Decides who sinks and who floats. Air is 1. */
  density: number
  color: ElementColor
  icon: LucideIcon
  movement?: ElementMovement
  moisture?: ElementMoisture
  thermal?: ElementThermal
  /** Transforms automatically after a while. Uses the cell's `life` timer. */
  lifetime?: ElementLifetime
  /**
   * Custom per-tick logic (growth, germination...). Runs before movement.
   * Movement is skipped if it returns `true` (e.g. fruit hanging from a branch)
   * or if it turns the cell into something else.
   */
  update?: (ctx: CellContext) => boolean | void
  /** Share of brush cells filled per frame (1 = solid stroke). Defaults by matter. */
  brushFill?: number
  /** Hidden elements only appear through reactions (plant, cloud...). */
  hidden?: boolean
}
