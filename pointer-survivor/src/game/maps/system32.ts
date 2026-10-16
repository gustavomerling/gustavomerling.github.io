import { defineMap } from './types'

const CHARS = '0123456789ABCDEF'

/** Hex dump strip, rendered once per arena size and scrolled. */
let strip: { key: string; canvas: HTMLCanvasElement } | null = null

function getStrip(w: number, h: number): HTMLCanvasElement {
  const key = `${w}x${h}`
  if (strip?.key === key) return strip.canvas
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  const ctx = c.getContext('2d')!
  ctx.font = '10px "Courier New", monospace'
  ctx.textBaseline = 'top'
  const lineH = 12
  let seed = 1
  const rnd = () => {
    seed = (seed * 16807) % 2147483647
    return seed / 2147483647
  }
  for (let y = 0; y < h; y += lineH) {
    let line = ''
    for (let x = 0; x < w / 6.2; x++) line += rnd() < 0.18 ? ' ' : CHARS[Math.floor(rnd() * 16)]
    const bright = rnd()
    ctx.fillStyle = bright > 0.92 ? 'rgba(120,255,120,0.22)' : 'rgba(0,200,60,0.1)'
    ctx.fillText(line, 0, y)
  }
  strip = { key, canvas: c }
  return c
}

/** Map 3: deep inside the operating system. */
export const system32Map = defineMap({
  id: 'system32',
  tier: 3,
  name: 'System32',
  path: 'C:\\WINNT\\System32',
  icon: 'terminal',
  description: 'The core of the OS. Worms, trojans and corrupted files — and something waiting for 01/01/2000.',
  unlockAfter: 'web',
  boss: { id: 'y2kBug', at: 240 },
  music: 'system32',
  waves: [
    { from: 0, to: 30, interval: 1.1, batch: 2, mix: { worm: 2, bug: 2 }, hpScale: 1.6 },
    { from: 30, to: 90, interval: 0.8, batch: 2, mix: { worm: 3, virus: 2, corruptedFile: 1 }, hpScale: 2.3 },
    { from: 90, to: 150, interval: 0.65, batch: 3, mix: { worm: 3, trojan: 1, corruptedFile: 2, hourglass: 1 }, hpScale: 2.7 },
    { from: 150, to: 240, interval: 0.5, batch: 3, mix: { worm: 3, trojan: 2, corruptedFile: 2, hourglass: 2, virus: 2 }, hpScale: 3.2 },
    { from: 240, to: Infinity, interval: 0.75, batch: 3, mix: { worm: 3, corruptedFile: 2, trojan: 1 }, hpScale: 3.5 },
  ],
  drawBackground(ctx, w, h, t) {
    ctx.fillStyle = '#000000'
    ctx.fillRect(0, 0, w, h)
    const s = getStrip(Math.ceil(w), Math.ceil(h))
    const off = (t * 10) % h
    ctx.drawImage(s, 0, off - h)
    ctx.drawImage(s, 0, off)
    // CRT scanlines
    ctx.fillStyle = 'rgba(0,0,0,0.28)'
    for (let y = 0; y < h; y += 3) ctx.fillRect(0, y, w, 1)
    // prompt
    ctx.font = '12px "Courier New", monospace'
    ctx.textAlign = 'left'
    ctx.textBaseline = 'bottom'
    ctx.fillStyle = 'rgba(160,160,160,0.5)'
    ctx.fillText(`C:\\WINNT\\System32>${Math.floor(t * 2) % 2 ? '_' : ' '}`, 8, h - 6)
  },
})
