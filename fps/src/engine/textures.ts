import * as THREE from 'three'

/** World units covered by one repeat of a surface texture. */
export const TILE = 2

const SIZE = 256

export type TextureName = 'stone' | 'cracked' | 'metal' | 'hazard' | 'pad' | 'grid' | 'floor' | 'chevron' | 'glow'

type Draw = (ctx: CanvasRenderingContext2D, rand: () => number) => void

/** Seeded random, so every texture looks the same on every load. */
function mulberry32(seed: number) {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function grain(ctx: CanvasRenderingContext2D, rand: () => number, count: number, alpha: number) {
  for (let i = 0; i < count; i++) {
    const shade = Math.floor(rand() * 255)
    ctx.fillStyle = `rgba(${shade}, ${shade}, ${shade}, ${alpha})`
    const size = 1 + rand() * 2.5
    ctx.fillRect(rand() * SIZE, rand() * SIZE, size, size)
  }
}

function stains(ctx: CanvasRenderingContext2D, rand: () => number, count: number, alpha: number) {
  for (let i = 0; i < count; i++) {
    const x = rand() * SIZE
    const y = rand() * SIZE
    const r = 20 + rand() * 60
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, r)
    gradient.addColorStop(0, `rgba(0, 0, 0, ${alpha})`)
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)')
    ctx.fillStyle = gradient
    ctx.fillRect(x - r, y - r, r * 2, r * 2)
  }
}

/** 2x2 panels (one per world unit) with seams and a soft bevel. */
const drawStone: Draw = (ctx, rand) => {
  const half = SIZE / 2
  for (let py = 0; py < 2; py++) {
    for (let px = 0; px < 2; px++) {
      const shade = 214 + Math.floor(rand() * 22)
      ctx.fillStyle = `rgb(${shade}, ${shade + 2}, ${shade + 5})`
      ctx.fillRect(px * half, py * half, half, half)
    }
  }
  grain(ctx, rand, 5000, 0.12)
  stains(ctx, rand, 10, 0.07)
  for (let py = 0; py < 2; py++) {
    for (let px = 0; px < 2; px++) {
      const x = px * half
      const y = py * half
      ctx.fillStyle = 'rgba(255, 255, 255, 0.35)'
      ctx.fillRect(x + 3, y + 3, half - 6, 2)
      ctx.fillRect(x + 3, y + 3, 2, half - 6)
      ctx.fillStyle = 'rgba(0, 0, 0, 0.18)'
      ctx.fillRect(x + 3, y + half - 5, half - 6, 2)
      ctx.fillRect(x + half - 5, y + 3, 2, half - 6)
    }
  }
  ctx.fillStyle = '#7d8691'
  for (const p of [0, half]) {
    ctx.fillRect(p - 1.5, 0, 3, SIZE)
    ctx.fillRect(0, p - 1.5, SIZE, 3)
  }
  ctx.fillRect(SIZE - 1.5, 0, 1.5, SIZE)
  ctx.fillRect(0, SIZE - 1.5, SIZE, 1.5)
}

const drawCracked: Draw = (ctx, rand) => {
  drawStone(ctx, rand)
  stains(ctx, rand, 8, 0.12)
  ctx.strokeStyle = 'rgba(40, 30, 22, 0.85)'
  ctx.lineCap = 'round'
  for (let c = 0; c < 9; c++) {
    let x = rand() * SIZE
    let y = rand() * SIZE
    let angle = rand() * Math.PI * 2
    ctx.lineWidth = 1.5 + rand() * 2
    ctx.beginPath()
    ctx.moveTo(x, y)
    for (let s = 0; s < 8; s++) {
      angle += (rand() - 0.5) * 1.3
      x += Math.cos(angle) * (10 + rand() * 14)
      y += Math.sin(angle) * (10 + rand() * 14)
      ctx.lineTo(x, y)
    }
    ctx.stroke()
  }
}

