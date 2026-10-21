import { approach, clamp, damp, lerp } from '@engine/math/math';
import type { Vec2 } from '@engine/math/vec2';
import { solveTwoBone } from '@engine/rig/ik';
import { lerpAngle, lerpPose, PoseBuilder, type BoneTransform, type Pose, type Skeleton } from '@engine/rig/skeleton';
import { PLAYER_TUNING } from '../config';
import { partCenter, type GunModel } from '../content/weapons/models';
import type { PlayerState } from '../world/components';
import { createHumanoidSkeleton, HB, proportionsFor, type HumanoidProportions } from './humanoid';

/** What the animator needs to know each step. Any character (player or NPC) can provide it. */
export interface RigInput {
  state: PlayerState;
  vx: number;
  vy: number;
  facing: 1 | -1;
  /** World aim angle (screen space). */
  aimAngle: number;
  /** null = unarmed (arms swing). */
  gun: GunModel | null;
  /** World side of the wall for wallSlide / wallJump (-1 left, 1 right). */
  wallSide?: -1 | 1;
  /** 0..1 through timed moves: mantle, roll, wallJump. */
  progress?: number;
  /** Mantle: the lip corner relative to the feet, world units (x not mirrored). */
  ledge?: Vec2;
  /** Gun action: 1 right after a shot -> 0 when it can fire again (drives the pump). */
  cycle?: number;
  /** Reload progress 0..1 (absent = not reloading). */
  reload?: number;
  /** Kick progress 0..1 (absent = not kicking). */
  kick?: number;
}

/**
 * Something that leaves the gun this step, for the game to spawn: a spent casing or a
 * dropped magazine. Local space (facing right, feet origin), velocity in px/s.
 */
export interface RigEvent {
  kind: 'casing' | 'mag';
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
}

/** Weapon swap: the old gun drops out of view, the new one comes up (seconds). */
const SWITCH_TIME = 0.32;
/** Reload beats (fractions of the reload time) for guns with a magazine. */
const MAG = { reach: 0.12, drop: 0.15, toBelt: 0.42, grab: 0.52, toGun: 0.78, seat: 0.88 } as const;
/** Shells loaded one by one (shotgun) during a reload. */
const SHELL_LOADS = 3;

/** A free hand's target, from the shoulder it hangs from (local space, feet origin). */
type HandTarget = (shoulder: Vec2) => Vec2;

interface Targets {
  hipHeight: number;
  lean: number;
  back: Vec2;
  front: Vec2;
  /** Smoothing rate for hip/lean (snappy moves use a higher one). */
  rate?: number;
  /** Feet smoothing rate. */
  footRate?: number;
  /** Hands taken off the gun / out of the swing (ladder rungs, ledge, wall, hugging the knees). */
  hands?: { back?: HandTarget; front?: HandTarget };
  /** Whole-body rotation around the torso's midpoint (roll). */
  spin?: number;
  /** Seen from behind (ladders): limbs spread sideways, gun slung on the back. */
  backView?: boolean;
  /** Head follows the aim (off when busy climbing, rolling...). */
  look?: boolean;
}

type Side = 'back' | 'front';
const SIDES: readonly Side[] = ['back', 'front'];
const LIMB_BONES = {
  armBack: [HB.armBackUpper, HB.armBackLower],
  armFront: [HB.armFrontUpper, HB.armFrontLower],
  legBack: [HB.legBackUpper, HB.legBackLower],
  legFront: [HB.legFrontUpper, HB.legFrontLower],
} as const;
type Limb = keyof typeof LIMB_BONES;

const AIRBORNE: ReadonlySet<PlayerState> = new Set(['air', 'wallJump', 'wallSlide']);
const GROUNDED: ReadonlySet<PlayerState> = new Set(['idle', 'run', 'sprint', 'crouch', 'takeoff', 'slide']);

/** Hip half-spread seen from behind (reference px): legs close enough to overlap. */
const LADDER_HIP = 0.7;

const fract = (v: number): number => v - Math.floor(v);
const smoothstep = (t: number): number => t * t * (3 - 2 * t);
const mixVec = (a: Vec2, b: Vec2, t: number): Vec2 => ({ x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t) });

/**
 * Procedural humanoid animation: no keyframes. Each step it picks targets for the
 * current state (hip height, torso lean, foot and hand positions), smooths them, then
 * places legs and arms with two-bone IK. Works in "facing right" local space with the
 * origin at the feet (collider bottom-centre); the renderer mirrors it for facing left.
 */
