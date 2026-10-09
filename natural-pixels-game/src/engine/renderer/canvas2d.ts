import { ELEMENTS } from '../../elements/registry.ts'
import type { Grid } from '../grid.ts'
import { CellColors } from './cellColors.ts'
import { HILLS, ridgeAt, ridgeNoise, SNOW_DEPTH, SNOW_LINE } from './horizon.ts'
import { LightMap } from './lighting.ts'
import { ambientLight, skyColor } from './sky.ts'
import type { FrameInfo, Renderer } from './types.ts'

/** Snow on the far peaks (0..1 RGB). */
const SNOW = [0.96, 0.97, 1]

/** The light map is worked out every this many frames. */
const LIGHT_EVERY = 3

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
  private readonly lightMap: LightMap
  private frames = 0
  private viewKey = ''
  /** Per hill layer: its ridge row and noise in every column (the hills never change). */
  private readonly ridges: { top: Float32Array; peak: Float32Array }[]
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
    this.lightMap = new LightMap(grid)
    this.ridges = HILLS.map((layer) => {
      const top = new Float32Array(grid.width)
      const peak = new Float32Array(grid.width)
      for (let x = 0; x < grid.width; x++) {
        const u = (x + 0.5) / grid.width
        top[x] = ridgeAt(layer, u) * grid.height
        peak[x] = ridgeNoise(layer, u)
      }
      return { top, peak }
    })
  }

  /** The sky at (x, y) with the hills in front of it, into `bg` (0..255 RGB; no allocation per pixel). */
  private readonly bg = new Float32Array(3)
  private background(x: number, y: number, sky: readonly number[], light: number) {
    const { bg } = this
    bg[0] = sky[0]
    bg[1] = sky[1]
    bg[2] = sky[2]
    const dim = 0.35 + 0.65 * light
    for (let k = 0; k < HILLS.length; k++) {
      const layer = HILLS[k]
      const { top, peak } = this.ridges[k]
      if (y < top[x]) continue
      const snowy = layer.snow && peak[x] > SNOW_LINE && y < top[x] + SNOW_DEPTH * this.grid.height
      const keep = layer.haze
      for (let ch = 0; ch < 3; ch++) bg[ch] = (snowy ? SNOW[ch] : layer.color[ch]) * 255 * dim * (1 - keep) + bg[ch] * keep
    }
  }

  render({ light, sun, overcast, flash, lighting, view }: FrameInfo) {
    this.applyView(view)
    const { width, height, type } = this.grid
    const { pixels, colors, emissive } = this
    this.cellColors.fill(colors)
    const ambient = ambientLight(light, overcast, flash)
    // (Light changes slowly: worked out every few frames.)
    if (this.frames++ % LIGHT_EVERY === 0) {
      if (lighting) this.lightMap.update(sun.x)
      else this.lightMap.flat()
    }
    const map = this.lightMap.texels

    for (let y = 0; y < height; y++) {
      const skyRow = skyColor(y / (height - 1), light, overcast, flash)
      const row = y * width
      for (let x = 0; x < width; x++) {
        const i = row + x
        const c = colors[i]
        const a = c >>> 24
        this.background(x, y, skyRow, light)
        const sr = this.bg[0]
        const sg = this.bg[1]
        const sb = this.bg[2]
        // Skylight and glow reaching this cell (see lighting.ts).
        const skyLit = map[i * 4] / 255
        const glow = map[i * 4 + 1] / 255
        if (a === 0) {
          // The sky only shows where daylight gets to; caves are dark behind.
          // (Under a tree's crown, a light dark veil: 20% black.)
          const k = Math.min(1, skyLit / 0.45) * (1 - 0.2 * (map[i * 4 + 2] / 255))
          const warm = glow * 40
          pixels[i] = (0xff000000 | (Math.round(sb * k + 9 * (1 - k) + warm * 0.4) << 16) | (Math.round(sg * k + 8 * (1 - k) + warm * 0.75) << 8) | Math.min(255, Math.round(sr * k + 9 * (1 - k) + warm))) >>> 0
          continue
        }
        const world = Math.min(1, Math.max(0.13, skyLit * ambient + glow))
        const lit = world + (1 - Math.min(1, world)) * emissive[type[i]]
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

  /** Zoomed in: the canvas (crisp pixels) is scaled up and shifted so the view fills the frame. */
  private applyView({ x, y, zoom }: FrameInfo['view']) {
    const key = `${x},${y},${zoom}`
    if (key === this.viewKey) return
    this.viewKey = key
    const { style } = this.ctx.canvas
    style.transformOrigin = '0 0'
    style.transform = zoom === 1 ? '' : `scale(${zoom}) translate(${-x * 100}%, ${-y * 100}%)`
  }

  destroy() {}
}
