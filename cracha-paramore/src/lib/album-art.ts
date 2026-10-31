import type { Album } from './albums'
import { getAlbumCover } from './album-covers'

type Ctx = CanvasRenderingContext2D

function drawFallback(ctx: Ctx, album: Album, x: number, y: number, w: number, h: number) {
  const gradient = ctx.createLinearGradient(x, y, x + w, y + h)
  gradient.addColorStop(0, album.palette.primary)
  gradient.addColorStop(0.55, album.palette.accent)
  gradient.addColorStop(1, album.palette.panel)
  ctx.fillStyle = gradient
  ctx.fillRect(x, y, w, h)

  ctx.save()
  ctx.globalAlpha = 0.18
  ctx.fillStyle = album.palette.highlight
  ctx.beginPath()
  ctx.arc(x + w * 0.76, y + h * 0.26, w * 0.42, 0, Math.PI * 2)
  ctx.fill()
  ctx.beginPath()
  ctx.arc(x + w * 0.18, y + h * 0.8, w * 0.5, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

function drawCoverFit(
  ctx: Ctx,
  image: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  const scale = Math.max(w / image.naturalWidth, h / image.naturalHeight)
  const width = image.naturalWidth * scale
  const height = image.naturalHeight * scale
  ctx.drawImage(image, x + (w - width) / 2, y + (h - height) / 2, width, height)
}

export function drawAlbumBackdrop(
  ctx: Ctx,
  album: Album,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  ctx.save()
  ctx.beginPath()
  ctx.rect(x, y, w, h)
  ctx.clip()
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'

  const cover = getAlbumCover(album)
  if (cover) {
    drawCoverFit(ctx, cover, x, y, w, h)
    ctx.fillStyle = 'rgba(5, 5, 8, 0.12)'
    ctx.fillRect(x, y, w, h)
  } else {
    drawFallback(ctx, album, x, y, w, h)
  }

  ctx.restore()
}