export class HumanoidAnimator {
  readonly skeleton: Skeleton;
  readonly props: HumanoidProportions;
  /** Current and previous step poses, for render interpolation. */
  readonly pose: Pose;
  readonly prevPose: Pose;
  facing: 1 | -1 = 1;
  gun: GunModel | null = null;
  /** Local aim angle (facing-right space). */
  aim = 0;
  /** Angle the gun is drawn at (the aim, or along the forearm when the hand is busy), current and previous step. */
  gunAngle = 0;
  prevGunAngle = 0;
  /** Pump travel (px at reference scale) of the gun's sliding parts. */
  pumpOffset = 0;
  /** 0 = side view, 1 = seen from behind (ladders). */
  backView = 0;
  /** Things that left the gun since the game last drained this list. */
  readonly events: RigEvent[] = [];
  /** The magazine is in the gun (false while reloading, after it drops). */
  magAttached = true;
  /** The far hand carries a fresh magazine (or a shotgun shell). */
  magInHand = false;
  /** Reload under way: the far arm works in front of the chest. */
  reloading = false;
  /** Lateral offset (local x, y) of each limb's root: spread shoulders/hips. Applied when sampling. */
  private readonly offsets = new Float32Array(HB.armFrontLower + 1);
  private readonly prevOffsets = new Float32Array(HB.armFrontLower + 1);

  private readonly builder: PoseBuilder;
  private readonly scratch: Pose;
  private readonly transforms: BoneTransform[];
  private phase = 0;
  private climbPhase = 0;
  private time = 0;
  private airTime = 0;
  private lastAirVy = 0;
  /** Landing squash 0..1. */
  private landing = 0;
  /** 0 = walk .. 1 = sprint (gait blend). */
  private gait = 0;
  private state: PlayerState = 'idle';
  private recoil = 0;
  /** Random muzzle wander per shot (radians), decays with the recoil. */
  private shake = 0;
  private seed = 12345;
  private cycle = 0;
  private reload = -1;
  /** Gun being switched to, and swap progress 0..1 (-1 = not switching). */
  private nextGun: GunModel | null = null;
  private switchT = -1;
  private hipHeight: number;
  private lean = 0.05;
  private spin = 0;
  private look = 1;
  private feet: { back: Vec2; front: Vec2 };
  private plan: Targets | null = null;
  private readonly freeWeight = { back: 0, front: 0 };
  private readonly freeHand = { back: { x: 0, y: 0 }, front: { x: 0, y: 0 } };

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

  /** Scale relative to the reference 24 px character. */
  get s(): number {
    return this.props.height / 24;
  }

  private get legLength(): number {
    return this.props.upperLeg + this.props.lowerLeg;
  }

  /** Unarmed attack wind-up progress 0..1 (set by AI each step; arm pulls back). */
  meleeWindup = 0;
  private strike = 0;

