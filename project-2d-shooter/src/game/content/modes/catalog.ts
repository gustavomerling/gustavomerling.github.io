import { Registry } from '@engine/content/registry';
import type { ThemeId } from '../../render/palette';

export type RunModeId = 'campaign' | 'zombie' | 'medieval';

export interface StartingWeapon {
  readonly weaponId: string;
  readonly attachments: readonly string[];
}

export interface WeightedEnemy {
  readonly id: string;
  readonly weight: number;
}

/** A value that moves from `start` (intensity 0) to `end` (intensity 1). */
export interface Ramp {
  readonly start: number;
  readonly end: number;
}

/** A reinforcement type; its weight slides from `weight` to `lateWeight` as intensity grows. */
export interface HordeEnemy extends WeightedEnemy {
  readonly lateWeight?: number;
  /** Never more than this many of the type near the player at once. */
  readonly cap?: number;
}

/**
 * Reinforcements (zombie mode), see systems/horde.ts. Pressure comes in surges with breathers
 * in between. Intensity (0..1) grows with time alive and with how far right the player got,
 * and every Ramp below follows it. Times in seconds, distances in px.
 */
export interface HordeDef {
  /** Seconds alive to reach full intensity from time alone. */
  readonly rampSeconds: number;
  /** Share of intensity that comes from map progress (0..1); the rest comes from time. */
  readonly progressWeight: number;
  /** Quiet before the first surge (the zombies already in the level come first). */
  readonly firstSurge: number;
  /** Breather between surges: nothing new spawns. */
  readonly calm: Ramp;
  /** The last seconds of a breather are a warning (HUD: "eles estão vindo"). */
  readonly warning: number;
  /** How long a surge lasts. */
  readonly surge: Ramp;
  /** Seconds between groups during a surge, and zombies per group. */
  readonly groupEvery: Ramp;
  readonly groupSize: Ramp;
  /** Members of a group come one at a time, this many seconds apart (no stacks). */
  readonly spawnStagger: number;
  /** No new spawns while this many zombies are near the player (within `despawnDistance`). */
  readonly maxAlive: Ramp;
  /** Spawn distance from the player (behind first; ahead only when nothing behind fits). */
  readonly minDistance: number;
  readonly maxDistance: number;
  /** Zombies this far behind, or stuck this long, out of view are recycled (no kill). */
  readonly despawnDistance: number;
  readonly stuckSeconds: number;
  /** Finite ammo: magazines in reserve at the start, refill per kill (per gun) and the ceiling. */
  readonly ammo: { readonly startMagazines: number; readonly perKill: number; readonly maxMagazines: number };
  readonly pool: readonly HordeEnemy[];
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
  /** Overrides the biome's colour theme (render/palette.ts), e.g. the darker zombie city. */
  readonly theme?: ThemeId;
  /** Overrides the campaign's biome (e.g. the flat castle test field). */
  readonly biomeId?: string;
  /** Overrides the player's starting kit (keys 1-5). A blade makes the player a sword-and-shield fencer. */
  readonly loadout?: readonly StartingWeapon[];
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
    description: 'Chegue à saída. Eles vêm em ondas, cada vez mais, por trás. Só tiro na cabeça mata, e cada morte devolve munição.',
    tag: 'MODO ZUMBI',
    deathTitle: 'Você foi pego',
    theme: 'zombie',
    enemyPool: ZOMBIES,
    horde: {
      rampSeconds: 240,
      progressWeight: 0.5,
      firstSurge: 8,
      calm: { start: 10, end: 6 },
      warning: 3,
      surge: { start: 10, end: 18 },
      groupEvery: { start: 3.2, end: 1.8 },
      groupSize: { start: 1, end: 3 },
      spawnStagger: 0.5,
      maxAlive: { start: 7, end: 16 },
      minDistance: 260,
      maxDistance: 420,
      despawnDistance: 640,
      stuckSeconds: 6,
      ammo: { startMagazines: 2, perKill: 0.3, maxMagazines: 5 },
      pool: [
        { id: 'zombie', weight: 6, lateWeight: 4 },
        { id: 'runner', weight: 1, lateWeight: 3, cap: 4 },
        { id: 'bloater', weight: 0.4, lateWeight: 1.5, cap: 2 },
      ],
    },
  },
  {
    id: 'medieval',
    name: 'Modo medieval',
    description: 'Espada e escudo contra esqueletos. Esquerdo golpeia, direito defende (na hora certa, apara). Q chuta o escudo.',
    tag: 'MEDIEVAL',
    deathTitle: 'Você caiu em batalha',
    biomeId: 'castle',
    enemyPool: [
      { id: 'skeleton', weight: 4 },
      { id: 'skeleton-knight', weight: 2 },
      { id: 'skeleton-archer', weight: 1 },
    ],
    loadout: [{ weaponId: 'iron-sword', attachments: [] }],
  },
]);
