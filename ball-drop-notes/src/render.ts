import { noteName } from './music'
import { BALL_RADIUS, PREDICT_DT } from './physics'
import type { Gesture, MovingBall, Point, Segment, View } from './types'
import { drawBackground, sampleAudioLevel } from './fx/background'
import {
  FINISH_SLOT,
  GOLD_SLOT,
  PINK_SLOT,
  SLOT_COUNT,
  SLOT_CSS,
  SLOT_DARK,
  SLOT_LIGHT,
  WHITE_SLOT,
  glowSprite,
  slotOf,
} from './fx/palette'
import {
  addBloom,
  addShake,
  clearParticles,
  drawParticlesScreen,
  drawParticlesWorld,
  emitBurst,
  emitRing,
  emitText,
  scheduleFirework,
  shakeOffset,
  updateParticles,
} from './fx/particles'

const HANDLE_RADIUS = 8 // raio, em pixels de tela, das alças nas pontas do bloco selecionado
export const FLASH_SECONDS = 0.3 // tempo em que um bloco fica aceso depois de tocado

// Tudo o que o desenho precisa saber num quadro. O render não altera o estado.
export type RenderState = {
  width: number // tamanho do canvas, em pixels
  height: number
  view: View
  ball: MovingBall
  segments: Segment[]
  trail: Point[]
  beatMarks: Point[]
  selectedIndex: number | null
  hoverIndex: number | null // bloco sob o cursor, se houver
  gesture: Gesture
  showTrail: boolean
  running: boolean
  // Previsão (presente quando deve ser mostrada).
  prediction: { points: Point[]; bounces: number[]; hits: number[] } | null
  beatSeconds: number
  simTime: number
  // Último instante (em simTime) e força (0..1) em que cada bloco tocou.
  flashes: Map<Segment, { t: number; strength: number }>
  harmony: string
  scaleIntervals: number[]
}

// ---------------------------------------------------------------------------
// Estado próprio do render (tempo real, não faz parte da simulação).
// ---------------------------------------------------------------------------

let clock = 0 // segundos reais desde o início
let lastWidth = 800
let lastHeight = 600
let lastZoom = 1
let editAlpha = 1 // 1 = pausado (grade visível), 0 = rodando

// Câmera para a tela, atualizada a cada quadro (inclui a tremida).
let camX = 0
let camY = 0
let camZoom = 1
let camOffX = 0
let camOffY = 0
const toScreenX = (x: number) => (x - camX) * camZoom + lastWidth / 2 + camOffX
const toScreenY = (y: number) => (y - camY) * camZoom + lastHeight / 2 + camOffY

// Nomes das notas, calculados uma vez.
const NOTE_LABELS: string[] = []
for (let i = 0; i < 37; i++) NOTE_LABELS.push(noteName(i))
const FINISH_LABEL = 'Chegada'
const nameOf = (note: number) => NOTE_LABELS[note] ?? noteName(note)
const labelOf = (seg: Segment) => {
  if (seg.finish) return FINISH_LABEL
  if (!seg.chord?.length) return nameOf(seg.note)
  return seg.chord.length === 1 ? `${nameOf(seg.note)} + ${nameOf(seg.chord[0].note)}` : `${nameOf(seg.note)} +${seg.chord.length}`
}

// Vibração de corda de cada bloco tocado (tempo real).
type Wobble = { t: number; amp: number; u: number; nx: number; ny: number; strength: number; textT: number }
const wobbles = new Map<Segment, Wobble>()
const WOBBLE_FREQ = Math.PI * 2 * 7 // rad/s
const WOBBLE_DECAY = 0.14 // s (constante de tempo; some em ~0,5 s)
const WOBBLE_LIFE = 0.6

// Cauda de cometa da bolinha: buffer circular das últimas posições.
const TAIL_SIZE = 96
const TAIL_SECONDS = 0.4
const tailX = new Float64Array(TAIL_SIZE)
const tailY = new Float64Array(TAIL_SIZE)
const tailT = new Float64Array(TAIL_SIZE)
let tailHead = 0 // próxima posição a escrever
let tailCount = 0

// Cor da bolinha: tende à cor da última nota tocada.
let tintSlot = WHITE_SLOT
let tintPrev = WHITE_SLOT
let tintMix = 1
// Achatamento no impacto (mola amortecida) e brilho.
let impactAmount = 0
let impactT = -10
let impactAngle = 0
let ballFlash = 0

// Baldes por cor para desenhar os blocos parados em lote (um stroke por cor).
const buckets: number[][] = []
for (let i = 0; i < SLOT_COUNT; i++) buckets.push([])
const visible: number[] = []
const specials: number[] = []
const labelWidths = new Map<string, number>()

// Cores da trilha, do violeta (antigo) ao rosa (recente).
const TRAIL_CHUNKS = 12
const TRAIL_COLORS: string[] = []
for (let i = 0; i < TRAIL_CHUNKS; i++) {
  const k = i / (TRAIL_CHUNKS - 1)
  const r = Math.round(167 + (244 - 167) * k)
  const g = Math.round(139 + (114 - 139) * k)
  const b = Math.round(250 + (182 - 250) * k)
  TRAIL_COLORS.push(`rgb(${r}, ${g}, ${b})`)
}

