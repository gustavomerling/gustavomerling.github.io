import { VerletBody } from '@engine/physics/verlet';
import type { BoneTransform } from '@engine/rig/skeleton';
import type { HitZone } from '../config';
import type { HumanoidAnimator } from './animator';
import { drawCapsule, drawDisc, mix, type RigStyle } from './draw';
import { HB, type HumanoidProportions } from './humanoid';
import { INK } from '../render/palette';

/** Ragdoll point indices. */
const P = {
  hip: 0,
  neck: 1,
  head: 2,
  shoulder: 3,
  backKnee: 4,
  backFoot: 5,
  frontKnee: 6,
  frontFoot: 7,
  backElbow: 8,
  backHand: 9,
  frontElbow: 10,
  frontHand: 11,
} as const;

const STICKS: readonly (readonly [number, number])[] = [
  [P.hip, P.neck],
  [P.neck, P.head],
  [P.hip, P.shoulder],
  [P.shoulder, P.neck],
  // Keeps the head from folding into the chest.
  [P.hip, P.head],
  [P.hip, P.backKnee],
  [P.backKnee, P.backFoot],
  [P.hip, P.frontKnee],
  [P.frontKnee, P.frontFoot],
  [P.shoulder, P.backElbow],
  [P.backElbow, P.backHand],
  [P.shoulder, P.frontElbow],
  [P.frontElbow, P.frontHand],
];

const IMPULSE_POINT: Record<HitZone, number> = { head: P.head, torso: P.shoulder, arm: P.frontElbow, leg: P.frontKnee };

/**
 * Turns a living rig into a verlet ragdoll, starting from its exact current pose and
 * carrying its velocity plus the killing hit's push.
 */
export function createRagdoll(
  animator: HumanoidAnimator,
  originX: number,
  originY: number,
  velocity: { x: number; y: number },
  hit: { vx: number; vy: number; zone: HitZone } | null,
  dt: number,
): VerletBody {
  const bones = animator.sample(1);
  const p = animator.props;
  const f = animator.facing;
  const w = (x: number, y: number) => ({ x: originX + f * x, y: originY + y });
  const along = (t: BoneTransform, d: number) => w(t.x0 + Math.cos(t.angle) * d, t.y0 + Math.sin(t.angle) * d);
  const torso = bones[HB.torso]!;

  const points = [
    w(torso.x0, torso.y0),
    w(torso.x1, torso.y1),
    along(bones[HB.head]!, p.neck + p.head / 2),
    along(torso, p.torso * p.shoulderAt),
    w(bones[HB.legBackUpper]!.x1, bones[HB.legBackUpper]!.y1),
    w(bones[HB.legBackLower]!.x1, bones[HB.legBackLower]!.y1),
    w(bones[HB.legFrontUpper]!.x1, bones[HB.legFrontUpper]!.y1),
    w(bones[HB.legFrontLower]!.x1, bones[HB.legFrontLower]!.y1),
    w(bones[HB.armBackUpper]!.x1, bones[HB.armBackUpper]!.y1),
    w(bones[HB.armBackLower]!.x1, bones[HB.armBackLower]!.y1),
    w(bones[HB.armFrontUpper]!.x1, bones[HB.armFrontUpper]!.y1),
    w(bones[HB.armFrontLower]!.x1, bones[HB.armFrontLower]!.y1),
  ];
  const body = new VerletBody(points, STICKS);
  body.addVelocityAll(velocity.x, velocity.y, dt);
  if (hit) {
    body.addVelocity(IMPULSE_POINT[hit.zone], hit.vx * 1.5, hit.vy * 1.5, dt);
    body.addVelocity(P.shoulder, hit.vx * 0.5, hit.vy * 0.5, dt);
    // Reads by zone: a headshot whips the head back along the shot; a leg hit sweeps the feet
    // out with the shot while the shoulders stay behind, so the body topples instead of sliding.
    if (hit.zone === 'head') body.addVelocity(P.neck, hit.vx * 0.4, hit.vy * 0.4, dt);
    if (hit.zone === 'leg') {
      body.addVelocity(P.backFoot, hit.vx * 1.2, hit.vy * 0.3, dt);
      body.addVelocity(P.frontFoot, hit.vx * 1.2, hit.vy * 0.3, dt);
      body.addVelocity(P.head, -hit.vx * 0.3, 0, dt);
    }
  }
  return body;
}

export function drawRagdoll(ctx: CanvasRenderingContext2D, body: VerletBody, p: HumanoidProportions, style: RigStyle, fade: number): void {
  const x = body.x;
  const y = body.y;
  const back = mix(style.backColor, INK.black, 0.2);
  ctx.globalAlpha = fade;
  const seg = (a: number, b: number, width: number, color: string) => drawCapsule(ctx, x[a]!, y[a]!, x[b]!, y[b]!, width, color, style.outline);

  seg(P.shoulder, P.backElbow, p.upperArmWidth, back);
  seg(P.backElbow, P.backHand, p.lowerArmWidth, back);
  seg(P.hip, P.backKnee, p.upperLegWidth, back);
  seg(P.backKnee, P.backFoot, p.lowerLegWidth, back);
  seg(P.hip, P.neck, p.torsoWidth, style.color);
  drawDisc(ctx, x[P.head]!, y[P.head]!, p.head / 2 + 0.4, style.color, style.outline);
  seg(P.hip, P.frontKnee, p.upperLegWidth, style.color);
  seg(P.frontKnee, P.frontFoot, p.lowerLegWidth, style.color);
  seg(P.shoulder, P.frontElbow, p.upperArmWidth, style.color);
  seg(P.frontElbow, P.frontHand, p.lowerArmWidth, style.color);
  ctx.globalAlpha = 1;
}
