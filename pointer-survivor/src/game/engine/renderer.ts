import { TASK_FX_TIME } from '../config'
import { drawEnemy } from '../enemies/helpers'
import type { EnemyBullet, Pickup } from '../types'
import { drawCursor } from './drawCursor'
import type { World } from './World'

const UI_FONT = 'Tahoma, Verdana, sans-serif'

export function drawPickup(ctx: CanvasRenderingContext2D, p: Pickup, time: number) {
  const bob = Math.sin(time * 5 + p.x) * 1
  ctx.save()
  ctx.translate(Math.round(p.x), Math.round(p.y + bob))
  switch (p.kind) {
    case 'xp': {
      // a little "bit": cyan diamond, bigger for bigger values
      const s = p.value >= 4 ? 5 : p.value >= 2 ? 4 : 3
      ctx.fillStyle = p.value >= 4 ? '#ffe000' : p.value >= 2 ? '#40ff80' : '#40e0ff'
      ctx.beginPath()
      ctx.moveTo(0, -s)
      ctx.lineTo(s, 0)
      ctx.lineTo(0, s)
      ctx.lineTo(-s, 0)
      ctx.closePath()
      ctx.fill()
      ctx.strokeStyle = '#003040'
      ctx.lineWidth = 1
      ctx.stroke()
      break
    }
    case 'floppy':
      ctx.fillStyle = '#202020'
      ctx.fillRect(-6, -6, 12, 12)
      ctx.fillStyle = '#c0c0c0'
      ctx.fillRect(-3, -6, 6, 4)
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(-4, 1, 8, 5)
      break
    case 'heart':
      ctx.fillStyle = '#ff2040'
      ctx.fillRect(-5, -3, 4, 3)
      ctx.fillRect(1, -3, 4, 3)
      ctx.fillRect(-6, -2, 12, 3)
      ctx.fillRect(-4, 1, 8, 2)
      ctx.fillRect(-2, 3, 4, 2)
      break
  }
  ctx.restore()
}

function drawEnemyBullet(ctx: CanvasRenderingContext2D, b: EnemyBullet) {
  const r = b.radius
  ctx.fillStyle = '#000'
  ctx.fillRect(Math.round(b.x - r - 1), Math.round(b.y - r - 1), r * 2 + 2, r * 2 + 2)
  ctx.fillStyle = b.color
  ctx.fillRect(Math.round(b.x - r), Math.round(b.y - r), r * 2, r * 2)
  if (b.glyph) {
    ctx.fillStyle = '#000'
    ctx.font = `bold ${Math.max(6, r * 1.3)}px "Courier New", monospace`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(b.glyph, b.x, b.y + 0.5)
  }
}

/** Win2000-style beveled panel. */
function panel(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  ctx.fillStyle = '#404040'
  ctx.fillRect(x, y, w, h)
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(x, y, w - 1, h - 1)
  ctx.fillStyle = '#808080'
  ctx.fillRect(x + 1, y + 1, w - 2, h - 2)
  ctx.fillStyle = '#d4d0c8'
  ctx.fillRect(x + 1, y + 1, w - 3, h - 3)
}

function titleBar(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, text: string) {
  const g = ctx.createLinearGradient(x, 0, x + w, 0)
  g.addColorStop(0, '#0a246a')
  g.addColorStop(1, '#a6caf0')
  ctx.fillStyle = g
  ctx.fillRect(x, y, w, 14)
  ctx.fillStyle = '#fff'
  ctx.font = `bold 10px ${UI_FONT}`
  ctx.textAlign = 'left'
  ctx.textBaseline = 'middle'
  ctx.fillText(text, x + 4, y + 7.5)
}

