import { drawAlbumBackdrop } from './album-art'
import { getAlbumCover } from './album-covers'
import type { Album } from './albums'
import {
  BADGE_HEIGHT_MM,
  BADGE_WIDTH_MM,
  DISPLAY,
  GOLD,
  GOLD_DEEP,
  PHOTO_FRAMES,
  SANS,
  drawTracked,
  fitTrackedSize,
  hexToRgba,
  layoutName,
  pinstripes,
  roundRectPath,
  setFont,
  type BadgeData,
  type Ctx,
  type NameLayout,
} from './badge'

const GROTESK = '"Space Grotesk", "Inter", sans-serif'
const PAPER = '#f3ede2'
const INK = '#16141a'

/* ------------------------------------------------------------------ */
/* Shared pieces                                                       */
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

function goldGradient(ctx: Ctx, x0: number, x1: number): CanvasGradient {
  const gradient = ctx.createLinearGradient(x0, 0, x1, 0)
  gradient.addColorStop(0, GOLD_DEEP)
  gradient.addColorStop(0.42, GOLD)
  gradient.addColorStop(0.72, '#f7e9bb')
  gradient.addColorStop(1, GOLD_DEEP)
  return gradient
}

function paletteGradient(ctx: Ctx, album: Album, x0: number, x1: number): CanvasGradient {
  const gradient = ctx.createLinearGradient(x0, 0, x1, 0)
  gradient.addColorStop(0, album.palette.primary)
  gradient.addColorStop(0.5, album.palette.accent)
  gradient.addColorStop(1, album.palette.highlight)
  return gradient
}

function drawNameLines(
  ctx: Ctx,
  layout: NameLayout,
  x: number,
  top: number,
  options: { align: CanvasTextAlign; color: string; shadow?: boolean },
) {
  let y = top + layout.size * 0.37
  ctx.save()
  ctx.textAlign = options.align
  ctx.textBaseline = 'middle'
  ctx.fillStyle = options.color
  if (options.shadow) {
    ctx.shadowColor = 'rgba(0,0,0,0.35)'
    ctx.shadowBlur = 1.1
    ctx.shadowOffsetY = 0.25
  }
  setFont(ctx, layout.size, DISPLAY)
  for (const line of layout.lines) {
    ctx.fillText(line, x, y)
    y += layout.lineHeight
  }
  ctx.restore()
}

function nameHeight(layout: NameLayout): number {
  return (layout.lines.length - 1) * layout.lineHeight + layout.size * 0.74
}

