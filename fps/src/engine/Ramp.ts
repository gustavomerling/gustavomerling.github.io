import * as THREE from 'three'
import type { RampDef } from './levels/types.ts'
import { TILE, texture } from './textures.ts'

/** Anything the player can walk on: the walkable height under (x, z), or null. */
export interface Ground {
  height(x: number, z: number): number | null
}

// Spacing of the height samples on the ground grid.
const GRID = 0.5

// Samples are kept this far past the path half-width. A grid cell touching the
// ramp then always has all four corners, so there are no holes at corners or ends.
export const RAMP_MARGIN = GRID * Math.SQRT2

// How thick the ramp looks, below its walking surface. Visual only: the player
// walks on the top surface, so this does not change collisions.
const THICKNESS = 0.2

/**
 * A walkable surface that follows a path: a continuous slope, not blocks.
 * The height rises in a straight line with the distance walked along the path,
 * so a bent path gives a crooked ramp with a constant incline. Samples exist only
 * within `width / 2` of the path, so the sides are open and walking off falls.
 */
export class Ramp implements Ground {
  readonly mesh: THREE.Mesh
  private readonly base: number
  private readonly x0: number
  private readonly z0: number
  private readonly nx: number
  private readonly nz: number
  /** Heights relative to the base, per grid sample. NaN where there is no surface. */
  private readonly heights: Float32Array

  constructor(def: RampDef, base: number) {
    this.base = base
    const half = def.width / 2
    const xs = def.path.map(([x]) => x)
    const zs = def.path.map(([, z]) => z)

    const reach = half + RAMP_MARGIN
    this.x0 = Math.floor((Math.min(...xs) - reach) / GRID) * GRID
    this.z0 = Math.floor((Math.min(...zs) - reach) / GRID) * GRID
    this.nx = Math.ceil((Math.max(...xs) + reach - this.x0) / GRID) + 1
    this.nz = Math.ceil((Math.max(...zs) + reach - this.z0) / GRID) + 1

    // Distance walked along the path to each corner of the path.
    const along = [0]
    for (let k = 1; k < def.path.length; k++) {
      along.push(along[k - 1] + segmentLength(def.path[k - 1], def.path[k]))
    }
    const total = along[along.length - 1]

    this.heights = new Float32Array(this.nx * this.nz).fill(Number.NaN)
    for (let j = 0; j < this.nz; j++) {
      for (let i = 0; i < this.nx; i++) {
        const point: [number, number] = [this.x0 + i * GRID, this.z0 + j * GRID]
        let bestDistance = Number.POSITIVE_INFINITY
        let bestAlong = 0
        for (let k = 0; k < def.path.length - 1; k++) {
          const { distance, t } = nearestOnSegment(point, def.path[k], def.path[k + 1])
          if (distance < bestDistance) {
            bestDistance = distance
            bestAlong = along[k] + t * segmentLength(def.path[k], def.path[k + 1])
          }
        }
        const from = def.from ?? 0
        if (bestDistance <= half + RAMP_MARGIN) this.heights[j * this.nx + i] = from + (bestAlong / total) * (def.rise - from)
      }
    }

    this.mesh = this.buildMesh(def.color)
  }

  /** World height of the surface under (x, z), or null if there is no surface there. */
  height(x: number, z: number) {
    const fx = (x - this.x0) / GRID
    const fz = (z - this.z0) / GRID
    const i = Math.floor(fx)
    const j = Math.floor(fz)
    if (i < 0 || j < 0 || i >= this.nx - 1 || j >= this.nz - 1) return null

    const h00 = this.at(i, j)
    const h10 = this.at(i + 1, j)
    const h01 = this.at(i, j + 1)
    const h11 = this.at(i + 1, j + 1)
    if (Number.isNaN(h00) || Number.isNaN(h10) || Number.isNaN(h01) || Number.isNaN(h11)) return null

    const u = fx - i
    const v = fz - j
    const relative = h00 * (1 - u) * (1 - v) + h10 * u * (1 - v) + h01 * (1 - u) * v + h11 * u * v
    return this.base + relative
  }

