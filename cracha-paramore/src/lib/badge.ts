import { drawAlbumBackdrop } from './album-art'
import type { Album } from './albums'
import { drawEditorialBadge, drawPolaroidBadge, drawTicketBadge } from './badge-variants'

export const BADGE_WIDTH_MM = 54
export const BADGE_HEIGHT_MM = 86

export const DISPLAY = '"Bebas Neue", "Inter", sans-serif'
export const SANS = '"Inter", sans-serif'
export const GOLD = '#e8c873'
export const GOLD_DEEP = '#a8843c'

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
  1: { aspect: 1, shape: 'round', label: 'circular' },
  2: { aspect: 19.4 / 24, shape: 'rect', label: 'retrato' },
  3: { aspect: 1, shape: 'rect', label: 'quadrado (polaroid)' },
  4: { aspect: 32.4 / 37.5, shape: 'rect', label: 'retrato' },
}

export interface BadgeData {
  name: string
  role: string
  album: Album
  isAdmin: boolean
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

function drawName(ctx: Ctx, layout: NameLayout, centerY: number) {
  const visualHeight = (layout.lines.length - 1) * layout.lineHeight + layout.size * 0.74
  let y = centerY - visualHeight / 2 + layout.size * 0.37
  ctx.save()
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillStyle = '#f8f4ec'
  ctx.shadowColor = 'rgba(0,0,0,0.35)'
  ctx.shadowBlur = 1.1
  ctx.shadowOffsetY = 0.25
  setFont(ctx, layout.size, DISPLAY)
  for (const line of layout.lines) {
    ctx.fillText(line, BADGE_WIDTH_MM / 2, y)
    y += layout.lineHeight
  }
  ctx.restore()
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

function brandHeader(ctx: Ctx, isAdmin: boolean) {
  drawTracked(ctx, 'PARAMORE', 4.8, 7.1, {
    size: 4.8,
    family: DISPLAY,
    color: '#fbf7ef',
    tracking: 0.16,
  })
  drawTracked(ctx, 'BRASIL', 5.0, 10.8, {
    size: 1.45,
    family: SANS,
    weight: '700',
    color: isAdmin ? GOLD : 'rgba(255,255,255,0.72)',
    tracking: 0.52,
  })
}

function drawPlaceholderPhoto(ctx: Ctx, cx: number, cy: number, r: number, album: Album) {
  const gradient = ctx.createLinearGradient(cx - r, cy - r, cx + r, cy + r)
  gradient.addColorStop(0, album.palette.primary)
  gradient.addColorStop(1, album.palette.panel)
  ctx.fillStyle = gradient
  ctx.fillRect(cx - r, cy - r, r * 2, r * 2)
  ctx.fillStyle = 'rgba(0,0,0,0.24)'
  ctx.fillRect(cx - r, cy - r, r * 2, r * 2)

  ctx.save()
  ctx.fillStyle = 'rgba(255,255,255,0.38)'
  ctx.beginPath()
  ctx.arc(cx, cy - r * 0.24, r * 0.27, 0, Math.PI * 2)
  ctx.fill()
  ctx.beginPath()
  ctx.ellipse(cx, cy + r * 0.48, r * 0.52, r * 0.34, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

function drawPhoto(
  ctx: Ctx,
  photo: HTMLImageElement | null,
  cx: number,
  cy: number,
  r: number,
  album: Album,
  isAdmin: boolean,
) {
  ctx.save()
  ctx.shadowColor = 'rgba(0,0,0,0.6)'
  ctx.shadowBlur = 2.2
  ctx.shadowOffsetY = 0.9
  ctx.fillStyle = album.palette.panel
  ctx.beginPath()
  ctx.arc(cx, cy, r + 1.35, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()

  ctx.save()
  ctx.beginPath()
  ctx.arc(cx, cy, r, 0, Math.PI * 2)
  ctx.clip()
  if (photo) {
    const scale = Math.max((r * 2) / photo.width, (r * 2) / photo.height)
    const width = photo.width * scale
    const height = photo.height * scale
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(photo, cx - width / 2, cy - height / 2, width, height)
  } else {
    drawPlaceholderPhoto(ctx, cx, cy, r, album)
  }
  const shade = ctx.createLinearGradient(0, cy + r * 0.25, 0, cy + r)
  shade.addColorStop(0, 'rgba(0,0,0,0)')
  shade.addColorStop(1, 'rgba(0,0,0,0.2)')
  ctx.fillStyle = shade
  ctx.fillRect(cx - r, cy, r * 2, r)
  ctx.restore()

  if (isAdmin) {
    ctx.save()
    ctx.strokeStyle = hexToRgba(GOLD, 0.85)
    ctx.lineWidth = 0.55
    ctx.beginPath()
    ctx.arc(cx, cy, r + 0.35, 0, Math.PI * 2)
    ctx.stroke()
    ctx.strokeStyle = 'rgba(255,255,255,0.55)'
    ctx.lineWidth = 0.22
    ctx.beginPath()
    ctx.arc(cx, cy, r + 1.05, 0, Math.PI * 2)
    ctx.stroke()
    ctx.fillStyle = GOLD
    for (let index = 0; index < 4; index++) {
      const angle = (index / 4) * Math.PI * 2 + Math.PI / 4
      ctx.beginPath()
      ctx.arc(
        cx + Math.cos(angle) * (r + 1.95),
        cy + Math.sin(angle) * (r + 1.95),
        0.32,
        0,
        Math.PI * 2,
      )
      ctx.fill()
    }
    ctx.restore()
  } else {
    ctx.save()
    ctx.strokeStyle = '#faf6ee'
    ctx.lineWidth = 0.85
    ctx.beginPath()
    ctx.arc(cx, cy, r + 0.55, 0, Math.PI * 2)
    ctx.stroke()
    ctx.strokeStyle = album.palette.accent
    ctx.lineWidth = 0.38
    ctx.beginPath()
    ctx.arc(cx, cy, r + 1.15, 0, Math.PI * 2)
    ctx.stroke()
    ctx.restore()
  }
}

function drawPill(ctx: Ctx, cx: number, cy: number, width: number, height: number) {
  roundRectPath(ctx, cx - width / 2, cy - height / 2, width, height, height / 2)
}

export function pinstripes(ctx: Ctx, color: string, spacing: number) {
  ctx.save()
  ctx.strokeStyle = color
  ctx.lineWidth = 0.14
  ctx.beginPath()
  for (let x = -BADGE_HEIGHT_MM; x < BADGE_WIDTH_MM; x += spacing) {
    ctx.moveTo(x, BADGE_HEIGHT_MM)
    ctx.lineTo(x + BADGE_HEIGHT_MM, 0)
  }
  ctx.stroke()
  ctx.restore()
}

function panelPath(ctx: Ctx, top: number, radius: number) {
  ctx.beginPath()
  ctx.moveTo(0, BADGE_HEIGHT_MM)
  ctx.lineTo(0, top + radius)
  ctx.quadraticCurveTo(0, top, radius, top)
  ctx.lineTo(BADGE_WIDTH_MM - radius, top)
  ctx.quadraticCurveTo(BADGE_WIDTH_MM, top, BADGE_WIDTH_MM, top + radius)
  ctx.lineTo(BADGE_WIDTH_MM, BADGE_HEIGHT_MM)
  ctx.closePath()
}

function drawFanBadge(ctx: Ctx, data: BadgeData) {
  const album = data.album
  const palette = album.palette

  drawAlbumBackdrop(ctx, album, 0, 0, BADGE_WIDTH_MM, 48)

  const topScrim = ctx.createLinearGradient(0, 0, 0, 18)
  topScrim.addColorStop(0, 'rgba(8,8,10,0.94)')
  topScrim.addColorStop(0.62, 'rgba(8,8,10,0.9)')
  topScrim.addColorStop(1, 'rgba(8,8,10,0)')
  ctx.fillStyle = topScrim
  ctx.fillRect(0, 0, BADGE_WIDTH_MM, 18)

  const headerRule = ctx.createLinearGradient(5, 0, 49, 0)
  headerRule.addColorStop(0, hexToRgba(palette.accent, 0))
  headerRule.addColorStop(0.5, hexToRgba(palette.accent, 0.42))
  headerRule.addColorStop(1, hexToRgba(palette.accent, 0))
  ctx.strokeStyle = headerRule
  ctx.lineWidth = 0.2
  ctx.beginPath()
  ctx.moveTo(4.8, 13.2)
  ctx.lineTo(49.2, 13.2)
  ctx.stroke()

  panelPath(ctx, 42.5, 7.5)
  ctx.fillStyle = palette.panel
  ctx.fill()
  ctx.save()
  panelPath(ctx, 42.5, 7.5)
  ctx.clip()
  const panelShade = ctx.createLinearGradient(0, 42.5, 0, BADGE_HEIGHT_MM)
  panelShade.addColorStop(0, 'rgba(0,0,0,0)')
  panelShade.addColorStop(0.5, 'rgba(0,0,0,0.22)')
  panelShade.addColorStop(1, 'rgba(0,0,0,0.4)')
  ctx.fillStyle = panelShade
  ctx.fillRect(0, 42.5, BADGE_WIDTH_MM, BADGE_HEIGHT_MM - 42.5)
  const photoGlow = ctx.createRadialGradient(27, 51, 1, 27, 51, 26)
  photoGlow.addColorStop(0, hexToRgba(palette.accent, 0.18))
  photoGlow.addColorStop(1, hexToRgba(palette.accent, 0))
  ctx.fillStyle = photoGlow
  ctx.fillRect(0, 42.5, BADGE_WIDTH_MM, BADGE_HEIGHT_MM - 42.5)
  pinstripes(ctx, 'rgba(255,255,255,0.025)', 3.8)
  ctx.restore()

  const edge = ctx.createLinearGradient(5, 0, 49, 0)
  edge.addColorStop(0, hexToRgba(palette.accent, 0))
  edge.addColorStop(0.5, hexToRgba(palette.accent, 0.9))
  edge.addColorStop(1, hexToRgba(palette.accent, 0))
  ctx.strokeStyle = edge
  ctx.lineWidth = 0.35
  ctx.beginPath()
  ctx.moveTo(7, 42.7)
  ctx.lineTo(47, 42.7)
  ctx.stroke()

  brandHeader(ctx, false)
  drawPhoto(ctx, data.photo, 27, 51.2, 12.2, album, false)

  ctx.save()
  drawPill(ctx, 27, 63.4, 20.5, 3.9)
  const ribbon = ctx.createLinearGradient(16, 0, 38, 0)
  ribbon.addColorStop(0, palette.primary)
  ribbon.addColorStop(1, palette.accent)
  ctx.fillStyle = ribbon
  ctx.fill()
  ctx.strokeStyle = 'rgba(255,255,255,0.35)'
  ctx.lineWidth = 0.18
  ctx.stroke()
  drawTracked(ctx, 'FÃ OFICIAL', 27, 63.55, {
    size: 1.8,
    family: SANS,
    weight: '800',
    color: '#0b0b0e',
    tracking: 0.17,
    align: 'center',
  })
  ctx.restore()

  const name = layoutName(ctx, data.name, 45.5, 2, 7.8, 2.7, 10.4)
  drawName(ctx, name, 74.2)

  const bar = ctx.createLinearGradient(0, 0, BADGE_WIDTH_MM, 0)
  bar.addColorStop(0, palette.primary)
  bar.addColorStop(0.5, palette.accent)
  bar.addColorStop(1, palette.highlight)
  ctx.fillStyle = bar
  ctx.fillRect(0, 84.7, BADGE_WIDTH_MM, 1.3)
}

function drawAdminBadge(ctx: Ctx, data: BadgeData) {
  const album = data.album

  ctx.fillStyle = '#08080b'
  ctx.fillRect(0, 0, BADGE_WIDTH_MM, BADGE_HEIGHT_MM)
  drawAlbumBackdrop(ctx, album, 0, 0, BADGE_WIDTH_MM, 48)

  const veil = ctx.createLinearGradient(0, 0, 0, 48)
  veil.addColorStop(0, 'rgba(4,4,7,0.7)')
  veil.addColorStop(0.34, 'rgba(4,4,7,0.42)')
  veil.addColorStop(0.74, 'rgba(6,6,9,0.82)')
  veil.addColorStop(1, '#08080b')
  ctx.fillStyle = veil
  ctx.fillRect(0, 0, BADGE_WIDTH_MM, 48)

  const topScrim = ctx.createLinearGradient(0, 0, 0, 18)
  topScrim.addColorStop(0, 'rgba(6,6,9,0.94)')
  topScrim.addColorStop(0.62, 'rgba(6,6,9,0.86)')
  topScrim.addColorStop(1, 'rgba(6,6,9,0)')
  ctx.fillStyle = topScrim
  ctx.fillRect(0, 0, BADGE_WIDTH_MM, 18)

  pinstripes(ctx, 'rgba(255,255,255,0.022)', 4.4)

  const bottomShade = ctx.createLinearGradient(0, 42, 0, BADGE_HEIGHT_MM)
  bottomShade.addColorStop(0, '#08080b')
  bottomShade.addColorStop(1, '#0b0a08')
  ctx.fillStyle = bottomShade
  ctx.fillRect(0, 42, BADGE_WIDTH_MM, BADGE_HEIGHT_MM - 42)

  const goldGlow = ctx.createRadialGradient(27, 52, 1, 27, 52, 28)
  goldGlow.addColorStop(0, hexToRgba(GOLD, 0.09))
  goldGlow.addColorStop(1, hexToRgba(GOLD, 0))
  ctx.fillStyle = goldGlow
  ctx.fillRect(0, 42, BADGE_WIDTH_MM, BADGE_HEIGHT_MM - 42)

  brandHeader(ctx, true)

  ctx.strokeStyle = hexToRgba(GOLD, 0.28)
  ctx.lineWidth = 0.2
  ctx.beginPath()
  ctx.moveTo(4.8, 13.2)
  ctx.lineTo(49.2, 13.2)
  ctx.stroke()

  drawPhoto(ctx, data.photo, 27, 51.2, 12.2, album, true)

  ctx.save()
  drawPill(ctx, 27, 63.4, 20.5, 3.9)
  const gold = ctx.createLinearGradient(16, 0, 38, 0)
  gold.addColorStop(0, '#f6e3a8')
  gold.addColorStop(0.52, GOLD)
  gold.addColorStop(1, '#c7a24f')
  ctx.fillStyle = gold
  ctx.fill()
  ctx.strokeStyle = 'rgba(255,255,255,0.42)'
  ctx.lineWidth = 0.18
  ctx.stroke()
  drawTracked(ctx, 'EQUIPE', 27, 63.55, {
    size: 1.9,
    family: SANS,
    weight: '800',
    color: '#171208',
    tracking: 0.4,
    align: 'center',
  })
  ctx.restore()

  const name = layoutName(ctx, data.name, 44.5, 2, 7.4, 2.6, 9.6)
  drawName(ctx, name, 73.9)

  const role = (data.role.trim() || 'Administrador').toLocaleUpperCase('pt-BR')
  const roleSize = fitTrackedSize(ctx, role, 42, 1.9, 1.3, SANS, '700', 0.18)
  drawTracked(ctx, role, 27, 80.7, {
    size: roleSize,
    family: SANS,
    weight: '700',
    color: GOLD,
    tracking: 0.18 * roleSize,
    align: 'center',
  })

  const bar = ctx.createLinearGradient(0, 0, BADGE_WIDTH_MM, 0)
  bar.addColorStop(0, GOLD_DEEP)
  bar.addColorStop(0.42, GOLD)
  bar.addColorStop(0.72, '#f7e9bb')
  bar.addColorStop(1, GOLD_DEEP)
  ctx.fillStyle = bar
  ctx.fillRect(0, 84.7, BADGE_WIDTH_MM, 1.3)
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
  if (data.variant === 2) drawTicketBadge(ctx, data)
  else if (data.variant === 3) drawPolaroidBadge(ctx, data)
  else if (data.variant === 4) drawEditorialBadge(ctx, data)
  else if (data.isAdmin) drawAdminBadge(ctx, data)
  else drawFanBadge(ctx, data)
  ctx.restore()
}

export function createBadgeCanvas(data: BadgeData, dpi: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  const width = Math.round((BADGE_WIDTH_MM / 25.4) * dpi)
  renderBadge(canvas, data, width)
  return canvas
}