function drawBossBar(ctx: CanvasRenderingContext2D, world: World) {
  const boss = world.boss
  if (!boss || boss.hp <= 0) return
  const w = Math.min(360, world.width - 40)
  const x = (world.width - w) / 2
  const y = 10
  panel(ctx, x, y, w, 34)
  titleBar(ctx, x + 3, y + 3, w - 6, boss.def.name)
  // segmented progress bar
  const bx = x + 6
  const by = y + 20
  const bw = w - 12
  ctx.fillStyle = '#808080'
  ctx.fillRect(bx, by, bw, 10)
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(bx + 1, by + 1, bw - 1, 9)
  ctx.fillStyle = '#d4d0c8'
  ctx.fillRect(bx + 1, by + 1, bw - 2, 8)
  const pct = Math.max(0, boss.hp / boss.maxHp)
  ctx.fillStyle = '#c00000'
  const fillW = (bw - 4) * pct
  for (let sx = 0; sx < fillW; sx += 7) ctx.fillRect(bx + 2 + sx, by + 2, Math.min(5, fillW - sx), 6)
}

function drawBanner(ctx: CanvasRenderingContext2D, world: World) {
  const b = world.banner
  if (!b) return
  const alpha = Math.min(1, b.time * 2)
  const w = 260
  const h = 64
  const x = (world.width - w) / 2
  const y = world.height * 0.32
  ctx.save()
  ctx.globalAlpha = alpha
  panel(ctx, x, y, w, h)
  titleBar(ctx, x + 3, y + 3, w - 6, 'pointer.exe')
  // warning triangle
  ctx.fillStyle = '#ffe000'
  ctx.strokeStyle = '#000'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(x + 24, y + 24)
  ctx.lineTo(x + 38, y + 50)
  ctx.lineTo(x + 10, y + 50)
  ctx.closePath()
  ctx.fill()
  ctx.stroke()
  ctx.fillStyle = '#000'
  ctx.fillRect(x + 23, y + 31, 2, 10)
  ctx.fillRect(x + 23, y + 44, 2, 2)
  ctx.textAlign = 'left'
  ctx.textBaseline = 'alphabetic'
  ctx.font = `bold 13px ${UI_FONT}`
  ctx.fillStyle = Math.floor(b.time * 6) % 2 ? '#c00000' : '#000'
  ctx.fillText(b.text, x + 50, y + 34)
  ctx.font = `11px ${UI_FONT}`
  ctx.fillStyle = '#000'
  ctx.fillText(b.sub, x + 50, y + 50)
  ctx.restore()
}

/** Ctrl+Alt+Del: a Task Manager window listing every enemy as "Not Responding". */
function drawTaskManager(ctx: CanvasRenderingContext2D, world: World) {
  const fx = world.taskFx
  if (!fx) return
  const t = fx.time
  const rows = fx.processes.length ? fx.processes.slice(0, 7) : [{ name: '(no tasks)', boss: false }]
  const w = 250
  const h = 52 + rows.length * 13 + 26
  const x = (world.width - w) / 2
  const y = (world.height - h) / 2
  const fade = Math.min(1, (TASK_FX_TIME - t) * 3)
  ctx.save()
  // brief white flash when it fires
  if (t < 0.15) {
    ctx.fillStyle = `rgba(255,255,255,${0.6 - t * 4})`
    ctx.fillRect(0, 0, world.width, world.height)
  }
  ctx.globalAlpha = Math.max(0, fade)
  panel(ctx, x, y, w, h)
  titleBar(ctx, x + 3, y + 3, w - 6, 'Task Manager')
  ctx.font = `10px ${UI_FONT}`
  ctx.textBaseline = 'middle'
  ctx.fillStyle = '#000'
  ctx.textAlign = 'left'
  ctx.fillText('Applications   Processes   Performance', x + 8, y + 26)
  ctx.fillStyle = '#fff'
  ctx.fillRect(x + 8, y + 34, w - 16, rows.length * 13 + 16)
  ctx.fillStyle = '#000'
  ctx.font = `bold 10px ${UI_FONT}`
  ctx.fillText('Task', x + 12, y + 41)
  ctx.fillText('Status', x + w - 92, y + 41)
  ctx.font = `10px ${UI_FONT}`
  rows.forEach((row, i) => {
    const ry = y + 54 + i * 13
    const done = t > 0.35 + i * 0.12
    const ended = done && !row.boss
    const selected = i === 0 && !done
    if (selected) {
      ctx.fillStyle = '#0a246a'
      ctx.fillRect(x + 9, ry - 6, w - 18, 12)
    }
    ctx.fillStyle = ended ? '#808080' : selected ? '#fff' : '#000'
    ctx.fillText(row.name, x + 12, ry)
    ctx.fillStyle = ended ? '#008000' : selected ? '#fff' : '#c00000'
    ctx.fillText(ended ? 'Ended' : done ? 'Access Denied' : 'Not Responding', x + w - 92, ry)
  })
  // "End Process" button, pressed while ending
  const bw = 78
  const bx = x + w - bw - 8
  const by = y + h - 22
  const pressed = t > 0.3 && t < 1
  ctx.fillStyle = pressed ? '#808080' : '#fff'
  ctx.fillRect(bx, by, bw, 16)
  ctx.fillStyle = pressed ? '#fff' : '#404040'
  ctx.fillRect(bx + 1, by + 1, bw - 1, 15)
  ctx.fillStyle = '#d4d0c8'
  ctx.fillRect(bx + 1, by + 1, bw - 2, 14)
  ctx.fillStyle = '#000'
  ctx.textAlign = 'center'
  ctx.fillText('End Process', bx + bw / 2 + (pressed ? 1 : 0), by + 8.5 + (pressed ? 1 : 0))
  ctx.restore()
}

