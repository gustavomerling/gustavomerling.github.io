import { ELEMENTS, EMPTY } from '../elements/registry.ts'
import { AMBIENT_TEMP } from './constants.ts'
import type { Grid } from './grid.ts'

/*
 * Scene files: a small JSON header + every grid array, gzip-compressed.
 * The header keeps the element ids in index order, so scenes survive new/reordered elements.
 *
 * Layout (before compression): [u32 header length][header JSON][array bytes...]
 */
const FORMAT = 'natural-pixels-scene'
const VERSION = 1

interface SceneHeader {
  format: typeof FORMAT
  version: number
  width: number
  height: number
  /** Element id for each index used in the `type` arrays. */
  elements: string[]
  timeOfDay: number
  /** Cell memories (humans' minds), keyed like the cells' `life`. */
  memory?: [number, unknown][]
}

export interface SceneExtras {
  timeOfDay: number
  memory: [number, unknown][]
}

/** Per-cell arrays in file order. Must match between save and load. */
function arraysOf(grid: Grid) {
  const { under } = grid
  return [
    grid.type,
    grid.temp,
    grid.water,
    grid.data,
    grid.life,
    grid.shade,
    under.type,
    under.temp,
    under.water,
    under.data,
    under.life,
    under.shade,
  ] as const
}

export async function encodeScene(grid: Grid, { timeOfDay, memory }: SceneExtras): Promise<Blob> {
  const header: SceneHeader = {
    format: FORMAT,
    version: VERSION,
    width: grid.width,
    height: grid.height,
    elements: ELEMENTS.map((el) => el.id),
    timeOfDay,
    memory,
  }
  const headerBytes = new TextEncoder().encode(JSON.stringify(header))
  const length = new Uint8Array(4)
  new DataView(length.buffer).setUint32(0, headerBytes.length, true)

  const parts: BlobPart[] = [length, headerBytes]
  // Grid arrays always own plain ArrayBuffers, never shared ones.
  for (const array of arraysOf(grid)) parts.push(new Uint8Array(array.buffer as ArrayBuffer, array.byteOffset, array.byteLength))

  const stream = new Blob(parts).stream().pipeThrough(new CompressionStream('gzip'))
  return new Response(stream).blob()
}

/**
 * Loads a scene into `grid`. A scene of another size is placed bottom-aligned and
 * horizontally centered (cropped or padded). Returns the scene's time of day and memories.
 */
export async function decodeScene(blob: Blob, grid: Grid): Promise<SceneExtras> {
  const stream = blob.stream().pipeThrough(new DecompressionStream('gzip'))
  const bytes = new Uint8Array(await new Response(stream).arrayBuffer())

  const headerLength = new DataView(bytes.buffer, bytes.byteOffset).getUint32(0, true)
  const header = JSON.parse(new TextDecoder().decode(bytes.subarray(4, 4 + headerLength))) as SceneHeader
  if (header.format !== FORMAT || header.version !== VERSION) throw new Error('Not a Natural Pixels scene')

  // Read each saved array back (copying into aligned buffers).
  const { width, height } = header
  const cells = width * height
  let offset = 4 + headerLength
  const saved = arraysOf(grid).map((target) => {
    const byteLength = cells * target.BYTES_PER_ELEMENT
    const copy = bytes.slice(offset, offset + byteLength).buffer
    offset += byteLength
    const Ctor = target.constructor as new (buffer: ArrayBuffer) => typeof target
    return new Ctor(copy)
  })

  // Map saved element indices to today's registry (unknown ids become air).
  const indexById = new Map(ELEMENTS.map((el, i) => [el.id, i]))
  const remap = Uint8Array.from(header.elements, (id) => indexById.get(id) ?? EMPTY)
  remapTypes(saved[0] as Uint8Array, remap)
  remapTypes(saved[6] as Uint8Array, remap)

  grid.clear()
  const targets = arraysOf(grid)
  const dx = Math.floor((grid.width - width) / 2)
  const dy = grid.height - height
  for (let y = 0; y < height; y++) {
    const ty = y + dy
    if (ty < 0 || ty >= grid.height) continue
    for (let x = 0; x < width; x++) {
      const tx = x + dx
      if (tx < 0 || tx >= grid.width) continue
      const from = y * width + x
      const to = ty * grid.width + tx
      for (let a = 0; a < targets.length; a++) targets[a][to] = saved[a][from]
    }
  }
  // Air holds no heat.
  for (let i = 0; i < grid.size; i++) if (grid.type[i] === EMPTY) grid.temp[i] = AMBIENT_TEMP
  return { timeOfDay: header.timeOfDay, memory: header.memory ?? [] }
}

function remapTypes(types: Uint8Array, remap: Uint8Array) {
  for (let i = 0; i < types.length; i++) types[i] = remap[types[i]] ?? EMPTY
}

const QUICKSAVE_KEY = 'natural-pixels.quicksave'

/** Quick save slot in the browser (base64 of the compressed scene). */
export async function writeQuicksave(blob: Blob) {
  const bytes = new Uint8Array(await blob.arrayBuffer())
  let binary = ''
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  localStorage.setItem(QUICKSAVE_KEY, btoa(binary))
}

export function readQuicksave(): Blob | null {
  try {
    const base64 = localStorage.getItem(QUICKSAVE_KEY)
    if (!base64) return null
    const binary = atob(base64)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
    return new Blob([bytes])
  } catch {
    return null
  }
}

export function hasQuicksave(): boolean {
  try {
    return localStorage.getItem(QUICKSAVE_KEY) !== null
  } catch {
    return false
  }
}
