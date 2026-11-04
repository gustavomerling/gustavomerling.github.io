import {
  BADGE_HEIGHT_MM,
  BADGE_WIDTH_MM,
  DISPLAY,
  GROTESK,
  PHOTO_FRAMES,
  SANS,
  drawPhotoRect,
  drawTracked,
  fitTrackedSize,
  hexToRgba,
  layoutName,
  setFont,
  type BadgeData,
  type Ctx,
  type NameLayout,
} from './badge'
import type { Palette } from './palettes'

/* ------------------------------------------------------------------ */
/* Peças compartilhadas — tudo em cor chapada, sem degradê nem sombra  */
/* ------------------------------------------------------------------ */

// Número do crachá: momento em que a pessoa abriu a página, no formato AAMMDDHHMMSS
const BADGE_SERIAL = (() => {
  const now = new Date()
  return [
    now.getFullYear() % 100,
    now.getMonth() + 1,
    now.getDate(),
    now.getHours(),
    now.getMinutes(),
    now.getSeconds(),
  ]
    .map((part) => String(part).padStart(2, '0'))
    .join('')
})()

/** Tom secundário de um texto. Nas versões P&B fica 100% preto ou branco. */
function tone(palette: Palette, color: string, alpha: number): string {
  return palette.mono ? color : hexToRgba(color, alpha)
}

function roleText(data: BadgeData): string {
  return data.role.trim() || 'Administrador'
}

function fill(ctx: Ctx, color: string, x: number, y: number, w: number, h: number) {
  ctx.fillStyle = color
  ctx.fillRect(x, y, w, h)
}

function rule(ctx: Ctx, palette: Palette, x0: number, x1: number, y: number) {
  fill(ctx, tone(palette, palette.ink, 0.22), x0, y, x1 - x0, palette.mono ? 0.2 : 0.16)
}

function drawNameLines(
  ctx: Ctx,
  layout: NameLayout,
  x: number,
  top: number,
  color: string,
  align: CanvasTextAlign = 'left',
) {
  let y = top + layout.size * 0.37
  ctx.save()
  ctx.textAlign = align
  ctx.textBaseline = 'middle'
  ctx.fillStyle = color
  setFont(ctx, layout.size, DISPLAY)
  for (const line of layout.lines) {
    ctx.fillText(line, x, y)
    y += layout.lineHeight
  }
  ctx.restore()
}

function drawField(
  ctx: Ctx,
  palette: Palette,
  label: string,
  value: string,
  x: number,
  y: number,
  maxWidth: number,
) {
  drawTracked(ctx, label, x, y, {
    size: 1.05,
    family: SANS,
    weight: '700',
    color: tone(palette, palette.ink, 0.48),
    tracking: 0.16,
  })
  const size = fitTrackedSize(ctx, value, maxWidth, 2.15, 1.3, GROTESK, '700', 0.02)
  drawTracked(ctx, value, x, y + 2.75, {
    size,
    family: GROTESK,
    weight: '700',
    color: palette.ink,
    tracking: 0.02 * size,
  })
}

function drawSmall(
  ctx: Ctx,
  text: string,
  x: number,
  y: number,
  color: string,
  align: 'left' | 'center' | 'right' = 'left',
  tracking = 0.16,
  size = 1.1,
) {
  drawTracked(ctx, text, x, y, { size, family: SANS, weight: '800', color, tracking, align })
}

function drawBrasil(ctx: Ctx, x: number, y: number, color: string) {
  drawTracked(ctx, 'BRASIL', x, y, { size: 1.35, family: SANS, weight: '700', color, tracking: 0.55 })
}

function drawVerticalBrand(ctx: Ctx, cx: number, color: string, direction: 1 | -1) {
  ctx.save()
  ctx.translate(cx, BADGE_HEIGHT_MM / 2)
  ctx.rotate((direction * Math.PI) / 2)
  const size = fitTrackedSize(ctx, 'PARAMORE', 78, 17, 8, DISPLAY, '400', 0.05)
  drawTracked(ctx, 'PARAMORE', 0, 0, {
    size,
    family: DISPLAY,
    color,
    tracking: 0.05 * size,
    align: 'center',
  })
  ctx.restore()
}

/* ------------------------------------------------------------------ */
/* v1 · Coluna (a v4 original, chapada)                                */
/* ------------------------------------------------------------------ */

