import type { Vec2 } from '../math/vec2';

/**
 * 2D skeletal rig. Bones form a tree; each bone starts somewhere along its parent
 * (`attach`: 0 = parent's start, 1 = parent's end) and points along its world angle.
 * Angles are radians in screen space (y down): 0 = right, -PI/2 = up.
 */
export interface BoneDef {
  readonly name: string;
  readonly parent: string | null;
  readonly length: number;
  /** Where on the parent this bone starts, 0..1 (default 1 = parent's tip). */
  readonly attach?: number;
}

/** World-space result of forward kinematics for one bone. */
export interface BoneTransform {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  angle: number;
}

/** Local bone angles (relative to the parent) + root position. Plain data, cheap to copy/blend. */
export class Pose {
  rootX = 0;
  rootY = 0;
  readonly local: Float32Array;

  constructor(boneCount: number) {
    this.local = new Float32Array(boneCount);
  }

  copyFrom(other: Pose): void {
    this.rootX = other.rootX;
    this.rootY = other.rootY;
    this.local.set(other.local);
  }
}

export class Skeleton {
  readonly bones: readonly BoneDef[];
  /** Parent index per bone, -1 for the root. Parents always come before children. */
  readonly parentOf: Int16Array;
  private readonly indexByName = new Map<string, number>();

  constructor(bones: readonly BoneDef[]) {
    this.bones = bones;
    this.parentOf = new Int16Array(bones.length);
    bones.forEach((b, i) => {
      if (this.indexByName.has(b.name)) throw new Error(`Skeleton: duplicate bone "${b.name}"`);
      if (b.parent === null) {
        if (i !== 0) throw new Error('Skeleton: only the first bone may be the root');
        this.parentOf[i] = -1;
      } else {
        const p = this.indexByName.get(b.parent);
        if (p === undefined) throw new Error(`Skeleton: bone "${b.name}" listed before its parent "${b.parent}"`);
        this.parentOf[i] = p;
      }
      this.indexByName.set(b.name, i);
    });
  }

  get size(): number {
    return this.bones.length;
  }

  index(name: string): number {
    const i = this.indexByName.get(name);
    if (i === undefined) throw new Error(`Skeleton: unknown bone "${name}"`);
    return i;
  }

  createPose(): Pose {
    return new Pose(this.bones.length);
  }

  createTransforms(): BoneTransform[] {
    return this.bones.map(() => ({ x0: 0, y0: 0, x1: 0, y1: 0, angle: 0 }));
  }

  /** Forward kinematics: pose -> world transforms (written into `out`). */
  solve(pose: Pose, out: BoneTransform[]): BoneTransform[] {
    for (let i = 0; i < this.bones.length; i++) {
      const bone = this.bones[i]!;
      const t = out[i]!;
      const p = this.parentOf[i]!;
      if (p < 0) {
        t.x0 = pose.rootX;
        t.y0 = pose.rootY;
        t.angle = pose.local[i]!;
      } else {
        const parent = out[p]!;
        const k = bone.attach ?? 1;
        t.x0 = parent.x0 + (parent.x1 - parent.x0) * k;
        t.y0 = parent.y0 + (parent.y1 - parent.y0) * k;
        t.angle = parent.angle + pose.local[i]!;
      }
      t.x1 = t.x0 + Math.cos(t.angle) * bone.length;
      t.y1 = t.y0 + Math.sin(t.angle) * bone.length;
    }
    return out;
  }
}

/**
 * Builds a pose bone by bone (parents first) while tracking world transforms, so a
 * procedural animator can mix local angles, world angles and IK freely.
 */
export class PoseBuilder {
  private readonly world: BoneTransform[];

  constructor(
    readonly skeleton: Skeleton,
    readonly pose: Pose,
  ) {
    this.world = skeleton.createTransforms();
  }

  root(x: number, y: number): void {
    this.pose.rootX = x;
    this.pose.rootY = y;
  }

  /** Start point of a bone (its parent must already be set). */
  start(index: number): Vec2 {
    const p = this.skeleton.parentOf[index]!;
    if (p < 0) return { x: this.pose.rootX, y: this.pose.rootY };
    const parent = this.world[p]!;
    const k = this.skeleton.bones[index]!.attach ?? 1;
    return { x: parent.x0 + (parent.x1 - parent.x0) * k, y: parent.y0 + (parent.y1 - parent.y0) * k };
  }

  setWorld(index: number, angle: number): BoneTransform {
    const p = this.skeleton.parentOf[index]!;
    const parentAngle = p < 0 ? 0 : this.world[p]!.angle;
    return this.apply(index, angle, angle - parentAngle);
  }

  setLocal(index: number, angle: number): BoneTransform {
    const p = this.skeleton.parentOf[index]!;
    const parentAngle = p < 0 ? 0 : this.world[p]!.angle;
    return this.apply(index, parentAngle + angle, angle);
  }

  get(index: number): BoneTransform {
    return this.world[index]!;
  }

  private apply(index: number, worldAngle: number, localAngle: number): BoneTransform {
    const s = this.start(index);
    const t = this.world[index]!;
    const len = this.skeleton.bones[index]!.length;
    t.x0 = s.x;
    t.y0 = s.y;
    t.angle = worldAngle;
    t.x1 = s.x + Math.cos(worldAngle) * len;
    t.y1 = s.y + Math.sin(worldAngle) * len;
    this.pose.local[index] = localAngle;
    return t;
  }
}

/** Shortest-path angle interpolation. */
export function lerpAngle(a: number, b: number, t: number): number {
  let d = (b - a) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return a + d * t;
}

export function lerpPose(a: Pose, b: Pose, t: number, out: Pose): Pose {
  out.rootX = a.rootX + (b.rootX - a.rootX) * t;
  out.rootY = a.rootY + (b.rootY - a.rootY) * t;
  for (let i = 0; i < out.local.length; i++) out.local[i] = lerpAngle(a.local[i]!, b.local[i]!, t);
  return out;
}
