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
  /** Skybox painted behind the level (defaults to the city). */
  readonly sky?: 'city' | 'castle';
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
      { id: 'janitor', weight: 2 },
      { id: 'auditor', weight: 1 },
    ],
  },
  // Prototype: a flat, straight castle field for the medieval kit (not part of BIOME_ORDER).
  {
    id: 'castle',
    name: 'Castelo',
    floorLabel: 'PÁTIO',
    description: 'Um pátio reto de pedra para testar lâminas, flechas e magia.',
    palette: { sky: '#33405a', solid: '#4a4f5a', solidEdge: '#a7b0be', oneWay: '#b08d57', ladder: '#8a7a5a', accent: '#ffd23f' },
    rooms: { min: 4, max: 4 },
    roomTags: ['castle'],
    startTemplate: 'castle-gate',
    endTemplate: 'castle-bridge',
    exitLabel: 'PORTÃO',
    enemyPool: [
      { id: 'skeleton-archer', weight: 3 },
      { id: 'skeleton-knight', weight: 2 },
      { id: 'skeleton-mage', weight: 1 },
    ],
    sky: 'castle',
  },
]);

/** Biomes played in a run, in order. The exit reloads the scenario (same seed -> same layout). */
export const BIOME_ORDER = ['alleys'] as const;