/** Brushed metal plates with rivets and a striped band. */
const drawMetal: Draw = (ctx, rand) => {
  ctx.fillStyle = '#d4d8dd'
  ctx.fillRect(0, 0, SIZE, SIZE)
  for (let i = 0; i < 500; i++) {
    const shade = 150 + Math.floor(rand() * 105)
    ctx.fillStyle = `rgba(${shade}, ${shade}, ${shade}, 0.12)`
    ctx.fillRect(0, rand() * SIZE, SIZE, 1)
  }
  const half = SIZE / 2
  for (let py = 0; py < 2; py++) {
    for (let px = 0; px < 2; px++) {
      const x = px * half
      const y = py * half
      ctx.strokeStyle = 'rgba(40, 44, 50, 0.6)'
      ctx.lineWidth = 3
      ctx.strokeRect(x + 4, y + 4, half - 8, half - 8)
      for (const [rx, ry] of [
        [14, 14],
        [half - 14, 14],
        [14, half - 14],
        [half - 14, half - 14],
      ]) {
        ctx.fillStyle = 'rgba(30, 34, 40, 0.7)'
        ctx.beginPath()
        ctx.arc(x + rx, y + ry, 5, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)'
        ctx.beginPath()
        ctx.arc(x + rx - 1.5, y + ry - 1.5, 2, 0, Math.PI * 2)
        ctx.fill()
      }
    }
  }
  ctx.save()
  ctx.beginPath()
  ctx.rect(0, half - 14, SIZE, 28)
  ctx.clip()
  for (let i = -SIZE; i < SIZE * 2; i += 28) {
    ctx.fillStyle = 'rgba(30, 30, 30, 0.75)'
    ctx.beginPath()
    ctx.moveTo(i, half - 14)
    ctx.lineTo(i + 14, half - 14)
    ctx.lineTo(i + 42, half + 14)
    ctx.lineTo(i + 28, half + 14)
    ctx.fill()
  }
  ctx.restore()
}

const drawHazard: Draw = (ctx, rand) => {
  ctx.fillStyle = '#f0f0f0'
  ctx.fillRect(0, 0, SIZE, SIZE)
  ctx.fillStyle = '#2e2e2e'
  const stripe = SIZE / 8
  for (let i = -SIZE; i < SIZE * 2; i += stripe * 2) {
    ctx.beginPath()
    ctx.moveTo(i, 0)
    ctx.lineTo(i + stripe, 0)
    ctx.lineTo(i + stripe + SIZE, SIZE)
    ctx.lineTo(i + SIZE, SIZE)
    ctx.fill()
  }
  grain(ctx, rand, 3000, 0.1)
  stains(ctx, rand, 6, 0.15)
}

/** Concentric rings: the bounce pad. */
const drawPad: Draw = (ctx, rand) => {
  ctx.fillStyle = '#3a3f46'
  ctx.fillRect(0, 0, SIZE, SIZE)
  const c = SIZE / 2
  for (const [r, w] of [
    [112, 10],
    [82, 8],
    [54, 8],
    [26, 10],
  ]) {
    ctx.strokeStyle = '#f4f4f4'
    ctx.lineWidth = w
    ctx.beginPath()
    ctx.arc(c, c, r, 0, Math.PI * 2)
    ctx.stroke()
  }
  ctx.fillStyle = '#f4f4f4'
  ctx.beginPath()
  ctx.arc(c, c, 8, 0, Math.PI * 2)
  ctx.fill()
  grain(ctx, rand, 1500, 0.08)
}

/** Dark glass with a bright grid: phasing platforms. */
const drawGrid: Draw = (ctx, rand) => {
  ctx.fillStyle = '#262626'
  ctx.fillRect(0, 0, SIZE, SIZE)
  grain(ctx, rand, 1500, 0.06)
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.55)'
  ctx.lineWidth = 2
  for (let i = 0; i <= SIZE; i += SIZE / 4) {
    ctx.beginPath()
    ctx.moveTo(i, 0)
    ctx.lineTo(i, SIZE)
    ctx.moveTo(0, i)
    ctx.lineTo(SIZE, i)
    ctx.stroke()
  }
  ctx.strokeStyle = '#ffffff'
  ctx.lineWidth = 8
  ctx.strokeRect(0, 0, SIZE, SIZE)
  ctx.fillStyle = '#ffffff'
  for (let x = 0; x <= SIZE; x += SIZE / 4) {
    for (let y = 0; y <= SIZE; y += SIZE / 4) {
      ctx.fillRect(x - 3, y - 3, 6, 6)
    }
  }
}

