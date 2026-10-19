import type { Vec2 } from '../math/vec2';

/**
 * - `integer`: largest whole-number scale that fits (pixel perfect, may letterbox a lot).
 * - `fit`: fills the window keeping aspect ratio (nearest-neighbour; pixels may differ by 1px).
 */
export type ScaleMode = 'integer' | 'fit';

/**
 * Pixel-art renderer. The game draws into a small back buffer at a fixed virtual
 * resolution (e.g. 480x270); `present()` blits it to the visible canvas, letterboxed,
 * nearest-neighbour, so pixels stay crisp. At 1920x1080 both scale modes are exactly 4x.
 */
export class Renderer {
  /** Draw here, in virtual pixels. */
  readonly ctx: CanvasRenderingContext2D;
  /** Current upscale factor (device pixels per virtual pixel). */
  scale = 1;
  private mode: ScaleMode = 'fit';

  private readonly buffer: HTMLCanvasElement;
  private readonly displayCtx: CanvasRenderingContext2D;
  private offsetX = 0;
  private offsetY = 0;
  private readonly observer: ResizeObserver;

  constructor(
    private readonly display: HTMLCanvasElement,
    readonly width: number,
    readonly height: number,
    private readonly letterboxColor = '#000',
  ) {
    this.buffer = document.createElement('canvas');
    this.buffer.width = width;
    this.buffer.height = height;
    this.ctx = get2d(this.buffer);
    this.displayCtx = get2d(display);
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
    const fit = Math.min(cw / this.width, ch / this.height);
    this.scale = this.mode === 'integer' ? Math.max(1, Math.floor(fit)) : fit;
    this.offsetX = Math.floor((cw - this.width * this.scale) / 2);
    this.offsetY = Math.floor((ch - this.height * this.scale) / 2);
  }

  setScaleMode(mode: ScaleMode): void {
    this.mode = mode;
    this.resize();
  }

  clear(color: string): void {
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.fillStyle = color;
    this.ctx.fillRect(0, 0, this.width, this.height);
  }

  present(): void {
    const d = this.displayCtx;
    d.setTransform(1, 0, 0, 1, 0, 0);
    d.imageSmoothingEnabled = false;
    d.fillStyle = this.letterboxColor;
    d.fillRect(0, 0, this.display.width, this.display.height);
    d.drawImage(this.buffer, this.offsetX, this.offsetY, Math.round(this.width * this.scale), Math.round(this.height * this.scale));
  }

  /** Client (CSS) coordinates -> virtual pixels. May fall outside [0, width) in the letterbox. */
  clientToVirtual(clientX: number, clientY: number): Vec2 {
    const rect = this.display.getBoundingClientRect();
    const px = (clientX - rect.left) * (this.display.width / rect.width);
    const py = (clientY - rect.top) * (this.display.height / rect.height);
    return { x: (px - this.offsetX) / this.scale, y: (py - this.offsetY) / this.scale };
  }

  dispose(): void {
    this.observer.disconnect();
  }
}

function get2d(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) throw new Error('Canvas 2D context unavailable');
  ctx.imageSmoothingEnabled = false;
  return ctx;
}
