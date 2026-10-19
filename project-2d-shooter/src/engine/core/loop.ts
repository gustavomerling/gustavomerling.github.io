export interface LoopCallbacks {
  /** Fixed-size simulation step. `dt` is real seconds (always `stepSeconds`). */
  update(dt: number): void;
  /** Called once per animation frame; `alpha` in [0, 1) interpolates between the last two updates. */
  render(alpha: number, frameSeconds: number): void;
}

export interface LoopOptions {
  stepSeconds?: number;
  /** Clamp for a single frame (tab switch, breakpoint) so we never spiral trying to catch up. */
  maxFrameSeconds?: number;
  requestFrame?: (cb: (timeMs: number) => void) => number;
  cancelFrame?: (handle: number) => void;
}

/**
 * Fixed-timestep loop ("fix your timestep"): simulation is deterministic and independent
 * of monitor refresh rate; rendering interpolates. Time scaling (slow motion) is NOT done
 * here — it belongs to the game clock, so the step size stays stable.
 */
export class GameLoop {
  readonly stepSeconds: number;
  private readonly maxFrameSeconds: number;
  private readonly requestFrame: (cb: (timeMs: number) => void) => number;
  private readonly cancelFrame: (handle: number) => void;
  private accumulator = 0;
  private lastTimeMs: number | null = null;
  private handle: number | null = null;
  private running = false;

  /** Simulation steps run during the last frame (debug). */
  lastFrameSteps = 0;

  constructor(
    private readonly callbacks: LoopCallbacks,
    options: LoopOptions = {},
  ) {
    this.stepSeconds = options.stepSeconds ?? 1 / 60;
    this.maxFrameSeconds = options.maxFrameSeconds ?? 0.25;
    this.requestFrame = options.requestFrame ?? ((cb) => requestAnimationFrame(cb));
    this.cancelFrame = options.cancelFrame ?? ((h) => cancelAnimationFrame(h));
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.lastTimeMs = null;
    this.handle = this.requestFrame(this.onFrame);
  }

  stop(): void {
    this.running = false;
    if (this.handle !== null) this.cancelFrame(this.handle);
    this.handle = null;
  }

  get isRunning(): boolean {
    return this.running;
  }

  /** Advances by `frameSeconds` of real time. Public so tests can drive the loop without rAF. */
  advance(frameSeconds: number): void {
    const frame = Math.min(Math.max(frameSeconds, 0), this.maxFrameSeconds);
    this.accumulator += frame;
    let steps = 0;
    while (this.accumulator >= this.stepSeconds) {
      this.callbacks.update(this.stepSeconds);
      this.accumulator -= this.stepSeconds;
      steps++;
    }
    this.lastFrameSteps = steps;
    this.callbacks.render(this.accumulator / this.stepSeconds, frame);
  }

  private onFrame = (timeMs: number): void => {
    if (!this.running) return;
    const frameSeconds = this.lastTimeMs === null ? 0 : (timeMs - this.lastTimeMs) / 1000;
    this.lastTimeMs = timeMs;
    this.advance(frameSeconds);
    if (this.running) this.handle = this.requestFrame(this.onFrame);
  };
}
