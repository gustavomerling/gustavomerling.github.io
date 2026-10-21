import { EventBus } from '@engine/core/events';
import { GameLoop } from '@engine/core/loop';
import { SceneManager } from '@engine/core/scene';
import { Input, type InputFrame } from '@engine/input/input';
import { randomSeedString } from '@engine/math/rng';
import { Renderer } from '@engine/render/renderer';
import { BIOME_ORDER } from './content/biomes/catalog';
import { VIEW } from './config';
import type { GameEvents } from './events';
import { DEFAULT_BINDINGS, type Action } from './input/actions';
import { RunScene } from './scenes/RunScene';

export interface SessionOptions {
  seed?: string;
  debug?: boolean;
}

/**
 * The single object React talks to. Owns the canvas renderer, input, loop and scenes;
 * reports to the UI through `bus`. Create on mount, `dispose()` on unmount.
 */
export class GameSession {
  readonly bus = new EventBus<GameEvents>();
  readonly seed: string;
  private readonly renderer: Renderer;
  private readonly input = new Input<Action>(DEFAULT_BINDINGS);
  private readonly scenes = new SceneManager();
  private readonly loop: GameLoop;
  private readonly frameStats = { fps: 0, steps: 0 };
  private fpsFrames = 0;
  private fpsTime = 0;
  private biomeIndex = 0;
  private paused = false;
  private disposed = false;
  /** Input of the current attempt, one frame per simulation step (for F10 replays). */
  private recording: InputFrame[] = [];
  private replay: { frames: InputFrame[]; next: number } | null = null;
  private pendingReplay = false;

  constructor(
    canvas: HTMLCanvasElement,
    private readonly options: SessionOptions = {},
  ) {
    this.seed = options.seed ?? randomSeedString();
    this.renderer = new Renderer(canvas, VIEW.height, VIEW.width);
    this.input.attach(canvas, (x, y) => this.renderer.clientToVirtual(x, y));
    this.loop = new GameLoop({
      update: (dt) => {
        if (this.paused) return;
        if (this.pendingReplay) this.startReplay();
        this.input.beginTick();
        if (this.replay) {
          const frame = this.replay.frames[this.replay.next++];
          if (frame) {
            this.input.inject(frame);
          } else {
            // Replay over: hand control back to the live input.
            this.replay = null;
            this.input.releaseAll();
            this.bus.emit('replay', false);
          }
        }
        this.recording.push(this.input.capture());
        this.scenes.update(dt);
      },
      render: (alpha, frameSeconds) => {
        this.trackFps(frameSeconds);
        this.scenes.render(this.paused ? 1 : alpha);
      },
    });
    this.enterBiome(0);
  }

  start(): void {
    this.loop.start();
  }

  get isPaused(): boolean {
    return this.paused;
  }

  pause(): void {
    this.paused = true;
    this.input.releaseAll();
  }

  resume(): void {
    // Drop anything pressed while the pause menu was open (e.g. the Esc that closed it).
    this.input.releaseAll();
    this.input.beginTick();
    this.paused = false;
  }

  /** Restart from the first scenario with the same seed (same layout, enemies back). */
  restart(): void {
    this.replay = null;
    this.enterBiome(0);
    this.resume();
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.loop.stop();
    this.scenes.clear();
    this.input.detach();
    this.renderer.dispose();
    this.bus.clear();
  }

  /**
   * Re-plays the current attempt from its start: same seed, same recorded input per step.
   * The simulation is deterministic, so it reproduces exactly what happened (bug hunting).
   */
  private startReplay(): void {
    this.pendingReplay = false;
    // Drop the step that pressed F10 itself.
    const frames = this.recording.slice(0, -1);
    this.enterBiome(this.biomeIndex);
    this.replay = { frames, next: 0 };
    this.bus.emit('replay', true);
  }

  private enterBiome(index: number): void {
    this.biomeIndex = index;
    this.recording = [];
    const previous = this.scenes.current;
    const debug = previous instanceof RunScene ? previous.debugOverlay : (this.options.debug ?? false);
    const grid = previous instanceof RunScene ? previous.gridVisible : true;
    this.scenes.switchTo(
      new RunScene({
        renderer: this.renderer,
        input: this.input,
        bus: this.bus,
        seed: this.seed,
        biomeId: BIOME_ORDER[index % BIOME_ORDER.length]!,
        frameStats: this.frameStats,
        debugOverlay: debug,
        grid,
        // Defer the switch: we're inside the scene's update.
        onExit: () => queueMicrotask(() => !this.disposed && this.enterBiome(this.biomeIndex + 1)),
        onReplay: () => {
          this.pendingReplay = true;
        },
      }),
    );
  }

  private trackFps(frameSeconds: number): void {
    this.fpsFrames++;
    this.fpsTime += frameSeconds;
    this.frameStats.steps = this.loop.lastFrameSteps;
    if (this.fpsTime >= 0.5) {
      this.frameStats.fps = Math.round(this.fpsFrames / this.fpsTime);
      this.fpsFrames = 0;
      this.fpsTime = 0;
    }
  }
}
