import { ELEMENTS } from '../../elements/registry.ts'
import type { ElementColor } from '../../elements/types.ts'
import type { Grid } from '../grid.ts'

const SHADES = 16
/** Moisture steps blended between `color.base` and `color.wet`. */
const WET_LEVELS = 4
const COLORS_PER_ELEMENT = SHADES * WET_LEVELS
/** Solids, powders and liquids start glowing red-hot above this temperature (°C)... */
const GLOW_START = 350
/** ...and reach full glow this many degrees later. */
const GLOW_RANGE = 650

/**
 * Turns the grid into one packed RGBA color per cell (0xAABBGGRR, little-endian):
 * element color with per-cell shade, wetness and red-hot glow. Air is transparent.
 * Shared by every renderer.
 */
export class CellColors {
  private readonly grid: Grid
  /** Packed colors: palette[type * COLORS_PER_ELEMENT + wetLevel * SHADES + shade]. */
  private readonly palette = buildPalette()
  /** Per element: multiplier from moisture units to wet level. */
  private readonly wetScale = Float32Array.from(ELEMENTS, (el) =>
    el.color.wet && el.moisture ? WET_LEVELS / (el.moisture.capacity + 1) : 0,
  )
  private readonly glows = Uint8Array.from(ELEMENTS, (el) =>
    el.matter === 'static' || el.matter === 'powder' || el.matter === 'liquid' ? 1 : 0,
  )

  constructor(grid: Grid) {
    this.grid = grid
  }

  fill(out: Uint32Array) {
    const { type, shade, water, temp, size } = this.grid
    const { palette, wetScale, glows } = this
    for (let i = 0; i < size; i++) {
      const t = type[i]
      const wet = (water[i] * wetScale[t]) | 0
      const color = palette[t * COLORS_PER_ELEMENT + wet * SHADES + (shade[i] >> 4)]
      const heat = temp[i]
      out[i] = heat > GLOW_START && glows[t] ? glow(color, Math.min(1, (heat - GLOW_START) / GLOW_RANGE)) : color
    }
  }
}

/** Blends a packed color towards red-hot orange by `amount` (0..1). */
function glow(color: number, amount: number): number {
  const k = amount * 0.85
  const r = color & 0xff
  const g = (color >>> 8) & 0xff
  const b = (color >>> 16) & 0xff
  const a = color >>> 24
  const nr = Math.round(r + (255 - r) * k)
  const ng = Math.round(g + (96 - g) * k)
  const nb = Math.round(b + (32 - b) * k)
  const na = Math.max(a, Math.round(255 * amount))
  return ((na << 24) | (nb << 16) | (ng << 8) | nr) >>> 0
}

function buildPalette(): Uint32Array {
  const palette = new Uint32Array(ELEMENTS.length * COLORS_PER_ELEMENT)
  ELEMENTS.forEach((el, t) => {
    for (let w = 0; w < WET_LEVELS; w++) {
      for (let s = 0; s < SHADES; s++) {
        palette[t * COLORS_PER_ELEMENT + w * SHADES + s] = shadeColor(el.color, w / (WET_LEVELS - 1), s / (SHADES - 1))
      }
    }
  })
  return palette
}

/** Packs a color for a little-endian Uint32 view over RGBA bytes (0xAABBGGRR). */
function shadeColor({ base, wet, variation = 0, alpha = 1 }: ElementColor, wetness: number, shade: number): number {
  const factor = 1 + (shade - 0.5) * 2 * variation
  const channel = (offset: number) => {
    const dry = parseInt(base.slice(offset, offset + 2), 16)
    const soaked = wet ? parseInt(wet.slice(offset, offset + 2), 16) : dry
    const value = dry + (soaked - dry) * wetness
    return Math.max(0, Math.min(255, Math.round(value * factor)))
  }
  const a = Math.round(alpha * 255)
  return ((a << 24) | (channel(5) << 16) | (channel(3) << 8) | channel(1)) >>> 0
}
