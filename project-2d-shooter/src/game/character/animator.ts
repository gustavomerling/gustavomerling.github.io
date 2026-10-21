import { approach, clamp, damp, lerp } from '@engine/math/math';
import type { Vec2 } from '@engine/math/vec2';
import { solveTwoBone } from '@engine/rig/ik';
import { lerpAngle, lerpPose, PoseBuilder, type BoneTransform, type Pose, type Skeleton } from '@engine/rig/skeleton';
import type { WeaponClass } from '../content/weapons/types';
import type { PlayerState } from '../world/components';
import { createHumanoidSkeleton, HB, HOLD_STYLES, proportionsFor, type HumanoidProportions } from './humanoid';

/** What the animator needs to know each step. Any character (player or NPC) can provide it. */
export interface RigInput {
  state: PlayerState;
  vx: number;
  vy: number;
  facing: 1 | -1;
  /** World aim angle (screen space). */
  aimAngle: number;
  /** null = unarmed (arms swing). */
  weaponClass: WeaponClass | null;
}

interface Targets {
  hipHeight: number;
  lean: number;
  back: Vec2;
  front: Vec2;
}

/**
 * Procedural humanoid animation: no keyframes. Each step it picks targets for the
 * current state (hip height, torso lean, foot positions), smooths them, then places
 * legs and arms with two-bone IK. Works in "facing right" local space with the origin
 * at the feet (collider bottom-centre); the renderer mirrors it for facing left.
 */
export class HumanoidAnimator {
  readonly skeleton: Skeleton;
  readonly props: HumanoidProportions;
  /** Current and previous step poses, for render interpolation. */
  readonly pose: Pose;
  readonly prevPose: Pose;
  facing: 1 | -1 = 1;
  weaponClass: WeaponClass | null = null;
  /** Local aim angle (facing-right space), current and previous step. */
  aim = 0;
  prevAim = 0;

  private readonly builder: PoseBuilder;
  private readonly scratch: Pose;
  private readonly transforms: BoneTransform[];
  private phase = 0;
  private climbPhase = 0;
  private time = 0;
  private state: PlayerState = 'idle';
  private recoil = 0;
  private hipHeight: number;
  private lean = 0.05;
  private feet: { back: Vec2; front: Vec2 };

  constructor(height: number) {
    this.props = proportionsFor(height);
    this.skeleton = createHumanoidSkeleton(this.props);
    this.pose = this.skeleton.createPose();
    this.prevPose = this.skeleton.createPose();
    this.scratch = this.skeleton.createPose();
    this.transforms = this.skeleton.createTransforms();
    this.builder = new PoseBuilder(this.skeleton, this.pose);
    this.hipHeight = this.legLength * 0.93;
    this.feet = { back: { x: -1.5, y: 0 }, front: { x: 2, y: 0 } };
    this.build();
    this.prevPose.copyFrom(this.pose);
  }

  private get s(): number {
    return this.props.height / 24;
  }

  private get legLength(): number {
    return this.props.upperLeg + this.props.lowerLeg;
  }

  /** Unarmed attack wind-up progress 0..1 (set by AI each step; arm pulls back). */
  meleeWindup = 0;
  private strike = 0;

  /** Gun kick (arms snap back towards the shoulder), 0..1. */
  kick(amount: number): void {
    this.recoil = Math.min(1, this.recoil + amount * 2);
  }

  /**
   * Hit reaction: head snaps (headshot) or torso jerks in the direction the hit travels.
   * `dirLocal` is +1 when pushed towards the facing direction, -1 when pushed back.
   */
  flinch(zone: 'head' | 'torso' | 'arm' | 'leg', dirLocal: number): void {
    if (zone === 'head') this.headSnap += 0.9 * dirLocal;
    this.torsoFlinch += (zone === 'torso' ? 0.35 : zone === 'head' ? 0.2 : 0.12) * dirLocal;
  }

  private headSnap = 0;
  private torsoFlinch = 0;

  /** Unarmed hit: front arm shoots forward, then retracts. */
  punch(): void {
    this.strike = 1;
    this.meleeWindup = 0;
  }

