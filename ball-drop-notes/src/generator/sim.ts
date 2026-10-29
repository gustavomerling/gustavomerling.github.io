import { BALL_RADIUS, integrate, PHYSICS } from '../physics'
import type { MovingBall, Segment } from '../types'

// Distância em que o motor considera que a bolinha encosta num bloco (e toca a nota).
export const HIT_DISTANCE = BALL_RADIUS + 0.5
const MAX_MOVE_PER_SUBSTEP = BALL_RADIUS / 2 // mesmo valor de physics.ts, só para estimar o subpasso

// Estado da bolinha no fim de um quadro da simulação.
export type Frame = { t: number; x: number; y: number; vx: number; vy: number; touching: boolean }

// Toque detectado, com o tempo do subpasso em que aconteceu (mais preciso que o quadro).
export type TimedHit = { index: number; t: number; speed: number; x: number; y: number }

// Tamanho de subpasso que integrate usaria para esta velocidade e este dt.
export function substepFor(speed: number, dt: number) {
  return dt / Math.max(1, Math.ceil((speed * dt) / MAX_MOVE_PER_SUBSTEP))
}

// Copia os blocos num vetor que conta quantas vezes o bloco 0 é lido. integrate lê o bloco 0
// uma vez por subpasso, então a contagem diz em que subpasso cada toque aconteceu.
function countingSegments(segments: Segment[]) {
  const copy = segments.slice()
  const counter = { n: 0 }
  if (copy.length > 0) {
    const first = copy[0]
    Object.defineProperty(copy, 0, {
      get: () => {
        counter.n++
        return first
      },
      enumerable: true,
      configurable: true,
    })
  }
  return { copy, counter }
}

// Roda a física real (integrate) com passo fixo dt, de t0 até tEnd, a partir do estado dado.
// Devolve os quadros e os toques com tempo de subpasso. Para na linha de chegada.
// dtAt permite variar o passo a cada quadro (para testar quadros irregulares).
export function runSim(
  ball: MovingBall,
  segments: Segment[],
  dt: number,
  t0: number,
  tEnd: number,
  options: { frames?: boolean; dtAt?: (frame: number) => number; stopAfterHits?: number } = {},
) {
  // O vetor que conta subpassos é lento (propriedade com getter); só é usado para repetir
  // o quadro em que houve um toque, a partir do estado salvo antes dele.
  const plain = segments.slice()
  let counting: ReturnType<typeof countingSegments> | null = null
  const frames: Frame[] = []
  const hits: TimedHit[] = []
  let t = t0
  let finished = false
  let k = 0
  if (options.frames)
    frames.push({ t, x: ball.x, y: ball.y, vx: ball.vx, vy: ball.vy, touching: ball.touching.length > 0 })
  let touchedInFrame = false
  const markTouch = () => {
    touchedInFrame = true
  }
  while (t < tEnd - 1e-9) {
    const step = options.dtAt ? options.dtAt(k) : dt
    k++
    const sx = ball.x
    const sy = ball.y
    const svx = ball.vx
    const svy = ball.vy
    const sTouching = ball.touching.slice()
    touchedInFrame = false
    let reached = integrate(ball, step, plain, markTouch)
    if (!touchedInFrame && !reached) {
      t += step
      if (options.frames)
        frames.push({ t, x: ball.x, y: ball.y, vx: ball.vx, vy: ball.vy, touching: ball.touching.length > 0 })
      continue
    }
    // Repete o quadro contando subpassos (o resultado é idêntico: a física é determinística).
    ball.x = sx
    ball.y = sy
    ball.vx = svx
    ball.vy = svy
    ball.touching = sTouching
    counting ??= countingSegments(segments)
    const { copy, counter } = counting
    counter.n = 0
    const pending: { index: number; count: number; speed: number; x: number; y: number }[] = []
    const startSpeed = Math.hypot(ball.vx, ball.vy + PHYSICS.gravity * step)
    reached = integrate(ball, step, copy, (index, speed) => {
      pending.push({ index, count: counter.n, speed, x: ball.x, y: ball.y })
    })
    // Sem chegada, a contagem final é o número de subpassos; com chegada, estima pelo motor.
    const substeps = reached || segments.length === 0 ? Math.round(step / substepFor(startSpeed, step)) : counter.n
    const h = step / Math.max(1, substeps)
    for (const p of pending) hits.push({ index: p.index, t: t + p.count * h, speed: p.speed, x: p.x, y: p.y })
    t += step
    if (options.frames)
      frames.push({ t, x: ball.x, y: ball.y, vx: ball.vx, vy: ball.vy, touching: ball.touching.length > 0 })
    if (reached) {
      // O toque na chegada não chama onHit; registra com índice da chegada.
      const index = ball.touching[ball.touching.length - 1]
      hits.push({ index, t: t - step + counter.n * h, speed: Math.hypot(ball.vx, ball.vy), x: ball.x, y: ball.y })
      finished = true
      break
    }
    if (options.stopAfterHits !== undefined && hits.length >= options.stopAfterHits) break
  }
  return { frames, hits, finished, t }
}

