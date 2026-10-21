import { Registry } from '@engine/content/registry';

export type RunModeId = 'campaign' | 'zombie';

export interface WeightedEnemy {
  readonly id: string;
  readonly weight: number;
}

/** Reinforcements that keep coming while the player moves on (zombie mode). */
export interface HordeDef {
  /** Seconds between spawn attempts. */
  readonly interval: number;
  /** Stop spawning while this many enemies are alive. */
  readonly maxAlive: number;
  /** Spawn distance behind the player, in world units (px). */
  readonly minDistance: number;
  readonly maxDistance: number;
  readonly pool: readonly WeightedEnemy[];
}

export interface RunModeDef {
  readonly id: RunModeId;
  /** Menu label. */
  readonly name: string;
  readonly description: string;
  /** Pause / death screen tag. */
  readonly tag: string;
  /** Death screen title. */
  readonly deathTitle: string;
  /** Replaces the biome's enemy pool for the enemies placed in the level. */
  readonly enemyPool?: readonly WeightedEnemy[];
  readonly horde?: HordeDef;
}

const ZOMBIES: readonly WeightedEnemy[] = [
  { id: 'zombie', weight: 5 },
  { id: 'runner', weight: 2 },
  { id: 'bloater', weight: 1 },
];

export const RUN_MODES = new Registry<RunModeDef>('mode', [
  {
    id: 'campaign',
    name: 'Jogar',
    description: 'Prédios e becos, da esquerda para a direita, até a saída.',
    tag: 'CAMPANHA',
    deathTitle: 'Você morreu',
  },
  {
    id: 'zombie',
    name: 'Modo zumbi',
    description: 'Eles não param. Cada vez mais vêm de trás.',
    tag: 'MODO ZUMBI',
    deathTitle: 'Você foi pego',
    enemyPool: ZOMBIES,
    horde: {
      interval: 3.5,
      maxAlive: 14,
      minDistance: 260,
      maxDistance: 420,
      pool: ZOMBIES,
    },
  },
]);
