import { ELEMENTS } from '../../elements/registry.ts'
import type { Grid } from '../grid.ts'
import { CellColors } from './cellColors.ts'
import { ambientLight, skyColor } from './sky.ts'
import type { FrameInfo, Renderer } from './types.ts'

/**
 * "Pixel" renderer: one pixel per cell at grid resolution, drawn crisp (CSS pixelated).
 * Also the fallback when WebGL2 isn't available. Composites cells over the sky on the CPU.
 */
export class Canvas2DRenderer implements Renderer {
  readonly mode = 'pixel'
  private readonly grid: Grid
  private readonly ctx: CanvasRenderingContext2D
  private readonly image: ImageData
  private readonly pixels: Uint32Array
  private readonly colors: Uint32Array
  private readonly cellColors: CellColors
  /** How much each element glows by itself (fire, lava, lamps): night doesn't darken that part. */
  private readonly emissive = Float32Array.from(ELEMENTS, (el) => (el.matter === 'energy' ? 1 : (el.color.emissive ?? 0)))

  constructor(canvas: HTMLCanvasElement, grid: Grid) {
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas 2D is not supported')
    canvas.width = grid.width
    canvas.height = grid.height
    this.grid = grid
    this.ctx = ctx
    this.image = ctx.createImageData(grid.width, grid.height)
    this.pixels = new Uint32Array(this.image.data.buffer)
    this.colors = new Uint32Array(grid.size)
    this.cellColors = new CellColors(grid)
  }

  render({ light }: FrameInfo) {
    const { width, height, type } = this.grid
    const { pixels, colors, emissive } = this
    this.cellColors.fill(colors)
    const ambient = ambientLight(light)

    for (let y = 0; y < height; y++) {
      const [sr, sg, sb] = skyColor(y / (height - 1), light)
      const row = y * width
      for (let x = 0; x < width; x++) {
        const i = row + x
        const c = colors[i]
        const a = c >>> 24
        if (a === 0) {
          pixels[i] = (0xff000000 | (sb << 16) | (sg << 8) | sr) >>> 0
          continue
        }
        const lit = ambient + (1 - ambient) * emissive[type[i]]
        const k = a / 255
        const r = (c & 0xff) * lit * k + sr * (1 - k)
        const g = ((c >>> 8) & 0xff) * lit * k + sg * (1 - k)
        const b = ((c >>> 16) & 0xff) * lit * k + sb * (1 - k)
        pixels[i] = (0xff000000 | (Math.round(b) << 16) | (Math.round(g) << 8) | Math.round(r)) >>> 0
      }
    }
    this.ctx.putImageData(this.image, 0, 0)
  }

  resize() {
    // Fixed grid resolution; CSS scales it.
  }

  destroy() {}
}
