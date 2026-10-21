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
  /** Body colour (flat shapes for now). */
  readonly color: string;
  /** Shooters close in until this distance (px) before firing; omitted = shoot from where they stand. */
  readonly closeIn?: number;
  /** Red laser on its aim while it sees the player (warns before the shot). */
  readonly laser?: boolean;
  /** Seconds of sight before the first shot (default AI.reactionTime). */
  readonly reaction?: number;
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
    color: '#7fd1ff',
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
    color: '#ffb347',
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
    color: '#9cff8a',
  },
  {
    id: 'janitor',
    name: 'Zelador',
    description: 'Varre o corredor. Com chumbo.',
    brain: 'shooter',
    hp: 70,
    moveSpeed: 80,
    size: { w: 12, h: 24 },
    weaponId: 'shotgun',
    sightRange: 200,
    color: '#c79bff',
    closeIn: 70,
  },
  {
    id: 'auditor',
    name: 'Auditor',
    description: 'Vê tudo de longe. Principalmente os seus erros.',
    brain: 'shooter',
    hp: 40,
    moveSpeed: 50,
    size: { w: 10, h: 24 },
    weaponId: 'sniper',
    sightRange: 380,
    color: '#7ef0d6',
    laser: true,
    reaction: 1.1,
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
    color: '#ff6b6b',
  },
]);
