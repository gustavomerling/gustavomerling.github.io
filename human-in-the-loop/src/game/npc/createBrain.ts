import { ArmedNpcBrain } from './ArmedNpcBrain'
import { Brain } from './Brain'
import { ZombieBrain } from './ZombieBrain'
import type { BrainDeps, NpcBrain, NpcKind } from './types'

/**
 * Único lugar que escolhe o cérebro pelo tipo.
 */
export function createBrain(kind: NpcKind, deps: BrainDeps): NpcBrain {
  switch (kind) {
    case 'civilian':
      return new Brain(kind, deps)
    case 'zombie':
      return new ZombieBrain(kind, deps)
    case 'armed':
      return new ArmedNpcBrain(kind, deps)
  }
}