// ---------------------------------------------------------------------------
// Câmera
// ---------------------------------------------------------------------------

const LOOK_AHEAD = 0.2 // segundos de velocidade à frente
const FOLLOW_RATE = 7 // 1/s; amortecimento exponencial
const CATCH_UP_RATE = 3.5 // 1/s; ao voltar a seguir depois de o usuário mover a câmera
const KEEP_BOX = 0.3 // fração da meia-tela em que a bolinha precisa ficar
let cameraLocked = false

// Câmera: com a simulação rodando, segue a bolinha. Pausada, fica onde o usuário deixou.
// dt é o tempo real do quadro, em segundos.
export function followCamera(view: View, ball: MovingBall, running: boolean, dt: number) {
  if (!running) {
    cameraLocked = false
    return
  }
  const zoom = view.zoom
  // Olha um pouco à frente, na direção da velocidade, com limite em pixels de tela.
  const maxLead = (Math.min(lastWidth, lastHeight) * 0.2) / zoom
  let lx = ball.vx * LOOK_AHEAD
  let ly = ball.vy * LOOK_AHEAD
  const lead = Math.hypot(lx, ly)
  if (lead > maxLead) {
    lx *= maxLead / lead
    ly *= maxLead / lead
  }
  const k = 1 - Math.exp(-(cameraLocked ? FOLLOW_RATE : CATCH_UP_RATE) * dt)
  view.x += (ball.x + lx - view.x) * k
  view.y += (ball.y + ly - view.y) * k
  // Nunca deixa a bolinha fugir da área central, mesmo em alta velocidade.
  const boxX = (lastWidth / 2) * KEEP_BOX / zoom
  const boxY = (lastHeight / 2) * KEEP_BOX / zoom
  const dx = ball.x - view.x
  const dy = ball.y - view.y
  if (cameraLocked) {
    if (dx > boxX) view.x = ball.x - boxX
    else if (dx < -boxX) view.x = ball.x + boxX
    if (dy > boxY) view.y = ball.y - boxY
    else if (dy < -boxY) view.y = ball.y + boxY
  } else if (Math.abs(dx) <= boxX && Math.abs(dy) <= boxY) {
    cameraLocked = true
  }
}

// ---------------------------------------------------------------------------
// Efeitos disparados pelo motor
// ---------------------------------------------------------------------------

// Efeito visual de impacto: a bolinha tocou o bloco em point, com força de 0 a 1.
export function fxHit(point: Point, seg: Segment, strength: number) {
  const z = lastZoom
  const s = Math.max(0, Math.min(1, strength))
  // Ponto de contato: projeção do centro da bolinha no bloco; normal aponta para a bolinha.
  const dx = seg.x2 - seg.x1
  const dy = seg.y2 - seg.y1
  const len2 = dx * dx + dy * dy
  const len = Math.sqrt(len2)
  const u = len2 > 0 ? Math.max(0, Math.min(1, ((point.x - seg.x1) * dx + (point.y - seg.y1) * dy) / len2)) : 0.5
  const cx = seg.x1 + u * dx
  const cy = seg.y1 + u * dy
  let nx = point.x - cx
  let ny = point.y - cy
  let nl = Math.hypot(nx, ny)
  if (nl < 1e-6) {
    nx = len > 0 ? -dy / len : 0
    ny = len > 0 ? dx / len : -1
    if (ny > 0) {
      nx = -nx
      ny = -ny
    }
    nl = 1
  }
  nx /= nl
  ny /= nl
  const slot = slotOf(seg.note, seg.finish)

  const previous = wobbles.get(seg)
  const amp = (0.25 + 0.75 * s) * Math.min(len * 0.06, 12 / z)
  const showText = !previous || clock - previous.textT > 0.15
  wobbles.set(seg, { t: clock, amp, u, nx, ny, strength: s, textT: showText ? clock : previous.textT })

  emitBurst(cx, cy, nx, ny, 2.2, Math.round(5 + 22 * s), 140 + 440 * s, slot, z, 'hit')
  emitRing(cx, cy, 24 + 48 * s, 2 + 3 * s, 0.45, slot)
  if (showText) emitText(cx, cy, labelOf(seg), slot, 0.9 + 0.45 * s)

  impactAmount = 0.1 + 0.22 * s
  impactT = clock
  impactAngle = Math.atan2(ny, nx)
  ballFlash = Math.max(ballFlash, 0.4 + 0.6 * s)
  if (slot !== tintSlot) {
    tintPrev = tintSlot
    tintSlot = slot
    tintMix = 0
  }
  if (s > 0.55) addShake(1.5 + (5 * (s - 0.55)) / 0.45)
}

const REWARD_WORDS = ['Lindo!', 'Que som!', 'Isso!', 'Bonito!']

