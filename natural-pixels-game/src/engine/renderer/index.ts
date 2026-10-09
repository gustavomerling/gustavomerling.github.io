import type { Grid } from '../grid.ts'
import { Canvas2DRenderer } from './canvas2d.ts'
import type { RenderMode, Renderer } from './types.ts'
import { WebGLRenderer } from './webgl.ts'

export type { FrameInfo, RenderMode, Renderer, View } from './types.ts'

/**
 * Creates the renderer for `mode`. Throws if smooth (WebGL2) isn't available: a canvas that
 * tried WebGL can't switch to 2D, so the caller retries on a fresh canvas in pixel mode.
 */
export function createRenderer(canvas: HTMLCanvasElement, grid: Grid, mode: RenderMode): Renderer {
  return mode === 'smooth' ? new WebGLRenderer(canvas, grid) : new Canvas2DRenderer(canvas, grid)
}
