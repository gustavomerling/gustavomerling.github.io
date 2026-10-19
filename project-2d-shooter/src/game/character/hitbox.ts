import { segmentDistance } from '@engine/math/segment';
import type { HitZone } from '../config';
import type { HumanoidAnimator } from './animator';
import { HB, type HumanoidBone } from './humanoid';

const BONE_ZONE: Record<HumanoidBone, HitZone> = {
  torso: 'torso',
  head: 'head',
  legBackUpper: 'leg',
  legBackLower: 'leg',
  legFrontUpper: 'leg',
  legFrontLower: 'leg',
  armBackUpper: 'arm',
  armBackLower: 'arm',
  armFrontUpper: 'arm',
  armFrontLower: 'arm',
};

/** A capsule (segment + radius) in world pixels, tagged with its body region. */
export interface HitPart {
  zone: HitZone;
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  radius: number;
}

/** Bullets are a bit "fat" so 2-px limbs are hittable at 480x270. */
const BULLET_RADIUS = 0.75;

/**
 * Hit capsules matching the drawn rig boxes, from the current (simulation) pose.
 * `originX/Y` = feet (collider bottom-centre) in world pixels.
 */
export function rigHitParts(animator: HumanoidAnimator, originX: number, originY: number): HitPart[] {
  const bones = animator.sample(1);
  const p = animator.props;
  const f = animator.facing;
  const width: Record<HitZone, number> = { head: p.head, torso: p.torsoWidth, arm: p.upperArmWidth, leg: p.upperLegWidth };

  return (Object.keys(BONE_ZONE) as HumanoidBone[]).map((name) => {
    const t = bones[HB[name]]!;
    const zone = BONE_ZONE[name];
    const r = width[zone] / 2;
    let x0 = t.x0;
    let y0 = t.y0;
    let x1 = t.x1;
    let y1 = t.y1;
    if (zone === 'head') {
      // Square head after the neck gap: a circle-ish capsule centred on it.
      const dx = Math.cos(t.angle);
      const dy = Math.sin(t.angle);
      const c = p.neck + p.head / 2;
      x0 = x1 = t.x0 + dx * c;
      y0 = y1 = t.y0 + dy * c;
    }
    return { zone, x0: originX + f * x0, y0: originY + y0, x1: originX + f * x1, y1: originY + y1, radius: r + BULLET_RADIUS };
  });
}

/** First part hit by the segment (x0,y0)->(x1,y1), by distance along it. Head wins ties. */
export function raycastParts(parts: readonly HitPart[], x0: number, y0: number, x1: number, y1: number): { zone: HitZone; s: number } | null {
  let best: { zone: HitZone; s: number } | null = null;
  for (const part of parts) {
    const { dist, s } = segmentDistance(x0, y0, x1, y1, part.x0, part.y0, part.x1, part.y1);
    if (dist > part.radius) continue;
    if (!best || s < best.s - 1e-6 || (Math.abs(s - best.s) <= 1e-6 && part.zone === 'head')) best = { zone: part.zone, s };
  }
  return best;
}
