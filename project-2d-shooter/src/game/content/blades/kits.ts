import { Registry } from '@engine/content/registry';
import { lerp } from '@engine/math/math';
import { solveTwoBone } from '@engine/rig/ik';

/**
 * Sword and shield fighting (modo medieval), as data. A kit is how one character fences: its
 * combo of swings, how long each beat lasts, and the shield's numbers. The player and the
 * skeletons run the same state machine (systems/fencing.ts) with different kits.
 *
 * Poses place the sword hand, in the rig's local space (facing right, y down): `angle` is the
 * direction from the shoulder to the hand (0 = forward, -π/2 = up, π/2 = down) and `reach`
 * how far it is, in reference px (scaled with the character; the arm is 8.4 long). The blade
 * leaves the fist at a right angle to the forearm (see `bladeAngle`), as a real grip does, so a
 * cut is the arm swinging. Hits are tested on that same blade: what you see is what connects.
 */
export interface BladeKey {
  readonly angle: number;
  readonly reach: number;
}

/** Reference arm (see character/humanoid.ts): upper and lower arm lengths. */
const ARM = 4.2;

/**
 * Where the blade points (local radians) for a hand pose: the forearm's direction (two-bone IK,
 * elbow down/back like the rig) turned 90° up from the fist.
 */
export function bladeAngle(pose: BladeKey): number {
  const hand = { x: Math.cos(pose.angle) * pose.reach, y: Math.sin(pose.angle) * pose.reach };
  return solveTwoBone(0, 0, hand.x, hand.y, ARM, ARM, -1).lower - Math.PI / 2;
}

export interface SwingDef {
  readonly name: string;
  /** Seconds: drawing back (telegraph), the cut itself (hits happen here), and the follow-through. */
  readonly windup: number;
  readonly active: number;
  readonly recover: number;
  readonly damage: number;
  /** Push on the target (px/s). */
  readonly knockback: number;
  /** Step forward at the start of the cut (px/s, fades out over it). */
  readonly lunge: number;
  /** Blade at the end of the windup and at the end of the cut. */
  readonly cocked: BladeKey;
  readonly end: BladeKey;
  /** Shield stamina it takes off a blocker, as a multiple of its damage (heavy blows break guards). Default 1. */
  readonly guardDamage?: number;
  /** Stamina the swing costs the attacker (spent when the wind-up starts). Default 0. */
  readonly staminaCost?: number;
  /** Seconds the target can't act when this cut lands (used when longer than the target kit's `hurtTime`). */
  readonly hitStun?: number;
  /** Armoured: a hit taken during this swing's wind-up or cut hurts but doesn't interrupt it. */
  readonly armor?: boolean;
}

export interface FencingKit {
  readonly id: string;
  readonly swings: readonly SwingDef[];
  /** Seconds after a swing in which another attack continues the combo (else it restarts). */
  readonly comboWindow: number;
  /** Shield stamina: blocking a hit costs `blockCost` per point of damage. Empty = guard broken. */
  readonly stamina: number;
  readonly blockCost: number;
  /** Stamina per second, after `regenDelay` seconds without blocking a hit. */
  readonly staminaRegen: number;
  readonly regenDelay: number;
  /** A hit taken this soon after raising the shield is parried: free, and the attacker is stunned. */
  readonly parryWindow: number;
  /**
   * The shield must have been down this long for the next raise to parry: tapping the button
   * over and over only blocks (and costs stamina); timing it is what parries.
   */
  readonly parryRearm: number;
  /** A cut stopped by a shield recovers this many times slower: the blocker's opening to counter. */
  readonly blockedRecover: number;
  /** Seconds stunned when the guard breaks / when one of our swings is parried. */
  readonly guardBreakStun: number;
  readonly parriedStun: number;
  /** Seconds unable to act after taking a hit. */
  readonly hurtTime: number;
  /**
   * Committed: past this fraction of a wind-up (the blade is going back) light hits hurt but
   * no longer stop the swing; only a heavy blow (one with hitStun) does. Undefined = never.
   * You can't just out-click a telegraphed cut: parry it, step out of it, or hit it earlier.
   */
  readonly commitAt?: number;
  /** Walking speed multipliers while blocking / swinging. */
  readonly blockMoveScale: number;
  readonly swingMoveScale: number;
  /** Seconds an AI fighter takes to turn around: getting behind a shield is a real opening. 0 = instant. */
  readonly turnTime: number;
  /** How the AI fights with it (skeletons); the player has none. */
  readonly ai?: FencerAiTuning;
}

