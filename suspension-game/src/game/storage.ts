// Persistência local + link de compartilhamento. Tudo em try/catch: storage pode não existir.

import { PRESETS } from './presets'
import type { CarDesign } from './types'

const DESIGN_KEY = 'suspension-game:design'
const RECORDS_KEY = 'suspension-game:records'

export interface TrackRecord {
  bestDistance: number
  bestTime: number | null
  bestStars: number
  bestScore: number
  /** 0 = nenhuma, 1 bronze, 2 prata, 3 ouro. */
  bestMedal: number
}

const EMPTY_RECORD: TrackRecord = { bestDistance: 0, bestTime: null, bestStars: 0, bestScore: 0, bestMedal: 0 }

export interface GameOptions {
  sound: boolean
  fragile: boolean
  fuel: boolean
  ghost: boolean
  particles: boolean
}

export const DEFAULT_GAME_OPTIONS: GameOptions = { sound: true, fragile: true, fuel: true, ghost: true, particles: true }
const OPTIONS_KEY = 'suspension-game:options'

export function loadOptions(): GameOptions {
  try {
    return { ...DEFAULT_GAME_OPTIONS, ...JSON.parse(localStorage.getItem(OPTIONS_KEY) ?? '{}') }
  } catch {
    return DEFAULT_GAME_OPTIONS
  }
}

export function saveOptions(o: GameOptions) {
  try {
    localStorage.setItem(OPTIONS_KEY, JSON.stringify(o))
  } catch {
    /* ignora */
  }
}

function isDesign(d: unknown): d is CarDesign {
  const x = d as CarDesign
  return !!x && typeof x.chassisId === 'string' && Array.isArray(x.parts)
}

export function loadDesign(): CarDesign {
  const fromLink = designFromHash()
  if (fromLink) return fromLink
  try {
    const raw = localStorage.getItem(DESIGN_KEY)
    const d = raw && JSON.parse(raw)
    if (isDesign(d)) return d
  } catch {
    /* ignora */
  }
  return PRESETS[0].design
}

export function saveDesign(d: CarDesign) {
  try {
    localStorage.setItem(DESIGN_KEY, JSON.stringify(d))
  } catch {
    /* ignora */
  }
}

// ---------- link: #car=<base64 do JSON compacto>

const round = (n: number) => Math.round(n * 1000) / 1000

export function designToHash(d: CarDesign): string {
  const compact = {
    c: d.chassisId,
    s: d.customChassis?.map((v) => [round(v.x), round(v.y)]),
    p: d.parts.map((p) => [p.kind[0], p.typeId, round(p.x), round(p.y), round(p.angle ?? 0), p.driven === false ? 0 : 1]),
  }
  return 'car=' + btoa(unescape(encodeURIComponent(JSON.stringify(compact))))
}

const KINDS = { b: 'block', s: 'suspension', a: 'axle', w: 'wheel', f: 'flag' } as const

export function designFromHash(): CarDesign | null {
  try {
    const m = location.hash.match(/car=([^&]+)/)
    if (!m) return null
    const c = JSON.parse(decodeURIComponent(escape(atob(m[1]))))
    const design: CarDesign = {
      chassisId: c.c,
      customChassis: c.s?.map(([x, y]: number[]) => ({ x, y })),
      parts: c.p.map(([k, typeId, x, y, angle, driven]: [keyof typeof KINDS, string, number, number, number, number], i: number) => ({
        id: `l${i}`,
        kind: KINDS[k],
        typeId,
        x,
        y,
        angle: angle || undefined,
        driven: driven === 0 ? false : undefined,
      })),
    }
    return isDesign(design) ? design : null
  } catch {
    return null
  }
}

// ---------- recordes por pista

const trackKey = (seed: number, difficulty: string) => `${difficulty}:${seed}`

function loadRecords(): Record<string, TrackRecord> {
  try {
    return JSON.parse(localStorage.getItem(RECORDS_KEY) ?? '{}')
  } catch {
    return {}
  }
}

export function getRecord(seed: number, difficulty: string): TrackRecord {
  return { ...EMPTY_RECORD, ...loadRecords()[trackKey(seed, difficulty)] }
}

export function saveRecord(seed: number, difficulty: string, r: TrackRecord) {
  try {
    const all = loadRecords()
    all[trackKey(seed, difficulty)] = r
    localStorage.setItem(RECORDS_KEY, JSON.stringify(all))
  } catch {
    /* ignora */
  }
}

/** Total de medalhas conquistadas em todas as pistas: [bronze, prata, ouro]. */
export function medalTotals(): [number, number, number] {
  const t: [number, number, number] = [0, 0, 0]
  for (const r of Object.values(loadRecords())) if (r.bestMedal) t[r.bestMedal - 1]++
  return t
}
