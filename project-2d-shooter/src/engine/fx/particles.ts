/**
 * Pooled particle system for short-lived visuals (sparks, smoke, debris, casings, flashes).
 * Not part of the ECS: thousands of tiny objects that never interact with gameplay.
 * Visual only, so it may use Math.random freely without hurting determinism.
 */
export type ParticleShape =
  /** 1-px dot (or `size` square). */
  | 'dot'
  /** Short line along its velocity (sparks). */
  | 'streak'
  /** Rotating rectangle `size` x `size2` (debris, casings). */
  | 'chip'
  /** Expanding, fading circle (smoke). */
  | 'puff'
  /** Star of rays from the origin towards `angle` (muzzle flash). */
  | 'flash';

export interface ParticleSpec {
  x: number;
  y: number;
  vx?: number;
  vy?: number;
  life: number;
  shape?: ParticleShape;
  color: string;
  size?: number;
  size2?: number;
  /** Pixels/s² downwards. */
  gravity?: number;
  /** Fraction of velocity lost per second (0..1). */
  drag?: number;
  /** Bounce off blocking tiles with this restitution; undefined = pass through. */
  bounce?: number;
  angle?: number;
  spin?: number;
  /** Puff growth, px/s. */
  grow?: number;
  /** Fade alpha out over the lifetime (default true). */
  fade?: boolean;
}

interface Particle extends Required<Omit<ParticleSpec, 'bounce'>> {
  bounce: number | undefined;
  age: number;
  alive: boolean;
}

export class ParticleSystem {
  private readonly pool: Particle[] = [];
  private count = 0;

  constructor(
    private readonly max = 1500,
    /** Collision probe for bouncing particles (world pixels). */
    private readonly isSolid: (x: number, y: number) => boolean = () => false,
  ) {}

  get active(): number {
    return this.count;
  }

  emit(spec: ParticleSpec): void {
    let p = this.pool.find((q) => !q.alive);
    if (!p) {
      if (this.pool.length >= this.max) return;
      p = {} as Particle;
      this.pool.push(p);
    }
    p.x = spec.x;
    p.y = spec.y;
    p.vx = spec.vx ?? 0;
    p.vy = spec.vy ?? 0;
    p.life = spec.life;
    p.shape = spec.shape ?? 'dot';
    p.color = spec.color;
    p.size = spec.size ?? 1;
    p.size2 = spec.size2 ?? spec.size ?? 1;
    p.gravity = spec.gravity ?? 0;
    p.drag = spec.drag ?? 0;
    p.bounce = spec.bounce;
    p.angle = spec.angle ?? 0;
    p.spin = spec.spin ?? 0;
    p.grow = spec.grow ?? 0;
    p.fade = spec.fade ?? true;
    p.age = 0;
    p.alive = true;
    this.count++;
  }

  update(dt: number): void {
    if (dt <= 0) return;
    for (const p of this.pool) {
      if (!p.alive) continue;
      p.age += dt;
      if (p.age >= p.life) {
        p.alive = false;
        this.count--;
        continue;
      }
      p.vy += p.gravity * dt;
      const k = Math.max(0, 1 - p.drag * dt);
      p.vx *= k;
      p.vy *= k;
      const nx = p.x + p.vx * dt;
      const ny = p.y + p.vy * dt;
      if (p.bounce !== undefined && this.isSolid(nx, ny)) {
        if (this.isSolid(nx, p.y)) p.vx = -p.vx * p.bounce;
        if (this.isSolid(p.x, ny)) {
          p.vy = -p.vy * p.bounce;
          p.vx *= 0.7;
          p.spin *= 0.6;
        }
      } else {
        p.x = nx;
        p.y = ny;
      }
      p.angle += p.spin * dt;
    }
  }

  draw(ctx: CanvasRenderingContext2D): void {
    for (const p of this.pool) {
      if (!p.alive) continue;
      const t = p.age / p.life;
      ctx.globalAlpha = p.fade ? 1 - t : 1;
      ctx.fillStyle = p.color;
      ctx.strokeStyle = p.color;
      const x = Math.round(p.x);
      const y = Math.round(p.y);
      switch (p.shape) {
        case 'dot':
          ctx.fillRect(x, y, p.size, p.size);
          break;
        case 'streak': {
          const len = Math.hypot(p.vx, p.vy);
          const l = Math.min(p.size * 3, len * 0.02 + 1);
          const dx = len > 0 ? p.vx / len : 0;
          const dy = len > 0 ? p.vy / len : 0;
          for (let i = 0; i <= l; i++) ctx.fillRect(Math.round(p.x - dx * i), Math.round(p.y - dy * i), 1, 1);
          break;
        }
        case 'chip':
          ctx.save();
          ctx.translate(x, y);
          ctx.rotate(p.angle);
          ctx.fillRect(-p.size / 2, -p.size2 / 2, p.size, p.size2);
          ctx.restore();
          break;
        case 'puff': {
          const r = Math.max(1, p.size + p.grow * p.age);
          ctx.globalAlpha *= 0.5;
          ctx.beginPath();
          ctx.arc(x, y, r, 0, Math.PI * 2);
          ctx.fill();
          break;
        }
        case 'flash': {
          // Main cone along `angle` plus two short side rays.
          ctx.globalAlpha = 1;
          for (const [da, len] of [
            [0, p.size],
            [0.6, p.size * 0.45],
            [-0.6, p.size * 0.45],
          ] as const) {
            const a = p.angle + da;
            for (let i = 0; i < len; i++) {
              const w = i < len * 0.4 ? 2 : 1;
              ctx.fillRect(Math.round(p.x + Math.cos(a) * i), Math.round(p.y + Math.sin(a) * i), w, w);
            }
          }
          break;
        }
      }
    }
    ctx.globalAlpha = 1;
  }

  clear(): void {
    for (const p of this.pool) p.alive = false;
    this.count = 0;
  }
}
