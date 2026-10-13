import { DEFAULT_SETTINGS, SETTING_LIMITS, type GameSettings } from '../engine/settings.ts'

/** What the player has achieved, kept between sessions. */
export type Progress = {
  /** Index of the highest level ever reached; every level up to it can be picked. */
  unlocked: number
  /** Best full run (from level 1 to the goal), in seconds. */
  bestTime: number | null
  /** Falls during the best run. */
  bestFalls: number | null
  /** How many times the tower was finished. */
  wins: number
}

const PROGRESS_KEY = 'fps-parkour:progress'
const SETTINGS_KEY = 'fps-parkour:settings'

const EMPTY_PROGRESS: Progress = { unlocked: 0, bestTime: null, bestFalls: null, wins: 0 }

// Storage can be missing or throw (private windows, blocked site data); the game
// then simply forgets between sessions.
function read<T>(key: string): Partial<T> | null {
  try {
    const raw = window.localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as Partial<T>) : null
  } catch {
    return null
  }
}

function write(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Not saved; nothing else to do.
  }
}

export function loadProgress(): Progress {
  return { ...EMPTY_PROGRESS, ...read<Progress>(PROGRESS_KEY) }
}

export function unlockLevel(index: number) {
  const progress = loadProgress()
  if (index <= progress.unlocked) return
  write(PROGRESS_KEY, { ...progress, unlocked: index })
}

/** Saves a finished run. Returns true when it is a new record. */
export function recordWin(time: number, falls: number, fullRun: boolean) {
  const progress = loadProgress()
  const record = fullRun && (progress.bestTime === null || time < progress.bestTime)
  write(PROGRESS_KEY, {
    ...progress,
    wins: progress.wins + 1,
    ...(record ? { bestTime: time, bestFalls: falls } : {}),
  })
  return record
}

export function loadSettings(): GameSettings {
  const stored = { ...DEFAULT_SETTINGS, ...read<GameSettings>(SETTINGS_KEY) }
  const clamp = (value: number, { min, max }: { min: number; max: number }, fallback: number) =>
    Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback
  return {
    sensitivity: clamp(stored.sensitivity, SETTING_LIMITS.sensitivity, DEFAULT_SETTINGS.sensitivity),
    fov: clamp(stored.fov, SETTING_LIMITS.fov, DEFAULT_SETTINGS.fov),
    volume: clamp(stored.volume, SETTING_LIMITS.volume, DEFAULT_SETTINGS.volume),
    muted: Boolean(stored.muted),
    headBob: Boolean(stored.headBob),
  }
}

export function saveSettings(settings: GameSettings) {
  write(SETTINGS_KEY, settings)
}

/** `83.4` -> `1:23.4` */
export function formatTime(seconds: number) {
  const minutes = Math.floor(seconds / 60)
  const rest = seconds - minutes * 60
  return `${minutes}:${rest.toFixed(1).padStart(4, '0')}`
}
