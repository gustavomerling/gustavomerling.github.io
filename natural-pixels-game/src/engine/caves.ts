import { ELEMENTS, EMPTY, elementIndex } from '../elements/registry.ts'
import type { Grid } from './grid.ts'
import type { Random } from './random.ts'

/*
 * Natural caves for the world generator: meandering tunnels (a random walk of a round carving
 * brush) with the odd bigger chamber, deep in the stone. Some chambers hold a little pool, the
 * floors sprout glowing mushrooms and stalagmites, and ore shows in the walls. Now and then one
 * cave opens onto a hillside so daylight spills in.
 *
 * Stone, ore, soil and sand all fall in this sim (stone and ore straight down, soil and sand also
 * diagonally), so a bare cave roof would cave in on the first tick. Every cell that would fall
 * into the cave is fixed in place: a roof cell (open below) becomes mine wall, the dark static
 * rock at the back of mine tunnels (the light passes it like a back wall, so it reads as the
 * shadowed roof of the cave); a soil or sand cell that would only slide in sideways becomes
 * stone, which never slides.
 */

const STONE = elementIndex('stone')
const WATER = elementIndex('water')
const FISH = elementIndex('fish')
const GLOW_SHROOM = elementIndex('glow_shroom')
const ROOF = elementIndex('mine_wall')

/** Rock a cave is carved out of (stone and its ores). */
const ROCK = new Uint8Array(ELEMENTS.length)
for (const id of ['stone', 'coal', 'iron_ore', 'silver_ore', 'gold_ore', 'sulfur_ore', 'saltpeter', 'amethyst']) ROCK[elementIndex(id)] = 1
/** Earth a cave mouth may also cut through. */
const EARTH = new Uint8Array(ELEMENTS.length)
for (const id of ['soil', 'sand']) EARTH[elementIndex(id)] = 1
/** Falls when there's nothing under it; SLIDES: also slips diagonally. */
const FALLS = Uint8Array.from(ELEMENTS, (el) => (el.matter === 'powder' ? 1 : 0))
const SLIDES = Uint8Array.from(ELEMENTS, (el) => (el.matter === 'powder' && (el.movement?.slide ?? 1) > 0 ? 1 : 0))

/** Ore showing in the cave walls: from this far into the stone (share of its depth), with this weight. */
const WALL_ORES = [
  { type: elementIndex('coal'), depth: 0, weight: 6 },
  { type: elementIndex('iron_ore'), depth: 0.1, weight: 5 },
  { type: elementIndex('saltpeter'), depth: 0.05, weight: 2 },
  { type: elementIndex('sulfur_ore'), depth: 0.2, weight: 2 },
  { type: elementIndex('silver_ore'), depth: 0.3, weight: 3 },
  { type: elementIndex('gold_ore'), depth: 0.45, weight: 2 },
  { type: elementIndex('amethyst'), depth: 0.35, weight: 3 },
] as const

/** Caves stay at least this many cells below the top of the stone. */
const MIN_DEPTH = 8
/** Near the middle of the map (where the human starts and digs) they stay this far under the surface. */
const CENTRE_CLEAR = 25
const CENTRE_DEPTH = 20
/** Per step of a tunnel: chance of a chamber, and of a side branch. */
const CHAMBER_CHANCE = 0.025
const BRANCH_CHANCE = 0.012
/** Chance a chamber holds a pool, and its most cells. */
const POOL_CHANCE = 0.45
const POOL_MAX = 220
/** Per cell of open cave floor: a glowing mushroom, a stalagmite. */
const GLOW_CHANCE = 0.1
const STALAGMITE_CHANCE = 0.025
/** Per cell of cave wall: a little blob of ore starts there. */
const WALL_ORE_CHANCE = 0.012

export interface CaveOptions {
  /** Ground level and top of the stone, per column. */
  top: Int32Array
  stoneTop: Int32Array
  /** Columns to keep clear of altogether (lakes). */
  avoid: (x: number) => boolean
  /** Cave systems to dig. */
  systems: number
  /** Whether one of them opens onto a hillside. */
  mouth: boolean
}