  /** Gun kick (arms snap back towards the shoulder, muzzle climbs), 0..1. */
  kick(amount: number): void {
    const k = this.gun?.kick.strength ?? 1;
    this.recoil = Math.min(1, this.recoil + amount * 2 * k);
    // Deterministic wander (it moves the muzzle, so it must replay identically).
    this.seed = (this.seed * 16807) % 2147483647;
    this.shake = (this.seed / 2147483647 - 0.5) * 0.12 * k;
    if (this.gun && !this.gun.pump) this.ejectCasing();
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
    this.prevGunAngle = this.gunAngle;
    this.prevOffsets.set(this.offsets);
    if (dt <= 0) return;

    this.time += dt;
    const recover = this.gun?.kick.recover ?? 8;
    this.recoil = approach(this.recoil, 0, dt * recover);
    this.shake = approach(this.shake, 0, dt * recover * 0.15);
    this.strike = approach(this.strike, 0, dt * 5);
    this.headSnap *= Math.exp(-7 * dt);
    this.torsoFlinch *= Math.exp(-7 * dt);
    this.landing = approach(this.landing, 0, dt * 4);
    const prevPump = 1 - this.cycle;
    this.cycle = input.cycle ?? 0;
    // Pump guns throw the spent shell when the pump is racked back.
    if (this.gun?.pump && this.cycle > 0 && prevPump < 0.55 && 1 - this.cycle >= 0.55) this.ejectCasing();

    // Touchdown: squash in proportion to the falling speed.
    if (GROUNDED.has(input.state) && AIRBORNE.has(this.state)) this.landing = clamp((this.lastAirVy - 120) / 280, 0, 1);
    if (AIRBORNE.has(input.state)) {
      this.airTime += dt;
      this.lastAirVy = input.vy;
    } else {
      this.airTime = 0;
    }

    const turned = input.facing !== this.facing;
    this.facing = input.facing;
    this.updateGun(dt, input.gun);
    this.updateReload(input.reload);
    this.state = input.state;
    this.aim = toLocalAim(input.aimAngle, input.facing);

    const t = this.targets(dt, input);
    if (input.kick !== undefined) this.applyKick(t, input.kick);
    this.plan = t;
    const k = damp(t.rate ?? 18, dt);
    this.hipHeight = lerp(this.hipHeight, t.hipHeight, k);
    this.lean = lerp(this.lean, t.lean, k);
    this.spin = t.spin ?? 0;
    this.look = lerp(this.look, t.look === false ? 0 : 1, damp(12, dt));
    this.backView = lerp(this.backView, t.backView ? 1 : 0, damp(16, dt));
    const kf = damp(t.footRate ?? 20, dt);
    for (const side of SIDES) {
      this.feet[side].x = lerp(this.feet[side].x, t[side].x, kf);
      this.feet[side].y = lerp(this.feet[side].y, t[side].y, kf);
      this.freeWeight[side] = lerp(this.freeWeight[side], t.hands?.[side] ? 1 : 0, damp(18, dt));
    }
    this.updateOffsets();
    this.build();
    // Turning around: don't interpolate the gun through the back.
    if (turned) this.prevGunAngle = this.gunAngle;
  }

  /** Bone transforms interpolated between the last two steps (local space; mirror when drawing). */
  sample(alpha: number): BoneTransform[] {
    const out = this.skeleton.solve(lerpPose(this.prevPose, this.pose, alpha, this.scratch), this.transforms);
    this.applyOffsets(out, alpha);
    return out;
  }

  sampleGunAngle(alpha: number): number {
    return lerpAngle(this.prevGunAngle, this.gunAngle, alpha);
  }

  /** Muzzle position in local space (facing right, feet origin), from the current pose. Null when the gun is slung. */
  muzzleLocal(): Vec2 | null {
    if (!this.gun || this.backView > 0.5) return null;
    const hand = this.sample(1)[HB.armFrontLower]!;
    return gunPoint(hand.x1, hand.y1, this.gunAngle, this.gun.muzzle.x * this.s, this.gun.muzzle.y * this.s);
  }

  private isCycling(input: RigInput): boolean {
    return (input.state === 'run' || input.state === 'sprint' || input.state === 'crouch') && Math.abs(input.vx) > 4;
  }

