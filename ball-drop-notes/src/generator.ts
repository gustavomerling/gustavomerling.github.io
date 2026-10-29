import { NOTE_SUSTAIN_PER_PX } from './music'
import { BALL_RADIUS, PHYSICS } from './physics'
import type { Melody, MovingBall, Segment } from './types'
import {
  type Frame,
  HIT_DISTANCE,
  pointSegDistance,
  runSim,
  segSegDistance,
  substepFor,
  validateTrack,
} from './generator/sim'
import { styleParams, styleTarget, TRACK_STYLES, type StyleParams, type TrackStyle } from './generator/styles'

export { TRACK_STYLES, validateTrack }
export type { TrackStyle }
export type { TrackReport } from './generator/sim'

export type GenerateOptions = {
  bpm: number
  style: TrackStyle
  // Coloca uma linha de chegada depois da última nota.
  finish: boolean
  seed?: number
  // Tempo de queda livre até a primeira nota, em segundos (padrão 0,6).
  startDelay?: number
}

// Gerador de pista que conhece a física: para cada nota, simula o voo da bolinha com o motor
// real (integrate), acha onde ela vai estar no instante exato da batida e põe o bloco ali,
// inclinado para mandar a bolinha na direção que o estilo pede. Cada escolha é conferida
// simulando de novo: a bolinha precisa tocar só aquele bloco, uma vez, no tempo certo, sair
// dele e não passar perto de nenhum outro. Se nenhuma inclinação serve, volta uma nota
// (busca em profundidade) e tenta outra.

const DT_REF = 1 / 60 // passo de quadro usado para planejar (o mais comum no jogo)
const G = PHYSICS.gravity
const MIN_LEN = 30
const MAX_LEN = 220
const FINISH_LEN = 260
const HIT_TOLERANCE = 0.005 // s; erro máximo aceito no planejamento
// Passos de quadro alternativos simulados junto (sombras), para a pista funcionar em qualquer monitor.
// A última sombra usa o passo de referência com a bolinha solta 0,5 px ao lado (perturbação).
// A sombra com jitter imita um navegador real: quadros de 1/60 s com variação de ±10%.
type Shadow = { dt: number; nudge: number; jitter?: boolean }
const SHADOWS: Shadow[] = [
  { dt: 1 / 30, nudge: 0 },
  { dt: 1 / 144, nudge: 0 },
  { dt: 1 / 120, nudge: 0 },
  { dt: 1 / 60, nudge: 0.5 },
  { dt: 1 / 60, nudge: 0, jitter: true },
]
// Passo irregular, mas determinístico (mesma pista = mesmo resultado).
const jitterDt = (k: number) => (1 / 60) * (0.9 + ((0.2 * (((Math.sin(k * 78.233 + 1.7) * 43758.5453) % 1) + 1)) % 1))
const SHADOW_TOLERANCE = 0.02 // s; acima disso a sombra reprova a opção
const END_CLEARANCE = 2 * BALL_RADIUS // px; o toque precisa ficar longe das pontas do bloco
const APPROACH_WINDOW = 0.15 // s; trecho do caminho logo antes do toque, que pode passar perto do bloco
const MIN_SPEED = 300 // px/s; abaixo disso o quique fica mole
const SIM_BUDGET = 1 // fração de GENERATOR_TUNING.budgetPerNote usada em cada tentativa
// Ajustes do planejamento (exportados para testes).
// O segredo da precisão: a física divide cada quadro em subpassos de até 6 px. Com a bolinha
// sempre rápida, os subpassos são curtos em qualquer taxa de quadros, e o caminho (e o tempo
// de cada nota) quase não muda entre 30, 60 ou 144 Hz. Bolinha lenta = subpasso do tamanho do
// quadro = cada monitor vê uma pista diferente.
export const GENERATOR_TUNING = {
  speedLow: 1300, // px/s; velocidade de impacto preferida
  speedHigh: 2300,
  minFlightSpeed: 800, // px/s; velocidade mínima no voo (no alto da subida sobra só a horizontal)
  maxAngle: 70, // graus; incidência máxima (rasante)
  shadows: true, // simula também outros dt (sombras); desligar deixa mais rápido e menos firme
  options: 3, // opções conferidas por nota antes de escolher a melhor
  budgetPerNote: 100, // simulações por nota (limita o tempo de geração)
  driftWeight: 1, // peso do erro das sombras na escolha
  minLength: 70, // px; bloco mais curto (mais longo = mais tolerante a desvios)
}
// Ângulos de incidência testados (0 = bate de frente), em radianos.
const angles = () => {
  const out = [0]
  for (let d = 10; d <= GENERATOR_TUNING.maxAngle; d += 10) out.push(d, -d)
  return out.map((d) => (d * Math.PI) / 180)
}

