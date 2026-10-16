/**
 * Pixel-art sprites authored as text: each character is one pixel, looked up in `palette`.
 * '.' (or any char missing from the palette) is transparent.
 *
 *   frames: [[
 *     '..kk..',
 *     '.kggk.',
 *   ]]
 */
export interface SpriteDef {
  palette: Record<string, string>
  frames: string[][]
  /** animation speed in frames per second (default 4) */
  fps?: number
  /** game units per sprite pixel (default 2) */
  pixel?: number
  /** mirror horizontally when moving left; sprites are drawn facing right (default true) */
  flip?: boolean
}

export function defineSprite(def: SpriteDef): SpriteDef {
  const width = def.frames[0]?.[0]?.length ?? 0
  def.frames.forEach((frame, f) => {
    if (frame.length !== def.frames[0].length) console.warn(`sprite frame ${f}: ${frame.length} rows, expected ${def.frames[0].length}`)
    frame.forEach((row, y) => {
      if (row.length !== width) console.warn(`sprite frame ${f} row ${y}: width ${row.length}, expected ${width}: "${row}"`)
    })
  })
  return def
}

export function spriteSize(def: SpriteDef): { width: number; height: number; pixel: number } {
  return { width: def.frames[0][0].length, height: def.frames[0].length, pixel: def.pixel ?? 2 }
}

/** Frame index for a moment in time; `seed` desyncs identical enemies. */
export function spriteFrame(def: SpriteDef, time: number, seed = 0): number {
  return Math.floor(time * (def.fps ?? 4) + seed * 0.37) % def.frames.length
}

// ---------- rendering (1 canvas pixel per sprite pixel, cached) ----------

interface Baked {
  normal: HTMLCanvasElement[]
  white: HTMLCanvasElement[]
}

const cache = new WeakMap<SpriteDef, Baked>()

function bakeFrame(def: SpriteDef, rows: string[], forceColor?: string): HTMLCanvasElement {
  const c = document.createElement('canvas')
  c.width = rows[0].length
  c.height = rows.length
  const ctx = c.getContext('2d')!
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const color = def.palette[row[x]]
      if (!color || row[x] === '.') continue
      ctx.fillStyle = forceColor ?? color
      ctx.fillRect(x, y, 1, 1)
    }
  })
  return c
}

function baked(def: SpriteDef): Baked {
  let b = cache.get(def)
  if (!b) {
    b = {
      normal: def.frames.map((f) => bakeFrame(def, f)),
      white: def.frames.map((f) => bakeFrame(def, f, '#ffffff')),
    }
    cache.set(def, b)
  }
  return b
}

/** Draws centered on the current origin. */
export function drawSprite(
  ctx: CanvasRenderingContext2D,
  def: SpriteDef,
  frame: number,
  opts: { flipX?: boolean; flash?: boolean; scale?: number } = {},
) {
  const b = baked(def)
  const img = (opts.flash ? b.white : b.normal)[frame % def.frames.length]
  const px = (def.pixel ?? 2) * (opts.scale ?? 1)
  const w = img.width * px
  const h = img.height * px
  ctx.save()
  ctx.imageSmoothingEnabled = false
  if (opts.flipX) ctx.scale(-1, 1)
  ctx.drawImage(img, -w / 2, -h / 2, w, h)
  ctx.restore()
}
