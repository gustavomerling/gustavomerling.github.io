import type { SongId } from '../music/songs'
import type { IconName } from '../types'
import type { WaveDef } from '../waves'

export interface MapDef {
  id: string
  /** 1-based difficulty tier; scales KB rewards */
  tier: number
  name: string
  /** shown like a drive/path in the map picker, e.g. "C:\" */
  path: string
  icon: IconName
  description: string
  waves: WaveDef[]
  /** boss enemy id and when it arrives (seconds). Killing it wins the run. */
  boss: { id: string; at: number }
  music: SongId
  /** map id that must be cleared first */
  unlockAfter?: string
  /** arena background, drawn every frame in arena units */
  drawBackground(ctx: CanvasRenderingContext2D, w: number, h: number, time: number): void
}

export function defineMap(def: MapDef): MapDef {
  return def
}
