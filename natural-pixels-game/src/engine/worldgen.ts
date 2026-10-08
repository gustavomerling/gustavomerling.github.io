import { FRUIT_ATTACHED } from '../elements/plants/fruit.ts'
import { CROWN } from '../elements/plants/leaf.ts'
import { WOOD_TREE, trunkTop } from '../elements/plants/wood.ts'
import { EMPTY, elementIndex } from '../elements/registry.ts'
import type { Grid } from './grid.ts'
import type { Random } from './random.ts'

/*
 * Semi-random worlds: rolling soil over bedrock, stone hills and boulders, sandy lakes,
 * grassy meadows with flowers and rabbits, grown trees with fruit, and worms in the earth. Every call rolls a new
 * "style" (flat, hilly, mountainous; dry or wet) so worlds differ in character, not just
 * in detail.
 */

const SOIL = elementIndex('soil')
const SAND = elementIndex('sand')
const STONE = elementIndex('stone')
const WATER = elementIndex('water')
const GRASS = elementIndex('grass')
const WOOD = elementIndex('wood')
const LEAF = elementIndex('leaf')
const FRUIT = elementIndex('fruit')
const WORM = elementIndex('worm')
const FLOWER = elementIndex('flower')
const RABBIT = elementIndex('rabbit')

/** Moisture of freshly generated soil and trees (soil holds 200, wood 220). */
const SOIL_WATER = 90
const TREE_WATER = 160
/** Grass `data` for a blade's base (see grass.ts). */
const GRASS_BASE = 1

interface Style {
  /** Ground level as a share of the height (0 = top). */
  level: number
  /** Height of the hills as a share of the height. */
  hills: number
  /** How bumpy (number of hills across the map). */
  roughness: number
  /** Hilltops above this share of the hills become bare stone. */
  rockyAbove: number
  lakes: number
  trees: number
}

function rollStyle(random: Random): Style {
  const pick = <T,>(options: readonly T[]) => options[Math.floor(random() * options.length)]
  return {
    level: 0.45 + random() * 0.15,
    hills: pick([0.06, 0.12, 0.2, 0.28]),
    roughness: 2 + random() * 4,
    rockyAbove: 0.55 + random() * 0.35,
    lakes: pick([0, 1, 1, 2, 2, 3]),
    trees: pick([0.5, 1, 1, 1.5]),
  }
}

/** Smooth 1D value noise: `octaves` layers of random points with cosine interpolation, 0..1. */
function noise1d(width: number, features: number, random: Random, octaves = 3): Float32Array {
  const out = new Float32Array(width)
  let amplitude = 1
  let total = 0
  for (let o = 0; o < octaves; o++) {
    const points = Math.ceil(features * 2 ** o) + 2
    const values = Array.from({ length: points }, random)
    for (let x = 0; x < width; x++) {
      const t = (x / width) * (points - 2)
      const i = Math.floor(t)
      const f = (1 - Math.cos((t - i) * Math.PI)) / 2
      out[x] += (values[i] * (1 - f) + values[i + 1] * f) * amplitude
    }
    total += amplitude
    amplitude /= 2
  }
  for (let x = 0; x < width; x++) out[x] /= total
  return out
}