/** Ready stance: fist at the belt, in front; blade up and forward. */
export const GUARD_POSE: BladeKey = { angle: 1.1, reach: 7 };
/** Shield up: sword hand pulled back by the hip, blade poking out behind the shield. */
export const BLOCK_POSE: BladeKey = { angle: 1.95, reach: 6 };
/** Stunned / hurt: arm hangs back, blade drooping. */
export const LOW_POSE: BladeKey = { angle: 2.3, reach: 8 };
/** Blade length from the fist (the sword model's tip), reference px. */
export const BLADE_LENGTH = 15.5;

/** Damage taken while stunned (guard broken or parried): the riposte. */
export const RIPOSTE_MULTIPLIER = 1.5;

// Arm raised up-front (blade hanging back over the shoulder) -> arm swung down and back
// (blade forward and low). The rising cut runs the same arc the other way, so they chain.
const CUT_DOWN: Omit<SwingDef, 'windup' | 'active' | 'recover' | 'damage'> = {
  name: 'Corte descendente',
  knockback: 120,
  lunge: 80,
  cocked: { angle: -1.25, reach: 7.5 },
  end: { angle: 2.45, reach: 7.5 },
};
const CUT_UP: Omit<SwingDef, 'windup' | 'active' | 'recover' | 'damage'> = {
  name: 'Corte ascendente',
  knockback: 120,
  lunge: 80,
  cocked: { angle: 2.45, reach: 7.5 },
  end: { angle: -1.0, reach: 7.5 },
};
// Finisher: arm straight up, blade behind the back, then the whole arm comes down with a step.
const HEAVY: Omit<SwingDef, 'windup' | 'active' | 'recover' | 'damage'> = {
  name: 'Golpe pesado',
  knockback: 260,
  lunge: 170,
  cocked: { angle: -1.6, reach: 8 },
  end: { angle: 2.0, reach: 8.2 },
};

/**
 * How an AI fighter (skeletons) uses its kit, see systems/ai.ts `fencer`. Distances are px,
 * centre to centre; the player's light cuts reach ~25 px (blade + lunge), the finisher ~32.
 */
export interface FencerAiTuning {
  /** Starts a swing from this close. */
  readonly strikeRange: number;
  /** Waiting its turn it keeps this distance ("measuring"): just outside the player's cuts. */
  readonly measure: { readonly min: number; readonly max: number };
  /** Seconds between its attacks. */
  readonly pause: { readonly min: number; readonly max: number };
  /** Chance to chain the second cut of its combo. */
  readonly comboChance: number;
  /** Chance an attack is a feint: it winds up, then pulls back at `feintAt` (0..1) of the wind-up. */
  readonly feintChance: number;
  readonly feintAt: number;
  /** Chance to hop back out of reach when the player winds up a cut at it (once per cut). */
  readonly evadeChance: number;
  /** Shield: chance to answer a blocked hit at once with swing `counterSwing` (no turn needed). */
  readonly counterChance: number;
  readonly counterSwing: number;
  /** Shield: below this stamina fraction it backs off to let the guard recover. */
  readonly retreatStamina: number;
}

/** Group rules for AI fighters, shared by every kit. */
export const FENCE_AI = {
  /** Attack tokens: at most this many fighters wind up / cut at the player at once; the rest wait. */
  attackers: 1,
  /** Waiting fighters on the same side queue up this much further back per fighter ahead of them. */
  queueSpacing: 16,
  /** Walking speed (fraction) while pacing in and out of measure. */
  paceSpeed: 0.4,
  /** Seconds between pace direction changes. */
  paceTime: { min: 0.4, max: 0.9 },
  /** Backstep when evading: speed (px/s) and duration (s). */
  evadeSpeed: 150,
  evadeTime: 0.2,
  /** Only fights the player on (about) the same floor height. */
  sameLevel: 20,
  /** Steps back when closer than this. */
  tooClose: 9,
  /** Squares up to the player (measuring, shield up) from this close; lets go past 1.5x. */
  guardRange: 70,
} as const;