/** Digs the caves. Returns the columns the cave mouth (if any) cut through, as [from, to]. */
export function carveCaves(grid: Grid, random: Random, { top, stoneTop, avoid, systems, mouth }: CaveOptions): [number, number] | null {
  const { width: W, height: H, type } = grid
  const at = (x: number, y: number) => y * W + x
  const inside = (x: number, y: number) => x >= 0 && x < W && y >= 0 && y < H
  const centre = W / 2
  /** 1 = dug out (air, or a pool's water). */
  const cave = new Uint8Array(W * H)
  const chambers: { x: number; y: number }[] = []
  const lowest = H - 2

  /** The shallowest a cave may come in this column. */
  const minY = (x: number) => {
    const y = stoneTop[x] + MIN_DEPTH
    return Math.abs(x - centre) <= CENTRE_CLEAR ? Math.max(y, top[x] + CENTRE_DEPTH) : y
  }
  const carve = (x: number, y: number, opening: boolean) => {
    if (!inside(x, y) || y > lowest || avoid(x)) return
    if (Math.abs(x - centre) <= CENTRE_CLEAR && y < top[x] + CENTRE_DEPTH) return
    const i = at(x, y)
    const t = type[i]
    if (opening ? !(ROCK[t] || EARTH[t]) : !ROCK[t] || y < minY(x)) return
    grid.place(i, EMPTY, 0, 0)
    cave[i] = 1
  }
  const brush = (cx: number, cy: number, r: number, opening = false) => {
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) if (dx * dx + dy * dy <= r * r + r * 0.6) carve(cx + dx, cy + dy, opening)
    }
  }
  const chamber = (cx: number, cy: number) => {
    const rx = 4 + Math.floor(random() * 5)
    const ry = 3 + Math.floor(random() * 3)
    for (let dy = -ry; dy <= ry; dy++) {
      for (let dx = -rx; dx <= rx; dx++) {
        if ((dx / rx) ** 2 + (dy / ry) ** 2 <= 1 + (random() - 0.5) * 0.3) carve(cx + dx, cy + dy, false)
      }
    }
    chambers.push({ x: cx, y: cy })
  }

  /** A meandering tunnel: mostly sideways, bouncing off the depth limits, now and then branching. */
  function tunnel(x0: number, y0: number, angle: number, steps: number, branches: number) {
    let x = x0
    let y = y0
    let r = 1 + Math.floor(random() * 2)
    for (let s = 0; s < steps; s++) {
      const cx = Math.round(x)
      const cy = Math.round(y)
      brush(cx, cy, r)
      if (random() < CHAMBER_CHANCE) chamber(cx, cy)
      if (branches > 0 && random() < BRANCH_CHANCE) {
        tunnel(x, y, angle + (random() < 0.5 ? -1 : 1) * (0.8 + random()), Math.round(steps * 0.5), branches - 1)
      }
      if (random() < 0.08) r = Math.max(1, Math.min(3, r + (random() < 0.5 ? -1 : 1)))
      // Wander, but drift back towards level.
      angle += (random() - 0.5) * 0.7
      const dy = Math.sin(angle)
      angle -= dy * 0.08 * Math.sign(Math.cos(angle) || 1)
      x += Math.cos(angle)
      y += Math.sin(angle) * 0.7
      const ix = Math.round(x)
      if (ix < 3 || ix > W - 4 || avoid(ix)) {
        angle = Math.PI - angle
        x += Math.cos(angle) * 2
      }
      const cxNow = Math.max(0, Math.min(W - 1, Math.round(x)))
      if (y < minY(cxNow) + r) angle = Math.abs(Math.atan2(Math.sin(angle), Math.cos(angle)))
      if (y > lowest - r - 1) angle = -Math.abs(Math.atan2(Math.sin(angle), Math.cos(angle)))
    }
  }

  // ---------- The tunnels ----------
  for (let n = 0, tries = 0; n < systems && tries < systems * 10; tries++) {
    const x = 10 + Math.floor(random() * (W - 20))
    if (avoid(x)) continue
    const from = minY(x) + 2
    const to = lowest - 4
    if (to - from < 4) continue
    const y = from + Math.floor(random() * (to - from))
    tunnel(x, y, random() < 0.5 ? (random() - 0.5) * 0.6 : Math.PI + (random() - 0.5) * 0.6, 40 + Math.floor(random() * W * 0.35), 2)
    n++
  }

  // ---------- A cave mouth on a hillside: a ramp from the slope down into the stone ----------
  let span: [number, number] | null = null
  if (mouth) {
    const sites: { x: number; dir: number; steep: number }[] = []
    for (let x = 8; x < W - 8; x++) {
      if (Math.abs(x - centre) <= CENTRE_CLEAR + 12 || avoid(x - 6) || avoid(x) || avoid(x + 6)) continue
      const slope = top[x + 4] - top[x - 4]
      if (slope === 0) continue
      // Into the hill (towards higher ground), and away from the middle of the map.
      const dir = slope > 0 ? -1 : 1
      if (Math.sign(x - centre) === dir) sites.push({ x, dir, steep: Math.abs(slope) })
    }
    // One of the steepest bits of hillside.
    sites.sort((a, b) => b.steep - a.steep)
    sites.length = Math.min(sites.length, 12)
    if (sites.length) {
      const { x: x0, dir } = sites[Math.floor(random() * sites.length)]
      let x = x0
      let y = top[x0] + 1
      let lo = x
      let hi = x
      for (let s = 0; s < 120 && y < minY(Math.round(x)) + 3; s++) {
        brush(Math.round(x), Math.round(y), s < 3 ? 2 : 1 + Math.floor(random() * 2), true)
        lo = Math.min(lo, Math.round(x) - 2)
        hi = Math.max(hi, Math.round(x) + 2)
        x += dir * (0.8 + random() * 0.4)
        y += 0.45 + random() * 0.3
        if (x < 3 || x > W - 4 || avoid(Math.round(x))) break
      }
      if (y >= minY(Math.round(x)) && x >= 3 && x <= W - 4) tunnel(x, y, dir > 0 ? 0 : Math.PI, 40 + Math.floor(random() * W * 0.3), 1)
      span = [lo, hi]
    }
  }

  const open = (x: number, y: number) => inside(x, y) && cave[at(x, y)] === 1
  const solid = (x: number, y: number) => inside(x, y) && !cave[at(x, y)] && type[at(x, y)] !== EMPTY && type[at(x, y)] !== WATER

  // ---------- Pools in some chambers: filled flat up to a level, so they've nowhere to drain ----------
  for (const c of chambers) {
    if (random() >= POOL_CHANCE || !open(c.x, c.y)) continue
    // Down to the lowest cell of the chamber's floor.
    let x = c.x
    let y = c.y
    for (let moved = true; moved; ) {
      moved = false
      for (const dx of [0, -1, 1]) {
        if (open(x + dx, y + 1)) {
          x += dx
          y++
          moved = true
          break
        }
      }
    }
    for (let depth = 2 + Math.floor(random() * 3); depth > 0; depth--) {
      const level = y - depth + 1
      const cells = flood(x, y, level)
      if (!cells || cells.length < 4) continue
      for (const i of cells) grid.place(i, WATER, 0, 0)
      if (cells.length >= 30) grid.place(cells[Math.floor(random() * cells.length)], FISH, 0, Math.floor(random() * 2))
      break
    }
  }

  /** The dug-out cells at or below `level` joined to (x, y) (diagonally too, as water flows); null if too many. */
  function flood(x: number, y: number, level: number): number[] | null {
    const seen = new Set<number>([at(x, y)])
    const stack = [at(x, y)]
    const out: number[] = []
    while (stack.length) {
      const i = stack.pop()!
      out.push(i)
      if (out.length > POOL_MAX) return null
      const cx = i % W
      const cy = (i - cx) / W
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nx = cx + dx
          const ny = cy + dy
          if (ny < level || !open(nx, ny)) continue
          const j = at(nx, ny)
          if (seen.has(j) || type[j] !== EMPTY) continue
          seen.add(j)
          stack.push(j)
        }
      }
    }
    return out
  }

  // ---------- Stalagmites and glowing mushrooms on the dry floors ----------
  for (let y = 1; y < H - 1; y++) {
    for (let x = 0; x < W; x++) {
      const i = at(x, y)
      if (!cave[i] || type[i] !== EMPTY || !solid(x, y + 1) || !inside(x, y + 1) || !ROCK[type[at(x, y + 1)]]) continue
      if (random() < STALAGMITE_CHANCE && open(x, y - 1) && open(x, y - 2)) {
        // A short spike of stone standing on the floor (it rests on it, so it stays up).
        const tall = 1 + Math.floor(random() * 3)
        for (let k = 0; k < tall && open(x, y - k) && type[at(x, y - k)] === EMPTY && open(x, y - k - 1); k++) {
          grid.place(at(x, y - k), STONE, 0, 0)
          cave[at(x, y - k)] = 0
        }
      } else if (random() < GLOW_CHANCE) {
        grid.place(i, GLOW_SHROOM, 0, 0)
        // They come in little clumps.
        for (const dx of [-1, 1]) {
          const j = at(x + dx, y)
          if (random() < 0.45 && open(x + dx, y) && type[j] === EMPTY && solid(x + dx, y + 1)) grid.place(j, GLOW_SHROOM, 0, 0)
        }
      }
    }
  }

  // ---------- Ore showing in the walls (never in the roof: that's fixed in place below) ----------
  for (let y = 1; y < H - 1; y++) {
    for (let x = 1; x < W - 1; x++) {
      if (!cave[at(x, y)]) continue
      for (const [dx, dy] of [[-1, 0], [1, 0], [0, 1]] as const) {
        if (random() >= WALL_ORE_CHANCE || type[at(x + dx, y + dy)] !== STONE) continue
        const ore = pickOre(x + dx, y + dy)
        let ox = x + dx
        let oy = y + dy
        for (let k = 0, size = 2 + Math.floor(random() * 4); k < size * 2 && k < 12; k++) {
          if (inside(ox, oy) && type[at(ox, oy)] === STONE && !open(ox, oy + 1)) grid.place(at(ox, oy), ore, 0, 0)
          if (random() < 0.5) ox += random() < 0.5 ? -1 : 1
          else oy += random() < 0.5 ? -1 : 1
        }
      }
    }
  }

  function pickOre(x: number, y: number): number {
    const share = (y - stoneTop[x]) / Math.max(1, H - stoneTop[x])
    const options = WALL_ORES.filter((o) => o.depth <= share)
    let roll = random() * options.reduce((sum, o) => sum + o.weight, 0)
    for (const o of options) if ((roll -= o.weight) < 0) return o.type
    return options[0].type
  }

  // ---------- Hold the roof up ----------
  // Anything that would fall straight in becomes static mine wall...
  for (let i = W; i < W * H; i++) {
    if (cave[i] && !cave[i - W] && FALLS[type[i - W]]) grid.place(i - W, ROOF, 0, 0)
  }
  // ...and earth that would slide in diagonally (stone never does) becomes stone.
  for (let y = 1; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (!cave[at(x, y)]) continue
      for (const dx of [-1, 1]) {
        if (!inside(x + dx, y - 1)) continue
        const j = at(x + dx, y - 1)
        if (!cave[j] && SLIDES[type[j]]) grid.place(j, STONE, 0, 0)
      }
    }
  }
  return span
}