// Efeito visual da recompensa (acorde de prêmio).
export function fxReward(point: Point) {
  const z = lastZoom
  emitBurst(point.x, point.y, 0, -1, Math.PI * 2, 40, 380, GOLD_SLOT, z, 'sparkle')
  emitBurst(point.x, point.y, 0, -1, Math.PI * 1.2, 24, 460, tintSlot, z, 'sparkle')
  emitRing(point.x, point.y, 110, 4, 0.6, GOLD_SLOT)
  emitRing(point.x, point.y, 60, 2, 0.4, WHITE_SLOT)
  emitText(point.x, point.y - 20 / z, REWARD_WORDS[Math.floor(Math.random() * REWARD_WORDS.length)], GOLD_SLOT, 1.25)
  addBloom(0.8, GOLD_SLOT)
}

// Efeito visual da chegada: confete, fogos ao redor e um brilho forte.
export function fxFinish(point: Point) {
  const z = lastZoom
  for (let k = 0; k < 6; k++) {
    const slot = 24 + ((k * 5) % 12) // cores variadas da oitava de dó5
    emitBurst(point.x, point.y, 0, -1, 2.4, 22, 760, slot, z, 'confetti')
  }
  emitRing(point.x, point.y, 180, 6, 0.8, FINISH_SLOT)
  emitRing(point.x, point.y, 110, 3, 0.6, GOLD_SLOT)
  emitText(point.x, point.y - 24 / z, 'Chegada!', GOLD_SLOT, 1.7)
  for (let k = 0; k < 7; k++) {
    const delay = 0.15 + k * 0.26 + Math.random() * 0.1
    const x = point.x + ((Math.random() - 0.5) * 520) / z
    const y = point.y - (120 + Math.random() * 220) / z
    scheduleFirework(delay, x, y, 12 + Math.floor(Math.random() * 24), z)
  }
  addBloom(1.3, GOLD_SLOT)
  addShake(4)
}

// Limpa partículas e efeitos (ao reiniciar ou carregar um desenho).
export function fxClear() {
  clearParticles()
  wobbles.clear()
  tailCount = 0
  impactAmount = 0
  ballFlash = 0
  tintSlot = WHITE_SLOT
  tintPrev = WHITE_SLOT
  tintMix = 1
}

// ---------------------------------------------------------------------------
// Desenho
// ---------------------------------------------------------------------------

// Desenha um quadro inteiro. dt é o tempo real desde o último quadro, em segundos (para animações).
export function draw(ctx: CanvasRenderingContext2D, s: RenderState, dt: number) {
  const step = Math.max(0, Math.min(dt, 0.1))
  clock += step
  lastWidth = s.width
  lastHeight = s.height
  const { view } = s
  lastZoom = view.zoom
  editAlpha += ((s.running ? 0 : 1) - editAlpha) * (1 - Math.exp(-5 * step))
  const level = sampleAudioLevel(step)
  updateParticles(step)
  updateTail(s.ball)
  tintMix = Math.min(1, tintMix + step * 4)
  ballFlash *= Math.exp(-step * 6)
  for (const [seg, w] of wobbles) if (clock - w.t > WOBBLE_LIFE) wobbles.delete(seg)

  drawBackground(ctx, s.width, s.height, view, clock, editAlpha, level)

  const [shakeX, shakeY] = shakeOffset(clock)
  camX = view.x
  camY = view.y
  camZoom = view.zoom
  camOffX = shakeX
  camOffY = shakeY

  ctx.save()
  ctx.translate(s.width / 2 + shakeX, s.height / 2 + shakeY)
  ctx.scale(view.zoom, view.zoom)
  ctx.translate(-view.x, -view.y)
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'

  if (s.prediction && s.prediction.points.length > 1) drawPrediction(ctx, s)
  if (s.showTrail) drawTrail(ctx, s)
  drawBlocks(ctx, s)
  drawGesture(ctx, s.gesture, view.zoom)
  drawParticlesWorld(ctx, view.zoom)
  drawBall(ctx, s)
  drawSelection(ctx, s)
  ctx.restore()

  // Passo em tela: etiquetas, textos flutuantes, brilho e resumo de harmonia.
  drawLabels(ctx, s)
  drawParticlesScreen(ctx, s.width, s.height, toScreenX, toScreenY, toScreenX(s.ball.x), toScreenY(s.ball.y))

  if (s.harmony) {
    ctx.globalAlpha = 1
    ctx.fillStyle = 'rgba(203, 213, 225, 0.55)'
    ctx.font = '12px system-ui, sans-serif'
    ctx.textAlign = 'left'
    ctx.textBaseline = 'bottom'
    ctx.fillText(s.harmony, 16, s.height - 16)
  }
}

// --- Blocos ---------------------------------------------------------------

// Desloca a corda: forma entre o modo fundamental e um "V" no ponto de impacto.
function wobbleOffset(w: Wobble) {
  const age = clock - w.t
  return -w.amp * Math.sin(WOBBLE_FREQ * age) * Math.exp(-age / WOBBLE_DECAY)
}