  private targets(dt: number, input: RigInput): Targets {
    const s = this.s;
    const L = this.legLength;
    const localVx = input.vx * input.facing;
    const wall = (input.wallSide ?? -input.facing) * input.facing;
    const p = clamp(input.progress ?? 0, 0, 1);

    if (this.isCycling(input)) {
      // Gait blends walk -> sprint by speed: longer strides, higher knees, more lean.
      const crouched = input.state === 'crouch';
      const g = clamp((Math.abs(localVx) - PLAYER_TUNING.walkSpeed) / (PLAYER_TUNING.sprintSpeed - PLAYER_TUNING.walkSpeed), 0, 1);
      this.gait = g;
      const stride = (crouched ? 6 : lerp(11, 14, g)) * s;
      const lift = (crouched ? 1.5 : lerp(1.8, 3.6, g)) * s;
      this.phase += ((localVx * dt) / stride) * Math.PI;
      const foot = (offset: number): Vec2 => ({
        x: (Math.cos(this.phase + offset) * stride) / 2,
        y: -Math.max(0, -Math.sin(this.phase + offset)) * lift,
      });
      const backwards = localVx < 0;
      const squash = this.landing * 4 * s;
      return {
        hipHeight: (crouched ? 4.5 * s : L * lerp(0.92, 0.88, g)) + Math.cos(this.phase * 2) * lerp(0.35, 0.7, g) * s - squash,
        lean: crouched ? 0.75 : backwards ? 0.02 : lerp(0.07, 0.3, g) + this.landing * 0.2,
        back: foot(Math.PI),
        front: foot(0),
        footRate: 60,
      };
    }
    this.gait = 0;

    switch (input.state) {
      case 'crouch':
        return { hipHeight: 4 * s, lean: 0.75, back: { x: -2.5 * s, y: 0 }, front: { x: 3.5 * s, y: 0 } };
      case 'slide': {
        // Feet lead the way and the body leans back from it, whichever way the aim faces.
        const dir = localVx < 0 ? -1 : 1;
        return { hipHeight: 3.5 * s, lean: -0.9 * dir, back: { x: -1 * s * dir, y: 0 }, front: { x: 9 * s * dir, y: 0 } };
      }
      case 'takeoff':
        // Anticipation: a quick dip before the legs fire.
        return { hipHeight: L * 0.66, lean: 0.32, back: { x: -2 * s, y: 0 }, front: { x: 2.5 * s, y: 0 }, rate: 50, footRate: 40 };
      case 'air':
        return this.airTargets(dt, input.vy);
      case 'wallSlide':
        // Back to the wall: one sole against it, the other leg loose; a free hand drags on it.
        return {
          hipHeight: L * 0.86,
          lean: -wall * 0.14,
          back: { x: wall * 4.5 * s, y: -3.5 * s },
          front: { x: -wall * 1 * s, y: -0.5 * s },
          hands: !input.gun || input.gun.oneHanded ? { back: (sh) => ({ x: wall * 5.2 * s, y: sh.y - 2.5 * s }) } : undefined,
        };
      case 'wallJump': {
        // Legs straight against the wall at the push, then tucked like a regular rising jump.
        const kick = 1 - smoothstep(clamp(p / 0.5, 0, 1));
        const tuck = this.airTargets(dt, -200);
        return {
          ...tuck,
          hipHeight: lerp(tuck.hipHeight, L * 0.98, kick),
          lean: lerp(tuck.lean, -wall * 0.4, kick),
          back: mixVec(tuck.back, { x: wall * 4 * s, y: 0.5 * s }, kick),
          front: mixVec(tuck.front, { x: wall * 2.5 * s, y: -1 * s }, kick),
          rate: 30,
          footRate: 30,
        };
      }
      case 'roll': {
        // Tucked ball spun once around the torso's middle; eases out as it uncurls.
        const dir = localVx < 0 ? -1 : 1;
        const hug: HandTarget = () => ({ x: 3.2 * s, y: -4 * s });
        return {
          hipHeight: 6 * s,
          lean: 1.25,
          back: { x: 0.5 * s, y: -2 * s },
          front: { x: 2.5 * s, y: -3 * s },
          hands: { back: hug, front: hug },
          spin: dir * Math.PI * 2 * (1 - (1 - p) * (1 - p)),
          rate: 30,
          footRate: 30,
          look: false,
        };
      }
      case 'climb':
        return this.climbTargets(dt, input.vy);
      case 'mantle':
        return this.mantleTargets(p, input.ledge ?? { x: 6 * s * input.facing, y: -16 * s });
      default: {
        // Idle: slight breathing; a long-gun stance stands a bit wider. Lands with a squash.
        const wide = input.gun && !input.gun.oneHanded ? 0.8 * s : 0;
        return {
          hipHeight: L * 0.93 + Math.sin(this.time * 2.2) * 0.35 * s - this.landing * 5 * s,
          lean: 0.06 + this.landing * 0.3,
          back: { x: -1.5 * s - wide, y: 0 },
          front: { x: 2 * s + wide, y: 0 },
          rate: this.landing > 0 ? 30 : 18,
        };
      }
    }
  }

  /** Jump arc: stretch at launch, knees up while rising, tuck at the apex, legs reach down when falling. */
  private airTargets(dt: number, vy: number): Targets {
    const s = this.s;
    const L = this.legLength;
    if (this.airTime < 0.09 && vy < 0) {
      return { hipHeight: L * 0.99, lean: 0.18, back: { x: -2.5 * s, y: 0.5 * s }, front: { x: 1 * s, y: -0.5 * s }, rate: 30, footRate: 35 };
    }
    const rising = { lean: 0.12, back: { x: -3 * s, y: -3 * s }, front: { x: 3 * s, y: -4.5 * s } };
    const apex = { lean: 0.16, back: { x: -2 * s, y: -4.5 * s }, front: { x: 3.5 * s, y: -5.5 * s } };
    const falling = { lean: 0.02, back: { x: -2.5 * s, y: -1 * s }, front: { x: 2.5 * s, y: 0 } };
    const rise = clamp(-vy / 220, 0, 1);
    const fall = clamp(vy / 260, 0, 1);
    const from = rise > 0 ? rising : falling;
    const t = Math.max(rise, fall);
    const pose = { lean: lerp(apex.lean, from.lean, t), back: mixVec(apex.back, from.back, t), front: mixVec(apex.front, from.front, t) };
    // A long drop: legs pedal for balance.
    const flail = clamp((this.airTime - 0.5) * 3, 0, 1) * fall;
    if (flail > 0) {
      this.phase += dt * 9;
      pose.back.y -= (Math.sin(this.phase) * 0.5 + 0.5) * 2.5 * s * flail;
      pose.front.y -= (Math.sin(this.phase + Math.PI) * 0.5 + 0.5) * 2.5 * s * flail;
    }
    return { hipHeight: L * 0.95, ...pose, footRate: 22 };
  }

