import type { BlockDef } from '../blocks/types.ts'

/**
 * A level is just data. Levels are stacked in the order of `LEVELS`: each one
 * starts at the base of the previous one plus its `height`. Positions inside a
 * level are relative to its own base, so a level can be written on its own.
 *
 * Add a new level by writing one of these and listing it in `levels/index.ts`.
 */
/**
 * A walkable slope that follows a path of (x, z) points. It starts at the level
 * base and rises `rise` in a straight line over the whole path. `width` is how
 * wide the surface is on each side of the path.
 */
export type RampDef = {
  path: [number, number][]
  width: number
  /** Height where the path starts, above the level base. Defaults to 0. */
  from?: number
  /** Height where the path ends, above the level base. */
  rise: number
  color: number
}

export type LevelDef = {
  id: string
  name: string
  /** Short subtitle shown when the player reaches the level. */
  tagline: string
  /** Floor footprint (`size x size`), centered on the origin. Used when `floor` is on. */
  size: number
  /** Vertical span. The next level starts this far above this level's base. */
  height: number
  /**
   * Whether the level has a floor that catches falls. Without one, the player
   * drops past the level into the one below. Defaults to true.
   */
  floor?: boolean
  /** Spawn point `[x, y, z]`, relative to the level base (y is the feet height). */
  spawn: [number, number, number]
  /**
   * Only the bottom level's value is used: falling below `fallLimit` (world Y)
   * respawns the player at the start of the level they fell into. Levels above
   * it can be dropped through freely.
   */
  fallLimit?: number
  blocks: BlockDef[]
  /** Walkable slopes, built along with the blocks. */
  ramps?: RampDef[]
  /** Finish line `[x, y, z]` (feet height), relative to the level base. Reaching it ends the run. */
  goal?: [number, number, number]
}
