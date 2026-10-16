import type { World } from './World'

/**
 * Pointer + keyboard input, converted to arena coordinates.
 * The game pointer chases `target`; keyboard (WASD/arrows) overrides with a direction.
 */
export class Input {
  target: { x: number; y: number } | null = null
  private keys = new Set<string>()
  private readonly cleanup: (() => void)[] = []
  private readonly canvas: HTMLCanvasElement

  constructor(canvas: HTMLCanvasElement, world: World) {
    this.canvas = canvas
    const onPointer = (ev: PointerEvent) => {
      // touch only steers while a finger is down; mouse steers on hover
      if (ev.pointerType !== 'mouse' && ev.buttons === 0 && ev.type === 'pointermove') return
      const r = this.canvas.getBoundingClientRect()
      this.target = {
        x: ((ev.clientX - r.left) / r.width) * world.width,
        y: ((ev.clientY - r.top) / r.height) * world.height,
      }
    }
    const onUp = (ev: PointerEvent) => {
      if (ev.pointerType !== 'mouse') this.target = null
    }
    const onKeyDown = (ev: KeyboardEvent) => {
      this.keys.add(ev.key.toLowerCase())
      if (ev.key.startsWith('Arrow')) ev.preventDefault()
    }
    const onKeyUp = (ev: KeyboardEvent) => this.keys.delete(ev.key.toLowerCase())
    const onBlur = () => this.keys.clear()

    canvas.addEventListener('pointermove', onPointer)
    canvas.addEventListener('pointerdown', onPointer)
    canvas.addEventListener('pointerup', onUp)
    canvas.addEventListener('pointercancel', onUp)
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    window.addEventListener('blur', onBlur)
    this.cleanup.push(() => {
      canvas.removeEventListener('pointermove', onPointer)
      canvas.removeEventListener('pointerdown', onPointer)
      canvas.removeEventListener('pointerup', onUp)
      canvas.removeEventListener('pointercancel', onUp)
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      window.removeEventListener('blur', onBlur)
    })
  }

  /** Keyboard direction, or null when no movement key is held. */
  keyDirection(): { x: number; y: number } | null {
    const k = this.keys
    const x = (k.has('d') || k.has('arrowright') ? 1 : 0) - (k.has('a') || k.has('arrowleft') ? 1 : 0)
    const y = (k.has('s') || k.has('arrowdown') ? 1 : 0) - (k.has('w') || k.has('arrowup') ? 1 : 0)
    if (x === 0 && y === 0) return null
    const len = Math.hypot(x, y)
    return { x: x / len, y: y / len }
  }

  dispose() {
    for (const fn of this.cleanup) fn()
  }
}
