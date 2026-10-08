import type { Matter } from '../../elements/types.ts'
import { energy } from './energy.ts'
import { gas } from './gas.ts'
import { liquid } from './liquid.ts'
import { powder } from './powder.ts'
import type { Behavior } from './types.ts'

export type { Behavior }

/** Default movement per matter. Matters without an entry don't move (yet). */
export const BEHAVIORS: Partial<Record<Matter, Behavior>> = {
  powder,
  liquid,
  gas,
  energy,
}
