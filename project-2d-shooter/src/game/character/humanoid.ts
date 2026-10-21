import { Skeleton } from '@engine/rig/skeleton';

/** Proportions at the reference height (24 px, the player's standing collider). */
const BASE = {
  height: 24,
  torso: 7.5,
  neck: 1,
  head: 5,
  upperLeg: 5.5,
  lowerLeg: 5.5,
  upperArm: 4.2,
  lowerArm: 4.2,
  /** Shoulders sit this far up the torso (0 = hips, 1 = neck). */
  shoulderAt: 0.88,
  /** Capsule thickness per part. */
  torsoWidth: 5,
  upperLegWidth: 3,
  lowerLegWidth: 3,
  upperArmWidth: 2,
  lowerArmWidth: 2,
} as const;

export type HumanoidProportions = { -readonly [K in keyof typeof BASE]: number };

/** Same body plan for every humanoid, scaled to its collider height (intern 20 px, manager 28 px...). */
export function proportionsFor(height: number): HumanoidProportions {
  const s = height / BASE.height;
  const out = {} as HumanoidProportions;
  for (const key of Object.keys(BASE) as (keyof HumanoidProportions)[]) out[key] = key === 'shoulderAt' ? BASE[key] : BASE[key] * s;
  return out;
}

/** Bone names, also the draw/solve order. "back" limbs are the ones farther from the camera. */
export const HUMANOID_BONES = [
  'torso',
  'head',
  'legBackUpper',
  'legBackLower',
  'legFrontUpper',
  'legFrontLower',
  'armBackUpper',
  'armBackLower',
  'armFrontUpper',
  'armFrontLower',
] as const;

export type HumanoidBone = (typeof HUMANOID_BONES)[number];

/** Bone index by name (fixed by HUMANOID_BONES order). */
export const HB = Object.fromEntries(HUMANOID_BONES.map((n, i) => [n, i])) as Record<HumanoidBone, number>;

export function createHumanoidSkeleton(p: HumanoidProportions): Skeleton {
  const skeleton = new Skeleton([
    { name: 'torso', parent: null, length: p.torso },
    { name: 'head', parent: 'torso', length: p.neck + p.head },
    { name: 'legBackUpper', parent: 'torso', length: p.upperLeg, attach: 0 },
    { name: 'legBackLower', parent: 'legBackUpper', length: p.lowerLeg },
    { name: 'legFrontUpper', parent: 'torso', length: p.upperLeg, attach: 0 },
    { name: 'legFrontLower', parent: 'legFrontUpper', length: p.lowerLeg },
    { name: 'armBackUpper', parent: 'torso', length: p.upperArm, attach: p.shoulderAt },
    { name: 'armBackLower', parent: 'armBackUpper', length: p.lowerArm },
    { name: 'armFrontUpper', parent: 'torso', length: p.upperArm, attach: p.shoulderAt },
    { name: 'armFrontLower', parent: 'armFrontUpper', length: p.lowerArm },
  ]);
  HUMANOID_BONES.forEach((name, i) => {
    if (skeleton.index(name) !== i) throw new Error('Humanoid bone order mismatch');
  });
  return skeleton;
}
