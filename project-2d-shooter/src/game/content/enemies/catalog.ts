import { Registry } from '@engine/content/registry';

export type EnemyBrain = 'melee' | 'shooter' | 'tank';

/** Enemy archetypes. Behaviour code lives in AI systems, keyed by `brain`. */
export interface EnemyDef {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly brain: EnemyBrain;
  readonly hp: number;
  readonly moveSpeed: number;
  readonly size: { readonly w: number; readonly h: number };
  /** Gun used by shooters (weapon registry id). */
  readonly weaponId?: string;
  /** Distance (px) at which it notices the player. */
  readonly sightRange: number;
  /** Wireframe color until sprites exist. */
  readonly debugColor: string;
  /** What it leaves behind. Money is a [min, max] coin count. */
  readonly drops: { readonly money: readonly [number, number]; readonly healthChance: number; readonly ammoChance: number; readonly weaponChance: number };
}

export const ENEMIES = new Registry<EnemyDef>('enemy', [
  {
    id: 'intern',
    name: 'Estagiário',
    description: 'Corre, grita, joga café quente. Ganha em vale-transporte.',
    brain: 'melee',
    hp: 30,
    moveSpeed: 120,
    size: { w: 10, h: 20 },
    sightRange: 180,
    debugColor: '#7fd1ff',
    drops: { money: [1, 3], healthChance: 0.35, ammoChance: 0.2, weaponChance: 0 },
  },
  {
    id: 'security',
    name: 'Segurança',
    description: 'Crachá, colete e uma Glock. Não deixa ninguém entrar sem cadastro.',
    brain: 'shooter',
    hp: 60,
    moveSpeed: 70,
    size: { w: 12, h: 24 },
    weaponId: 'glock',
    sightRange: 240,
    debugColor: '#ffb347',
    drops: { money: [2, 4], healthChance: 0.15, ammoChance: 0.5, weaponChance: 0.6 },
  },
  {
    id: 'it-guy',
    name: 'Analista de TI',
    description: 'Já tentou desligar e ligar de novo. Agora tenta uma Uzi.',
    brain: 'shooter',
    hp: 45,
    moveSpeed: 85,
    size: { w: 10, h: 24 },
    weaponId: 'uzi',
    sightRange: 220,
    debugColor: '#9cff8a',
    drops: { money: [2, 5], healthChance: 0.15, ammoChance: 0.5, weaponChance: 0.6 },
  },
  {
    id: 'manager',
    name: 'Gerente de Projetos',
    description: 'Lento, resistente, marca reunião no meio do tiroteio.',
    brain: 'tank',
    hp: 160,
    moveSpeed: 45,
    size: { w: 16, h: 28 },
    weaponId: 'ak47',
    sightRange: 260,
    debugColor: '#ff6b6b',
    drops: { money: [5, 9], healthChance: 0.6, ammoChance: 0.8, weaponChance: 1 },
  },
]);
