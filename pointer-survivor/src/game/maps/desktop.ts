import { defineMap } from './types'

/** Map 1: the plain Win2000 desktop. */
export const desktopMap = defineMap({
  id: 'desktop',
  tier: 1,
  name: 'Desktop',
  path: 'C:\\',
  icon: 'drive',
  description: 'Bugs and viruses crawl over your teal wallpaper. A good place to start.',
  boss: { id: 'blueScreen', at: 240 },
  music: 'desktop',
  waves: [
    { from: 0, to: 30, interval: 1.2, batch: 1, mix: { bug: 1 }, hpScale: 1 },
    { from: 30, to: 60, interval: 1.0, batch: 2, mix: { bug: 4, virus: 1 }, hpScale: 1 },
    { from: 60, to: 120, interval: 0.85, batch: 2, mix: { bug: 3, virus: 2, popup: 1 }, hpScale: 1.2 },
    { from: 120, to: 180, interval: 0.7, batch: 3, mix: { bug: 3, virus: 3, popup: 2, hourglass: 1 }, hpScale: 1.5 },
    { from: 180, to: 240, interval: 0.55, batch: 3, mix: { bug: 2, virus: 3, popup: 3, hourglass: 2 }, hpScale: 1.9 },
    { from: 240, to: Infinity, interval: 0.8, batch: 3, mix: { bug: 3, virus: 3, popup: 2 }, hpScale: 2.1 },
  ],
  drawBackground(ctx, w, h) {
    ctx.fillStyle = '#3a6ea5'
    ctx.fillRect(0, 0, w, h)
    ctx.fillStyle = 'rgba(255,255,255,0.12)'
    ctx.font = 'bold 13px Tahoma, Verdana, sans-serif'
    ctx.textAlign = 'right'
    ctx.textBaseline = 'bottom'
    ctx.fillText('Pointer Survivor 2000', w - 10, h - 22)
    ctx.font = '11px Tahoma, Verdana, sans-serif'
    ctx.fillText('Build 2195', w - 10, h - 8)
  },
})