function traceSegment(ctx: CanvasRenderingContext2D, seg: Segment, w: Wobble | undefined, offset: number) {
  ctx.moveTo(seg.x1, seg.y1)
  if (!w || Math.abs(offset) < 0.05 / lastZoom) {
    ctx.lineTo(seg.x2, seg.y2)
    return
  }
  const n = 16
  const uh = Math.max(0.05, Math.min(0.95, w.u))
  for (let i = 1; i < n; i++) {
    const u = i / n
    const tri = u < uh ? u / uh : (1 - u) / (1 - uh)
    const shape = 0.5 * Math.sin(Math.PI * u) + 0.5 * tri
    const d = offset * shape
    ctx.lineTo(seg.x1 + (seg.x2 - seg.x1) * u + w.nx * d, seg.y1 + (seg.y2 - seg.y1) * u + w.ny * d)
  }
  ctx.lineTo(seg.x2, seg.y2)
}

function drawBlocks(ctx: CanvasRenderingContext2D, s: RenderState) {
  const { view } = s
  const zoom = view.zoom
  const inv = 1 / zoom
  const margin = 30 * inv
  const left = view.x - s.width / 2 / zoom - margin
  const right = view.x + s.width / 2 / zoom + margin
  const top = view.y - s.height / 2 / zoom - margin
  const bottom = view.y + s.height / 2 / zoom + margin

  for (const b of buckets) b.length = 0
  visible.length = 0
  specials.length = 0
  const touching = s.ball.touching
  let batched = 0

  for (let i = 0; i < s.segments.length; i++) {
    const seg = s.segments[i]
    if (Math.max(seg.x1, seg.x2) < left || Math.min(seg.x1, seg.x2) > right) continue
    if (Math.max(seg.y1, seg.y2) < top || Math.min(seg.y1, seg.y2) > bottom) continue
    visible.push(i)
    const special =
      seg.finish ||
      wobbles.has(seg) ||
      i === s.hoverIndex ||
      i === s.selectedIndex ||
      touching.includes(i) ||
      simFlash(s, seg) > 0
    if (special) specials.push(i)
    else {
      buckets[slotOf(seg.note, false)].push(i)
      batched++
    }
  }

  // Lote: brilho, corpo e reflexo, um caminho por cor.
  if (batched > 0) {
    ctx.globalCompositeOperation = 'lighter'
    ctx.globalAlpha = 0.2
    ctx.lineWidth = 15 * inv
    strokeBuckets(ctx, s.segments)
    ctx.globalCompositeOperation = 'source-over'
    ctx.globalAlpha = 1
    ctx.lineWidth = 6 * inv
    strokeBuckets(ctx, s.segments)
    ctx.globalAlpha = 0.45
    ctx.lineWidth = 1.6 * inv
    ctx.strokeStyle = '#ffffff'
    ctx.beginPath()
    for (const b of buckets) for (const i of b) traceHighlight(ctx, s.segments[i], inv)
    ctx.stroke()
    ctx.globalAlpha = 1
  }

  // Blocos especiais, um a um.
  for (const i of specials) drawSpecialBlock(ctx, s, s.segments[i], i, inv)
}

function strokeBuckets(ctx: CanvasRenderingContext2D, segments: Segment[]) {
  for (let slot = 0; slot < buckets.length; slot++) {
    const b = buckets[slot]
    if (b.length === 0) continue
    ctx.strokeStyle = SLOT_CSS[slot]
    ctx.beginPath()
    for (const i of b) {
      const seg = segments[i]
      ctx.moveTo(seg.x1, seg.y1)
      ctx.lineTo(seg.x2, seg.y2)
    }
    ctx.stroke()
  }
}

// Reflexo fino deslocado para cima, dando volume ao bloco.
function traceHighlight(ctx: CanvasRenderingContext2D, seg: Segment, inv: number) {
  const o = 1.3 * inv
  ctx.moveTo(seg.x1, seg.y1 - o)
  ctx.lineTo(seg.x2, seg.y2 - o)
}

function simFlash(s: RenderState, seg: Segment) {
  const flash = s.flashes.get(seg)
  if (!flash) return 0
  return Math.max(0, 1 - (s.simTime - flash.t) / FLASH_SECONDS) * flash.strength
}

function drawSpecialBlock(ctx: CanvasRenderingContext2D, s: RenderState, seg: Segment, i: number, inv: number) {
  const slot = slotOf(seg.note, seg.finish)
  const w = wobbles.get(seg)
  const offset = w ? wobbleOffset(w) : 0
  // Brilho do impacto: o maior entre o tempo real e o tempo da simulação (passo a passo).
  const realFlash = w ? w.strength * Math.exp(-(clock - w.t) / 0.12) : 0
  const flash = Math.min(1, Math.max(realFlash, simFlash(s, seg)))
  const hover = i === s.hoverIndex
  const touch = s.ball.touching.includes(i)
  const pulse = seg.finish ? 0.5 + 0.5 * Math.sin(clock * 4) : 0

  ctx.beginPath()
  traceSegment(ctx, seg, w, offset)

  // Halo.
  ctx.globalCompositeOperation = 'lighter'
  ctx.strokeStyle = SLOT_CSS[slot]
  ctx.globalAlpha = Math.min(1, 0.2 + flash * 0.6 + (hover ? 0.18 : 0) + (touch ? 0.15 : 0) + pulse * 0.15)
  ctx.lineWidth = (15 + 16 * flash + (seg.finish ? 6 : 0)) * inv
  ctx.stroke()
  if (hover) {
    ctx.strokeStyle = '#ffffff'
    ctx.globalAlpha = 0.16
    ctx.lineWidth = 12 * inv
    ctx.stroke()
  }
  ctx.globalCompositeOperation = 'source-over'
  ctx.globalAlpha = 1

  if (seg.finish) {
    drawCheckered(ctx, seg, w, offset, inv)
  } else {
    ctx.strokeStyle = touch || hover ? SLOT_LIGHT[slot] : SLOT_CSS[slot]
    ctx.lineWidth = (6 + 2 * flash) * inv
    ctx.stroke()
    if (flash > 0.01) {
      ctx.strokeStyle = '#ffffff'
      ctx.globalAlpha = flash * 0.85
      ctx.stroke()
      ctx.globalAlpha = 1
    }
    ctx.globalAlpha = 0.45
    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = 1.6 * inv
    ctx.beginPath()
    if (w && offset !== 0) {
      traceSegment(ctx, seg, w, offset)
    } else {
      traceHighlight(ctx, seg, inv)
    }
    ctx.stroke()
    ctx.globalAlpha = 1
  }
}

