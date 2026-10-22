import { Registry } from '@engine/content/registry';
import { ENEMY } from '../../render/palette';

export type EnemyBrain = 'melee' | 'shooter' | 'tank' | 'fencer';

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
  /**
   * Lost sight of you: follows the same route to your last known spot (ladders and jumps
   * included) instead of walking straight at it. Gunmen use it to flank.
   */
  readonly routes?: boolean;
  /** Only a headshot can kill it: any other hit stops at 1 HP. */
  readonly headshotOnly?: boolean;
  /** A leg hit knocks it down; it drags itself along the floor from then on. */
  readonly crawlsWhenLegShot?: boolean;
  /** Skull face and pale bones (medieval skeletons). */
  readonly skeleton?: boolean;
  /** Carries a shield (fencers block with it; it hangs on the back otherwise). */
  readonly shield?: boolean;
  /** Sword fighting kit (content/blades/kits.ts) for the 'fencer' brain. */
  readonly fencingKit?: string;
  /** Hits dealing less damage than this don't stagger it (headshots always do). Omitted = every hit staggers. */
  readonly poise?: number;
  /** Zombie role (modo zumbi): how it attacks. See systems/zombies.ts for the shared rules. */
  readonly zombie?: ZombieTraits;
}

/** What makes each zombie demand a different answer. Times in seconds, damage in HP, speeds px/s. */
export interface ZombieTraits {
  /** Arms-out telegraph before the attack lands (step back, kick or shoot to cancel it). */
  readonly windup: number;
  /** Seconds before it can attack again. */
  readonly cooldown: number;
  /** Reaching you grabs and pins you; the bite lands after `hold` s unless you break free with `struggle` presses (A, D, Space) or it gets hit. */
  readonly grab?: { readonly hold: number; readonly struggle: number; readonly bite: number };
  /** Damage of a plain swipe (no grab, or someone else already holds you). */
  readonly claw: number;
  /** Spots you on the same floor, stops to tense up (`tell`), then sprints for `duration`. */
  readonly rush?: { readonly range: number; readonly tell: number; readonly speed: number; readonly duration: number; readonly cooldown: number };
  /** Dies bursting: kills zombies within `radius`, hurts and shoves you within `playerRadius`. */
  readonly burst?: { readonly radius: number; readonly playerRadius: number; readonly damage: number; readonly knockback: number };
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
    color: ENEMY.office.intern,
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
    color: ENEMY.office.security,
    routes: true,
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
    color: ENEMY.office.itGuy,
    routes: true,
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
    color: ENEMY.office.janitor,
    closeIn: 70,
    routes: true,
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
    color: ENEMY.office.auditor,
    laser: true,
    reaction: 1.1,
    routes: true,
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
    color: ENEMY.undead.zombie,
    omniscient: true,
    pathing: true,
    headshotOnly: true,
    crawlsWhenLegShot: true,
    zombie: { windup: 0.5, cooldown: 1.2, grab: { hold: 0.85, struggle: 3, bite: 22 }, claw: 8 },
  },
  {
    id: 'runner',
    name: 'Corredor',
    description: 'Ainda tem fôlego. Pouco. Quando te vê no mesmo andar, para, se arma e dispara.',
    brain: 'melee',
    hp: 22,
    moveSpeed: 55,
    size: { w: 10, h: 22 },
    sightRange: 300,
    color: ENEMY.undead.runner,
    omniscient: true,
    pathing: true,
    headshotOnly: true,
    crawlsWhenLegShot: true,
    zombie: { windup: 0.28, cooldown: 1.6, claw: 14, rush: { range: 150, tell: 0.45, speed: 145, duration: 1.6, cooldown: 3.5 } },
  },
  {
    id: 'bloater',
    name: 'Inchado',
    description: 'Lento, agarra forte e estoura ao morrer: leva os zumbis em volta junto. E você, se estiver perto.',
    brain: 'melee',
    hp: 120,
    moveSpeed: 28,
    size: { w: 16, h: 28 },
    sightRange: 200,
    color: ENEMY.undead.bloater,
    omniscient: true,
    pathing: true,
    headshotOnly: true,
    crawlsWhenLegShot: true,
    zombie: {
      windup: 0.7,
      cooldown: 1.6,
      grab: { hold: 1.0, struggle: 5, bite: 32 },
      claw: 12,
      burst: { radius: 44, playerRadius: 40, damage: 25, knockback: 280 },
    },
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
    color: ENEMY.office.manager,
    poise: 20,
    routes: true,
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
    // Inside the screen: no arrows from an archer you can't see.
    sightRange: 220,
    color: ENEMY.skeleton.bone,
    skeleton: true,
    routes: true,
    // Draws slowly: time to raise the shield (or close in) before the first arrow.
    reaction: 0.8,
  },
  {
    id: 'skeleton',
    name: 'Esqueleto',
    description: 'Só osso e espada. Dança na borda do seu alcance, finta e recua dos seus golpes.',
    brain: 'fencer',
    hp: 40,
    moveSpeed: 62,
    size: { w: 10, h: 23 },
    weaponId: 'iron-sword',
    sightRange: 240,
    color: ENEMY.skeleton.bone,
    skeleton: true,
    fencingKit: 'skeleton',
  },
  {
    id: 'skeleton-knight',
    name: 'Esqueleto cavaleiro',
    description: 'A armadura ficou, a carne não. Avança atrás do escudo e só abre a guarda para bater.',
    brain: 'fencer',
    hp: 60,
    moveSpeed: 55,
    size: { w: 12, h: 24 },
    weaponId: 'iron-sword',
    sightRange: 240,
    color: ENEMY.skeleton.knight,
    skeleton: true,
    shield: true,
    fencingKit: 'knight',
  },
]);
