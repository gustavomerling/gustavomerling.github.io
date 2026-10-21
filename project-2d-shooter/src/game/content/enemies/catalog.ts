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
  /**
   * Senses the player through walls and from behind (sound, smell), within `sightRange`.
   * Zombies use it: they don't need a line of sight to come after you.
   */
  readonly omniscient?: boolean;
  /**
   * Always knows where the player is and follows a route over the floor (walks, jumps, drops),
   * see pathing/navgraph.ts. Only melee enemies use it.
   */
  readonly pathing?: boolean;
  /** Only a headshot can kill it: any other hit stops at 1 HP. */
  readonly headshotOnly?: boolean;
  /** A leg hit knocks it down; it drags itself along the floor from then on. */
  readonly crawlsWhenLegShot?: boolean;
  /** Skull face and pale bones (medieval skeletons). */
  readonly skeleton?: boolean;
  /** Carries a shield that blocks damage from the front. */
  readonly shield?: boolean;
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
  // Zombies (modo zumbi): melee only, no line of sight needed to notice you.
  {
    id: 'zombie',
    name: 'Zumbi',
    description: 'Anda torto e não para. Sente o cheiro de longe.',
    brain: 'melee',
    hp: 35,
    moveSpeed: 38,
    size: { w: 10, h: 22 },
    sightRange: 230,
    color: '#8fbf7a',
    omniscient: true,
    pathing: true,
    headshotOnly: true,
    crawlsWhenLegShot: true,
  },
  {
    id: 'runner',
    name: 'Corredor',
    description: 'Ainda tem fôlego. Pouco. Chega antes de você ouvir.',
    brain: 'melee',
    hp: 22,
    moveSpeed: 95,
    size: { w: 10, h: 22 },
    sightRange: 300,
    color: '#d9a56b',
    omniscient: true,
    pathing: true,
    headshotOnly: true,
    crawlsWhenLegShot: true,
  },
  {
    id: 'bloater',
    name: 'Inchado',
    description: 'Lento e difícil de derrubar. Cada tiro só o faz cambalear.',
    brain: 'melee',
    hp: 120,
    moveSpeed: 28,
    size: { w: 16, h: 28 },
    sightRange: 200,
    color: '#7f9a6e',
    omniscient: true,
    pathing: true,
    headshotOnly: true,
    crawlsWhenLegShot: true,
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
  // Medieval skeletons (modo medieval): one per weapon family.
  {
    id: 'skeleton-archer',
    name: 'Esqueleto arqueiro',
    description: 'Deve ter morrido esperando o alvará. Atira flechas com paciência eterna.',
    brain: 'shooter',
    hp: 32,
    moveSpeed: 60,
    size: { w: 10, h: 23 },
    weaponId: 'shortbow',
    sightRange: 280,
    color: '#ddd6c2',
    skeleton: true,
  },
  {
    id: 'skeleton-knight',
    name: 'Esqueleto cavaleiro',
    description: 'A armadura ficou, a carne não. Avança de escudo e espada.',
    brain: 'melee',
    hp: 80,
    moveSpeed: 72,
    size: { w: 12, h: 24 },
    weaponId: 'iron-sword',
    sightRange: 220,
    color: '#cfc8b4',
    skeleton: true,
    shield: true,
  },
  {
    id: 'skeleton-mage',
    name: 'Esqueleto mago',
    description: 'Estudou demais. Agora lança bolas de fogo com sotaque antigo.',
    brain: 'shooter',
    hp: 40,
    moveSpeed: 52,
    size: { w: 10, h: 24 },
    weaponId: 'fire-staff',
    sightRange: 300,
    color: '#d8d0bb',
    skeleton: true,
    reaction: 0.7,
  },
]);