// Linha de chegada xadrez: duas fileiras de quadrados vermelhos e brancos.
function drawCheckered(ctx: CanvasRenderingContext2D, seg: Segment, w: Wobble | undefined, offset: number, inv: number) {
  const len = Math.hypot(seg.x2 - seg.x1, seg.y2 - seg.y1) || 1
  const nx = -(seg.y2 - seg.y1) / len
  const ny = (seg.x2 - seg.x1) / len
  const sq = 4 * inv
  ctx.strokeStyle = '#fff5f5'
  ctx.lineWidth = 8 * inv
  ctx.stroke()
  ctx.lineCap = 'butt'
  ctx.strokeStyle = SLOT_CSS[FINISH_SLOT]
  ctx.lineWidth = sq
  ctx.setLineDash([sq, sq])
  for (let row = 0; row < 2; row++) {
    const o = (row === 0 ? -sq : sq) / 2
    ctx.lineDashOffset = row === 0 ? 0 : sq
    ctx.save()
    ctx.translate(nx * o, ny * o)
    ctx.beginPath()
    traceSegment(ctx, seg, w, offset)
    ctx.stroke()
    ctx.restore()
  }
  ctx.setLineDash([])
  ctx.lineDashOffset = 0
  ctx.lineCap = 'round'
}

// Contorno tracejado animado em volta do bloco selecionado e alças nas pontas.
function drawSelection(ctx: CanvasRenderingContext2D, s: RenderState) {
  if (s.selectedIndex === null) return
  const seg = s.segments[s.selectedIndex]
  if (!seg) return
  const inv = 1 / s.view.zoom
  const len = Math.hypot(seg.x2 - seg.x1, seg.y2 - seg.y1)
  const r = 14 * inv
  const an = len > 0 ? Math.atan2(seg.x2 - seg.x1, -(seg.y2 - seg.y1)) : 0 // ângulo da normal (-dy, dx)
  const nx = Math.cos(an) * r
  const ny = Math.sin(an) * r
  ctx.beginPath()
  ctx.moveTo(seg.x1 + nx, seg.y1 + ny)
  ctx.lineTo(seg.x2 + nx, seg.y2 + ny)
  ctx.arc(seg.x2, seg.y2, r, an, an - Math.PI, true)
  ctx.lineTo(seg.x1 - nx, seg.y1 - ny)
  ctx.arc(seg.x1, seg.y1, r, an - Math.PI, an - Math.PI * 2, true)
  ctx.closePath()
  ctx.fillStyle = 'rgba(251, 191, 36, 0.06)'
  ctx.fill()
  ctx.strokeStyle = '#fcd34d'
  ctx.lineWidth = 1.8 * inv
  ctx.setLineDash([7 * inv, 5 * inv])
  ctx.lineDashOffset = -clock * 26 * inv
  ctx.stroke()
  ctx.setLineDash([])
  ctx.lineDashOffset = 0

  const hr = HANDLE_RADIUS * inv
  const glow = glowSprite(GOLD_SLOT)
  const breathe = 1 + 0.08 * Math.sin(clock * 5)
  for (let e = 0; e < 2; e++) {
    const x = e === 0 ? seg.x1 : seg.x2
    const y = e === 0 ? seg.y1 : seg.y2
    ctx.globalCompositeOperation = 'lighter'
    ctx.globalAlpha = 0.5
    const g = hr * 3.2 * breathe
    ctx.drawImage(glow, x - g, y - g, g * 2, g * 2)
    ctx.globalCompositeOperation = 'source-over'
    ctx.globalAlpha = 1
    ctx.beginPath()
    ctx.arc(x, y, hr * breathe, 0, Math.PI * 2)
    ctx.fillStyle = '#fbbf24'
    ctx.fill()
    ctx.lineWidth = 2.5 * inv
    ctx.strokeStyle = '#fffbeb'
    ctx.stroke()
    ctx.beginPath()
    ctx.arc(x, y, hr * 0.35, 0, Math.PI * 2)
    ctx.fillStyle = '#78350f'
    ctx.fill()
  }
}

// --- Etiquetas (em tela, tamanho fixo) --------------------------------------