  update(dt: number, input: RigInput): void {
    this.prevPose.copyFrom(this.pose);
    this.prevAim = this.aim;
    if (dt <= 0) return;

    this.time += dt;
    this.recoil = approach(this.recoil, 0, dt * 8);
    this.strike = approach(this.strike, 0, dt * 5);
    this.headSnap *= Math.exp(-7 * dt);
    this.torsoFlinch *= Math.exp(-7 * dt);
    if (input.facing !== this.facing) this.prevAim = toLocalAim(input.aimAngle, input.facing);
    this.facing = input.facing;
    this.weaponClass = input.weaponClass;
    this.state = input.state;
    this.aim = toLocalAim(input.aimAngle, input.facing);

    const t = this.targets(dt, input);
    const k = damp(18, dt);
    this.hipHeight = lerp(this.hipHeight, t.hipHeight, k);
    this.lean = lerp(this.lean, t.lean, k);
    // Feet follow the walk cycle almost exactly; other transitions ease in.
    const kf = damp(this.isCycling(input) ? 60 : 20, dt);
    for (const side of ['back', 'front'] as const) {
      this.feet[side].x = lerp(this.feet[side].x, t[side].x, kf);
      this.feet[side].y = lerp(this.feet[side].y, t[side].y, kf);
    }
    this.build();
  }

  /** World-space bone transforms interpolated between the last two steps (local space; mirror when drawing). */
  sample(alpha: number): BoneTransform[] {
    return this.skeleton.solve(lerpPose(this.prevPose, this.pose, alpha, this.scratch), this.transforms);
  }

  sampleAim(alpha: number): number {
    return lerpAngle(this.prevAim, this.aim, alpha);
  }

  /** Muzzle position in local space (facing right, feet origin), from the current pose. */
  muzzleLocal(): Vec2 | null {
    if (!this.weaponClass) return null;
    const hand = this.builder.get(HB.armFrontLower);
    const len = HOLD_STYLES[this.weaponClass].length * this.s;
    return { x: hand.x1 + Math.cos(this.aim) * len, y: hand.y1 + Math.sin(this.aim) * len };
  }

  private isCycling(input: RigInput): boolean {
    return (input.state === 'run' || input.state === 'sprint' || input.state === 'crouch') && Math.abs(input.vx) > 4;
  }

  private targets(dt: number, input: RigInput): Targets {
    const s = this.s;
    const L = this.legLength;
    const localVx = input.vx * input.facing;

    if (this.isCycling(input)) {
      const crouched = input.state === 'crouch';
      const stride = (input.state === 'sprint' ? 13 : crouched ? 6 : 9) * s;
      const lift = (crouched ? 1.5 : 3) * s;
      this.phase += ((localVx * dt) / stride) * Math.PI;
      const foot = (offset: number): Vec2 => ({
        x: (Math.cos(this.phase + offset) * stride) / 2,
        y: -Math.max(0, -Math.sin(this.phase + offset)) * lift,
      });
      const backwards = localVx < 0;
      return {
        hipHeight: (crouched ? 4.5 * s : L * 0.9) + Math.cos(this.phase * 2) * 0.5 * s,
        lean: crouched ? 0.75 : backwards ? 0.02 : input.state === 'sprint' ? 0.3 : 0.14,
        back: foot(Math.PI),
        front: foot(0),
      };
    }

    switch (input.state) {
      case 'crouch':
        return { hipHeight: 4 * s, lean: 0.75, back: { x: -2.5 * s, y: 0 }, front: { x: 3.5 * s, y: 0 } };
      case 'slide':
        return { hipHeight: 3.5 * s, lean: -0.9, back: { x: -1 * s, y: 0 }, front: { x: 9 * s, y: 0 } };
      case 'climb': {
        // Alternating limbs driven by how fast the body moves up/down the rungs.
        this.climbPhase += dt * (2 + Math.abs(input.vy) / 35) * Math.PI;
        const swing = Math.sin(this.climbPhase);
        return {
          hipHeight: L * 0.82,
          lean: 0.04,
          back: { x: -2.5 * s, y: -4 * s - swing * 2 * s },
          front: { x: 2.5 * s, y: -1 * s + swing * 2 * s },
        };
      }
      case 'mantle':
        return { hipHeight: L * 0.76, lean: 0.32, back: { x: -3 * s, y: -3 * s }, front: { x: 3 * s, y: -5 * s } };
      case 'air': {
        // Feet are relative to the collider bottom, which is in the air with us.
        const rising = input.vy < 0;
        return rising
          ? { hipHeight: L * 0.95, lean: 0.12, back: { x: -3 * s, y: -3 * s }, front: { x: 3 * s, y: -4 * s } }
          : { hipHeight: L * 0.95, lean: 0.06, back: { x: -2 * s, y: -0.5 * s }, front: { x: 2.5 * s, y: -1.5 * s } };
      }
      default:
        // Idle: slight breathing.
        return {
          hipHeight: L * 0.93 + Math.sin(this.time * 2.2) * 0.35 * s,
          lean: 0.06,
          back: { x: -1.5 * s, y: 0 },
          front: { x: 2 * s, y: 0 },
        };
    }
  }

