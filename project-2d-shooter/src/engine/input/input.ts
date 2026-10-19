import type { Vec2 } from '../math/vec2';

/** A physical input that can trigger an action. Keys use `KeyboardEvent.code` (layout independent). */
export type Binding =
  | { device: 'key'; code: string }
  | { device: 'mouse'; button: number }
  | { device: 'wheel'; direction: 'up' | 'down' };

export type Bindings<A extends string> = Record<A, readonly Binding[]>;

/** One tick of latched input, as recorded for replays. */
export interface InputFrame {
  down: string[];
  pressed: string[];
  released: string[];
  wheel: number;
  px: number;
  py: number;
  inside: boolean;
}

export const key = (code: string): Binding => ({ device: 'key', code });
export const mouse = (button: number): Binding => ({ device: 'mouse', button });
export const wheel = (direction: 'up' | 'down'): Binding => ({ device: 'wheel', direction });

const bindingId = (b: Binding): string =>
  b.device === 'key' ? b.code : b.device === 'mouse' ? `Mouse${b.button}` : b.direction === 'up' ? 'WheelUp' : 'WheelDown';

/**
 * Action-based input. Raw DOM events are buffered and latched once per simulation tick
 * (`beginTick`), so a quick tap between two ticks is never lost and an edge (`pressed`)
 * is seen by exactly one tick regardless of frame rate.
 */
export class Input<A extends string> {
  /** Pointer position in virtual (game-pixel) coordinates. */
  readonly pointer: Vec2 = { x: 0, y: 0 };
  pointerInside = false;
  /** Net wheel notches this tick: positive = down, negative = up. */
  wheelSteps = 0;

  private down = new Set<string>();
  private rawPressed = new Set<string>();
  private rawReleased = new Set<string>();
  private rawWheel = 0;
  private tickPressed = new Set<string>();
  private tickReleased = new Set<string>();
  private boundCodes = new Set<string>();
  private detachFn: (() => void) | null = null;

  constructor(private bindings: Bindings<A>) {
    this.indexBindings();
  }

  setBindings(bindings: Bindings<A>): void {
    this.bindings = bindings;
    this.indexBindings();
  }

  getBindings(): Bindings<A> {
    return this.bindings;
  }

  /**
   * Starts listening. Keyboard is global (window); mouse is relative to `surface`.
   * `toVirtual` converts client coordinates to game pixels.
   */
  attach(surface: HTMLElement, toVirtual: (clientX: number, clientY: number) => Vec2): void {
    this.detach();
    const onKeyDown = (e: KeyboardEvent) => {
      // While playing, swallow browser shortcuts like Ctrl+S / Ctrl+D.
      if (this.boundCodes.has(e.code) || e.ctrlKey || e.code === 'Tab') e.preventDefault();
      if (e.repeat) return;
      this.press(e.code);
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (this.boundCodes.has(e.code)) e.preventDefault();
      this.release(e.code);
    };
    const onMouseDown = (e: MouseEvent) => {
      e.preventDefault();
      this.press(`Mouse${e.button}`);
    };
    const onMouseUp = (e: MouseEvent) => this.release(`Mouse${e.button}`);
    const onMove = (e: MouseEvent) => {
      const v = toVirtual(e.clientX, e.clientY);
      this.pointer.x = v.x;
      this.pointer.y = v.y;
      this.pointerInside = true;
    };
    const onLeave = () => {
      this.pointerInside = false;
    };
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (e.deltaY !== 0) this.rawWheel += Math.sign(e.deltaY);
    };
    const onContextMenu = (e: Event) => e.preventDefault();
    // Losing focus while holding keys would leave them "stuck" down.
    const onBlur = () => this.releaseAll();

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('blur', onBlur);
    surface.addEventListener('mousedown', onMouseDown);
    surface.addEventListener('mousemove', onMove);
    surface.addEventListener('mouseleave', onLeave);
    surface.addEventListener('wheel', onWheel, { passive: false });
    surface.addEventListener('contextmenu', onContextMenu);

    this.detachFn = () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('blur', onBlur);
      surface.removeEventListener('mousedown', onMouseDown);
      surface.removeEventListener('mousemove', onMove);
      surface.removeEventListener('mouseleave', onLeave);
      surface.removeEventListener('wheel', onWheel);
      surface.removeEventListener('contextmenu', onContextMenu);
    };
  }

  detach(): void {
    this.detachFn?.();
    this.detachFn = null;
    this.releaseAll();
  }

  /** Latches buffered events for the coming simulation tick. Call once at the start of every tick. */
  beginTick(): void {
    [this.tickPressed, this.rawPressed] = [this.rawPressed, this.tickPressed];
    [this.tickReleased, this.rawReleased] = [this.rawReleased, this.tickReleased];
    this.rawPressed.clear();
    this.rawReleased.clear();
    this.wheelSteps = this.rawWheel;
    this.rawWheel = 0;
    if (this.wheelSteps < 0) this.tickPressed.add('WheelUp');
    if (this.wheelSteps > 0) this.tickPressed.add('WheelDown');
  }

  /** Held now, or tapped since the last tick. */
  isDown(action: A): boolean {
    return this.bindings[action].some((b) => {
      const id = bindingId(b);
      return this.down.has(id) || this.tickPressed.has(id);
    });
  }

  /** Went down this tick. */
  pressed(action: A): boolean {
    return this.bindings[action].some((b) => this.tickPressed.has(bindingId(b)));
  }

  /** Went up this tick. */
  released(action: A): boolean {
    return this.bindings[action].some((b) => this.tickReleased.has(bindingId(b)));
  }

  releaseAll(): void {
    for (const id of this.down) this.rawReleased.add(id);
    this.down.clear();
  }

  /** Snapshot of this tick's latched state (for recording/replay). Call after `beginTick`. */
  capture(): InputFrame {
    return {
      down: [...this.down],
      pressed: [...this.tickPressed],
      released: [...this.tickReleased],
      wheel: this.wheelSteps,
      px: this.pointer.x,
      py: this.pointer.y,
      inside: this.pointerInside,
    };
  }

  /** Replaces this tick's state with a recorded one (replay). Call after `beginTick`. */
  inject(frame: InputFrame): void {
    this.down = new Set(frame.down);
    this.tickPressed = new Set(frame.pressed);
    this.tickReleased = new Set(frame.released);
    this.wheelSteps = frame.wheel;
    this.pointer.x = frame.px;
    this.pointer.y = frame.py;
    this.pointerInside = frame.inside;
  }

  /** Test/automation hook: simulate a raw press or release by binding id (e.g. "KeyW", "Mouse0"). */
  simulate(id: string, isDown: boolean): void {
    if (isDown) this.press(id);
    else this.release(id);
  }

  private press(id: string): void {
    if (this.down.has(id)) return;
    this.down.add(id);
    this.rawPressed.add(id);
  }

  private release(id: string): void {
    if (!this.down.delete(id)) return;
    this.rawReleased.add(id);
  }

  private indexBindings(): void {
    this.boundCodes.clear();
    for (const list of Object.values(this.bindings) as Binding[][]) {
      for (const b of list) if (b.device === 'key') this.boundCodes.add(b.code);
    }
  }
}
