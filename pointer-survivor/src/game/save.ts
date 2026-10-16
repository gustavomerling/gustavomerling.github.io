const KEY = 'pointer-survivor:save:v1'

export interface MapRecord {
  bestTime: number
  clears: number
}

export interface SaveData {
  /** currency */
  kb: number
  /** shop upgrade id -> level */
  shop: Record<string, number>
  runs: number
  bestTime: number
  bestKills: number
  totalKills: number
  /** sound effects muted */
  muted: boolean
  musicMuted: boolean
  /** glossary unlocks, as "enemies:bug" / "weapons:leftClick" / "items:cache" */
  discovered: string[]
  /** map id -> record; a map is cleared once its boss died */
  maps: Record<string, MapRecord>
}

export const EMPTY_SAVE: SaveData = {
  kb: 0,
  shop: {},
  runs: 0,
  bestTime: 0,
  bestKills: 0,
  totalKills: 0,
  muted: false,
  musicMuted: false,
  discovered: [],
  maps: {},
}

export function loadSave(): SaveData {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return { ...EMPTY_SAVE }
    return { ...EMPTY_SAVE, ...(JSON.parse(raw) as Partial<SaveData>) }
  } catch {
    return { ...EMPTY_SAVE }
  }
}

export function writeSave(data: SaveData): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(data))
  } catch {
    // storage unavailable (private mode etc.) — progress lives only in memory
  }
}

export function clearedMaps(save: SaveData): string[] {
  return Object.entries(save.maps)
    .filter(([, r]) => r.clears > 0)
    .map(([id]) => id)
}