  /**
   * Ladder, seen from behind. Hands and feet grip in diagonal pairs and stay put on the
   * ladder while the body passes them, then reach for the next rung. The cycle advances
   * with the distance climbed, so hanging still keeps the pose.
   */
  private climbTargets(dt: number, vy: number): Targets {
    const s = this.s;
    const L = this.legLength;
    const cycle = 16 * s;
    this.climbPhase += (-vy * dt) / cycle;
    // 0..0.75 gripping (slides down relative to the body), 0.75..1 reaching back up.
    const grip = (u: number): number => (u < 0.75 ? u / 0.75 : 1 - (u - 0.75) / 0.25);
    const reach = (u: number): number => (u < 0.75 ? 0 : Math.sin(((u - 0.75) / 0.25) * Math.PI));
    const hand = (side: -1 | 1, offset: number): HandTarget => (sh) => {
      const u = fract(this.climbPhase + offset);
      return { x: sh.x + side * (0.8 + reach(u) * 0.8) * s, y: sh.y - 8 * s + grip(u) * 12 * s };
    };
    // Feet stay under the hips and only move up and down, the legs overlapping.
    const foot = (side: -1 | 1, offset: number): Vec2 => {
      const u = fract(this.climbPhase + offset);
      return { x: side * LADDER_HIP * s, y: -7 * s + grip(u) * 7 * s };
    };
    return {
      hipHeight: L * 0.84 + Math.sin(this.climbPhase * Math.PI * 4) * 0.4 * s,
      lean: Math.sin(this.climbPhase * Math.PI * 2) * 0.06,
      back: foot(-1, 0.5),
      front: foot(1, 0),
      hands: { back: hand(-1, 0), front: hand(1, 0.5) },
      backView: true,
      look: false,
      footRate: 40,
    };
  }

  /** Ledge pull-up: hands locked on the lip, a foot scrambles on the wall, then steps over the top. */
  private mantleTargets(p: number, ledge: Vec2): Targets {
    const s = this.s;
    const L = this.legLength;
    const lip = { x: ledge.x * this.facing, y: ledge.y };
    const step = smoothstep(clamp((p - 0.35) / 0.45, 0, 1));
    const pull = { hip: L * 0.8, lean: 0.3, back: { x: -1 * s, y: 0.5 * s }, front: { x: lip.x - 0.6 * s, y: Math.min(0, lip.y + 7 * s) } };
    const over = { hip: L * 0.85, lean: 0.45, back: { x: lip.x - 0.5 * s, y: lip.y + 3 * s }, front: { x: lip.x + 2.5 * s, y: lip.y } };
    return {
      hipHeight: lerp(pull.hip, over.hip, step),
      lean: lerp(pull.lean, over.lean, step) - smoothstep(clamp((p - 0.8) / 0.2, 0, 1)) * 0.3,
      back: mixVec(pull.back, over.back, step),
      front: mixVec(pull.front, over.front, step),
      hands: { front: () => ({ x: lip.x + 0.8 * s, y: lip.y - 0.4 * s }), back: () => ({ x: lip.x - 0.3 * s, y: lip.y - 0.4 * s }) },
      rate: 30,
      footRate: 35,
      look: false,
    };
  }

  /** Spreads shoulders and hips when seen from behind; armed, the far shoulder sits a bit forward. */
  private updateOffsets(): void {
    const s = this.s;
    const bv = this.backView;
    const armed = this.gun ? 1 : 0;
    const set = (limb: Limb, x: number) => {
      for (const bone of LIMB_BONES[limb]) this.offsets[bone] = x;
    };
    set('armBack', lerp(armed * 1.3 * s, -1.8 * s, bv));
    set('armFront', 1.8 * s * bv);
    set('legBack', -LADDER_HIP * s * bv);
    set('legFront', LADDER_HIP * s * bv);
  }