/** Replaces the whole grid with a freshly generated world. */
export function generateWorld(grid: Grid, random: Random) {
  const { width: W, height: H } = grid
  const style = rollStyle(random)
  const at = (x: number, y: number) => y * W + x
  const inside = (x: number, y: number) => x >= 0 && x < W && y >= 0 && y < H
  const typeAt = (x: number, y: number) => (inside(x, y) ? grid.type[at(x, y)] : -1)
  const put = (x: number, y: number, type: number, water = 0, data = 0) => {
    if (inside(x, y)) grid.place(at(x, y), type, water, data)
  }

  grid.clear()

  // ---------- Terrain: soil over stone, rocky hilltops ----------
  const shape = noise1d(W, style.roughness, random)
  const soilDepth = noise1d(W, 6, random, 2)
  const top = new Int32Array(W)
  for (let x = 0; x < W; x++) {
    const height = shape[x]
    top[x] = Math.round(H * (style.level + style.hills * (0.5 - height)))
    const rocky = height > style.rockyAbove
    const stoneFrom = rocky ? top[x] : top[x] + Math.round(H * (0.1 + soilDepth[x] * 0.18))
    for (let y = Math.max(0, top[x]); y < H; y++) {
      put(x, y, y >= stoneFrom ? STONE : SOIL, y >= stoneFrom ? 0 : SOIL_WATER)
    }
  }

  // ---------- Lakes: a sandy bowl filled up to its lower rim ----------
  const lakeSpans: [number, number][] = []
  for (let n = 0; n < style.lakes; n++) {
    const half = Math.round(W * (0.05 + random() * 0.08))
    const cx = half + 4 + Math.floor(random() * (W - 2 * half - 8))
    if (lakeSpans.some(([a, b]) => cx + half + 6 > a && cx - half - 6 < b)) continue
    const left = cx - half
    const right = cx + half
    const depth = Math.round(H * (0.05 + random() * 0.07))
    const rim = Math.max(top[left], top[right])

    for (let x = left - 3; x <= right + 3; x++) {
      if (x < 0 || x >= W) continue
      const d = (x - cx) / half
      const bottom = Math.abs(d) < 1 ? Math.max(top[x], rim + Math.round(depth * (1 - d * d))) : top[x]
      // Dig the bowl, then line it (and the shores) with sand so the water doesn't soak away.
      for (let y = top[x]; y < bottom; y++) put(x, y, EMPTY)
      for (let y = bottom; y < bottom + 4; y++) if (typeAt(x, y) === SOIL || typeAt(x, y) === STONE) put(x, y, SAND)
      for (let y = Math.max(rim, top[x]); y < bottom; y++) put(x, y, WATER)
      top[x] = Math.min(bottom, Math.max(rim, top[x]))
    }
    lakeSpans.push([left - 3, right + 3])
  }
  const nearLake = (x: number, margin: number) => lakeSpans.some(([a, b]) => x > a - margin && x < b + margin)

  // ---------- Sand patches and dunes away from the water ----------
  const sandiness = noise1d(W, 3, random, 2)
  for (let x = 0; x < W; x++) {
    if (sandiness[x] < 0.72 || nearLake(x, 0)) continue
    for (let y = top[x]; y < top[x] + 3 + Math.round((sandiness[x] - 0.72) * 30); y++) {
      if (typeAt(x, y) === SOIL) put(x, y, SAND)
    }
  }

  // ---------- Boulders resting on the ground ----------
  const boulders = Math.floor(random() * 4)
  for (let n = 0; n < boulders; n++) {
    const x0 = Math.floor(random() * (W - 6))
    if (nearLake(x0, 4)) continue
    const size = 2 + Math.floor(random() * 3)
    for (let dx = 0; dx < size + 1; dx++) {
      const x = x0 + dx
      const height = dx === 0 || dx === size ? size - 1 : size
      for (let k = 1; k <= height; k++) put(x, top[x] - k, STONE)
    }
  }

  // ---------- Trees, then grass in the meadows ----------
  const treeCount = Math.round((W / 40) * style.trees)
  const trunks: number[] = []
  for (let tries = 0; tries < treeCount * 6 && trunks.length < treeCount; tries++) {
    const x = 4 + Math.floor(random() * (W - 8))
    if (nearLake(x, 3) || trunks.some((t) => Math.abs(t - x) < 9)) continue
    if (typeAt(x, top[x]) !== SOIL || typeAt(x, top[x] - 1) !== EMPTY) continue
    growTree(x, top[x] - 1, 12 + Math.floor(random() * 14))
    trunks.push(x)
  }

  for (let x = 0; x < W; x++) {
    if (typeAt(x, top[x]) === SOIL && typeAt(x, top[x] - 1) === EMPTY && random() < 0.75) {
      put(x, top[x] - 1, GRASS, 0, GRASS_BASE)
      if (random() < 0.04 && typeAt(x, top[x] - 2) === EMPTY) put(x, top[x] - 2, FLOWER)
    }
  }

  // ---------- A few pairs of rabbits in the meadows ----------
  const pairs = Math.floor(random() * 3)
  for (let n = 0, tries = 0; n < pairs && tries < 40; tries++) {
    const x = 2 + Math.floor(random() * (W - 4))
    if (nearLake(x, 2) || typeAt(x, top[x] - 1) !== GRASS || typeAt(x, top[x] - 2) !== EMPTY || typeAt(x + 1, top[x + 1] - 2) !== EMPTY) continue
    put(x, top[x] - 2, RABBIT)
    put(x + 1, top[x + 1] - 2, RABBIT, 0, 1)
    n++
  }

  // ---------- Worms in the topsoil ----------
  const worms = Math.round(W / 30)
  for (let n = 0, tries = 0; n < worms && tries < worms * 10; tries++) {
    const x = Math.floor(random() * W)
    const y = top[x] + 2 + Math.floor(random() * 5)
    if (typeAt(x, y) !== SOIL) continue
    put(x, y, WORM, 0, Math.floor(random() * 4))
    n++
  }

  /** A grown tree: living trunk (still growing at the top), maybe a branch, a leafy crown with fruit. */
  function growTree(x: number, base: number, height: number) {
    for (let k = 0; k < height; k++) {
      const tip = k === height - 1
      put(x, base - k, WOOD, TREE_WATER, tip ? trunkTop(k + 1) : WOOD_TREE)
    }
    crown(x, base - height, 4 + Math.floor(random() * 3), 3 + Math.floor(random() * 2))

    if (height >= 16 && random() < 0.7) {
      const side = random() < 0.5 ? -1 : 1
      const from = base - Math.round(height * 0.6)
      const length = 3 + Math.floor(random() * 3)
      for (let k = 1; k <= length; k++) {
        const last = k === length
        put(x + side * k, from - k, WOOD, TREE_WATER, last ? trunkTop(height, true) : WOOD_TREE)
      }
      crown(x + side * length, from - length - 1, 2 + Math.floor(random() * 2), 2)
    }
  }

  function crown(cx: number, cy: number, rx: number, ry: number) {
    for (let dy = -ry; dy <= ry; dy++) {
      for (let dx = -rx; dx <= rx; dx++) {
        const d = (dx / rx) ** 2 + (dy / ry) ** 2
        if (d > 1 + random() * 0.3 || typeAt(cx + dx, cy + dy) !== EMPTY) continue
        put(cx + dx, cy + dy, LEAF, 60, CROWN)
      }
    }
    const fruits = Math.floor(random() * 3)
    for (let n = 0; n < fruits; n++) {
      const fx = cx + Math.round((random() * 2 - 1) * (rx - 1))
      const fy = cy + Math.round(random() * ry)
      if (typeAt(fx, fy) === LEAF) put(fx, fy, FRUIT, 0, FRUIT_ATTACHED)
    }
  }
}
