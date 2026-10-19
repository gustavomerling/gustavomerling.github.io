import { Registry } from '@engine/content/registry';

export type ItemEffect = 'explosion' | 'flash';

/** Throwables (and later: consumables). */
export interface ItemDef {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly kind: 'throwable';
  readonly effect: ItemEffect;
  readonly fuseSeconds: number;
  /** Effect radius, pixels. */
  readonly radius: number;
  readonly damage: number;
  /** Seconds enemies stay blinded/stunned. */
  readonly stunSeconds: number;
  readonly throwSpeed: number;
  readonly maxCarry: number;
}

export const ITEMS = new Registry<ItemDef>('item', [
  {
    id: 'grenade',
    name: 'Granada',
    description: 'Resolve conflitos de agenda.',
    kind: 'throwable',
    effect: 'explosion',
    fuseSeconds: 1.6,
    radius: 56,
    damage: 80,
    stunSeconds: 0,
    throwSpeed: 300,
    maxCarry: 3,
  },
  {
    id: 'flashbang',
    name: 'Flashbang',
    description: 'Igual abrir o notebook às 7h com o brilho no máximo.',
    kind: 'throwable',
    effect: 'flash',
    fuseSeconds: 1.2,
    radius: 96,
    damage: 0,
    stunSeconds: 3,
    throwSpeed: 300,
    maxCarry: 3,
  },
]);
