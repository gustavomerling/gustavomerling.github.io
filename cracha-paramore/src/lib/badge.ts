import type { Palette } from './palettes'
import { drawBandBadge, drawBleedBadge, drawBlockBadge, drawColumnBadge } from './badge-variants'

export const BADGE_WIDTH_MM = 54
export const BADGE_HEIGHT_MM = 86

export const DISPLAY = '"Bebas Neue", "Inter", sans-serif'
export const SANS = '"Inter", sans-serif'
export const GROTESK = '"Space Grotesk", "Inter", sans-serif'

export const BADGE_VARIANTS = [1, 2, 3, 4] as const
export type BadgeVariant = (typeof BADGE_VARIANTS)[number]

export interface PhotoFrame {
  /** Largura ÷ altura do recorte no crachá */
  aspect: number
  shape: 'round' | 'rect'
  label: string
}

// Mantém o recorte da foto em sincronia com o desenho de cada versão
export const PHOTO_FRAMES: Record<BadgeVariant, PhotoFrame> = {
  1: { aspect: 32.4 / 37.5, shape: 'rect', label: 'retrato' },
  2: { aspect: 22 / 27, shape: 'rect', label: 'retrato' },
  3: { aspect: 54 / 46, shape: 'rect', label: 'paisagem (de ponta a ponta)' },
  4: { aspect: 31.2 / 36,shape: 'rect', label: 'retrato' },
}

export interface BadgeData {
  name: string
  role: string
  palette: Palette
  variant: BadgeVariant
  photo: HTMLImageElement | null
}

export type Ctx = CanvasRenderingContext2D

export function setFont(ctx: Ctx, size: number, family: string, weight = '400') {
  ctx.font = `${weight} ${size}px ${family}`
}

export function measureTracked(ctx: Ctx, text: string, tracking: number): number {
  const widths = [...text].map((char) => ctx.measureText(char).width)
  return widths.reduce((sum, width) => sum + width, 0) + tracking * Math.max(0, text.length - 1)
}

export function drawTracked(
  ctx: Ctx,
  text: string,
  x: number,
  y: number,
  options: {
    size: number
    family: string
    weight?: string
    color: string
    tracking?: number
    align?: 'left' | 'center' | 'right'
    baseline?: CanvasTextBaseline
  },
) {
  const tracking = options.tracking ?? 0
  setFont(ctx, options.size, options.family, options.weight)
  const total = measureTracked(ctx, text, tracking)
  let cursor = x
  if (options.align === 'center') cursor = x - total / 2
  if (options.align === 'right') cursor = x - total
  ctx.fillStyle = options.color
  ctx.textBaseline = options.baseline ?? 'middle'
  for (let index = 0; index < text.length; index++) {
    ctx.fillText(text[index]!, cursor, y)
    cursor += ctx.measureText(text[index]!).width + tracking
  }
}

export function fitTrackedSize(
  ctx: Ctx,
  text: string,
  maxWidth: number,
  maxSize: number,
  minSize: number,
  family: string,
  weight: string,
  trackingRatio = 0.12,
): number {
  for (let size = maxSize; size >= minSize; size -= 0.1) {
    setFont(ctx, size, family, weight)
    if (measureTracked(ctx, text, trackingRatio * size) <= maxWidth) return size
  }
  return minSize
}

function wrapLines(ctx: Ctx, text: string, maxWidth: number): string[] {
  const words = text.split(/\s+/).filter(Boolean)
  const lines: string[] = []
  let current = ''
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word
    if (ctx.measureText(candidate).width <= maxWidth) {
      current = candidate
    } else {
      if (current) lines.push(current)
      current = word
    }
  }
  if (current) lines.push(current)
  return lines
}

export interface NameLayout {
  lines: string[]
  size: number
  lineHeight: number
}