  private applyOffsets(out: BoneTransform[], alpha: number): void {
    for (let i = 0; i < this.offsets.length; i++) {
      const dx = lerp(this.prevOffsets[i]!, this.offsets[i]!, alpha);
      if (dx === 0) continue;
      const t = out[i]!;
      t.x0 += dx;
      t.x1 += dx;
    }
  }

  /** Places every bone from the smoothed targets. */
  private build(): void {
    const b = this.builder;
    const p = this.props;
    const plan = this.plan;

    b.root(0, -this.hipHeight);
    const lean = this.lean + this.torsoFlinch;
    b.setWorld(HB.torso, -Math.PI / 2 + lean);
    const look = clamp(this.aim * 0.4, -0.5, 0.5) * this.look * (1 - this.backView);
    b.setWorld(HB.head, -Math.PI / 2 + lean * 0.4 + look + this.headSnap);

    const start = (bone: number): Vec2 => {
      const at = b.start(bone);
      return { x: at.x + this.offsets[bone]!, y: at.y };
    };
    const chain = (upper: number, lower: number, target: Vec2, upperLength: number, lowerLength: number, bend: 1 | -1) => {
      const from = start(upper);
      const ik = solveTwoBone(from.x, from.y, target.x, target.y, upperLength, lowerLength, bend);
      b.setWorld(upper, ik.upper);
      b.setWorld(lower, ik.lower);
    };

    // Seen from behind, knees and elbows point outwards; from the side, knees forward and elbows down.
    const bv = this.backView > 0.5;
    chain(HB.legBackUpper, HB.legBackLower, this.feet.back, p.upperLeg, p.lowerLeg, bv ? -1 : 1);
    chain(HB.legFrontUpper, HB.legFrontLower, this.feet.front, p.upperLeg, p.lowerLeg, 1);

    const hands = this.defaultHands(start(HB.armFrontUpper), start(HB.armBackUpper));
    for (const side of SIDES) {
      const fn = plan?.hands?.[side];
      const shoulder = start(side === 'front' ? HB.armFrontUpper : HB.armBackUpper);
      if (fn) this.freeHand[side] = fn(shoulder);
      hands[side] = mixVec(hands[side], this.freeHand[side], this.freeWeight[side]);
    }
    const elbow = (hand: Vec2, shoulder: Vec2, side: -1 | 1): 1 | -1 => {
      if (!bv) return -1;
      // Pick the bend that puts the elbow on the outer side.
      return (hand.y < shoulder.y ? -side : side) as 1 | -1;
    };
    chain(HB.armBackUpper, HB.armBackLower, hands.back, p.upperArm, p.lowerArm, elbow(hands.back, start(HB.armBackUpper), -1));
    chain(HB.armFrontUpper, HB.armFrontLower, hands.front, p.upperArm, p.lowerArm, elbow(hands.front, start(HB.armFrontUpper), 1));

    // The gun follows the aim, or the forearm while that hand is busy.
    const forearm = b.get(HB.armFrontLower).angle;
    this.gunAngle = lerpAngle(this.aimedGunAngle(), forearm, this.freeWeight.front) + this.spin;

    if (this.spin !== 0) {
      // Rotate the whole body around the torso's middle (children follow the root).
      const torso = b.get(HB.torso);
      const cx = (torso.x0 + torso.x1) / 2;
      const cy = (torso.y0 + torso.y1) / 2;
      const rx = torso.x0 - cx;
      const ry = torso.y0 - cy;
      const c = Math.cos(this.spin);
      const sn = Math.sin(this.spin);
      this.pose.rootX = cx + rx * c - ry * sn;
      this.pose.rootY = cy + rx * sn + ry * c;
      this.pose.local[HB.torso]! += this.spin;
    }
  }

  /** Aim minus the muzzle climb from recoil, plus the tilt while reloading and the dip while switching. */
  private aimedGunAngle(): number {
    let angle = this.aim - this.recoil * 0.3 + this.shake;
    if (this.reload >= 0 && this.gun) {
      const envelope = smoothstep(clamp(this.reload / 0.1, 0, 1)) * smoothstep(clamp((1 - this.reload) / 0.1, 0, 1));
      // Magazine guns cant the muzzle up to show the well; the shotgun rolls down to the loading port.
      angle += (this.gun.mag ? -0.5 : 0.3) * envelope;
    }
    return angle + this.lowered() * 1.2;
  }

