import { level1 } from './level1.ts'
import { level2 } from './level2.ts'
import { level3 } from './level3.ts'
import { level4 } from './level4.ts'
import { level5 } from './level5.ts'
import { level6 } from './level6.ts'
import { level7 } from './level7.ts'
import type { LevelDef } from './types.ts'

/** Every level in the game, bottom to top. They are stacked in this order. */
export const LEVELS: LevelDef[] = [level1, level2, level3, level4, level5, level6, level7]

export type { LevelDef } from './types.ts'
