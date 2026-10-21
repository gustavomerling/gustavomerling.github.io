import type { Vec2 } from '../math/vec2';

/**
 * Vector renderer. The game draws in virtual units straight onto the visible canvas at device
 * resolution: the virtual -> device transform is set by `clear()`, so lines and shapes stay
 * smooth at any window size (no low-res back buffer, no pixel art).
 *
 * The view always shows `height` virtual units vertically and fills the whole window: `width`
 * follows the window's aspect ratio (no letterbox).
 */
export class Renderer {
  /** Draw here, in virtual units. */
  readonly ctx: CanvasRenderingContext2D;
  /** Device pixels per virtual unit. */
  scale = 1;
  /** Visible width in virtual units (changes with the window's aspect ratio). */
  width: number;
  private readonly observer: ResizeObserver;

  constructor(
    private readonly display: HTMLCanvasElement,
    readonly height: number,
    /** Width used until the canvas has a size (and the narrowest the view gets). */
    private readonly minWidth: number,
  ) {
    this.width = minWidth;
    const ctx = display.getContext('2d', { alpha: false });
    if (!ctx) throw new Error('Canvas 2D context unavailable');
    this.ctx = ctx;
    this.observer = new ResizeObserver(() => this.resize());
    this.observer.observe(display);
    this.resize();
  }

  resize(): void {
    const dpr = window.devicePixelRatio || 1;
    const rect = this.display.getBoundingClientRect();
    const cw = Math.max(1, Math.round(rect.width * dpr));
    const ch = Math.max(1, Math.round(rect.height * dpr));
    if (this.display.width !== cw) this.display.width = cw;
    if (this.display.height !== ch) this.display.height = ch;
    // Fit the height; a very tall/narrow window fits the minimum width instead.
    this.scale = Math.min(ch / this.height, cw / this.minWidth);
    this.width = cw / this.scale;
  }

  /** Paints the whole canvas and leaves the virtual-unit transform active. */
  clear(color: string): void {
    const ctx = this.ctx;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, this.display.width, this.display.height);
    ctx.setTransform(this.scale, 0, 0, this.scale, 0, 0);
  }

  /** Client (CSS) coordinates -> virtual units. */
  clientToVirtual(clientX: number, clientY: number): Vec2 {
    const rect = this.display.getBoundingClientRect();
    const px = (clientX - rect.left) * (this.display.width / rect.width);
    const py = (clientY - rect.top) * (this.display.height / rect.height);
    return { x: px / this.scale, y: py / this.scale };
  }

  dispose(): void {
    this.observer.disconnect();
  }
}