function drawLabels(ctx: CanvasRenderingContext2D, s: RenderState) {
  const zoom = s.view.zoom
  // Somem quando o zoom está muito longe.
  const alpha = Math.max(0, Math.min(1, (zoom - 0.28) / 0.17))
  if (alpha <= 0 || visible.length === 0) return
  ctx.font = '600 11px system-ui, sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.lineWidth = 1
  const h = 16
  for (const i of visible) {
    const seg = s.segments[i]
    const dx = (seg.x2 - seg.x1) * zoom
    const dy = (seg.y2 - seg.y1) * zoom
    const len = Math.hypot(dx, dy)
    if (len < 16 && !seg.finish) continue
    // Normal que aponta para cima na tela.
    let nx = len > 0 ? -dy / len : 0
    let ny = len > 0 ? dx / len : -1
    if (ny > 0) {
      nx = -nx
      ny = -ny
    }
    const text = labelOf(seg)
    let tw = labelWidths.get(text)
    if (tw === undefined) {
      tw = ctx.measureText(text).width
      labelWidths.set(text, tw)
    }
    const w = tw + 12
    const cx = toScreenX((seg.x1 + seg.x2) / 2) + nx * 17
    const cy = toScreenY((seg.y1 + seg.y2) / 2) + ny * 17
    const slot = slotOf(seg.note, seg.finish)
    const wob = wobbles.get(seg)
    const pop = wob ? Math.max(0, 1 - (clock - wob.t) / 0.35) : 0
    const selected = i === s.selectedIndex || i === s.hoverIndex
    ctx.globalAlpha = alpha * (selected || pop > 0 ? 1 : 0.88)
    ctx.beginPath()
    ctx.roundRect(cx - w / 2, cy - h / 2 - pop * 3, w, h, h / 2)
    ctx.fillStyle = seg.finish ? 'rgba(127, 18, 38, 0.9)' : SLOT_DARK[slot]
    ctx.fill()
    ctx.strokeStyle = pop > 0 || selected ? SLOT_LIGHT[slot] : SLOT_CSS[slot]
    ctx.stroke()
    ctx.fillStyle = pop > 0.3 ? '#ffffff' : SLOT_LIGHT[slot]
    ctx.fillText(text, cx, cy - pop * 3 + 0.5)
  }
  ctx.globalAlpha = 1
}

// --- Trilha e previsão ------------------------------------------------------

const TRAIL_RECENT = 240 // pontos mais recentes, desenhados com destaque

function drawTrail(ctx: CanvasRenderingContext2D, s: RenderState) {
  const inv = 1 / s.view.zoom
  const trail = s.trail
  const n = trail.length
  if (n > 1) {
    const start = Math.max(0, n - TRAIL_RECENT)
    // Parte antiga: um único traço apagado; com muitos pontos, pula alguns.
    if (start > 1) {
      const stride = Math.max(1, Math.floor(start / 3000))
      ctx.strokeStyle = TRAIL_COLORS[0]
      ctx.globalAlpha = 0.28
      ctx.lineWidth = 2 * inv
      ctx.beginPath()
      ctx.moveTo(trail[0].x, trail[0].y)
      for (let i = stride; i < start; i += stride) ctx.lineTo(trail[i].x, trail[i].y)
      ctx.lineTo(trail[start].x, trail[start].y)
      ctx.stroke()
    }
    // Parte recente em pedaços, cada vez mais forte e larga.
    const count = n - start
    const chunk = Math.max(2, Math.ceil(count / TRAIL_CHUNKS))
    for (let c = 0; c * chunk < count - 1; c++) {
      const a = start + c * chunk
      const b = Math.min(n - 1, a + chunk)
      const k = (b - start) / Math.max(1, count - 1)
      const color = TRAIL_COLORS[Math.min(TRAIL_CHUNKS - 1, Math.floor(k * (TRAIL_CHUNKS - 1)))]
      ctx.beginPath()
      ctx.moveTo(trail[a].x, trail[a].y)
      for (let i = a + 1; i <= b; i++) ctx.lineTo(trail[i].x, trail[i].y)
      ctx.strokeStyle = color
      ctx.globalCompositeOperation = 'lighter'
      ctx.globalAlpha = 0.12 * k
      ctx.lineWidth = 8 * inv
      ctx.stroke()
      ctx.globalCompositeOperation = 'source-over'
      ctx.globalAlpha = 0.3 + 0.65 * k
      ctx.lineWidth = (2 + 1.5 * k) * inv
      ctx.stroke()
    }
    ctx.globalAlpha = 1
  }

  // Batidas do metrônomo marcadas sobre a trilha.
  if (s.beatMarks.length > 0) {
    const sprite = glowSprite(PINK_SLOT)
    const g = 9 * inv
    ctx.globalCompositeOperation = 'lighter'
    ctx.globalAlpha = 0.9
    for (const p of s.beatMarks) ctx.drawImage(sprite, p.x - g, p.y - g, g * 2, g * 2)
    ctx.globalCompositeOperation = 'source-over'
    ctx.globalAlpha = 1
  }
}

const PREDICTION_CHUNKS = 5

