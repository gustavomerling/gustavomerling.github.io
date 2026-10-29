// Fundo: céu noturno em degradê, camadas de estrelas e bokeh em paralaxe, grade de edição
// e um leve pulso com o nível do áudio.
import { getAnalyser } from '../audio'
import type { View } from '../types'
import { bokehSprite, glowSprite, WHITE_SLOT } from './palette'

// Gerador pseudoaleatório determinístico por célula: o céu é infinito e sempre igual no mesmo lugar.
function hash(x: number, y: number, seed: number) {
  let h = Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ Math.imul(seed, 1442695041)
  h = Math.imul(h ^ (h >>> 13), 1274126177)
  h ^= h >>> 16
  return (h >>> 0) / 4294967296
}

type Layer = {
  depth: number // fração do movimento da câmera que a camada acompanha
  cell: number // tamanho da célula, em pixels da camada
  perCell: number // estrelas por célula
  minSize: number // raio em pixels de tela
  maxSize: number
  alpha: number
  bokeh: boolean
  seed: number
}

const LAYERS: Layer[] = [
  { depth: 0.04, cell: 260, perCell: 1, minSize: 26, maxSize: 70, alpha: 0.07, bokeh: true, seed: 11 },
  { depth: 0.08, cell: 110, perCell: 1, minSize: 1.2, maxSize: 2.2, alpha: 0.55, bokeh: false, seed: 23 },
  { depth: 0.18, cell: 170, perCell: 2, minSize: 1.6, maxSize: 3.2, alpha: 0.7, bokeh: false, seed: 37 },
  { depth: 0.35, cell: 340, perCell: 1, minSize: 14, maxSize: 34, alpha: 0.06, bokeh: true, seed: 53 },
]

let skyGradient: CanvasGradient | null = null
let skyHeight = -1
let horizonGradient: CanvasGradient | null = null
let horizonWidth = -1
let horizonHeight = -1

// Nível do áudio suavizado (0..1).
let audioLevel = 0
let audioBuffer: Uint8Array<ArrayBuffer> | null = null

export function sampleAudioLevel(dt: number) {
  const analyser = getAnalyser()
  let level = 0
  if (analyser) {
    if (!audioBuffer || audioBuffer.length !== analyser.fftSize) audioBuffer = new Uint8Array(analyser.fftSize)
    analyser.getByteTimeDomainData(audioBuffer)
    let sum = 0
    for (let i = 0; i < audioBuffer.length; i += 4) {
      const v = (audioBuffer[i] - 128) / 128
      sum += v * v
    }
    level = Math.min(1, Math.sqrt(sum / (audioBuffer.length / 4)) * 3)
  }
  // Sobe rápido, desce devagar.
  const rate = level > audioLevel ? 18 : 2.5
  audioLevel += (level - audioLevel) * (1 - Math.exp(-rate * dt))
  return audioLevel
}

