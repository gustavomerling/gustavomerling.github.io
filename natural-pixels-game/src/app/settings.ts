import { createContext, useContext } from 'react'
import type { RenderMode } from '../engine/renderer/index.ts'

export type Grain = 'fine' | 'normal' | 'coarse'

export interface Settings {
  graphics: RenderMode
  /** Cell size: fine = more, smaller cells (heavier); coarse = fewer, bigger cells. */
  grain: Grain
  dayCycle: boolean
  sound: boolean
  /** 0..1 */
  volume: number
}

export const DEFAULT_SETTINGS: Settings = {
  graphics: 'smooth',
  grain: 'normal',
  dayCycle: true,
  sound: true,
  volume: 0.6,
}

/** Roughly how many grid cells each grain setting gives. */
export const GRAIN_CELLS: Record<Grain, number> = {
  fine: 120_000,
  normal: 72_000,
  coarse: 40_000,
}

const STORAGE_KEY = 'natural-pixels.settings'

export function loadSettings(): Settings {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') as Partial<Settings>
    return { ...DEFAULT_SETTINGS, ...saved }
  } catch {
    return DEFAULT_SETTINGS
  }
}

export function saveSettings(settings: Settings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
  } catch {
    // Storage unavailable: settings just won't persist.
  }
}

export interface SettingsContextValue {
  settings: Settings
  update: (patch: Partial<Settings>) => void
}

export const SettingsContext = createContext<SettingsContextValue>({
  settings: DEFAULT_SETTINGS,
  update: () => {},
})

export function useSettings(): SettingsContextValue {
  return useContext(SettingsContext)
}
