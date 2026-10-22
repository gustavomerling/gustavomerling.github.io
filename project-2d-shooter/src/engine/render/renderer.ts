import type { Vec2 } from '../math/vec2';

/**
 * Pixel-art renderer. The game draws in virtual units onto a low-resolution canvas (one pixel per
 * unit by default) that CSS scales up without smoothing; the virtual -> buffer transform is set
 * by `clear()`.
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
    /** Back-buffer pixels per virtual unit: 1 = true pixel art, 2 = finer pixels. */
    private readonly pixelsPerUnit = 1,
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
    const rect = this.display.getBoundingClientRect();
    const aspect = rect.width > 0 && rect.height > 0 ? rect.width / rect.height : this.minWidth / this.height;
    // Pixel art: the back buffer is the virtual grid itself (times `pixelsPerUnit`) and CSS
    // scales it up with `image-rendering: pixelated`, so every unit is a crisp, chunky pixel.
    this.scale = this.pixelsPerUnit;
    this.width = Math.max(this.minWidth, Math.round(this.height * aspect));
    const cw = Math.round(this.width * this.scale);
    const ch = Math.round(this.height * this.scale);
    if (this.display.width !== cw) this.display.width = cw;
    if (this.display.height !== ch) this.display.height = ch;
    this.ctx.imageSmoothingEnabled = false;
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