export function drawColumnBadge(ctx: Ctx, data: BadgeData) {
  const { palette } = data
  const column = 13
  const left = 17
  const right = 49.4

  fill(ctx, palette.bg, 0, 0, BADGE_WIDTH_MM, BADGE_HEIGHT_MM)
  fill(ctx, palette.block, 0, 0, column, BADGE_HEIGHT_MM)
  drawVerticalBrand(ctx, column / 2 + 0.35, palette.blockInk, -1)

  drawBrasil(ctx, left, 5.4, palette.accent)
  drawSmall(ctx, `Nº ${BADGE_SERIAL}`, right, 5.4, tone(palette, palette.ink, 0.5), 'right', 0.16, 1.35)
  rule(ctx, palette, left, right, 7.6)

  const photoW = right - left
  drawPhotoRect(ctx, data.photo, palette, left, 10, photoW, photoW / PHOTO_FRAMES[1].aspect)

  const name = layoutName(ctx, data.name, right - left - 1, 3, 7.2, 2.6, 14.5)
  drawNameLines(ctx, name, left, 51, palette.ink)

  rule(ctx, palette, left, right, 68.6)
  drawField(ctx, palette, 'FUNÇÃO', roleText(data), left, 70.6, right - left)

  fill(ctx, palette.accent, column, 77.6, BADGE_WIDTH_MM - column, BADGE_HEIGHT_MM - 77.6)
  drawTracked(ctx, 'EQUIPE', left, 82.2, {
    size: 5,
    family: DISPLAY,
    color: palette.accentInk,
    tracking: 0.22,
  })
  drawSmall(ctx, 'ALL ACCESS', right, 82, tone(palette, palette.accentInk, 0.7), 'right')
}

/* ------------------------------------------------------------------ */
/* v2 · Faixa — marca na horizontal, foto e dados lado a lado          */
/* ------------------------------------------------------------------ */

export function drawBandBadge(ctx: Ctx, data: BadgeData) {
  const { palette } = data
  const left = 4.8
  const right = 49.2
  const side = 29.4

  fill(ctx, palette.bg, 0, 0, BADGE_WIDTH_MM, BADGE_HEIGHT_MM)

  fill(ctx, palette.block, 0, 0, BADGE_WIDTH_MM, 20)
  const brandSize = fitTrackedSize(ctx, 'PARAMORE', right - left, 15, 8, DISPLAY, '400', 0.04)
  drawTracked(ctx, 'PARAMORE', left, 9.8, {
    size: brandSize,
    family: DISPLAY,
    color: palette.blockInk,
    tracking: 0.04 * brandSize,
  })
  drawBrasil(ctx, left + 0.2, 16.6, palette.blockInk)

  const photoW = side - 2.6 - left
  drawPhotoRect(ctx, data.photo, palette, left, 24, photoW, photoW / PHOTO_FRAMES[2].aspect)

  drawField(ctx, palette, 'FUNÇÃO', roleText(data), side, 24.6, right - side)
  rule(ctx, palette, side, right, 30.8)
  drawField(ctx, palette, 'Nº', BADGE_SERIAL, side, 32.8, right - side)

  fill(ctx, palette.accent, side, 43, right - side, 8)
  const tagSize = fitTrackedSize(ctx, 'EQUIPE', right - side - 3, 5.6, 3, DISPLAY, '400', 0.06)
  // Bebas tem só caixa-alta: o "middle" da fonte fica acima do centro visual das letras
  drawTracked(ctx, 'EQUIPE', (side + right) / 2, 47 + tagSize * 0.1, {
    size: tagSize,
    family: DISPLAY,
    color: palette.accentInk,
    tracking: 0.06 * tagSize,
    align: 'center',
  })

  const name = layoutName(ctx, data.name, right - left, 2, 8, 2.7, 15)
  const nameHeight = (name.lines.length - 1) * name.lineHeight + name.size * 0.74
  drawNameLines(ctx, name, left, 65 - nameHeight / 2, palette.ink)

  fill(ctx, palette.block, 0, 79.6, BADGE_WIDTH_MM, BADGE_HEIGHT_MM - 79.6)
  drawSmall(ctx, 'ALL ACCESS', left, 82.9, palette.blockInk, 'left', 0.22, 1.2)
  drawSmall(ctx, 'PARAMORE BRASIL', right, 82.9, tone(palette, palette.blockInk, 0.7), 'right', 0.22, 1.2)
}

