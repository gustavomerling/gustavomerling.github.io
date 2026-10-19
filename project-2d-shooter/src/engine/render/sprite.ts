/** Grid-based sprite sheet: frame `i` is at column i % columns, row floor(i / columns). */
export interface SpriteSheet {
  image: CanvasImageSource;
  frameWidth: number;
  frameHeight: number;
  columns: number;
}

export interface AnimationClip {
  frames: readonly number[];
  fps: number;
  loop: boolean;
}

/** Plays named clips of a sheet. Pure state; time is fed by the caller (so slow-mo just works). */
export class Animator<Clip extends string> {
  private clip: Clip;
  private time = 0;

  constructor(
    readonly clips: Record<Clip, AnimationClip>,
    initial: Clip,
  ) {
    this.clip = initial;
  }

  get current(): Clip {
    return this.clip;
  }

  play(clip: Clip, restart = false): void {
    if (clip === this.clip && !restart) return;
    this.clip = clip;
    this.time = 0;
  }

  update(dt: number): void {
    this.time += dt;
  }

  get finished(): boolean {
    const c = this.clips[this.clip];
    return !c.loop && this.time * c.fps >= c.frames.length;
  }

  get frame(): number {
    const c = this.clips[this.clip];
    const i = Math.floor(this.time * c.fps);
    const idx = c.loop ? i % c.frames.length : Math.min(i, c.frames.length - 1);
    return c.frames[idx] ?? 0;
  }
}

export function drawFrame(
  ctx: CanvasRenderingContext2D,
  sheet: SpriteSheet,
  frame: number,
  x: number,
  y: number,
  flipX = false,
): void {
  const sx = (frame % sheet.columns) * sheet.frameWidth;
  const sy = Math.floor(frame / sheet.columns) * sheet.frameHeight;
  const dx = Math.round(x);
  const dy = Math.round(y);
  if (!flipX) {
    ctx.drawImage(sheet.image, sx, sy, sheet.frameWidth, sheet.frameHeight, dx, dy, sheet.frameWidth, sheet.frameHeight);
    return;
  }
  ctx.save();
  ctx.translate(dx + sheet.frameWidth, dy);
  ctx.scale(-1, 1);
  ctx.drawImage(sheet.image, sx, sy, sheet.frameWidth, sheet.frameHeight, 0, 0, sheet.frameWidth, sheet.frameHeight);
  ctx.restore();
}