function drawPhotoRect(
  ctx: Ctx,
  photo: HTMLImageElement | null,
  x: number,
  y: number,
  w: number,
  h: number,
  radius: number,
  album: Album,
) {
  ctx.save()
  roundRectPath(ctx, x, y, w, h, radius)
  ctx.clip()
  if (photo) {
    const scale = Math.max(w / photo.width, h / photo.height)
    const width = photo.width * scale
    const height = photo.height * scale
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(photo, x + (w - width) / 2, y + (h - height) / 2, width, height)
  } else {
    const gradient = ctx.createLinearGradient(x, y, x + w, y + h)
    gradient.addColorStop(0, album.palette.primary)
    gradient.addColorStop(1, album.palette.panel)
    ctx.fillStyle = gradient
    ctx.fillRect(x, y, w, h)
    ctx.fillStyle = 'rgba(0,0,0,0.24)'
    ctx.fillRect(x, y, w, h)
    const unit = Math.min(w, h)
    ctx.fillStyle = 'rgba(255,255,255,0.38)'
    ctx.beginPath()
    ctx.arc(x + w / 2, y + h * 0.42, unit * 0.17, 0, Math.PI * 2)
    ctx.fill()
    ctx.beginPath()
    ctx.ellipse(x + w / 2, y + h * 0.9, unit * 0.34, unit * 0.24, 0, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.restore()
}

function drawCoverSquare(ctx: Ctx, album: Album, x: number, y: number, size: number) {
  const cover = getAlbumCover(album)
  if (cover) {
    ctx.save()
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(cover, x, y, size, size)
    ctx.restore()
  } else {
    drawAlbumBackdrop(ctx, album, x, y, size, size)
  }
}

function drawBarcode(
  ctx: Ctx,
  seed: string,
  x: number,
  y: number,
  w: number,
  h: number,
  color: string | CanvasGradient,
) {
  let state = (Number(seed) % 2147483647) + 17
  const next = () => {
    state = (state * 1103515245 + 12345) % 2147483648
    return state / 2147483648
  }
  ctx.save()
  ctx.fillStyle = color
  let cursor = x
  while (cursor < x + w) {
    const bar = 0.16 + next() * 0.46
    if (cursor + bar > x + w) break
    ctx.fillRect(cursor, y, bar, h)
    cursor += bar + 0.2 + next() * 0.3
  }
  ctx.restore()
}

function drawField(
  ctx: Ctx,
  label: string,
  value: string,
  x: number,
  y: number,
  maxWidth: number,
  colors: { label: string; value: string },
) {
  drawTracked(ctx, label, x, y, {
    size: 1.05,
    family: SANS,
    weight: '700',
    color: colors.label,
    tracking: 0.16,
  })
  const size = fitTrackedSize(ctx, value, maxWidth, 2.15, 1.3, GROTESK, '700', 0.02)
  drawTracked(ctx, value, x, y + 2.75, {
    size,
    family: GROTESK,
    weight: '700',
    color: colors.value,
    tracking: 0.02 * size,
  })
}

/* ------------------------------------------------------------------ */
/* v2 · Ingresso                                                       */
/* ------------------------------------------------------------------ */

export function drawTicketBadge(ctx: Ctx, data: BadgeData) {
  const { album, isAdmin } = data
  const palette = album.palette
  const serial = BADGE_SERIAL
  const stubTop = 74.2

  ctx.fillStyle = PAPER
  ctx.fillRect(0, 0, BADGE_WIDTH_MM, BADGE_HEIGHT_MM)
  pinstripes(ctx, 'rgba(0,0,0,0.03)', 1.6)

  // Capa do álbum no topo, escurecendo para baixo
  drawAlbumBackdrop(ctx, album, 0, 0, BADGE_WIDTH_MM, 31)
  const coverShade = ctx.createLinearGradient(0, 4, 0, 31)
  coverShade.addColorStop(0, 'rgba(8,8,10,0)')
  coverShade.addColorStop(0.45, isAdmin ? 'rgba(8,8,10,0.72)' : 'rgba(8,8,10,0.62)')
  coverShade.addColorStop(1, isAdmin ? 'rgba(8,8,10,0.96)' : 'rgba(8,8,10,0.92)')
  ctx.fillStyle = coverShade
  ctx.fillRect(0, 0, BADGE_WIDTH_MM, 31)
  const topShade = ctx.createLinearGradient(0, 0, 0, 8)
  topShade.addColorStop(0, 'rgba(8,8,10,0.55)')
  topShade.addColorStop(1, 'rgba(8,8,10,0)')
  ctx.fillStyle = topShade
  ctx.fillRect(0, 0, BADGE_WIDTH_MM, 8)

  // Chips do topo
  roundRectPath(ctx, 4.2, 3.2, 18.4, 3.3, 1.65)
  ctx.fillStyle = 'rgba(8,8,10,0.62)'
  ctx.fill()
  drawTracked(ctx, `Nº ${serial}`, 13.4, 4.9, {
    size: 1.35,
    family: SANS,
    weight: '700',
    color: 'rgba(255,255,255,0.88)',
    tracking: 0.12,
    align: 'center',
  })
  const chipLabel = isAdmin ? 'EQUIPE' : String(album.year)
  roundRectPath(ctx, 38.2, 3.2, 11.6, 3.3, 1.65)
  ctx.fillStyle = isAdmin ? goldGradient(ctx, 38.2, 49.8) : 'rgba(8,8,10,0.62)'
  ctx.fill()
  drawTracked(ctx, chipLabel, 44, 4.9, {
    size: 1.35,
    family: SANS,
    weight: '800',
    color: isAdmin ? '#171208' : 'rgba(255,255,255,0.88)',
    tracking: 0.2,
    align: 'center',
  })

  drawTracked(ctx, 'PARAMORE', 4.6, 23.4, {
    size: 8.6,
    family: DISPLAY,
    color: '#fbf7ef',
    tracking: 0.3,
  })
  drawTracked(ctx, 'BRASIL', 4.9, 28.2, {
    size: 1.45,
    family: SANS,
    weight: '700',
    color: isAdmin ? GOLD : 'rgba(255,255,255,0.72)',
    tracking: 0.55,
  })

  ctx.fillStyle = isAdmin ? goldGradient(ctx, 0, BADGE_WIDTH_MM) : paletteGradient(ctx, album, 0, BADGE_WIDTH_MM)
  ctx.fillRect(0, 31, BADGE_WIDTH_MM, 1.2)

  // Foto + campos
  const photoW = 24 * PHOTO_FRAMES[2].aspect
  drawPhotoRect(ctx, data.photo, 4.8, 35.4, photoW, 24, 1.2, album)
  roundRectPath(ctx, 4.8, 35.4, photoW, 24, 1.2)
  ctx.strokeStyle = isAdmin ? hexToRgba(GOLD_DEEP, 0.9) : hexToRgba(INK, 0.85)
  ctx.lineWidth = 0.28
  ctx.stroke()

  const fieldColors = { label: hexToRgba(INK, 0.48), value: INK }
  const role = (data.role.trim() || 'Administrador').toLocaleUpperCase('pt-BR')
  const fields: [string, string][] = isAdmin
    ? [
        ['CATEGORIA', 'EQUIPE'],
        ['FUNÇÃO', role],
        ['ÁLBUM', album.shortTitle.toLocaleUpperCase('pt-BR')],
      ]
    : [
        ['CATEGORIA', 'FÃ OFICIAL'],
        ['ÁLBUM', album.shortTitle.toLocaleUpperCase('pt-BR')],
        ['ANO', String(album.year)],
      ]
  fields.forEach(([label, value], index) => {
    const y = 36.4 + index * 7.6
    drawField(ctx, label, value, 27.4, y, 21.8, fieldColors)
    if (index < fields.length - 1) {
      ctx.strokeStyle = hexToRgba(INK, 0.14)
      ctx.lineWidth = 0.16
      ctx.beginPath()
      ctx.moveTo(27.4, y + 5.4)
      ctx.lineTo(49.2, y + 5.4)
      ctx.stroke()
    }
  })

  const name = layoutName(ctx, data.name, 44.4, 2, 7.6, 2.7, 9.6)
  drawNameLines(ctx, name, 4.8, 67 - nameHeight(name) / 2, { align: 'left', color: INK })

  // Canhoto destacável
  ctx.fillStyle = isAdmin ? '#0b0a08' : palette.panel
  ctx.fillRect(0, stubTop, BADGE_WIDTH_MM, BADGE_HEIGHT_MM - stubTop)
  ctx.save()
  ctx.strokeStyle = PAPER
  ctx.lineWidth = 0.3
  ctx.setLineDash([0.7, 0.55])
  ctx.beginPath()
  ctx.moveTo(0, stubTop + 0.15)
  ctx.lineTo(BADGE_WIDTH_MM, stubTop + 0.15)
  ctx.stroke()
  ctx.restore()

  drawBarcode(
    ctx,
    serial,
    4.8,
    76.8,
    18,
    6.6,
    isAdmin ? goldGradient(ctx, 4.8, 22.8) : 'rgba(255,255,255,0.86)',
  )
  drawTracked(ctx, isAdmin ? 'ALL ACCESS' : 'ADMIT ONE', 49.2, 78.4, {
    size: 3.6,
    family: DISPLAY,
    color: isAdmin ? GOLD : palette.highlight,
    tracking: 0.18,
    align: 'right',
  })
  drawTracked(ctx, `Nº ${serial}`, 49.2, 81.9, {
    size: 1.1,
    family: SANS,
    weight: '700',
    color: 'rgba(255,255,255,0.5)',
    tracking: 0.14,
    align: 'right',
  })
}

/* ------------------------------------------------------------------ */
/* v3 · Polaroid                                                       */
/* ------------------------------------------------------------------ */

export function drawPolaroidBadge(ctx: Ctx, data: BadgeData) {
  const { album, isAdmin } = data
  const palette = album.palette
  const accent = isAdmin ? GOLD : palette.accent

  drawAlbumBackdrop(ctx, album, 0, 0, BADGE_WIDTH_MM, BADGE_HEIGHT_MM)
  ctx.fillStyle = isAdmin ? 'rgba(8,8,11,0.86)' : hexToRgba(palette.panel, 0.8)
  ctx.fillRect(0, 0, BADGE_WIDTH_MM, BADGE_HEIGHT_MM)
  const vignette = ctx.createRadialGradient(27, 36, 8, 27, 43, 52)
  vignette.addColorStop(0, hexToRgba(accent, isAdmin ? 0.1 : 0.16))
  vignette.addColorStop(0.55, 'rgba(0,0,0,0)')
  vignette.addColorStop(1, 'rgba(0,0,0,0.5)')
  ctx.fillStyle = vignette
  ctx.fillRect(0, 0, BADGE_WIDTH_MM, BADGE_HEIGHT_MM)
  pinstripes(ctx, 'rgba(255,255,255,0.025)', 3.4)

  drawTracked(ctx, 'PARAMORE', 27, 6.9, {
    size: 5.4,
    family: DISPLAY,
    color: '#fbf7ef',
    tracking: 0.42,
    align: 'center',
  })
  drawTracked(ctx, 'BRASIL', 27, 10.4, {
    size: 1.35,
    family: SANS,
    weight: '700',
    color: accent,
    tracking: 0.62,
    align: 'center',
  })

  // Polaroid levemente torta com fita adesiva
  ctx.save()
  ctx.translate(27, 35.2)
  ctx.rotate((-3.5 * Math.PI) / 180)
  ctx.save()
  ctx.shadowColor = 'rgba(0,0,0,0.6)'
  ctx.shadowBlur = 2.6
  ctx.shadowOffsetY = 1
  ctx.fillStyle = '#f7f4ee'
  ctx.fillRect(-17.5, -21, 35, 42)
  ctx.restore()
  drawPhotoRect(ctx, data.photo, -15.3, -18.8, 30.6, 30.6, 0, album)
  ctx.strokeStyle = 'rgba(0,0,0,0.12)'
  ctx.lineWidth = 0.12
  ctx.strokeRect(-15.3, -18.8, 30.6, 30.6)
  const caption = `${album.shortTitle} · ${album.year}`
  const captionSize = fitTrackedSize(ctx, caption, 29, 1.9, 1.2, GROTESK, '600', 0.04)
  drawTracked(ctx, caption, 0, 16.6, {
    size: captionSize,
    family: GROTESK,
    weight: '600',
    color: '#2a2630',
    tracking: 0.04 * captionSize,
    align: 'center',
  })
  ctx.save()
  ctx.translate(0, -21)
  ctx.rotate((7 * Math.PI) / 180)
  ctx.fillStyle = isAdmin ? hexToRgba(GOLD, 0.78) : hexToRgba(palette.highlight, 0.6)
  ctx.fillRect(-6.8, -1.9, 13.6, 3.8)
  ctx.restore()
  ctx.restore()

  const name = layoutName(ctx, data.name, 46, 2, 7.6, 2.7, 9.8)
  drawNameLines(ctx, name, 27, 66.6 - nameHeight(name) / 2, {
    align: 'center',
    color: '#f8f4ec',
    shadow: true,
  })

  const tagline = isAdmin
    ? (data.role.trim() || 'Administrador').toLocaleUpperCase('pt-BR')
    : 'FÃ OFICIAL'
  const tagSize = fitTrackedSize(ctx, tagline, 30, 1.9, 1.3, SANS, '800', 0.26)
  setFont(ctx, tagSize, SANS, '800')
  const tagWidth =
    [...tagline].reduce((sum, char) => sum + ctx.measureText(char).width, 0) +
    0.26 * tagSize * (tagline.length - 1)
  drawTracked(ctx, tagline, 27, 75, {
    size: tagSize,
    family: SANS,
    weight: '800',
    color: accent,
    tracking: 0.26 * tagSize,
    align: 'center',
  })
  ctx.strokeStyle = hexToRgba(accent, 0.6)
  ctx.lineWidth = 0.2
  ctx.beginPath()
  ctx.moveTo(27 - tagWidth / 2 - 6, 75)
  ctx.lineTo(27 - tagWidth / 2 - 1.4, 75)
  ctx.moveTo(27 + tagWidth / 2 + 1.4, 75)
  ctx.lineTo(27 + tagWidth / 2 + 6, 75)
  ctx.stroke()

  drawTracked(ctx, 'PARAMORE BRASIL', 4.8, 81.3, {
    size: 1.1,
    family: SANS,
    weight: '700',
    color: 'rgba(255,255,255,0.42)',
    tracking: 0.2,
  })
  drawTracked(ctx, `Nº ${BADGE_SERIAL}`, 49.2, 81.3, {
    size: 1.1,
    family: SANS,
    weight: '700',
    color: 'rgba(255,255,255,0.42)',
    tracking: 0.2,
    align: 'right',
  })

  ctx.fillStyle = isAdmin ? goldGradient(ctx, 0, BADGE_WIDTH_MM) : paletteGradient(ctx, album, 0, BADGE_WIDTH_MM)
  ctx.fillRect(0, 84.7, BADGE_WIDTH_MM, 1.3)

  if (isAdmin) {
    // Faixa diagonal de "equipe" no canto
    ctx.save()
    ctx.translate(47.2, 6.8)
    ctx.rotate(Math.PI / 4)
    ctx.shadowColor = 'rgba(0,0,0,0.5)'
    ctx.shadowBlur = 1.2
    ctx.fillStyle = goldGradient(ctx, -14, 14)
    ctx.fillRect(-14, -1.9, 28, 3.8)
    ctx.shadowColor = 'transparent'
    drawTracked(ctx, 'EQUIPE', 0, 0.1, {
      size: 1.6,
      family: SANS,
      weight: '800',
      color: '#171208',
      tracking: 0.42,
      align: 'center',
    })
    ctx.restore()
  }
}

/* ------------------------------------------------------------------ */
/* v4 · Editorial                                                      */
/* ------------------------------------------------------------------ */

export function drawEditorialBadge(ctx: Ctx, data: BadgeData) {
  const { album, isAdmin } = data
  const palette = album.palette
  const accent = isAdmin ? GOLD : palette.accent
  const column = 13
  const left = 17
  const right = 49.4
  const serial = BADGE_SERIAL

  ctx.fillStyle = isAdmin ? '#0a0a0c' : palette.panel
  ctx.fillRect(0, 0, BADGE_WIDTH_MM, BADGE_HEIGHT_MM)
  const wash = ctx.createLinearGradient(column, 0, BADGE_WIDTH_MM, BADGE_HEIGHT_MM)
  wash.addColorStop(0, hexToRgba(accent, 0.08))
  wash.addColorStop(1, 'rgba(0,0,0,0.3)')
  ctx.fillStyle = wash
  ctx.fillRect(column, 0, BADGE_WIDTH_MM - column, BADGE_HEIGHT_MM)

  // Coluna lateral com o nome da banda na vertical
  if (isAdmin) {
    const gold = ctx.createLinearGradient(0, 0, 0, BADGE_HEIGHT_MM)
    gold.addColorStop(0, '#f6e3a8')
    gold.addColorStop(0.5, GOLD)
    gold.addColorStop(1, GOLD_DEEP)
    ctx.fillStyle = gold
    ctx.fillRect(0, 0, column, BADGE_HEIGHT_MM)
  } else {
    drawAlbumBackdrop(ctx, album, 0, 0, column, BADGE_HEIGHT_MM)
    ctx.fillStyle = 'rgba(0,0,0,0.42)'
    ctx.fillRect(0, 0, column, BADGE_HEIGHT_MM)
  }
  ctx.save()
  ctx.translate(column / 2 + 0.35, BADGE_HEIGHT_MM / 2)
  ctx.rotate(-Math.PI / 2)
  const brandSize = fitTrackedSize(ctx, 'PARAMORE', 78, 17, 8, DISPLAY, '400', 0.05)
  drawTracked(ctx, 'PARAMORE', 0, 0, {
    size: brandSize,
    family: DISPLAY,
    color: isAdmin ? '#171208' : '#fbf7ef',
    tracking: 0.05 * brandSize,
    align: 'center',
  })
  ctx.restore()

  drawTracked(ctx, 'BRASIL', left, 5.4, {
    size: 1.35,
    family: SANS,
    weight: '700',
    color: accent,
    tracking: 0.55,
  })
  drawTracked(ctx, `Nº ${serial}`, right, 5.4, {
    size: 1.35,
    family: SANS,
    weight: '700',
    color: 'rgba(255,255,255,0.5)',
    tracking: 0.16,
    align: 'right',
  })
  ctx.fillStyle = 'rgba(255,255,255,0.18)'
  ctx.fillRect(left, 7.6, right - left, 0.16)

  const photoW = right - left
  drawPhotoRect(ctx, data.photo, left, 10, photoW, photoW / PHOTO_FRAMES[4].aspect, 0.4, album)

  // Capa do álbum sobreposta ao canto da foto
  ctx.save()
  ctx.shadowColor = 'rgba(0,0,0,0.55)'
  ctx.shadowBlur = 1.6
  ctx.shadowOffsetY = 0.5
  ctx.fillStyle = isAdmin ? GOLD : '#f8f4ec'
  ctx.fillRect(right - 9.6, 42.2, 10.4, 10.4)
  ctx.restore()
  drawCoverSquare(ctx, album, right - 9.2, 42.6, 9.6)

  const name = layoutName(ctx, data.name, right - left - 1, 3, 7.2, 2.6, 13)
  drawNameLines(ctx, name, left, 55.2, { align: 'left', color: '#f8f4ec' })

  const fieldColors = { label: 'rgba(255,255,255,0.42)', value: '#f8f4ec' }
  ctx.fillStyle = 'rgba(255,255,255,0.18)'
  ctx.fillRect(left, 69.2, right - left, 0.16)
  if (isAdmin) {
    drawField(ctx, 'FUNÇÃO', data.role.trim() || 'Administrador', left, 71.2, 21, fieldColors)
  } else {
    drawField(ctx, 'ÁLBUM', album.shortTitle, left, 71.2, 21, fieldColors)
  }
  drawField(ctx, 'ANO', String(album.year), 41, 71.2, 8.4, fieldColors)

  // Faixa de categoria no rodapé
  ctx.fillStyle = isAdmin ? goldGradient(ctx, column, BADGE_WIDTH_MM) : accent
  ctx.fillRect(column, 77.6, BADGE_WIDTH_MM - column, BADGE_HEIGHT_MM - 77.6)
  drawTracked(ctx, isAdmin ? 'EQUIPE' : 'FÃ OFICIAL', left, 82.2, {
    size: 5,
    family: DISPLAY,
    color: '#0b0b0e',
    tracking: 0.22,
  })
  drawTracked(ctx, isAdmin ? 'ALL ACCESS' : 'PARAMORE BR', right, 82, {
    size: 1.1,
    family: SANS,
    weight: '800',
    color: 'rgba(11,11,14,0.7)',
    tracking: 0.16,
    align: 'right',
  })
}
