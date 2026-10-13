/** Player preferences the engine reads. Stored by the app between sessions. */
export type GameSettings = {
  /** Multiplier on the base mouse sensitivity. */
  sensitivity: number
  /** Vertical field of view, in degrees. */
  fov: number
  /** Master volume, 0 to 1. */
  volume: number
  muted: boolean
  headBob: boolean
}

export const DEFAULT_SETTINGS: GameSettings = {
  sensitivity: 1,
  fov: 75,
  volume: 0.7,
  muted: false,
  headBob: true,
}

export const SETTING_LIMITS = {
  sensitivity: { min: 0.3, max: 2.5, step: 0.05 },
  fov: { min: 60, max: 100, step: 1 },
  volume: { min: 0, max: 1, step: 0.05 },
} as const