export function layoutName(
  ctx: Ctx,
  name: string,
  maxWidth: number,
  maxLines: number,
  maxSize: number,
  minSize: number,
  maxHeight: number,
): NameLayout {
  const text = (name.trim() || 'Seu nome').toLocaleUpperCase('pt-BR')
  for (let size = maxSize; size >= minSize; size -= 0.1) {
    setFont(ctx, size, DISPLAY)
    const lines = wrapLines(ctx, text, maxWidth)
    const lineHeight = size * 0.92
    const visualHeight = (lines.length - 1) * lineHeight + size * 0.74
    const fitsLines =
      lines.length <= maxLines && lines.every((line) => ctx.measureText(line).width <= maxWidth)
    if (fitsLines && visualHeight <= maxHeight) {
      return { lines, size, lineHeight }
    }
  }

  setFont(ctx, minSize, DISPLAY)
  let lines = wrapLines(ctx, text, maxWidth)
  if (lines.length > maxLines) {
    lines = lines.slice(0, maxLines)
    const last = lines[lines.length - 1] ?? ''
    lines[lines.length - 1] = last.length > 1 ? `${last.slice(0, -1)}…` : last
  }
  return { lines, size: minSize, lineHeight: minSize * 0.92 }
}

export function roundRectPath(ctx: Ctx, x: number, y: number, w: number, h: number, r: number) {
  const radius = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + radius, y)
  ctx.lineTo(x + w - radius, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius)
  ctx.lineTo(x + w, y + h - radius)
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h)
  ctx.lineTo(x + radius, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius)
  ctx.lineTo(x, y + radius)
  ctx.quadraticCurveTo(x, y, x + radius, y)
  ctx.closePath()
}

export function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace('#', '')
  const value =
    clean.length === 3
      ? clean
          .split('')
          .map((char) => char + char)
          .join('')
      : clean
  const int = Number.parseInt(value, 16)
  const r = (int >> 16) & 255
  const g = (int >> 8) & 255
  const b = int & 255
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

/** Foto recortada no retângulo (ou silhueta chapada quando ainda não há foto). */
export function drawPhotoRect(
  ctx: Ctx,
  photo: HTMLImageElement | null,
  palette: Palette,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  ctx.save()
  ctx.beginPath()
  ctx.rect(x, y, w, h)
  ctx.clip()
  if (photo) {
    const source = photo
    const scale = Math.max(w / source.width, h / source.height)
    const width = source.width * scale
    const height = source.height * scale
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(source, x + (w - width) / 2, y + (h - height) / 2, width, height)
  } else {
    ctx.fillStyle = palette.block
    ctx.fillRect(x, y, w, h)
    const unit = Math.min(w, h)
    ctx.fillStyle = hexToRgba(palette.blockInk, 0.4)
    ctx.beginPath()
    ctx.arc(x + w / 2, y + h * 0.42, unit * 0.17, 0, Math.PI * 2)
    ctx.fill()
    ctx.beginPath()
    ctx.ellipse(x + w / 2, y + h * 0.9, unit * 0.34, unit * 0.24, 0, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.restore()
}

export function renderBadge(canvas: HTMLCanvasElement, data: BadgeData, widthPx: number) {
  const width = Math.max(1, Math.round(widthPx))
  const height = Math.round((width * BADGE_HEIGHT_MM) / BADGE_WIDTH_MM)
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  ctx.clearRect(0, 0, width, height)
  ctx.save()
  ctx.scale(width / BADGE_WIDTH_MM, height / BADGE_HEIGHT_MM)
  roundRectPath(ctx, 0, 0, BADGE_WIDTH_MM, BADGE_HEIGHT_MM, 3.18)
  ctx.clip()
  if (data.variant === 2) drawBandBadge(ctx, data)
  else if (data.variant === 3) drawBleedBadge(ctx, data)
  else if (data.variant === 4) drawBlockBadge(ctx, data)
  else drawColumnBadge(ctx, data)
  ctx.restore()
}

export function createBadgeCanvas(data: BadgeData, dpi: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  const width = Math.round((BADGE_WIDTH_MM / 25.4) * dpi)
  renderBadge(canvas, data, width)
  return canvas
}
