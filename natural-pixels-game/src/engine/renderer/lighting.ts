import { ELEMENTS } from '../../elements/registry.ts'
import type { Grid } from '../grid.ts'

/*
 * Light and shadow, Terraria-style, worked out on the CPU every frame or two and handed to the
 * renderers as a light map (one RGBA texel per cell: r = skylight, g = light from glowing things,
 * b = tree shade, 0 = none .. 255 = fully shaded: the air under a crown is veiled with it).
 *
 *   - Skylight fans out from the sun (or the moon): straight down right under it, slanting more
 *     the further a column is from it (see SLANT), so shadows fall away from the sun on both
 *     sides and grow long when it's low: through air untouched, dimmed by water (deeper
 *     is darker), and fading over ~13 cells into the ground. Then it spreads a little sideways
 *     and around corners, lighting cave mouths and the top of shafts. Trees cast an even, soft
 *     shade under the whole width of their crown (LEAF_SHADE, applied after the spreading so the
 *     open air around doesn't wash it out).
 *   - Glowing things (torches, campfires, lamps, lava, fire, glowing mushrooms, a human's torch...)
 *     light up the cells around them, fading over ~10 open cells or a couple of solid ones.
 *
 * The inside of the ground (and of mines) is dark unless something lights it: down a mine with
 * no torches you can barely see. The renderers turn the map into brightness (skylight follows
 * the time of day; glow doesn't) and darken the sky behind caves and galleries.
 */

/** How a cell lets light through. */
const OPEN = 0
/** Things people walk in front of (a mine's or a house's back wall, ladders, furniture): light gets through, a bit dimmed. */
const INSIDE = 1
const LEAFY = 2
const LIQUID = 3
const SOLID = 4
/** People, monsters and boats: light gets past them as through the air, but they cast a shadow (see CASTER_SHADE). */
const CASTER = 5

/** Skylight lost going straight down through one cell of each kind (leaves: see LEAF_SHADE). */
const SKY_COST = [0, 0.07, 0, 0.06, 0.075, 0]
/** Light lost spreading sideways (or around) through one cell of each kind: skylight, then glow. */
const SKY_SPREAD = [0.15, 0.15, 0.15, 0.12, 0.08, 0.15]
const GLOW_SPREAD = [0.09, 0.1, 0.13, 0.12, 0.4, 0.09]

/** Back walls and the like: you see what's lit behind them, so light passes. */
const INSIDE_IDS = new Set([
  'mine_wall',
  'mine_post',
  'backwall',
  'back_window',
  'ladder',
  'torch',
  'door',
  'fence',
  'bed',
  'lamp',
  'painting',
  'table',
  'chair',
  'bookshelf',
  'flowerpot',
  'glass',
  'furnace',
  'furnace_fire',
  'workbench',
  'anvil',
  'statue',
  'gold_statue',
  'tiki_pole',
  'campfire',
  'bench',
  'scarecrow',
])
const LEAFY_IDS = new Set(['leaf', 'fruit', 'wood', 'beehive'])
/** Underwater plants: light goes through them as through the water around. */
const WATERY_IDS = new Set(['seaweed'])
/** Solid ground and building material: light stops a few cells in. */
const SOLID_IDS = new Set(['plank', 'metal', 'ice', 'gunpowder'])
/** They cast a shadow like a tree's (on the ground, the water, the air beside them), never on themselves. */
const CASTER_IDS = new Set([
  'human',
  'human_body',
  'human_torch',
  'human_head',
  'zombie',
  'zombie_body',
  'zombie_head',
  'skeleton',
  'skeleton_body',
  'skeleton_head',
  'boat',
])
const CASTER_SHADE = 0.75
/** How far sideways skylight travels per row down: SLANT × the column's distance from the sun (as a share of the world's width), at most MAX_SLANT. */
const MAX_SLANT = 0.6
const SLANT = 1.2