// Rigidez das conferências: a primeira tentativa usa folga maior; se falhar, afrouxa.
type Strictness = { margin: number; budget: number; checks: boolean; shadowTolerance: number; shadows: boolean }
const PASSES: Strictness[] = [
  { margin: 8, budget: SIM_BUDGET, checks: true, shadowTolerance: SHADOW_TOLERANCE, shadows: true },
  { margin: 5, budget: SIM_BUDGET / 2, checks: true, shadowTolerance: SHADOW_TOLERANCE * 1.5, shadows: true },
  { margin: 3, budget: SIM_BUDGET / 2, checks: true, shadowTolerance: SHADOW_TOLERANCE * 3, shadows: true },
  { margin: 3, budget: SIM_BUDGET / 2, checks: true, shadowTolerance: Infinity, shadows: true },
  { margin: 2, budget: SIM_BUDGET / 4, checks: true, shadowTolerance: Infinity, shadows: false },
  { margin: 0, budget: SIM_BUDGET / 4, checks: false, shadowTolerance: Infinity, shadows: false },
]

// Caminho já percorrido, em trechos de quadro a quadro (x1, y1, x2, y2, t do fim).
type Chunk = { start: number; end: number; minX: number; minY: number; maxX: number; maxY: number }

function mulberry32(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// Gera uma pista: blocos posicionados para que a bolinha, solta parada em (0, 0),
// toque cada nota da melodia na ordem e no tempo certo.
export function generateTrack(melody: Melody, options: GenerateOptions): Segment[] {
  const n = Math.min(melody.notes.length, melody.beats.length)
  const beatSeconds = 60 / Math.max(1, options.bpm)
  const startDelay = options.startDelay ?? 0.6
  // Instante de cada nota e tempo até a próxima.
  const times: number[] = []
  const gaps: number[] = []
  const beatAt: number[] = []
  let acc = 0
  for (let i = 0; i < n; i++) {
    const beats = Math.max(0.05, melody.beats[i])
    times.push(startDelay + acc * beatSeconds)
    beatAt.push(acc)
    gaps.push(beats * beatSeconds)
    acc += beats
  }
  if (n === 0) {
    return options.finish ? [{ x1: -FINISH_LEN / 2, y1: 300, x2: FINISH_LEN / 2, y2: 300, note: 0, finish: true }] : []
  }

  let best: Segment[] = []
  for (const pass of PASSES) {
    const result = plan(melody, options, times, gaps, beatAt, pass)
    if (result.ok) return result.segments
    if (result.segments.length > best.length) best = result.segments
  }
  return best
}

function plan(
  melody: Melody,
  options: GenerateOptions,
  times: number[],
  gaps: number[],
  beatAt: number[],
  strict: Strictness,
): { ok: boolean; segments: Segment[] } {
  const n = times.length
  const rand = mulberry32(options.seed ?? 1)
  const params: StyleParams = styleParams(rand)
  const segments: Segment[] = []
  const path: number[] = []
  const chunks: Chunk[] = []
  let sims = 0
  let deepest: Segment[] = []

  const pushChunk = (frames: Frame[], upTo: number) => {
    const start = path.length
    let minX = Infinity
    let minY = Infinity
    let maxX = -Infinity
    let maxY = -Infinity
    for (let k = 1; k <= upTo; k++) {
      const a = frames[k - 1]
      const b = frames[k]
      path.push(a.x, a.y, b.x, b.y, b.t)
      minX = Math.min(minX, a.x, b.x)
      minY = Math.min(minY, a.y, b.y)
      maxX = Math.max(maxX, a.x, b.x)
      maxY = Math.max(maxY, a.y, b.y)
    }
    chunks.push({ start, end: path.length, minX, minY, maxX, maxY })
  }
  const popChunk = () => {
    const chunk = chunks.pop()
    if (chunk) path.length = chunk.start
  }

  // Menor folga entre um segmento e o caminho já percorrido (trechos recentes têm folga menor).
  const clearOfPath = (x1: number, y1: number, x2: number, y2: number, recentAfter: number, margin: number) => {
    const reach = HIT_DISTANCE + margin
    const minX = Math.min(x1, x2) - reach
    const maxX = Math.max(x1, x2) + reach
    const minY = Math.min(y1, y2) - reach
    const maxY = Math.max(y1, y2) + reach
    for (const c of chunks) {
      if (c.maxX < minX || c.minX > maxX || c.maxY < minY || c.minY > maxY) continue
      for (let k = c.start; k < c.end; k += 5) {
        const ax = path[k]
        const ay = path[k + 1]
        const bx = path[k + 2]
        const by = path[k + 3]
        if (Math.max(ax, bx) < minX || Math.min(ax, bx) > maxX || Math.max(ay, by) < minY || Math.min(ay, by) > maxY)
          continue
        const limit = path[k + 4] > recentAfter ? HIT_DISTANCE + 0.5 : reach
        if (segSegDistance(x1, y1, x2, y2, ax, ay, bx, by) <= limit) return false
      }
    }
    return true
  }

  // O caminho (quadros) passa longe de todos os blocos já colocados?
  const framesClearOfSegments = (frames: Frame[], from: number, margin: number) => {
    const reach = HIT_DISTANCE + margin
    let fx1 = Infinity
    let fy1 = Infinity
    let fx2 = -Infinity
    let fy2 = -Infinity
    for (let k = from; k < frames.length; k++) {
      const f = frames[k]
      if (f.x < fx1) fx1 = f.x
      if (f.x > fx2) fx2 = f.x
      if (f.y < fy1) fy1 = f.y
      if (f.y > fy2) fy2 = f.y
    }
    for (const seg of segments) {
      if (Math.max(seg.x1, seg.x2) + reach < fx1 || Math.min(seg.x1, seg.x2) - reach > fx2) continue
      if (Math.max(seg.y1, seg.y2) + reach < fy1 || Math.min(seg.y1, seg.y2) - reach > fy2) continue
      const minX = Math.min(seg.x1, seg.x2) - reach
      const maxX = Math.max(seg.x1, seg.x2) + reach
      const minY = Math.min(seg.y1, seg.y2) - reach
      const maxY = Math.max(seg.y1, seg.y2) + reach
      for (let k = from + 1; k < frames.length; k++) {
        const a = frames[k - 1]
        const b = frames[k]
        if (
          Math.max(a.x, b.x) < minX ||
          Math.min(a.x, b.x) > maxX ||
          Math.max(a.y, b.y) < minY ||
          Math.min(a.y, b.y) > maxY
        )
          continue
        if (segSegDistance(seg.x1, seg.y1, seg.x2, seg.y2, a.x, a.y, b.x, b.y) <= reach) return false
      }
    }
    return true
  }

  // Coloca a linha de chegada abaixo da bolinha, depois da última nota.
  const placeFinish = (frames: Frame[], from: number, lastT: number): Segment | null => {
    for (const len of [FINISH_LEN, FINISH_LEN * 0.6])
      for (const wait of [0.5, 0.6, 0.7, 0.8, 0.9, 1.0, 0.4, 1.1, 1.2, 0.3]) {
        const k = frames.findIndex((f) => f.t >= lastT + wait)
        if (k < 0) continue
        const f = frames[k]
        if (f.vy < 300) continue
        // A linha fica quase toda à frente da bolinha (no sentido em que ela anda), para que ela
        // não passe raspando por cima da linha antes de chegar.
        const y = f.y + HIT_DISTANCE - 0.5
        const ahead = Math.sign(f.vx) || 1
        const xa = f.x - ahead * 2 * BALL_RADIUS
        const xb = f.x + ahead * (len - 2 * BALL_RADIUS)
        const fin: Segment = { x1: Math.min(xa, xb), y1: y, x2: Math.max(xa, xb), y2: y, note: 0, finish: true }
        if (!strict.checks) return fin
        // O caminho até a chegada não pode passar perto dela antes da hora.
        if (!clearOfPath(fin.x1, fin.y1, fin.x2, fin.y2, Infinity, strict.margin)) continue
        let clear = true
        for (let j = from + 1; j < k - 1 && clear; j++) {
          const a = frames[j - 1]
          const b = frames[j]
          if (segSegDistance(fin.x1, fin.y1, fin.x2, fin.y2, a.x, a.y, b.x, b.y) <= HIT_DISTANCE + strict.margin)
            clear = false
        }
        if (!clear) continue
        if (
          segments.some(
            (s) =>
              segSegDistance(s.x1, s.y1, s.x2, s.y2, fin.x1, fin.y1, fin.x2, fin.y2) < 2 * HIT_DISTANCE + strict.margin,
          )
        )
          continue
        return fin
      }
    return null
  }

  let finishSeg: Segment | null = null

  // Busca em profundidade: coloca a nota i, a partir do voo que chega nela.
  const solve = (i: number, flights: Frame[][]): boolean => {
    const incoming = flights[0]
    const T = times[i]
    // Mira o bloco um pouco antes ou depois da batida para centrar o conjunto (referência +
    // sombras): o atraso que cada dt acumula fica dividido entre todos.
    const aim = T - relDrift.reduce((a, b) => a + b, 0) / (relDrift.length + 1)
    const gap = gaps[i]
    const last = i === n - 1
    // Último quadro livre antes do toque: daqui a simulação recomeça com o novo bloco.
    let f = -1
    for (let k = incoming.length - 1; k >= 0; k--) {
      if (incoming[k].t <= T - 0.03 && !incoming[k].touching) {
        f = k
        break
      }
    }
    if (f < 0) return false
    // Posição e velocidade no instante da batida (queda livre a partir do quadro anterior).
    let k0 = f
    while (k0 + 1 < incoming.length && incoming[k0 + 1].t <= aim) k0++
    const base = incoming[k0]
    const tau = aim - base.t
    const px = base.x + base.vx * tau
    const py = base.y + base.vy * tau + 0.5 * G * tau * tau
    const vx = base.vx
    const vy = base.vy + G * tau
    const speed = Math.hypot(vx, vy)
    if (speed < MIN_SPEED) return false

    const minLen = Math.max(MIN_LEN, GENERATOR_TUNING.minLength)
    const len0 = Math.max(minLen, Math.min(MAX_LEN, gap / NOTE_SUSTAIN_PER_PX))
    const lengths = len0 > minLen * 1.5 ? [len0, Math.max(minLen, len0 * 0.6)] : [len0]
    const nextGap = last ? 0.6 : gap
    const target = styleTarget(
      options.style,
      { i, x: px, y: py, gap: nextGap, beat: beatAt[i] + melody.beats[i] },
      params,
    )

    // Candidatos: ângulo de incidência e largura. O contato fica sempre no meio do bloco,
    // longe das pontas (que desviam a bolinha de um jeito diferente do planejado).
    type Candidate = { nx: number; ny: number; vn: number; len: number; score: number }
    const candidates: Candidate[] = []
    const ux = -vx / speed
    const uy = -vy / speed
    for (const psi of angles()) {
      const c = Math.cos(psi)
      const s = Math.sin(psi)
      const nx = ux * c - uy * s
      const ny = ux * s + uy * c
      const vn = speed * c
      // Velocidade depois do quique (atrito desprezível num toque curto).
      const ox = vx + (1 + PHYSICS.bounce) * vn * nx
      const oy = vy + (1 + PHYSICS.bounce) * vn * ny
      const ex = px + ox * nextGap
      const dy = oy * nextGap + 0.5 * G * nextGap * nextGap
      const nextSpeed = Math.hypot(ox, oy + G * nextGap)
      let score = ((ex - target.x) / target.sx) ** 2 + ((dy - target.dy) / target.sy) ** 2
      const tune = GENERATOR_TUNING
      if (!last && nextSpeed < tune.speedLow) score += ((tune.speedLow - nextSpeed) / 200) ** 2
      if (nextSpeed > tune.speedHigh) score += ((nextSpeed - tune.speedHigh) / 300) ** 2
      if (ny > 0.2) score += 1.5 // bloco de teto: possível, mas menos bonito
      // Velocidade mínima no voo (no alto da subida, só sobra a horizontal).
      const flightMin = oy < 0 && oy + G * nextGap > 0 ? Math.abs(ox) : Math.min(Math.hypot(ox, oy), nextSpeed)
      if (!last && flightMin < tune.minFlightSpeed) score += ((tune.minFlightSpeed - flightMin) / 150) ** 2
      score += 0.1 * psi * psi + rand() * 0.05
      lengths.forEach((len, li) => candidates.push({ nx, ny, vn, len, score: score + li * 0.6 }))
    }
    candidates.sort((a, b) => a.score - b.score)

    const h = substepFor(speed, DT_REF)
    const startFrame = incoming[f]
    const tEnd = last ? T + (options.finish ? 1.3 : 3) : T + gap + 0.05
    // Opções que passaram nas conferências, com o erro das sombras.
    type Option = {
      seg: Segment
      frames: Frame[]
      shadows: Frame[][]
      ranges: { lo: number; hi: number }[]
      drifts: number[]
      score: number
    }
    const opts: Option[] = []
    for (const cand of candidates) {
      if (
        sims >= strict.budget * GENERATOR_TUNING.budgetPerNote * n ||
        opts.length >= (last ? 3 * GENERATOR_TUNING.options : GENERATOR_TUNING.options)
      )
        break
      // Tangente do bloco e ponto de contato a uma distância d0 do centro da bolinha na batida.
      const tx = -cand.ny
      const ty = cand.nx
      let d0 = HIT_DISTANCE - (cand.vn * h) / 2
      const makeSeg = (d: number): Segment => {
        const qx = px - cand.nx * d
        const qy = py - cand.ny * d
        const half = cand.len / 2
        return {
          x1: qx - tx * half,
          y1: qy - ty * half,
          x2: qx + tx * half,
          y2: qy + ty * half,
          note: melody.notes[i],
          finish: false,
        }
      }
      let seg = makeSeg(d0)
      if (strict.checks) {
        if (!clearOfPath(seg.x1, seg.y1, seg.x2, seg.y2, T - APPROACH_WINDOW, strict.margin)) continue
        if (segments.some((s) => segSegDistance(s.x1, s.y1, s.x2, s.y2, seg.x1, seg.y1, seg.x2, seg.y2) < 10)) continue
      }
      // Simula do quadro livre até depois da próxima batida, só com este bloco.
      let sim: ReturnType<typeof runSim> | null = null
      let err = Infinity
      for (let attempt = 0; attempt < 3; attempt++) {
        const ball: MovingBall = {
          x: startFrame.x,
          y: startFrame.y,
          vx: startFrame.vx,
          vy: startFrame.vy,
          touching: [],
        }
        const trySeg = makeSeg(d0)
        const trial = runSim(ball, [trySeg], DT_REF, startFrame.t, tEnd, { frames: true })
        sims++
        if (trial.hits.length === 0) break
        const e = trial.hits[0].t - aim
        if (Math.abs(e) < Math.abs(err)) {
          err = e
          sim = trial
          seg = trySeg
        }
        if (Math.abs(e) <= HIT_TOLERANCE * 0.4) break
        // Toque atrasado: aproxima o bloco da bolinha (d0 menor) e vice-versa.
        d0 -= e * cand.vn
      }
      if (!sim || Math.abs(err) > HIT_TOLERANCE) continue
      if (sim.hits.length !== 1 || !contactInside(sim.hits[0], seg)) continue
      const frames = sim.frames
      if (!leavesCleanly(frames, sim.hits[0].t, seg, strict.checks ? strict.margin : 0, Math.min(0.15, 0.6 * gap)))
        continue
      if (strict.checks && !framesClearOfSegments(frames, 0, strict.margin)) continue
      const end = frames[frames.length - 1]
      if (!last && strict.checks && slowest(frames, sim.hits[0].t + 0.02) < GENERATOR_TUNING.minFlightSpeed * 0.75)
        continue
      if (!last && Math.hypot(end.vx, end.vy) < MIN_SPEED) continue
      // Confere a mesma pista com outros passos de quadro (monitores de 30 a 144 Hz):
      // cada sombra segue o próprio caminho e precisa tocar o bloco também.
      // O erro de tempo das sombras entra na nota da opção (mais estável = melhor).
      const shadows: Frame[][] = []
      const ranges: { lo: number; hi: number }[] = []
      const drifts: number[] = []
      let drift = 0
      if (strict.checks && flights.length > 1) {
        for (let s = 1; s < flights.length; s++) {
          const shadow = checkShadow(flights[s], s, seg, T, last, tEnd)
          if (!shadow) break
          shadows.push(shadow.frames)
          ranges[s] = pendingRange[s]
          drifts[s - 1] = shadow.hitT - sim.hits[0].t
          drift = Math.max(drift, Math.abs(shadow.err))
        }
        if (shadows.length !== flights.length - 1) continue
      }
      opts.push({
        seg,
        frames,
        shadows,
        ranges,
        drifts,
        score: cand.score + GENERATOR_TUNING.driftWeight * (drift / 0.01) ** 2,
      })
    }
    opts.sort((a, b) => a.score - b.score)

    const savedRanges = shadowRange
    const savedDrift = relDrift
    for (const { seg, frames, shadows, ranges, drifts } of opts) {
      shadowRange = ranges
      relDrift = drifts
      segments.push(seg)
      pushChunk(incoming, f)
      if (segments.length > deepest.length) deepest = segments.slice()
      if (last) {
        if (options.finish) {
          finishSeg = placeFinish(frames, 0, T)
          if (finishSeg) return true
        } else {
          // Sem chegada, a bolinha cai para sempre: precisa terminar abaixo de todos os blocos.
          const end = frames[frames.length - 1]
          const lowest = Math.max(...segments.map((s) => Math.max(s.y1, s.y2)))
          if (!strict.checks || (end.y > lowest + 100 && end.vy > 0)) return true
        }
      } else if (solve(i + 1, [frames, ...shadows])) {
        return true
      }
      segments.pop()
      popChunk()
    }
    shadowRange = savedRanges
    relDrift = savedDrift
    return false
  }

  // Menor velocidade da bolinha nos quadros depois de t.
  const slowest = (frames: Frame[], t: number) => {
    let min = Infinity
    for (const f of frames) if (f.t > t) min = Math.min(min, Math.hypot(f.vx, f.vy))
    return min
  }

  // O ponto de contato (projeção do centro da bolinha) fica longe das pontas do bloco.
  const contactInside = (hit: { x: number; y: number }, seg: Segment) => {
    const dx = seg.x2 - seg.x1
    const dy = seg.y2 - seg.y1
    const len = Math.hypot(dx, dy)
    const along = ((hit.x - seg.x1) * dx + (hit.y - seg.y1) * dy) / len
    const clearance = Math.max(END_CLEARANCE, 0.2 * len)
    return along >= clearance && along <= len - clearance
  }

  // A bolinha sai do bloco em até maxTime depois do toque e não volta a chegar perto.
  const leavesCleanly = (frames: Frame[], hitT: number, seg: Segment, margin: number, maxTime: number) => {
    const reach = HIT_DISTANCE + margin
    let left = false
    for (let k = 1; k < frames.length; k++) {
      if (frames[k].t <= hitT) continue
      const a = frames[k - 1]
      const b = frames[k]
      if (!left) {
        if (pointSegDistance(b.x, b.y, seg.x1, seg.y1, seg.x2, seg.y2) > reach) {
          if (b.t > hitT + maxTime) return false
          left = true
        }
      } else if (segSegDistance(seg.x1, seg.y1, seg.x2, seg.y2, a.x, a.y, b.x, b.y) <= reach) {
        return false
      }
    }
    return left
  }

  // Menor e maior desvio de cada sombra até a nota atual (pilha, por causa da busca).
  let shadowRange: { lo: number; hi: number }[] = []
  // Atraso de cada sombra em relação à referência, no último toque.
  let relDrift: number[] = []
  const pendingRange: { lo: number; hi: number }[] = []
  // Simula uma sombra (outro dt) com o novo bloco e confere toque, tempo e saída.
  const checkShadow = (
    incoming: Frame[],
    s: number,
    seg: Segment,
    T: number,
    last: boolean,
    tEnd: number,
  ): { frames: Frame[]; err: number; hitT: number } | null => {
    let f = -1
    for (let k = incoming.length - 1; k >= 0; k--) {
      if (incoming[k].t <= T - 0.05 && !incoming[k].touching) {
        f = k
        break
      }
    }
    if (f < 0) return null
    const start = incoming[f]
    const ball: MovingBall = { x: start.x, y: start.y, vx: start.vx, vy: start.vy, touching: [] }
    const shadowSpec = SHADOWS[s - 1]
    const sim = runSim(ball, [seg], shadowSpec.dt, start.t, tEnd + 0.03, {
      frames: true,
      dtAt: shadowSpec.jitter ? (k) => jitterDt(k + Math.round(start.t * 60)) : undefined,
    })
    sims++
    if (sim.hits.length !== 1 || !contactInside(sim.hits[0], seg)) return null
    const e = sim.hits[0].t - T
    // Erro medido como no validateTrack: em torno do meio entre o menor e o maior desvio.
    const lo = Math.min(e, shadowRange[s]?.lo ?? e)
    const hi = Math.max(e, shadowRange[s]?.hi ?? e)
    const err = (hi - lo) / 2
    pendingRange[s] = { lo, hi }
    if (err > strict.shadowTolerance) return null
    const frames = sim.frames
    if (!leavesCleanly(frames, sim.hits[0].t, seg, 2, 0.3)) return null
    if (!framesClearOfSegments(frames, 0, 2)) return null
    const end = frames[frames.length - 1]
    if (!last && Math.hypot(end.vx, end.vy) < MIN_SPEED * 0.8) return null
    return { frames, err, hitT: sim.hits[0].t }
  }

  // Queda livre inicial, da bolinha parada em (0, 0) até um pouco depois da primeira nota.
  const specs = [{ dt: DT_REF, nudge: 0 }, ...(GENERATOR_TUNING.shadows && strict.shadows ? SHADOWS : [])]
  const flights = specs.map((spec: Shadow) => {
    const ball: MovingBall = { x: spec.nudge, y: 0, vx: 0, vy: 0, touching: [] }
    return runSim(ball, [], spec.dt, 0, times[0] + 0.05, { frames: true, dtAt: spec.jitter ? jitterDt : undefined })
      .frames
  })
  const ok = solve(0, flights)
  if (ok) {
    const out = segments.slice()
    if (finishSeg) out.push(finishSeg)
    return { ok: true, segments: out }
  }
  return { ok: false, segments: deepest }
}
