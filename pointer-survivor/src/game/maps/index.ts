import { desktopMap } from './desktop'
import { system32Map } from './system32'
import type { MapDef } from './types'
import { webMap } from './web'

/** In unlock order. To add a map: create a file with defineMap(...) and list it here. */
export const MAPS: MapDef[] = [desktopMap, webMap, system32Map]

export const MAP_BY_ID: Record<string, MapDef> = Object.fromEntries(MAPS.map((m) => [m.id, m]))

export function isMapUnlocked(map: MapDef, cleared: string[]): boolean {
  return !map.unlockAfter || cleared.includes(map.unlockAfter)
}