/** Everything under a tree's crown (leaves, fruit, trunk) gets this much of the skylight. */
const LEAF_SHADE = 0.75
/** Windows let the daylight in: the room behind gets some. */
const WINDOW_IDS = new Set(['back_window', 'glass'])
const WINDOW_LIGHT = 0.8
/** Small glowing things light up less around them than their own glow suggests. */
const GLOW_SCALE: Record<string, number> = { firefly: 0.35, human_torch: 1, gold_ore: 0.3, amethyst: 0.6 }

function kindOf(id: string, matter: string, category: string): number {
  if (CASTER_IDS.has(id)) return CASTER
  if (INSIDE_IDS.has(id)) return INSIDE
  if (LEAFY_IDS.has(id)) return LEAFY
  if (matter === 'liquid' || WATERY_IDS.has(id)) return LIQUID
  if (category === 'terrain' || SOLID_IDS.has(id)) return SOLID
  return OPEN
}

export class LightMap {
  private readonly grid: Grid
  private readonly sky: Float32Array
  private readonly glow: Float32Array
  /** How each cell lets light through, this update (see OPEN..SOLID). */
  private readonly cells: Uint8Array
  /** Tree shade per cell (1 = none). */
  private readonly shade: Float32Array
  /** Scratch rows for the slanting skylight (the row above, and this one). */
  private readonly rowA: Float32Array
  private readonly rowB: Float32Array
  private readonly rowC: Float32Array
  private readonly rowD: Float32Array
  private readonly rowE: Float32Array
  private readonly rowF: Float32Array
  /** Per column, this update: the cell above that its skylight comes from, and how far towards the next. */
  private readonly from: Int32Array
  private readonly blend: Float32Array
  /** The map to draw with: per cell r = skylight, g = glow, b = tree shade, 0..255. */
  readonly texels: Uint8Array
  private readonly kind = Uint8Array.from(ELEMENTS, (el) => kindOf(el.id, el.matter, el.category))
  private readonly emit = Float32Array.from(ELEMENTS, (el) => {
    const glow = el.matter === 'energy' ? 1 : (el.color.emissive ?? 0)
    return Math.min(1, glow * (GLOW_SCALE[el.id] ?? 1))
  })
  private readonly window = Uint8Array.from(ELEMENTS, (el) => (WINDOW_IDS.has(el.id) ? 1 : 0))

  constructor(grid: Grid) {
    this.grid = grid
    this.sky = new Float32Array(grid.size)
    this.glow = new Float32Array(grid.size)
    this.cells = new Uint8Array(grid.size)
    this.shade = new Float32Array(grid.size)
    this.rowA = new Float32Array(grid.width)
    this.rowB = new Float32Array(grid.width)
    this.rowC = new Float32Array(grid.width)
    this.rowD = new Float32Array(grid.width)
    this.rowE = new Float32Array(grid.width)
    this.rowF = new Float32Array(grid.width)
    this.from = new Int32Array(grid.width)
    this.blend = new Float32Array(grid.width)
    this.texels = new Uint8Array(grid.size * 4)
  }

  /** Lighting off: everything in full daylight, nothing glowing (the old flat look). */
  flat() {
    const { texels } = this
    for (let o = 0; o < texels.length; o += 4) {
      texels[o] = 255
      texels[o + 1] = 0
      texels[o + 2] = 0
    }
  }

