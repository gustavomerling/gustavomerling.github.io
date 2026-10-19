import { Registry } from '@engine/content/registry';

/**
 * Parallax background layer, painted procedurally in the wireframe phase.
 * `parallax` 0 = glued to the screen, 1 = moves with the world.
 */
export type BackgroundLayer =
  | { kind: 'fill'; color: string }
  | { kind: 'grid'; color: string; spacing: number; parallax: number }
  | { kind: 'skyline'; color: string; parallax: number; minHeight: number; maxHeight: number; minWidth: number; maxWidth: number }
  | { kind: 'pillars'; color: string; parallax: number; spacing: number; width: number };

export interface BiomePalette {
  solid: string;
  solidEdge: string;
  oneWay: string;
  accent: string;
}

export interface BiomeDef {
  readonly id: string;
  readonly name: string;
  /** Elevator display, e.g. "SS2". */
  readonly floorLabel: string;
  readonly description: string;
  readonly palette: BiomePalette;
  readonly background: readonly BackgroundLayer[];
  /** Rooms from left to right. */
  readonly rooms: { readonly min: number; readonly max: number };
  /** Template tags allowed in this biome (see procgen/rooms.ts). */
  readonly roomTags: readonly string[];
  /** Fixed first/last room template ids (e.g. the bedroom where the run starts). */
  readonly startTemplate?: string;
  readonly endTemplate?: string;
  /** Text over the exit at the far right ("PORTA", "ELEVADOR"...). */
  readonly exitLabel: string;
  /** Empty = peaceful biome. */
  readonly enemyPool: readonly { readonly id: string; readonly weight: number }[];
}

export const BIOMES = new Registry<BiomeDef>('biome', [
  {
    id: 'apartment',
    name: 'Apartamento',
    floorLabel: 'AP 302',
    description: 'Domingo à noite. O celular vibra: foto da sua lasanha no grupo do escritório.',
    palette: { solid: '#1e1a22', solidEdge: '#b9a7c9', oneWay: '#d4a373', accent: '#ffd23f' },
    background: [
      { kind: 'fill', color: '#120f15' },
      { kind: 'grid', color: '#1a1520', spacing: 12, parallax: 1 },
    ],
    rooms: { min: 3, max: 3 },
    roomTags: ['apartment'],
    startTemplate: 'apt-bedroom',
    endTemplate: 'apt-living',
    exitLabel: 'PORTA',
    enemyPool: [],
  },
  {
    id: 'alleys',
    name: 'Becos',
    floorLabel: 'RUA',
    description: 'Lixeiras, escadas de incêndio e o caminho mais curto até o escritório.',
    palette: { solid: '#1b1f27', solidEdge: '#8a94a6', oneWay: '#c9b458', accent: '#ffd23f' },
    background: [
      { kind: 'fill', color: '#0b0d12' },
      { kind: 'skyline', color: '#11151d', parallax: 0.15, minHeight: 120, maxHeight: 240, minWidth: 40, maxWidth: 90 },
      { kind: 'pillars', color: '#141821', parallax: 0.4, spacing: 160, width: 10 },
    ],
    rooms: { min: 5, max: 6 },
    roomTags: ['alley'],
    startTemplate: 'alley-start',
    exitLabel: 'ENTRADA',
    enemyPool: [
      { id: 'security', weight: 3 },
      { id: 'intern', weight: 3 },
      { id: 'it-guy', weight: 2 },
      { id: 'manager', weight: 1 },
    ],
  },
  {
    id: 'reception',
    name: 'Recepção',
    floorLabel: 'T',
    description: 'Mármore, catraca e uma recepcionista que viu tudo.',
    palette: { solid: '#221d1a', solidEdge: '#c8b8a6', oneWay: '#d98c5f', accent: '#ff8c42' },
    background: [
      { kind: 'fill', color: '#120f0d' },
      { kind: 'skyline', color: '#1d1916', parallax: 0.2, minHeight: 60, maxHeight: 150, minWidth: 30, maxWidth: 70 },
      { kind: 'grid', color: '#1a1613', spacing: 48, parallax: 0.5 },
    ],
    rooms: { min: 6, max: 8 },
    roomTags: ['generic'],
    exitLabel: 'ELEVADOR',
    enemyPool: [
      { id: 'security', weight: 2 },
      { id: 'intern', weight: 2 },
    ],
  },
  {
    id: 'open-space',
    name: 'Open Space',
    floorLabel: '7',
    description: 'Baias, post-its e o cheiro inconfundível de lasanha requentada.',
    palette: { solid: '#161c1a', solidEdge: '#9fd3c7', oneWay: '#6fbf73', accent: '#9fffcb' },
    background: [
      { kind: 'fill', color: '#0a100e' },
      { kind: 'skyline', color: '#111a17', parallax: 0.15, minHeight: 90, maxHeight: 200, minWidth: 24, maxWidth: 56 },
      { kind: 'grid', color: '#13201c', spacing: 24, parallax: 0.7 },
    ],
    rooms: { min: 7, max: 9 },
    roomTags: ['generic', 'office'],
    exitLabel: 'ESCADA',
    enemyPool: [
      { id: 'intern', weight: 3 },
      { id: 'it-guy', weight: 2 },
      { id: 'manager', weight: 1 },
    ],
  },
]);

/**
 * Biomes played in a run. Scope is deliberately ONE scenario while combat is being tuned;
 * the exit reloads it (same seed -> same layout, enemies back). Planned full order:
 * apartment -> alleys -> reception -> open-space.
 */
export const BIOME_ORDER = ['alleys'] as const;
