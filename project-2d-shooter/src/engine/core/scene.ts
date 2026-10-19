/** A self-contained game state (a run, a hub, a cutscene...). */
export interface Scene {
  readonly name: string;
  enter?(): void;
  exit?(): void;
  /** Fixed-step simulation; `realDt` is unscaled seconds. */
  update(realDt: number): void;
  /** `alpha` interpolates between the previous and the current simulation step. */
  render(alpha: number): void;
}

/** Stack of scenes: only the top one updates; push/pop is useful for overlays like a shop. */
export class SceneManager {
  private stack: Scene[] = [];

  get current(): Scene | undefined {
    return this.stack[this.stack.length - 1];
  }

  /** Replaces the whole stack. */
  switchTo(scene: Scene): void {
    while (this.stack.length > 0) this.stack.pop()?.exit?.();
    this.push(scene);
  }

  push(scene: Scene): void {
    this.stack.push(scene);
    scene.enter?.();
  }

  pop(): Scene | undefined {
    const scene = this.stack.pop();
    scene?.exit?.();
    return scene;
  }

  update(realDt: number): void {
    this.current?.update(realDt);
  }

  render(alpha: number): void {
    this.current?.render(alpha);
  }

  clear(): void {
    while (this.stack.length > 0) this.stack.pop()?.exit?.();
  }
}