  /**
   * Works the map out again. `sunX` is where the sun (or moon) is across the sky, 0 (left) ..
   * 1 (right): the light comes down slanting away from it, so shadows fall the other way.
   */
  update(sunX = 0.5) {
    const { grid, sky, glow, cells, shade, kind, emit, window, texels } = this
    const { width, height, type } = grid
    for (let i = 0; i < cells.length; i++) cells[i] = kind[type[i]]

    // Skylight fanning out from the sun, row by row: each cell gets what came down to the cell
    // above it and a little towards the sun (blended between the two nearest, for soft edges).
    // Right under the sun it falls straight; the further a column is from it, the more it slants
    // (so with the sun up in the middle, shadows fall away from it on both sides).
    const { from, blend } = this
    for (let x = 0; x < width; x++) {
      const slant = Math.max(-MAX_SLANT, Math.min(MAX_SLANT, (x / width - sunX) * SLANT))
      const at = Math.floor(x - slant)
      // (Off the edge of the world: the edge column itself, never light out of nowhere.)
      from[x] = Math.max(0, Math.min(width - 2, at))
      blend[x] = at < 0 ? 0 : at > width - 2 ? 1 : x - slant - at
    }
    let lightAbove = this.rowA.fill(1)
    let shadeAbove = this.rowB.fill(1)
    let castAbove = this.rowE.fill(1)
    let lightHere = this.rowC
    let shadeHere = this.rowD
    let castHere = this.rowF
    for (let y = 0; y < height; y++) {
      for (let x = 0, i = y * width; x < width; x++, i++) {
        const x0 = from[x]
        const f = blend[x]
        const s = lightAbove[x0] * (1 - f) + lightAbove[x0 + 1] * f
        const shaded = shadeAbove[x0] * (1 - f) + shadeAbove[x0 + 1] * f
        const cast = castAbove[x0] * (1 - f) + castAbove[x0 + 1] * f
        const kind = cells[i]
        sky[i] = window[type[i]] ? Math.max(s, WINDOW_LIGHT) : s
        // Trees shade everything under them; people and boats shade everything but each other.
        shade[i] = kind === CASTER ? shaded : shaded * cast
        lightHere[x] = Math.max(0, s - SKY_COST[kind])
        shadeHere[x] = kind === LEAFY ? Math.min(shaded, LEAF_SHADE) : shaded
        castHere[x] = kind === CASTER ? Math.min(cast, CASTER_SHADE) : cast
      }
      ;[lightAbove, lightHere] = [lightHere, lightAbove]
      ;[shadeAbove, shadeHere] = [shadeHere, shadeAbove]
      ;[castAbove, castHere] = [castHere, castAbove]
    }
    for (let i = 0; i < sky.length; i++) glow[i] = emit[type[i]]

    // Then both spread around: sideways, down, up, and sideways again (around corners).
    for (const [field, cost] of [
      [sky, SKY_SPREAD],
      [glow, GLOW_SPREAD],
    ] as const) {
      this.spreadRows(field, cost)
      this.spreadColumns(field, cost)
      this.spreadRows(field, cost)
    }

    for (let i = 0, o = 0; i < sky.length; i++, o += 4) {
      texels[o] = (sky[i] * shade[i] * 255) | 0
      texels[o + 2] = (Math.min(1, (1 - shade[i]) * 4) * 255) | 0
      texels[o + 1] = (Math.min(1, glow[i]) * 255) | 0
    }
  }

  /** Light leaking left and right along every row. */
  private spreadRows(field: Float32Array, cost: readonly number[]) {
    const { width, height } = this.grid
    const { cells } = this
    for (let y = 0; y < height; y++) {
      const row = y * width
      for (let x = 1; x < width; x++) {
        const i = row + x
        const v = field[i - 1] - cost[cells[i]]
        if (v > field[i]) field[i] = v
      }
      for (let x = width - 2; x >= 0; x--) {
        const i = row + x
        const v = field[i + 1] - cost[cells[i]]
        if (v > field[i]) field[i] = v
      }
    }
  }

  /** Light leaking down and up every column. */
  private spreadColumns(field: Float32Array, cost: readonly number[]) {
    const { width, height } = this.grid
    const { cells } = this
    for (let y = 1; y < height; y++) {
      for (let x = 0, i = y * width; x < width; x++, i++) {
        const v = field[i - width] - cost[cells[i]]
        if (v > field[i]) field[i] = v
      }
    }
    for (let y = height - 2; y >= 0; y--) {
      for (let x = 0, i = y * width; x < width; x++, i++) {
        const v = field[i + width] - cost[cells[i]]
        if (v > field[i]) field[i] = v
      }
    }
  }
}