function drawPrediction(ctx: CanvasRenderingContext2D, s: RenderState) {
  const prediction = s.prediction
  if (!prediction) return
  const inv = 1 / s.view.zoom
  const { points, bounces, hits } = prediction
  const n = points.length

  // Linha pontilhada fantasma, que se apaga ao longo do futuro.
  ctx.strokeStyle = '#c7d2fe'
  ctx.lineWidth = 2.6 * inv
  ctx.setLineDash([0.01, 9 * inv])
  const chunk = Math.ceil(n / PREDICTION_CHUNKS)
  for (let c = 0; c < PREDICTION_CHUNKS; c++) {
    const a = c * chunk
    if (a >= n - 1) break
    const b = Math.min(n - 1, a + chunk)
    ctx.globalAlpha = 0.55 - (0.4 * c) / (PREDICTION_CHUNKS - 1)
    ctx.beginPath()
    ctx.moveTo(points[a].x, points[a].y)
    for (let i = a + 1; i <= b; i++) ctx.lineTo(points[i].x, points[i].y)
    ctx.stroke()
  }
  ctx.setLineDash([])

  // Metrônomo: pontinhos rosados a cada batida.
  if (s.beatSeconds > 0) {
    ctx.fillStyle = SLOT_CSS[PINK_SLOT]
    ctx.globalAlpha = 0.5
    ctx.beginPath()
    for (let k = 1; ; k++) {
      const index = Math.round((k * s.beatSeconds) / PREDICT_DT)
      if (index >= n) break
      const p = points[index]
      ctx.moveTo(p.x + 3 * inv, p.y)
      ctx.arc(p.x, p.y, 3 * inv, 0, Math.PI * 2)
    }
    ctx.fill()
  }

  // Quiques previstos: aneizinhos na cor da nota do bloco.
  ctx.lineWidth = 2 * inv
  const breathe = 1 + 0.12 * Math.sin(clock * 3)
  for (let k = 0; k < bounces.length; k++) {
    const index = bounces[k]
    const p = points[index]
    if (!p) continue
    const seg = s.segments[hits[k]]
    const slot = seg ? slotOf(seg.note, seg.finish) : WHITE_SLOT
    const fade = 0.85 - (0.5 * index) / n
    ctx.globalAlpha = fade * 0.25
    ctx.fillStyle = SLOT_CSS[slot]
    ctx.beginPath()
    ctx.arc(p.x, p.y, 7 * inv * breathe, 0, Math.PI * 2)
    ctx.fill()
    ctx.globalAlpha = fade
    ctx.strokeStyle = SLOT_LIGHT[slot]
    ctx.stroke()
  }
  ctx.globalAlpha = 1
}

// --- Gestos -----------------------------------------------------------------