  private at(i: number, j: number) {
    return this.heights[j * this.nx + i]
  }

  private hasCell(i: number, j: number) {
    if (i < 0 || j < 0 || i >= this.nx - 1 || j >= this.nz - 1) return false
    return [this.at(i, j), this.at(i + 1, j), this.at(i, j + 1), this.at(i + 1, j + 1)].every(
      (h) => !Number.isNaN(h),
    )
  }

  /**
   * The visible ramp: a top surface, a bottom face THICKNESS lower, and side walls
   * on every edge of the ramp, so it reads as a slab and not a sheet of paper.
   */
  private buildMesh(color: number) {
    const positions: number[] = []
    const uvs: number[] = []
    const top = (i: number, j: number) => [this.x0 + i * GRID, this.base + this.at(i, j), this.z0 + j * GRID]
    const bottom = (i: number, j: number) => {
      const [x, y, z] = top(i, j)
      return [x, y - THICKNESS, z]
    }
    // Top and bottom are mapped from above; side walls along x + z and y.
    const uvOf = ([x, y, z]: number[], wall: boolean) => (wall ? [(x + z) / TILE, y / TILE] : [x / TILE, z / TILE])
    const quad = (a: number[], b: number[], c: number[], d: number[], wall = false) => {
      positions.push(...a, ...b, ...c, ...a, ...c, ...d)
      for (const p of [a, b, c, a, c, d]) uvs.push(...uvOf(p, wall))
    }

    for (let j = 0; j < this.nz - 1; j++) {
      for (let i = 0; i < this.nx - 1; i++) {
        if (!this.hasCell(i, j)) continue

        // Top and bottom faces.
        quad(top(i, j), top(i + 1, j), top(i + 1, j + 1), top(i, j + 1))
        quad(bottom(i, j), bottom(i, j + 1), bottom(i + 1, j + 1), bottom(i + 1, j))

        // Side walls on each edge that has no neighbouring cell.
        if (!this.hasCell(i, j - 1)) quad(top(i, j), top(i + 1, j), bottom(i + 1, j), bottom(i, j), true)
        if (!this.hasCell(i, j + 1)) quad(top(i + 1, j + 1), top(i, j + 1), bottom(i, j + 1), bottom(i + 1, j + 1), true)
        if (!this.hasCell(i - 1, j)) quad(top(i, j + 1), top(i, j), bottom(i, j), bottom(i, j + 1), true)
        if (!this.hasCell(i + 1, j)) quad(top(i + 1, j), top(i + 1, j + 1), bottom(i + 1, j + 1), bottom(i + 1, j), true)
      }
    }

    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
    geometry.computeVertexNormals()

    const mesh = new THREE.Mesh(
      geometry,
      new THREE.MeshStandardMaterial({
        color,
        map: texture('stone'),
        bumpMap: texture('stone', 'data'),
        bumpScale: 1.5,
        roughness: 0.8,
        metalness: 0,
        side: THREE.DoubleSide,
      }),
    )
    mesh.receiveShadow = true
    mesh.castShadow = true
    return mesh
  }
}

function segmentLength(a: [number, number], b: [number, number]) {
  return Math.hypot(b[0] - a[0], b[1] - a[1])
}

/** Closest point of segment a-b to `p`: its distance and how far along the segment (0..1). */
function nearestOnSegment(p: [number, number], a: [number, number], b: [number, number]) {
  const dx = b[0] - a[0]
  const dz = b[1] - a[1]
  const lengthSq = dx * dx + dz * dz
  const t = lengthSq === 0 ? 0 : Math.min(1, Math.max(0, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dz) / lengthSq))
  const distance = Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dz))
  return { distance, t }
}
