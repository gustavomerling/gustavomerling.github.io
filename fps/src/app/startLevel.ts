import { LEVELS } from '../engine/levels/index.ts'

/**
 * Dev shortcut: a hash like `#/n-4` starts the game at level 4 (1-based).
 * Returns the level's index in `LEVELS`, or `null` if the hash is not a level.
 */
export function levelFromHash(hash: string): number | null {
  const match = /^#\/n-(\d+)$/.exec(hash)
  if (!match) return null
  const index = Number(match[1]) - 1
  return index >= 0 && index < LEVELS.length ? index : null
}