/** Where the real mouse is: the game pointer is heading there. */
function drawTargetMarker(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.save()
  ctx.globalAlpha = 0.5
  ctx.fillStyle = '#ffffff'
  ctx.beginPath()
  ctx.arc(x, y, 3, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

/** `target` = real pointer position in arena units, or null (keyboard / finger lifted). */
export function renderWorld(ctx: CanvasRenderingContext2D, world: World, target: { x: number; y: number } | null = null) {
  const t = world.time
  ctx.save()
  if (world.shake > 0) ctx.translate((Math.random() - 0.5) * world.shake, (Math.random() - 0.5) * world.shake)

  world.map.drawBackground(ctx, world.width, world.height, t)

  for (const p of world.pickups) drawPickup(ctx, p, t)

  // weapon auras etc. under enemies
  for (const w of world.weapons) w.def.draw?.(ctx, w.state, w.level, world)

  for (const e of world.enemies) {
    ctx.save()
    ctx.translate(Math.round(e.x), Math.round(e.y))
    drawEnemy(ctx, e, t)
    ctx.restore()
  }

  for (const p of world.projectiles) {
    const len = Math.hypot(p.vx, p.vy) || 1
    const tx = (p.vx / len) * 6
    const ty = (p.vy / len) * 6
    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = p.radius * 2 + 2
    ctx.beginPath()
    ctx.moveTo(p.x - tx, p.y - ty)
    ctx.lineTo(p.x, p.y)
    ctx.stroke()
    ctx.strokeStyle = p.color
    ctx.lineWidth = p.radius * 2
    ctx.stroke()
  }

  for (const b of world.enemyBullets) drawEnemyBullet(ctx, b)

  const pl = world.player
  const blinking = pl.iframes > 0 && Math.floor(t * 30) % 2 === 0
  // under the game pointer, so it disappears once the pointer catches up
  if (target) drawTargetMarker(ctx, target.x, target.y)
  drawCursor(ctx, pl.x, pl.y, pl.heading, 1.4, blinking)
  if (pl.slowed > 0) {
    // the busy hourglass rides along while slowed
    ctx.fillStyle = 'rgba(255, 220, 80, 0.95)'
    ctx.font = `bold 11px ${UI_FONT}`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('⌛', pl.x + 11, pl.y - 11)
  }

  for (const p of world.particles) {
    ctx.globalAlpha = Math.max(0, p.life / p.maxLife)
    ctx.fillStyle = p.color
    ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size)
  }
  ctx.globalAlpha = 1

  ctx.font = `bold 10px ${UI_FONT}`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  for (const f of world.floatTexts) {
    ctx.globalAlpha = Math.min(1, f.life * 3)
    ctx.fillStyle = '#000'
    ctx.fillText(f.text, f.x + 1, f.y + 1)
    ctx.fillStyle = f.color
    ctx.fillText(f.text, f.x, f.y)
  }
  ctx.globalAlpha = 1
  ctx.restore()

  // screen-space UI (no shake)
  drawBossBar(ctx, world)
  drawBanner(ctx, world)
  drawTaskManager(ctx, world)
}
