import type { Vec2 } from '../math/vec2';

/**
 * Verlet point-and-stick body (ragdolls, ropes, debris chains). Velocity is implicit
 * (position - previous position), which makes constraints stable and impulses trivial.
 */
export class VerletBody {
  readonly x: Float32Array;
  readonly y: Float32Array;
  readonly ox: Float32Array;
  readonly oy: Float32Array;
  readonly sticks: { a: number; b: number; length: number }[];

  constructor(points: readonly Vec2[], sticks: readonly (readonly [number, number])[]) {
    const n = points.length;
    this.x = new Float32Array(n);
    this.y = new Float32Array(n);
    this.ox = new Float32Array(n);
    this.oy = new Float32Array(n);
    points.forEach((p, i) => {
      this.x[i] = this.ox[i] = p.x;
      this.y[i] = this.oy[i] = p.y;
    });
    this.sticks = sticks.map(([a, b]) => ({ a, b, length: Math.hypot(points[b]!.x - points[a]!.x, points[b]!.y - points[a]!.y) }));
  }

  get size(): number {
    return this.x.length;
  }

  /** Adds velocity (px/s) to one point, given the step size the body will be simulated with. */
  addVelocity(i: number, vx: number, vy: number, dt: number): void {
    this.ox[i]! -= vx * dt;
    this.oy[i]! -= vy * dt;
  }

  addVelocityAll(vx: number, vy: number, dt: number): void {
    for (let i = 0; i < this.size; i++) this.addVelocity(i, vx, vy, dt);
  }

  /**
   * Integrates, then relaxes sticks `iterations` times. `isSolid` makes points collide with
   * the world: they stop on the blocked axis and get ground friction.
   */
  step(dt: number, gravity: number, isSolid: (x: number, y: number) => boolean, iterations = 4, damping = 0.995): void {
    if (dt <= 0) return;
    for (let i = 0; i < this.size; i++) {
      const vx = (this.x[i]! - this.ox[i]!) * damping;
      const vy = (this.y[i]! - this.oy[i]!) * damping + gravity * dt * dt;
      this.ox[i] = this.x[i]!;
      this.oy[i] = this.y[i]!;
      this.moveTo(i, this.x[i]! + vx, this.y[i]! + vy, isSolid);
    }
    for (let k = 0; k < iterations; k++) {
      for (const s of this.sticks) {
        const dx = this.x[s.b]! - this.x[s.a]!;
        const dy = this.y[s.b]! - this.y[s.a]!;
        const d = Math.hypot(dx, dy) || 1e-6;
        const diff = ((d - s.length) / d) * 0.5;
        this.moveTo(s.a, this.x[s.a]! + dx * diff, this.y[s.a]! + dy * diff, isSolid, false);
        this.moveTo(s.b, this.x[s.b]! - dx * diff, this.y[s.b]! - dy * diff, isSolid, false);
      }
    }
  }

  private moveTo(i: number, nx: number, ny: number, isSolid: (x: number, y: number) => boolean, friction = true): void {
    const x = this.x[i]!;
    const y = this.y[i]!;
    if (!isSolid(nx, ny)) {
      this.x[i] = nx;
      this.y[i] = ny;
      return;
    }
    // Slide along whichever axis is free.
    if (!isSolid(nx, y)) this.x[i] = nx;
    if (!isSolid(x, ny)) {
      this.y[i] = ny;
    } else if (friction) {
      // Landed: kill most horizontal motion (ground friction).
      this.ox[i] = this.x[i]! - (this.x[i]! - this.ox[i]!) * 0.5;
    }
  }
}
