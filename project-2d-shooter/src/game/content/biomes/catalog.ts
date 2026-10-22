import { Registry } from '@engine/content/registry';
import type { ThemeId } from '../../render/palette';

/** Difficulty ramp and fairness for the enemies placed in a level. */
export interface EncounterRules {
  /**
   * Share of a room's E markers that spawn, from the first room with enemies (`from`) to the
   * last room (`to`), linear in between: the level starts light and ends crowded.
   */
  readonly density: { readonly from: number; readonly to: number };
  /** At least this many enemies in every room after the first (when it has that many markers). */
  readonly minPerRoom: number;
  /** No enemy within this many tiles of the left wall of its room (where the player comes in, by door or window). */
  readonly entryClearance: number;
  /** No enemy within this many tiles of the player's start. */
  readonly safeRadius: number;
}

export interface BiomeDef {
  readonly id: string;
  readonly name: string;
  /** Short label in the HUD, e.g. "RUA". */
  readonly floorLabel: string;
  readonly description: string;
  /** Colours, sky and mood (render/palette.ts THEMES). A run mode may override it. */
  readonly theme: ThemeId;
  /** Rooms from left to right. */
  readonly rooms: { readonly min: number; readonly max: number };
  /** Template tags allowed in this biome (see procgen/rooms.ts). */
  readonly roomTags: readonly string[];
  /** Fixed first/last room template ids. */
  readonly startTemplate?: string;
  readonly endTemplate?: string;
  /** Text over the exit at the far right. */
  readonly exitLabel: string;
  /**
   * Empty = peaceful biome. `from` (0-1, default 0): the entry only shows up from that point of the
   * level on (0 = first room with enemies, 1 = the last room), so the heavy ones come late.
   */
  readonly enemyPool: readonly { readonly id: string; readonly weight: number; readonly from?: number }[];
  /** How the E markers turn into enemies (procgen/level.ts). Omitted: every marker spawns. */
  readonly encounters?: EncounterRules;
  /** Chance (0-1) that a middle chunk is stamped mirrored left-right. Default 0. */
  readonly mirrorChance?: number;
}

export const BIOMES = new Registry<BiomeDef>('biome', [
  {
    id: 'alleys',
    name: 'Becos',
    floorLabel: 'RUA',
    description: 'Prédios e becos, da esquerda para a direita.',
    theme: 'campaign',
    rooms: { min: 5, max: 7 },
    roomTags: ['alley'],
    startTemplate: 'building-1',
    endTemplate: 'building-4',
    exitLabel: 'SAÍDA',
    enemyPool: [
      { id: 'security', weight: 3 },
      { id: 'intern', weight: 3 },
      { id: 'it-guy', weight: 2 },
      { id: 'manager', weight: 1, from: 0.5 },
      { id: 'janitor', weight: 2 },
      { id: 'auditor', weight: 1, from: 0.25 },
    ],
    encounters: { density: { from: 0.35, to: 0.75 }, minPerRoom: 2, entryClearance: 4, safeRadius: 12 },
    mirrorChance: 0.5,
  },
  // Prototype: a flat, straight castle field for the medieval kit (not part of BIOME_ORDER).
  {
    id: 'castle',
    name: 'Castelo',
    floorLabel: 'PÁTIO',
    description: 'Um campo aberto ao pé do castelo, para testar espada e escudo.',
    theme: 'castle',
    rooms: { min: 4, max: 4 },
    roomTags: ['castle'],
    startTemplate: 'castle-gate',
    endTemplate: 'castle-bridge',
    exitLabel: 'PORTÃO',
    enemyPool: [
      { id: 'skeleton', weight: 4 },
      { id: 'skeleton-knight', weight: 2 },
      { id: 'skeleton-archer', weight: 1 },
    ],
  },
]);

/** Biomes played in a run, in order. The exit reloads the scenario (same seed -> same layout). */
export const BIOME_ORDER = ['alleys'] as const;
