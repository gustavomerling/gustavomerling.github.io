import { clamp, damp, lerp } from '../math/math';
import type { Rect } from '../math/rect';
import type { Vec2 } from '../math/vec2';

/**
 * 2D camera centred on (x, y) in world pixels. Simulation moves it in fixed steps;
 * rendering interpolates between the previous and current position and snaps to whole
 * pixels so pixel art never shimmers.
 */
export class Camera {
  x = 0;
  y = 0;
  private prevX = 0;
  private prevY = 0;
  /** World area the camera may show; null = unbounded. */
  bounds: Rect | null = null;
  /** 0..1, decays over time; shake offset grows with trauma². */
  trauma = 0;
  traumaDecayPerSecond = 1.6;
  maxShakePixels = 6;

  /** Top-left of the view used by the last `begin()` (for screen -> world). */
  private viewLeft = 0;
  private viewTop = 0;

  constructor(
    readonly viewWidth: number,
    readonly viewHeight: number,
  ) {}

  /** Jump without smoothing (spawn, room transition). */
  snapTo(x: number, y: number): void {
    this.x = this.prevX = x;
    this.y = this.prevY = y;
    this.applyBounds();
    this.prevX = this.x;
    this.prevY = this.y;
  }

  /** Call once per simulation step, before moving. */
  beginStep(): void {
    this.prevX = this.x;
    this.prevY = this.y;
  }

  follow(target: Vec2, dt: number, rate = 10): void {
    const t = damp(rate, dt);
    this.x = lerp(this.x, target.x, t);
    this.y = lerp(this.y, target.y, t);
    this.applyBounds();
  }

  addTrauma(amount: number): void {
    this.trauma = clamp(this.trauma + amount, 0, 1);
  }

  /** Directional jolt (e.g. towards where a shot landed), decays quickly. Pixels. */
  kick(dx: number, dy: number): void {
    this.kickX = clamp(this.kickX + dx, -8, 8);
    this.kickY = clamp(this.kickY + dy, -8, 8);
  }

  updateShake(realDt: number): void {
    this.trauma = Math.max(0, this.trauma - this.traumaDecayPerSecond * realDt);
    const k = Math.exp(-18 * realDt);
    this.kickX *= k;
    this.kickY *= k;
  }

  private kickX = 0;
  private kickY = 0;

  /** Applies the world transform to `ctx`. Pair with `ctx.restore()` (or `end`). */
  begin(ctx: CanvasRenderingContext2D, alpha: number, timeSeconds: number): void {
    const cx = lerp(this.prevX, this.x, alpha);
    const cy = lerp(this.prevY, this.y, alpha);
    const shake = this.trauma * this.trauma * this.maxShakePixels;
    const sx = shake * Math.sin(timeSeconds * 71.3);
    const sy = shake * Math.sin(timeSeconds * 53.7 + 1.3);
    this.viewLeft = Math.round(cx - this.viewWidth / 2 + sx + this.kickX);
    this.viewTop = Math.round(cy - this.viewHeight / 2 + sy + this.kickY);
    ctx.save();
    ctx.translate(-this.viewLeft, -this.viewTop);
  }

  end(ctx: CanvasRenderingContext2D): void {
    ctx.restore();
  }

  /** Visible world rect from the last render (for culling). */
  get view(): Rect {
    return { x: this.viewLeft, y: this.viewTop, w: this.viewWidth, h: this.viewHeight };
  }

  screenToWorld(p: Vec2): Vec2 {
    return { x: p.x + this.viewLeft, y: p.y + this.viewTop };
  }

  /** Same as screenToWorld but based on the simulation position (deterministic, no shake). */
  screenToWorldSim(p: Vec2): Vec2 {
    return { x: p.x + this.x - this.viewWidth / 2, y: p.y + this.y - this.viewHeight / 2 };
  }

  private applyBounds(): void {
    const b = this.bounds;
    if (!b) return;
    const hw = this.viewWidth / 2;
    const hh = this.viewHeight / 2;
    this.x = b.w <= this.viewWidth ? b.x + b.w / 2 : clamp(this.x, b.x + hw, b.x + b.w - hw);
    this.y = b.h <= this.viewHeight ? b.y + b.h / 2 : clamp(this.y, b.y + hh, b.y + b.h - hh);
  }
}