/* ------------------------------------------------------------------ */
/* v3 · Sangria — foto de ponta a ponta com bloco da marca por cima    */
/* ------------------------------------------------------------------ */

export function drawBleedBadge(ctx: Ctx, data: BadgeData) {
  const { palette } = data
  const left = 4.8
  const right = 49.2

  fill(ctx, palette.bg, 0, 0, BADGE_WIDTH_MM, BADGE_HEIGHT_MM)
  drawPhotoRect(ctx, data.photo, palette, 0, 0, BADGE_WIDTH_MM, BADGE_WIDTH_MM / PHOTO_FRAMES[3].aspect)

  // Bloco da marca: PARAMORE + BRASIL juntos, sobrepostos à foto
  fill(ctx, palette.block, 0, 38.6, 40, 12.6)
  const brandSize = fitTrackedSize(ctx, 'PARAMORE', 31.6, 10, 6, DISPLAY, '400', 0.05)
  drawTracked(ctx, 'PARAMORE', left, 44.4, {
    size: brandSize,
    family: DISPLAY,
    color: palette.blockInk,
    tracking: 0.05 * brandSize,
  })
  drawBrasil(ctx, left + 0.2, 48.7, palette.blockInk)

  drawSmall(ctx, `Nº ${BADGE_SERIAL}`, right, 55.6, tone(palette, palette.ink, 0.5), 'right', 0.16, 1.2)

  const name = layoutName(ctx, data.name, right - left, 2, 7.6, 2.7, 11.2)
  drawNameLines(ctx, name, left, 58.2, palette.ink)

  rule(ctx, palette, left, right, 71.2)
  drawField(ctx, palette, 'FUNÇÃO', roleText(data), left, 73, right - left)

  fill(ctx, palette.accent, 0, 79.6, BADGE_WIDTH_MM, BADGE_HEIGHT_MM - 79.6)
  drawTracked(ctx, 'EQUIPE', left, 83.1, {
    size: 4.4,
    family: DISPLAY,
    color: palette.accentInk,
    tracking: 0.22,
  })
  drawSmall(ctx, 'ALL ACCESS', right, 82.9, tone(palette, palette.accentInk, 0.7), 'right')
}

/* ------------------------------------------------------------------ */
/* v4 · Bloco — coluna à direita e foto com bloco deslocado            */
/* ------------------------------------------------------------------ */

export function drawBlockBadge(ctx: Ctx, data: BadgeData) {
  const { palette } = data
  const column = 41
  const left = 4.8
  const right = 37.6
  const offset = 1.6

  fill(ctx, palette.bg, 0, 0, BADGE_WIDTH_MM, BADGE_HEIGHT_MM)
  fill(ctx, palette.block, column, 0, BADGE_WIDTH_MM - column, BADGE_HEIGHT_MM)
  drawVerticalBrand(ctx, column + (BADGE_WIDTH_MM - column) / 2 - 0.35, palette.blockInk, 1)

  drawBrasil(ctx, left, 5.4, palette.accent)
  drawSmall(ctx, `Nº ${BADGE_SERIAL}`, right, 5.4, tone(palette, palette.ink, 0.5), 'right', 0.16, 1.2)
  rule(ctx, palette, left, right, 7.6)

  const photoW = right - left - offset
  const photoH = photoW / PHOTO_FRAMES[4].aspect
  fill(ctx, palette.accent, left + offset, 10 + offset, photoW, photoH)
  drawPhotoRect(ctx, data.photo, palette, left, 10, photoW, photoH)

  const name = layoutName(ctx, data.name, right - left, 3, 7.2, 2.6, 14)
  drawNameLines(ctx, name, left, 52, palette.ink)

  rule(ctx, palette, left, right, 68.6)
  drawField(ctx, palette, 'FUNÇÃO', roleText(data), left, 70.6, right - left)

  drawTracked(ctx, 'EQUIPE', left, 81.2, {
    size: 6.4,
    family: DISPLAY,
    color: palette.accent,
    tracking: 0.22,
  })
  drawSmall(ctx, 'ALL ACCESS', right, 81, tone(palette, palette.ink, 0.5), 'right')
}