  /** Front kick: the near leg chambers, snaps out at hip height and comes back; the body leans away. */
  private applyKick(t: Targets, k: number): void {
    const s = this.s;
    const out = k < 0.35 ? smoothstep(k / 0.35) : 1 - smoothstep((k - 0.35) / 0.65);
    t.front = mixVec(t.front, { x: 8.5 * s, y: -8.5 * s }, out);
    t.back = mixVec(t.back, { x: -1.5 * s, y: 0 }, out);
    t.lean = lerp(t.lean, -0.3, out);
    t.hipHeight = lerp(t.hipHeight, this.legLength * 0.93, out);
    t.rate = 40;
    t.footRate = 45;
  }

  /** 0..1..0 over a weapon swap. */
  private lowered(): number {
    return this.switchT < 0 ? 0 : Math.sin(this.switchT * Math.PI);
  }

  private updateGun(dt: number, gun: GunModel | null): void {
    const target = this.switchT >= 0 ? this.nextGun : this.gun;
    if (gun !== target) {
      if (!this.gun || !gun) {
        this.gun = gun;
        this.switchT = -1;
      } else {
        this.nextGun = gun;
        // Already on the way back up with another gun: go down again from where it is.
        this.switchT = this.switchT >= 0.5 ? 1 - this.switchT : Math.max(0, this.switchT);
      }
    }
    if (this.switchT < 0) return;
    this.switchT += dt / SWITCH_TIME;
    if (this.switchT >= 0.5) this.gun = this.nextGun;
    if (this.switchT >= 1) this.switchT = -1;
  }

  private updateReload(reload: number | undefined): void {
    const prev = this.reload;
    this.reload = reload ?? -1;
    const gun = this.gun;
    this.reloading = this.reload >= 0 && !!gun;
    if (!this.reloading || !gun) {
      this.magAttached = true;
      this.magInHand = false;
      return;
    }
    const r = this.reload;
    if (gun.mag) {
      if (prev < MAG.drop && r >= MAG.drop) this.dropMag();
      this.magAttached = r < MAG.drop || r >= MAG.seat;
      this.magInHand = r >= MAG.grab && r < MAG.seat;
    } else {
      const u = fract(clamp((r - 0.1) / 0.8, 0, 0.999) * SHELL_LOADS);
      this.magInHand = r > 0.1 && r < 0.9 && u > 0.45 && u < 0.95;
    }
  }

  /** Support hand path while reloading: to the gun, to the belt for a fresh one, back. */
  private reloadHand(support: Vec2, grip: Vec2, angle: number): Vec2 {
    const gun = this.gun!;
    const s = this.s;
    const r = this.reload;
    const belt = { x: 1.2 * s, y: -this.hipHeight + 1 * s };
    const at = (p: { x: number; y: number }) => gunPoint(grip.x, grip.y, angle, p.x * s, p.y * s);
    const ease = (a: number, b: number) => smoothstep(clamp((r - a) / (b - a), 0, 1));
    if (gun.mag) {
      const well = at(partCenter(gun.mag));
      if (r < MAG.reach) return mixVec(support, well, ease(0, MAG.reach));
      if (r < MAG.drop + 0.05) return well;
      if (r < MAG.grab) return mixVec(well, belt, ease(MAG.drop + 0.05, MAG.toBelt));
      if (r < MAG.seat) return mixVec(belt, well, ease(MAG.grab, MAG.toGun));
      return mixVec(well, support, ease(MAG.seat, 1));
    }
    // Shell by shell: belt -> loading port, a few times.
    const port = at({ x: 0.6, y: 0.6 });
    if (r < 0.1) return mixVec(support, port, ease(0, 0.1));
    if (r >= 0.9) return mixVec(port, support, ease(0.9, 1));
    const u = fract(((r - 0.1) / 0.8) * SHELL_LOADS);
    const t = u < 0.4 ? smoothstep(u / 0.4) : u < 0.5 ? 1 : u < 0.9 ? 1 - smoothstep((u - 0.5) / 0.4) : 0;
    return mixVec(port, belt, t);
  }

  /** Local position of a gun-space point on the current pose. */
  private gunLocal(x: number, y: number): Vec2 {
    const hand = this.sample(1)[HB.armFrontLower]!;
    return gunPoint(hand.x1, hand.y1, this.gunAngle, x * this.s, y * this.s);
  }