export const FENCING_KITS = new Registry<FencingKit>('fencing kit', [
  {
    // The player: quick cuts, a heavy finisher that breaks guards, a timed parry.
    id: 'player',
    swings: [
      { ...CUT_DOWN, windup: 0.11, active: 0.1, recover: 0.17, damage: 16, staminaCost: 6 },
      { ...CUT_UP, windup: 0.09, active: 0.1, recover: 0.17, damage: 16, staminaCost: 6 },
      { ...HEAVY, windup: 0.18, active: 0.11, recover: 0.28, damage: 28, staminaCost: 12, guardDamage: 2.5, hitStun: 0.6 },
    ],
    comboWindow: 0.35,
    stamina: 100,
    blockCost: 2,
    staminaRegen: 45,
    regenDelay: 0.6,
    parryWindow: 0.2,
    parryRearm: 0.35,
    blockedRecover: 1.5,
    guardBreakStun: 0.8,
    parriedStun: 0.7,
    hurtTime: 0.2,
    blockMoveScale: 0.45,
    swingMoveScale: 0.25,
    turnTime: 0,
  },
  {
    // Skeletons: the same cuts, slow to start (readable telegraph), no finisher, no shield.
    // They dance at the edge of your reach, feint, and hop back from your cuts.
    id: 'skeleton',
    swings: [
      { ...CUT_DOWN, windup: 0.42, active: 0.12, recover: 0.4, damage: 14 },
      { ...CUT_UP, windup: 0.3, active: 0.12, recover: 0.5, damage: 12 },
    ],
    comboWindow: 0.3,
    stamina: 60,
    blockCost: 2.2,
    staminaRegen: 25,
    regenDelay: 1,
    parryWindow: 0,
    parryRearm: 0,
    blockedRecover: 1.5,
    guardBreakStun: 1.3,
    parriedStun: 1.2,
    hurtTime: 0.35,
    commitAt: 0.3,
    blockMoveScale: 0.5,
    swingMoveScale: 0,
    turnTime: 0.15,
    ai: {
      strikeRange: 17,
      measure: { min: 30, max: 40 },
      pause: { min: 0.8, max: 1.6 },
      comboChance: 0.35,
      feintChance: 0.2,
      feintAt: 0.6,
      evadeChance: 0.35,
      counterChance: 0,
      counterSwing: 1,
      retreatStamina: 0,
    },
  },
  {
    // Skeleton knight: a duelist behind its shield. A slow, heavy overhead, and a quick armoured
    // counter-cut right after it blocks (raise your shield in time and that counter is parried).
    // Answers: parry its attacks, break its guard (finisher, kick), or get behind it (slow to turn).
    id: 'knight',
    swings: [
      { ...CUT_DOWN, windup: 0.5, active: 0.13, recover: 0.45, damage: 18, knockback: 180 },
      { ...CUT_UP, windup: 0.26, active: 0.12, recover: 0.55, damage: 12, armor: true },
    ],
    comboWindow: 0.3,
    stamina: 90,
    blockCost: 1.5,
    staminaRegen: 18,
    regenDelay: 1.2,
    parryWindow: 0,
    parryRearm: 0,
    blockedRecover: 1.5,
    guardBreakStun: 1.5,
    parriedStun: 1.3,
    hurtTime: 0.3,
    commitAt: 0.35,
    blockMoveScale: 0.6,
    swingMoveScale: 0,
    turnTime: 0.45,
    ai: {
      strikeRange: 17,
      measure: { min: 24, max: 34 },
      pause: { min: 1.2, max: 2.2 },
      comboChance: 0,
      feintChance: 0.15,
      feintAt: 0.5,
      evadeChance: 0,
      counterChance: 0.6,
      counterSwing: 1,
      retreatStamina: 0.3,
    },
  },
]);

export type FencePhase = 'ready' | 'windup' | 'strike' | 'recover' | 'block' | 'stunned' | 'hurt';

const smoothstep = (t: number): number => t * t * (3 - 2 * t);
const easeOut = (t: number): number => 1 - (1 - t) * (1 - t);
const mixKey = (a: BladeKey, b: BladeKey, t: number): BladeKey => ({ angle: lerp(a.angle, b.angle, t), reach: lerp(a.reach, b.reach, t) });

/** Where the blade is for a phase, `p` (0..1) through it. */
export function bladePose(swing: SwingDef, phase: FencePhase, p: number): BladeKey {
  switch (phase) {
    case 'windup':
      return mixKey(GUARD_POSE, swing.cocked, smoothstep(p));
    case 'strike':
      return mixKey(swing.cocked, swing.end, easeOut(p));
    case 'recover':
      return mixKey(swing.end, GUARD_POSE, smoothstep(p));
    case 'block':
      return BLOCK_POSE;
    case 'stunned':
    case 'hurt':
      return LOW_POSE;
    default:
      return GUARD_POSE;
  }
}
