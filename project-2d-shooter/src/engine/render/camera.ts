import { clamp, damp, lerp } from '../math/math';
import type { Rect } from '../math/rect';
import type { Vec2 } from '../math/vec2';

/**
 * 2D camera centred on (x, y) in world units. Simulation moves it in fixed steps;
 * rendering interpolates between the previous and current position (sub-pixel, smooth).
 */
export class Camera {
  x = 0;
  y = 0;
  private prevX = 0;
  private prevY = 0;
  /** Render-only offset (screen shake), world units. Never used by simulation reads (`screenToWorldSim`). */
  offsetX = 0;
  offsetY = 0;
  /** World area the camera may show; null = unbounded. */
  bounds: Rect | null = null;

  /** Top-left of the view used by the last `begin()` (for culling). */
  private viewLeft = 0;
  private viewTop = 0;

  constructor(
    public viewWidth: number,
    public viewHeight: number,
  ) {}

  /** The window changed shape: show this many world units (keeps the camera inside its bounds). */
  resize(viewWidth: number, viewHeight: number): void {
    if (viewWidth === this.viewWidth && viewHeight === this.viewHeight) return;
    this.viewWidth = viewWidth;
    this.viewHeight = viewHeight;
    this.applyBounds();
  }

  /** Jump without smoothing (spawn, room transition). */
  snapTo(x: number, y: number): void {
    this.x = x;
    this.y = y;
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

  /** Applies the world transform to `ctx`. Pair with `end`. */
  begin(ctx: CanvasRenderingContext2D, alpha: number): void {
    this.viewLeft = lerp(this.prevX, this.x, alpha) - this.viewWidth / 2 + this.offsetX;
    this.viewTop = lerp(this.prevY, this.y, alpha) - this.viewHeight / 2 + this.offsetY;
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

  /** Screen -> world from the simulation position (deterministic: used by aim and debug spawns). */
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