  private ejectCasing(): void {
    const gun = this.gun!;
    const at = this.gunLocal(gun.eject.x, gun.eject.y);
    // Up and back out of the port, with some scatter.
    const v = gunPoint(0, 0, this.gunAngle, -25 - Math.random() * 30, -70 - Math.random() * 50);
    this.events.push({ kind: 'casing', x: at.x, y: at.y, vx: v.x, vy: v.y, angle: this.gunAngle });
  }

  private dropMag(): void {
    const gun = this.gun!;
    const c = partCenter(gun.mag!);
    const at = this.gunLocal(c.x, c.y);
    const v = gunPoint(0, 0, this.gunAngle, 0, 25);
    this.events.push({ kind: 'mag', x: at.x, y: at.y, vx: v.x, vy: v.y, angle: this.gunAngle });
  }

  /** Hands when nothing else claims them: on the gun, or swinging / punching / balancing unarmed. */
  private defaultHands(frontShoulder: Vec2, backShoulder: Vec2): { back: Vec2; front: Vec2 } {
    const p = this.props;
    const s = this.s;
    const armLength = p.upperArm + p.lowerArm;

    if (this.gun) {
      const gun = this.gun;
      const angle = this.aimedGunAngle();
      // Recoil pulls the grip back; a swap tucks the gun in towards the body.
      const reach = gun.grip.x * (1 - this.lowered() * 0.35) - this.recoil * 1.5;
      const grip = gunPoint(frontShoulder.x, frontShoulder.y, angle, reach * s, gun.grip.y * s);
      // Pump action: the support hand racks back and forth while the gun cycles.
      const t = 1 - this.cycle;
      this.pumpOffset = gun.pump && this.cycle > 0 && t > 0.15 ? Math.sin(((t - 0.15) / 0.85) * Math.PI) * gun.pump : 0;
      let support = gunPoint(grip.x, grip.y, angle, (gun.support.x - this.pumpOffset) * s, gun.support.y * s);
      if (this.reloading) support = this.reloadHand(support, grip, angle);
      return { front: grip, back: support };
    }
    this.pumpOffset = 0;

    if (this.strike > 0 || this.meleeWindup > 0) {
      // Punch: wind up (fist pulled back) -> strike (arm extended), retracting as `strike` decays.
      const ext = this.strike > 0 ? armLength * 0.95 * this.strike : -armLength * 0.35 * this.meleeWindup;
      return {
        front: { x: frontShoulder.x + ext + s, y: frontShoulder.y + armLength * 0.15 },
        back: { x: backShoulder.x - s, y: backShoulder.y + armLength * 0.6 },
      };
    }
    if (AIRBORNE.has(this.state)) {
      // Arms up for balance, higher and flailing on a long drop.
      const fall = clamp(this.airTime - 0.3, 0, 1);
      const flap = Math.sin(this.time * 14) * fall * 1.5 * s;
      return {
        front: { x: frontShoulder.x + 3 * s, y: frontShoulder.y - 2 * s - fall * 2 * s + flap },
        back: { x: backShoulder.x - 3 * s, y: backShoulder.y - 1 * s - fall * 3 * s - flap },
      };
    }
    // Arms swing opposite to the legs, wider at a sprint.
    const swing = Math.cos(this.phase) * lerp(2.5, 4, this.gait) * s;
    return {
      front: { x: frontShoulder.x - swing + s, y: frontShoulder.y + armLength * 0.85 },
      back: { x: backShoulder.x + swing - s, y: backShoulder.y + armLength * 0.85 },
    };
  }
}

/** A point in gun space (x along `angle`, y perpendicular, towards the gun's bottom) from an origin. */
export function gunPoint(ox: number, oy: number, angle: number, x: number, y: number): Vec2 {
  const c = Math.cos(angle);
  const sn = Math.sin(angle);
  return { x: ox + x * c - y * sn, y: oy + x * sn + y * c };
}

/** World aim -> facing-right local aim, kept in the front half-plane (with a little slack). */
function toLocalAim(worldAngle: number, facing: 1 | -1): number {
  const a = facing > 0 ? worldAngle : Math.PI - worldAngle;
  const n = Math.atan2(Math.sin(a), Math.cos(a));
  return clamp(n, -Math.PI / 2 - 0.2, Math.PI / 2 + 0.2);
}
