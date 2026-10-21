import { Registry } from '@engine/content/registry';

export interface BiomePalette {
  /** Background behind everything (sky / void). */
  sky: string;
  solid: string;
  solidEdge: string;
  oneWay: string;
  ladder: string;
  accent: string;
}

export interface BiomeDef {
  readonly id: string;
  readonly name: string;
  /** Short label in the HUD, e.g. "RUA". */
  readonly floorLabel: string;
  readonly description: string;
  readonly palette: BiomePalette;
  /** Rooms from left to right. */
  readonly rooms: { readonly min: number; readonly max: number };
  /** Template tags allowed in this biome (see procgen/rooms.ts). */
  readonly roomTags: readonly string[];
  /** Fixed first/last room template ids. */
  readonly startTemplate?: string;
  readonly endTemplate?: string;
  /** Text over the exit at the far right. */
  readonly exitLabel: string;
  /** Empty = peaceful biome. */
  readonly enemyPool: readonly { readonly id: string; readonly weight: number }[];
}

export const BIOMES = new Registry<BiomeDef>('biome', [
  {
    id: 'alleys',
    name: 'Becos',
    floorLabel: 'RUA',
    description: 'Prédios e becos, da esquerda para a direita.',
    palette: { sky: '#0b0d12', solid: '#1b1f27', solidEdge: '#8a94a6', oneWay: '#c9b458', ladder: '#9a8a52', accent: '#ffd23f' },
    rooms: { min: 5, max: 6 },
    roomTags: ['alley'],
    startTemplate: 'building-1',
    endTemplate: 'building-4',
    exitLabel: 'SAÍDA',
    enemyPool: [
      { id: 'security', weight: 3 },
      { id: 'intern', weight: 3 },
      { id: 'it-guy', weight: 2 },
      { id: 'manager', weight: 1 },
    ],
  },
]);

/** Biomes played in a run, in order. The exit reloads the scenario (same seed -> same layout). */
export const BIOME_ORDER = ['alleys'] as const;
