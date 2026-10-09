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
  /** Rainbow after the rain, 0..1 (and whether there's a second one). */
  rainbow: number
  doubleRainbow: boolean
  /** Rare sky events, 0..1: the moon over the sun, an aurora, a meteor shower. */
  eclipse: number
  aurora: number
  meteors: number
  /** Light and shadow (renderer/lighting.ts) on; off = everything evenly lit. */
  lighting: boolean
  /** The camera: the part of the world on screen (see View). */
  view: View
}

/**
 * What part of the world is on screen: its top-left corner as a share of the world (0..1) and how
 * far it's zoomed in (1 = the whole world; 2 = half its width and height, twice as big).
 */
export interface View {
  x: number
  y: number
  zoom: number
}

export interface Renderer {
  readonly mode: RenderMode
  render(frame: FrameInfo): void
  /** Displayed size of the canvas in CSS pixels. */
  resize(cssWidth: number, cssHeight: number): void
  destroy(): void
}