/** Big floor tiles, a checker of two shades. */
const drawFloor: Draw = (ctx, rand) => {
  const tile = SIZE / 4
  for (let y = 0; y < 4; y++) {
    for (let x = 0; x < 4; x++) {
      const shade = (x + y) % 2 === 0 ? 206 : 192
      const jitter = Math.floor(rand() * 10)
      ctx.fillStyle = `rgb(${shade + jitter}, ${shade + jitter + 3}, ${shade + jitter + 8})`
      ctx.fillRect(x * tile, y * tile, tile, tile)
    }
  }
  grain(ctx, rand, 4000, 0.1)
  stains(ctx, rand, 12, 0.06)
  ctx.fillStyle = '#7f8895'
  for (let i = 0; i <= SIZE; i += tile) {
    ctx.fillRect(i - 1, 0, 2, SIZE)
    ctx.fillRect(0, i - 1, SIZE, 2)
  }
}

/** Three chevrons pointing along +u, on a transparent background. */
const drawChevron: Draw = (ctx) => {
  ctx.clearRect(0, 0, SIZE, SIZE)
  ctx.strokeStyle = '#ffffff'
  ctx.lineWidth = 22
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  for (const [x, alpha] of [
    [60, 0.35],
    [120, 0.65],
    [180, 1],
  ]) {
    ctx.globalAlpha = alpha
    ctx.beginPath()
    ctx.moveTo(x - 30, 70)
    ctx.lineTo(x + 20, 128)
    ctx.lineTo(x - 30, 186)
    ctx.stroke()
  }
  ctx.globalAlpha = 1
}

const drawGlow: Draw = (ctx) => {
  const c = SIZE / 2
  const gradient = ctx.createRadialGradient(c, c, 0, c, c, c)
  gradient.addColorStop(0, 'rgba(255, 255, 255, 1)')
  gradient.addColorStop(0.25, 'rgba(255, 255, 255, 0.45)')
  gradient.addColorStop(1, 'rgba(255, 255, 255, 0)')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, SIZE, SIZE)
}

const DRAWERS: Record<TextureName, Draw> = {
  stone: drawStone,
  cracked: drawCracked,
  metal: drawMetal,
  hazard: drawHazard,
  pad: drawPad,
  grid: drawGrid,
  floor: drawFloor,
  chevron: drawChevron,
  glow: drawGlow,
}

const canvases = new Map<TextureName, HTMLCanvasElement>()
const textures = new Map<string, THREE.Texture>()

function canvasFor(name: TextureName) {
  let canvas = canvases.get(name)
  if (!canvas) {
    canvas = document.createElement('canvas')
    canvas.width = SIZE
    canvas.height = SIZE
    const ctx = canvas.getContext('2d')
    if (ctx) DRAWERS[name](ctx, mulberry32(name.length * 7919 + name.charCodeAt(0)))
    canvases.set(name, canvas)
  }
  return canvas
}

/**
 * A shared procedural texture. `color` textures are sRGB (for `map`); `data`
 * ones are linear (for `bumpMap`). Shared textures are marked so the engine does
 * not dispose them along with one material.
 */
export function texture(name: TextureName, kind: 'color' | 'data' = 'color') {
  const key = `${name}:${kind}`
  let result = textures.get(key)
  if (!result) {
    result = new THREE.CanvasTexture(canvasFor(name))
    result.wrapS = THREE.RepeatWrapping
    result.wrapT = THREE.RepeatWrapping
    result.anisotropy = 4
    result.colorSpace = kind === 'color' ? THREE.SRGBColorSpace : THREE.NoColorSpace
    result.userData.shared = true
    textures.set(key, result)
  }
  return result
}

/** A box whose UVs are in world units, so textures keep their scale on any size. */
export function boxGeometry(size: THREE.Vector3, tile = TILE) {
  const geometry = new THREE.BoxGeometry(size.x, size.y, size.z)
  const uv = geometry.getAttribute('uv') as THREE.BufferAttribute
  // BoxGeometry faces, 4 vertices each: +x, -x, +y, -y, +z, -z.
  const faces = [
    [size.z, size.y],
    [size.z, size.y],
    [size.x, size.z],
    [size.x, size.z],
    [size.x, size.y],
    [size.x, size.y],
  ]
  for (let face = 0; face < 6; face++) {
    for (let k = 0; k < 4; k++) {
      const i = face * 4 + k
      uv.setXY(i, (uv.getX(i) * faces[face][0]) / tile, (uv.getY(i) * faces[face][1]) / tile)
    }
  }
  uv.needsUpdate = true
  return geometry
}