function drawGesture(ctx: CanvasRenderingContext2D, gesture: Gesture, zoom: number) {
  const inv = 1 / zoom
  if (gesture?.kind === 'create') {
    const { start, end } = gesture
    ctx.beginPath()
    ctx.moveTo(start.x, start.y)
    ctx.lineTo(end.x, end.y)
    ctx.globalCompositeOperation = 'lighter'
    ctx.strokeStyle = '#e0e7ff'
    ctx.globalAlpha = 0.15
    ctx.lineWidth = 16 * inv
    ctx.stroke()
    ctx.globalCompositeOperation = 'source-over'
    ctx.globalAlpha = 0.9
    ctx.lineWidth = 5 * inv
    ctx.setLineDash([12 * inv, 9 * inv])
    ctx.lineDashOffset = -clock * 40 * inv
    ctx.stroke()
    ctx.setLineDash([])
    ctx.lineDashOffset = 0
    ctx.globalAlpha = 1
    ctx.fillStyle = '#ffffff'
    for (const p of [start, end]) {
      ctx.beginPath()
      ctx.arc(p.x, p.y, 4.5 * inv, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  if (gesture?.kind === 'record' && gesture.points.length > 1) {
    const pts = gesture.points
    ctx.beginPath()
    ctx.moveTo(pts[0].x, pts[0].y)
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y)
    ctx.globalCompositeOperation = 'lighter'
    ctx.strokeStyle = SLOT_CSS[GOLD_SLOT]
    ctx.globalAlpha = 0.18
    ctx.lineWidth = 12 * inv
    ctx.stroke()
    ctx.globalCompositeOperation = 'source-over'
    ctx.globalAlpha = 0.95
    ctx.lineWidth = 3 * inv
    ctx.setLineDash([6 * inv, 6 * inv])
    ctx.lineDashOffset = -clock * 30 * inv
    ctx.stroke()
    ctx.setLineDash([])
    ctx.lineDashOffset = 0
    ctx.globalAlpha = 1
    const last = pts[pts.length - 1]
    const g = 14 * inv
    ctx.globalCompositeOperation = 'lighter'
    ctx.drawImage(glowSprite(GOLD_SLOT), last.x - g, last.y - g, g * 2, g * 2)
    ctx.globalCompositeOperation = 'source-over'
  }
}

// --- Bolinha ----------------------------------------------------------------

function updateTail(ball: MovingBall) {
  if (tailCount > 0) {
    const last = (tailHead - 1 + TAIL_SIZE) % TAIL_SIZE
    const jump = Math.hypot(ball.x - tailX[last], ball.y - tailY[last])
    // Teletransporte (reinício, rebobinar, mover a bolinha): começa a cauda de novo.
    if (jump > 120 + Math.hypot(ball.vx, ball.vy) * 0.12) tailCount = 0
  }
  tailX[tailHead] = ball.x
  tailY[tailHead] = ball.y
  tailT[tailHead] = clock
  tailHead = (tailHead + 1) % TAIL_SIZE
  tailCount = Math.min(TAIL_SIZE, tailCount + 1)
}

function drawBall(ctx: CanvasRenderingContext2D, s: RenderState) {
  const ball = s.ball
  const R = BALL_RADIUS

  // Cauda de cometa: do mais antigo ao mais novo, cada vez mais larga e forte.
  if (tailCount > 1) {
    ctx.globalCompositeOperation = 'lighter'
    ctx.lineCap = 'round'
    let prev = -1
    for (let k = tailCount - 1; k >= 0; k--) {
      const idx = (tailHead - 1 - k + TAIL_SIZE * 2) % TAIL_SIZE
      const age = clock - tailT[idx]
      if (age > TAIL_SECONDS) continue
      if (prev >= 0) {
        const f = 1 - age / TAIL_SECONDS
        const dx = tailX[idx] - tailX[prev]
        const dy = tailY[idx] - tailY[prev]
        if (dx * dx + dy * dy > 0.01) {
          ctx.beginPath()
          ctx.moveTo(tailX[prev], tailY[prev])
          ctx.lineTo(tailX[idx], tailY[idx])
          ctx.strokeStyle = SLOT_CSS[tintSlot]
          ctx.globalAlpha = f * f * 0.45
          ctx.lineWidth = R * 1.8 * f
          ctx.stroke()
          ctx.strokeStyle = '#ffffff'
          ctx.globalAlpha = f * f * 0.5
          ctx.lineWidth = R * 0.7 * f
          ctx.stroke()
        }
      }
      prev = idx
    }
    ctx.globalAlpha = 1
    ctx.globalCompositeOperation = 'source-over'
  }

  // Halo colorido (troca de cor suave entre a nota anterior e a atual).
  const glowSize = R * (4.2 + ballFlash * 2.5)
  ctx.globalCompositeOperation = 'lighter'
  if (tintMix < 1) {
    ctx.globalAlpha = (1 - tintMix) * 0.6
    ctx.drawImage(glowSprite(tintPrev), ball.x - glowSize, ball.y - glowSize, glowSize * 2, glowSize * 2)
  }
  ctx.globalAlpha = tintMix * (0.6 + ballFlash * 0.4)
  ctx.drawImage(glowSprite(tintSlot), ball.x - glowSize, ball.y - glowSize, glowSize * 2, glowSize * 2)
  ctx.globalAlpha = 1
  ctx.globalCompositeOperation = 'source-over'

  // Esticar na direção da velocidade e achatar no impacto, ao longo da normal.
  const speed = Math.hypot(ball.vx, ball.vy)
  const stretch = 1 + Math.min(0.28, speed / 5000)
  const av = speed > 1 ? Math.atan2(ball.vy, ball.vx) : 0
  const it = clock - impactT
  const squash = it < 0.6 ? impactAmount * Math.exp(-it * 9) * Math.cos(it * 30) : 0
  const sqA = 1 - squash // ao longo da normal
  const sqB = 1 + squash * 0.8 // ao longo do bloco

  ctx.save()
  ctx.translate(ball.x, ball.y)
  ctx.rotate(impactAngle)
  ctx.scale(sqA, sqB)
  ctx.rotate(av - impactAngle)
  ctx.scale(stretch, 1 / stretch)
  // Reflexo fixo no alto à esquerda: desfaz as transformações para achar o ponto no sistema local.
  const [hx, hy] = toLocal(-R * 0.35, -R * 0.42, impactAngle, sqA, sqB, av - impactAngle, stretch)
  const grad = ctx.createRadialGradient(hx, hy, R * 0.08, 0, 0, R)
  grad.addColorStop(0, '#ffffff')
  grad.addColorStop(0.45, SLOT_LIGHT[tintSlot])
  grad.addColorStop(1, SLOT_CSS[tintSlot])
  ctx.fillStyle = grad
  ctx.beginPath()
  ctx.arc(0, 0, R, 0, Math.PI * 2)
  ctx.fill()
  ctx.lineWidth = 1.2
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.55)'
  ctx.stroke()
  ctx.restore()
}

// Leva um deslocamento (x, y) do mundo para o sistema da bolinha (rotate a, scale sa/sb, rotate b, scale st).
function toLocal(x: number, y: number, a: number, sa: number, sb: number, b: number, st: number): [number, number] {
  let c = Math.cos(-a)
  let s = Math.sin(-a)
  let lx = (x * c - y * s) / sa
  let ly = (x * s + y * c) / sb
  c = Math.cos(-b)
  s = Math.sin(-b)
  const rx = lx * c - ly * s
  const ry = lx * s + ly * c
  lx = rx / st
  ly = ry * st
  return [lx, ly]
}
