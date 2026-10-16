import { defineMap } from './types'

/** Cheap deterministic hash so the starfield is stable frame to frame. */
function hash(n: number): number {
  const x = Math.sin(n * 127.1) * 43758.5453
  return x - Math.floor(x)
}

const MARQUEE = '~*~ Welcome to my HomePage!!! ~*~ You are visitor #000042 ~*~ Sign my guestbook ~*~ Best viewed in 800x600 ~*~ '

/** Map 2: a 1999 personal homepage. */
export const webMap = defineMap({
  id: 'web',
  tier: 2,
  name: 'World Wide Web',
  path: 'http://',
  icon: 'globe',
  description: 'A starry homepage full of spam, cookies and blinking banners. Dial-up not included.',
  unlockAfter: 'desktop',
  boss: { id: 'error404', at: 240 },
  music: 'web',
  waves: [
    { from: 0, to: 30, interval: 1.2, batch: 2, mix: { cookie: 2, spamMail: 1 }, hpScale: 1.2 },
    { from: 30, to: 90, interval: 0.85, batch: 2, mix: { cookie: 3, spamMail: 2, popup: 1 }, hpScale: 1.6 },
    { from: 90, to: 150, interval: 0.7, batch: 3, mix: { spamMail: 3, cookie: 2, popup: 2, bannerAd: 1 }, hpScale: 1.9 },
    { from: 150, to: 240, interval: 0.55, batch: 3, mix: { spamMail: 3, cookie: 3, popup: 2, bannerAd: 2 }, hpScale: 2.3 },
    { from: 240, to: Infinity, interval: 0.8, batch: 3, mix: { spamMail: 2, cookie: 3, bannerAd: 1 }, hpScale: 2.6 },
  ],
  drawBackground(ctx, w, h, t) {
    ctx.fillStyle = '#000033'
    ctx.fillRect(0, 0, w, h)
    // twinkling tiled starfield
    for (let i = 0; i < 140; i++) {
      const x = hash(i) * w
      const y = hash(i + 500) * h
      const tw = 0.35 + 0.65 * Math.abs(Math.sin(t * (0.5 + hash(i + 900) * 2) + i))
      ctx.fillStyle = `rgba(255,255,${200 + Math.floor(hash(i + 7) * 55)},${tw * 0.8})`
      const s = hash(i + 33) > 0.85 ? 2 : 1
      ctx.fillRect(Math.floor(x), Math.floor(y), s, s)
    }
    // scrolling marquee
    ctx.font = 'bold 12px "Comic Sans MS", "Comic Sans", Tahoma, sans-serif'
    ctx.textBaseline = 'top'
    ctx.textAlign = 'left'
    const textW = ctx.measureText(MARQUEE).width
    const off = -((t * 40) % textW)
    ctx.fillStyle = 'rgba(255, 255, 0, 0.22)'
    for (let x = off; x < w; x += textW) ctx.fillText(MARQUEE, x, 6)
    // "under construction" stripe band
    const band = 8
    ctx.save()
    ctx.globalAlpha = 0.35
    ctx.beginPath()
    ctx.rect(0, h - band, w, band)
    ctx.clip()
    ctx.fillStyle = '#ffd400'
    ctx.fillRect(0, h - band, w, band)
    ctx.fillStyle = '#000'
    for (let x = -band; x < w + band; x += band * 2) {
      ctx.beginPath()
      ctx.moveTo(x, h)
      ctx.lineTo(x + band, h - band)
      ctx.lineTo(x + band * 2, h - band)
      ctx.lineTo(x + band, h)
      ctx.fill()
    }
    ctx.restore()
    // hit counter
    ctx.font = '10px "Courier New", monospace'
    ctx.textAlign = 'right'
    ctx.textBaseline = 'bottom'
    ctx.fillStyle = 'rgba(0, 255, 0, 0.35)'
    const visitors = String(42 + Math.floor(t * 3)).padStart(6, '0')
    ctx.fillText(`[${visitors}]`, w - 8, h - band - 4)
  },
})
