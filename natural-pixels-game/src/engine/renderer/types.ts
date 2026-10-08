/** `smooth` = WebGL2 shader look; `pixel` = crisp Canvas 2D pixels (also the fallback). */
export type RenderMode = 'smooth' | 'pixel'

/** Per-frame lighting and animation inputs shared by every renderer. */
export interface FrameInfo {
  /** Seconds, for animation (ripples, flicker, twinkling). */
  time: number
  /** Daylight 0 (night) .. 1 (noon). */
  light: number
  /** Sun (by day) or moon (by night) position in 0..1 screen coordinates, y down. */
  sun: { x: number; y: number }
  /** Rain clouds darkening the sky and the world, 0..1. */
  overcast: number
  /** Lightning flash 0..1. */
  flash: number
  /** Rainbow after the rain, 0..1. */
  rainbow: number
}

export interface Renderer {
  readonly mode: RenderMode
  render(frame: FrameInfo): void
  /** Displayed size of the canvas in CSS pixels. */
  resize(cssWidth: number, cssHeight: number): void
  destroy(): void
}