  /** Places every bone from the smoothed targets. */
  private build(): void {
    const b = this.builder;
    const p = this.props;
    const s = this.s;

    b.root(0, -this.hipHeight);
    const lean = this.lean + this.torsoFlinch;
    b.setWorld(HB.torso, -Math.PI / 2 + lean);
    b.setWorld(HB.head, -Math.PI / 2 + lean * 0.4 + clamp(this.aim * 0.4, -0.5, 0.5) + this.headSnap);

    for (const [upper, lower, foot] of [
      [HB.legBackUpper, HB.legBackLower, this.feet.back],
      [HB.legFrontUpper, HB.legFrontLower, this.feet.front],
    ] as const) {
      const hip = b.start(upper);
      const ik = solveTwoBone(hip.x, hip.y, foot.x, foot.y, p.upperLeg, p.lowerLeg, 1);
      b.setWorld(upper, ik.upper);
      b.setWorld(lower, ik.lower);
    }

    const shoulder = b.start(HB.armFrontUpper);
    const armLength = p.upperArm + p.lowerArm;
    let frontHand: Vec2;
    let backHand: Vec2;
    if (this.state === 'climb') {
      // One hand reaches for the next rung while the other pulls down.
      const swing = Math.sin(this.climbPhase);
      frontHand = { x: shoulder.x + 2 * s + swing * 1.5 * s, y: shoulder.y - armLength * 0.85 - swing * 2 * s };
      backHand = { x: shoulder.x - 2 * s - swing * 1.5 * s, y: shoulder.y - armLength * 0.35 + swing * 2 * s };
    } else if (this.state === 'mantle') {
      // Both hands planted on the lip while the body pulls itself up.
      frontHand = { x: shoulder.x + 3 * s, y: shoulder.y - armLength * 0.75 };
      backHand = { x: shoulder.x - 1 * s, y: shoulder.y - armLength * 0.7 };
    } else if (this.weaponClass) {
      const style = HOLD_STYLES[this.weaponClass];
      const dir = { x: Math.cos(this.aim), y: Math.sin(this.aim) };
      const reach = armLength * style.reach - this.recoil * 1.5 * s;
      frontHand = { x: shoulder.x + dir.x * reach, y: shoulder.y + dir.y * reach };
      backHand = { x: frontHand.x + dir.x * style.support * s, y: frontHand.y + dir.y * style.support * s };
    } else if (this.strike > 0 || this.meleeWindup > 0) {
      // Punch: wind up (fist pulled back) -> strike (arm extended), retracting as `strike` decays.
      const ext = this.strike > 0 ? armLength * 0.95 * this.strike : -armLength * 0.35 * this.meleeWindup;
      frontHand = { x: shoulder.x + ext + s, y: shoulder.y + armLength * 0.15 };
      backHand = { x: shoulder.x - s, y: shoulder.y + armLength * 0.6 };
    } else {
      // Unarmed: arms swing opposite to the legs.
      const swing = Math.cos(this.phase) * 3 * s;
      frontHand = { x: shoulder.x - swing + s, y: shoulder.y + armLength * 0.85 };
      backHand = { x: shoulder.x + swing - s, y: shoulder.y + armLength * 0.85 };
    }

    for (const [upper, lower, hand] of [
      [HB.armBackUpper, HB.armBackLower, backHand],
      [HB.armFrontUpper, HB.armFrontLower, frontHand],
    ] as const) {
      const sh = b.start(upper);
      const ik = solveTwoBone(sh.x, sh.y, hand.x, hand.y, p.upperArm, p.lowerArm, -1);
      b.setWorld(upper, ik.upper);
      b.setWorld(lower, ik.lower);
    }
  }
}

/** World aim -> facing-right local aim, kept in the front half-plane (with a little slack). */
function toLocalAim(worldAngle: number, facing: 1 | -1): number {
  const a = facing > 0 ? worldAngle : Math.PI - worldAngle;
  const n = Math.atan2(Math.sin(a), Math.cos(a));
  return clamp(n, -Math.PI / 2 - 0.2, Math.PI / 2 + 0.2);
}