export function drawBackground(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  view: View,
  clock: number,
  editAlpha: number,
  level: number,
) {
  if (!skyGradient || skyHeight !== height) {
    skyGradient = ctx.createLinearGradient(0, 0, 0, height)
    skyGradient.addColorStop(0, '#060818')
    skyGradient.addColorStop(0.55, '#0d1030')
    skyGradient.addColorStop(1, '#1b1240')
    skyHeight = height
  }
  ctx.fillStyle = skyGradient
  ctx.fillRect(0, 0, width, height)

  // Brilho de horizonte, embaixo, que pulsa de leve com o som.
  if (!horizonGradient || horizonWidth !== width || horizonHeight !== height) {
    const r = Math.max(width, height) * 0.75
    horizonGradient = ctx.createRadialGradient(width / 2, height * 1.1, 0, width / 2, height * 1.1, r)
    horizonGradient.addColorStop(0, 'rgba(124, 92, 255, 0.32)')
    horizonGradient.addColorStop(0.5, 'rgba(90, 70, 220, 0.12)')
    horizonGradient.addColorStop(1, 'rgba(60, 50, 180, 0)')
    horizonWidth = width
    horizonHeight = height
  }
  ctx.globalCompositeOperation = 'lighter'
  ctx.globalAlpha = Math.min(1, 0.55 + level * 0.9)
  ctx.fillStyle = horizonGradient
  ctx.fillRect(0, 0, width, height)
  ctx.globalAlpha = 1
  ctx.globalCompositeOperation = 'source-over'

  ctx.globalCompositeOperation = 'lighter'
  const star = glowSprite(WHITE_SLOT)
  const bokeh = bokehSprite()
  for (const layer of LAYERS) {
    // A camada acompanha uma fração do zoom também, com limites para não gerar estrelas demais.
    const scale = Math.max(0.6, Math.min(1.8, Math.pow(view.zoom, layer.depth * 1.5)))
    const drift = layer.bokeh ? clock * 4 : 0
    const cx = view.x * layer.depth + drift
    const cy = view.y * layer.depth
    const halfW = width / 2 / scale
    const halfH = height / 2 / scale
    const pad = layer.maxSize / scale
    const x0 = Math.floor((cx - halfW - pad) / layer.cell)
    const x1 = Math.floor((cx + halfW + pad) / layer.cell)
    const y0 = Math.floor((cy - halfH - pad) / layer.cell)
    const y1 = Math.floor((cy + halfH + pad) / layer.cell)
    const sprite = layer.bokeh ? bokeh : star
    const pulse = layer.bokeh ? 1 + level * 1.6 : 1
    for (let ix = x0; ix <= x1; ix++) {
      for (let iy = y0; iy <= y1; iy++) {
        for (let k = 0; k < layer.perCell; k++) {
          const seed = layer.seed + k * 101
          const rx = hash(ix, iy, seed)
          const ry = hash(ix, iy, seed + 1)
          const rs = hash(ix, iy, seed + 2)
          const lx = (ix + rx) * layer.cell
          const ly = (iy + ry) * layer.cell
          const sx = (lx - cx) * scale + width / 2
          const sy = (ly - cy) * scale + height / 2
          const size = (layer.minSize + (layer.maxSize - layer.minSize) * rs * rs) * (layer.bokeh ? 1 : 2.4)
          const twinkle = layer.bokeh ? 1 : 0.55 + 0.45 * Math.sin(clock * (1 + rs * 2.5) + rx * 40)
          ctx.globalAlpha = Math.min(1, layer.alpha * twinkle * pulse)
          ctx.drawImage(sprite, sx - size, sy - size, size * 2, size * 2)
        }
      }
    }
  }
  ctx.globalAlpha = 1
  ctx.globalCompositeOperation = 'source-over'

  if (editAlpha > 0.01) drawGrid(ctx, width, height, view, editAlpha)
}

// Grade discreta do modo de edição (pausado). O espaçamento dobra conforme o zoom diminui.
function drawGrid(ctx: CanvasRenderingContext2D, width: number, height: number, view: View, alpha: number) {
  let spacing = 50
  while (spacing * view.zoom < 28) spacing *= 2
  while (spacing * view.zoom > 120) spacing /= 2
  const left = view.x - width / 2 / view.zoom
  const top = view.y - height / 2 / view.zoom
  const right = view.x + width / 2 / view.zoom
  const bottom = view.y + height / 2 / view.zoom
  const toX = (x: number) => Math.round((x - view.x) * view.zoom + width / 2) + 0.5
  const toY = (y: number) => Math.round((y - view.y) * view.zoom + height / 2) + 0.5
  ctx.lineWidth = 1
  for (let pass = 0; pass < 2; pass++) {
    const major = pass === 1
    const step = major ? spacing * 4 : spacing
    ctx.strokeStyle = major ? 'rgba(165, 180, 252, 1)' : 'rgba(148, 163, 220, 1)'
    ctx.globalAlpha = alpha * (major ? 0.09 : 0.045)
    ctx.beginPath()
    for (let x = Math.ceil(left / step) * step; x <= right; x += step) {
      const sx = toX(x)
      ctx.moveTo(sx, 0)
      ctx.lineTo(sx, height)
    }
    for (let y = Math.ceil(top / step) * step; y <= bottom; y += step) {
      const sy = toY(y)
      ctx.moveTo(0, sy)
      ctx.lineTo(width, sy)
    }
    ctx.stroke()
  }
  ctx.globalAlpha = 1
}