// Distância entre dois segmentos de reta (0 se cruzam).
export function segSegDistance(
  ax1: number,
  ay1: number,
  ax2: number,
  ay2: number,
  bx1: number,
  by1: number,
  bx2: number,
  by2: number,
) {
  if (segmentsCross(ax1, ay1, ax2, ay2, bx1, by1, bx2, by2)) return 0
  return Math.min(
    pointSegDistance(ax1, ay1, bx1, by1, bx2, by2),
    pointSegDistance(ax2, ay2, bx1, by1, bx2, by2),
    pointSegDistance(bx1, by1, ax1, ay1, ax2, ay2),
    pointSegDistance(bx2, by2, ax1, ay1, ax2, ay2),
  )
}

export function pointSegDistance(px: number, py: number, x1: number, y1: number, x2: number, y2: number) {
  const dx = x2 - x1
  const dy = y2 - y1
  const len2 = dx * dx + dy * dy
  const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / len2))
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy))
}

function segmentsCross(
  ax1: number,
  ay1: number,
  ax2: number,
  ay2: number,
  bx1: number,
  by1: number,
  bx2: number,
  by2: number,
) {
  const d1 = cross(bx2 - bx1, by2 - by1, ax1 - bx1, ay1 - by1)
  const d2 = cross(bx2 - bx1, by2 - by1, ax2 - bx1, ay2 - by1)
  const d3 = cross(ax2 - ax1, ay2 - ay1, bx1 - ax1, by1 - ay1)
  const d4 = cross(ax2 - ax1, ay2 - ay1, bx2 - ax1, by2 - ay1)
  return d1 * d2 < 0 && d3 * d4 < 0
}

function cross(ax: number, ay: number, bx: number, by: number) {
  return ax * by - ay * bx
}

export type TrackReport = {
  ok: boolean
  // Maior erro de tempo entre o toque e a batida esperada, em ms (sem contar o atraso inicial comum).
  maxErrorMs: number
  // Notas tocadas na ordem certa.
  hits: number
  expected: number
  // Toques fora do roteiro: bloco errado, repetido ou fora de ordem.
  extraTouches: number
  // A bolinha chegou à linha de chegada (true se a pista não tem chegada).
  finished: boolean
}

// Roda a física real a partir da bolinha parada em (0, 0) e mede se cada bloco i é tocado
// uma vez, em ordem, no tempo da melodia. O erro ignora um atraso comum a todas as notas
// (o ouvido só percebe o ritmo), e é medido no subpasso da física.
export function validateTrack(
  melody: { beats: number[] },
  segments: Segment[],
  bpm: number,
  dt = 1 / 60,
  dtAt?: (frame: number) => number,
): TrackReport {
  const expected = melody.beats.length
  const beatSeconds = 60 / bpm
  const offsets: number[] = []
  let acc = 0
  for (let i = 0; i < expected; i++) {
    offsets.push(acc)
    acc += melody.beats[i] * beatSeconds
  }
  const hasFinish = segments.some((s) => s.finish)
  const lastNote = expected > 0 ? offsets[expected - 1] : 0
  const ball: MovingBall = { x: 0, y: 0, vx: 0, vy: 0, touching: [] }
  const sim = runSim(ball, segments, dt, 0, lastNote + 8, { dtAt })
  let next = 0
  let extraTouches = 0
  const times: number[] = []
  for (const hit of sim.hits) {
    if (segments[hit.index]?.finish) continue
    if (hit.index === next && next < expected) {
      times.push(hit.t)
      next++
    } else {
      extraTouches++
    }
  }
  let maxErrorMs = 0
  if (times.length > 0) {
    // Atraso comum: média entre o menor e o maior desvio, que minimiza o erro máximo.
    const devs = times.map((t, i) => t - offsets[i])
    const mid = (Math.min(...devs) + Math.max(...devs)) / 2
    maxErrorMs = Math.max(...devs.map((d) => Math.abs(d - mid))) * 1000
  }
  const finished = hasFinish ? sim.finished : true
  const ok = next === expected && extraTouches === 0 && maxErrorMs <= 25 && finished
  return { ok, maxErrorMs, hits: next, expected, extraTouches, finished }
}
