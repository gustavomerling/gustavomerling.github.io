// Geração procedural do cenário. Cada "feature" é uma função que recebe o
// cursor atual (x, y) e devolve pontos do chão + objetos extras.
// Para criar um obstáculo novo: escreva uma Feature e adicione em FEATURES.

import type { Vec } from '../types'
import type { MaterialId } from './materials'

export interface GroundSegment {
  points: Vec[]
  material: MaterialId
}

export type PropSpec =
  | { kind: 'rock'; x: number; y: number; vertices: Vec[] } // estático
  | { kind: 'crate'; x: number; y: number; size: number } // dinâmico
  | { kind: 'log'; x: number; y: number; radius: number } // dinâmico
  | { kind: 'seesaw'; x: number; y: number; length: number; height: number } // gangorra
  | { kind: 'bridge'; x: number; y: number; length: number; planks: number } // ponte de tábuas
  | { kind: 'boost'; x: number; y: number; length: number } // faixa de impulso (empurra para frente)
  | { kind: 'trampoline'; x: number; y: number; width: number } // lança o carro para cima

export type Difficulty = 'easy' | 'normal' | 'hard'

export const DIFFICULTIES: Record<Difficulty, { name: string; amp: number; length: number }> = {
  easy: { name: 'Fácil', amp: 0.6, length: 400 },
  normal: { name: 'Normal', amp: 1, length: 600 },
  hard: { name: 'Difícil', amp: 1.4, length: 900 },
}

export interface Terrain {
  seed: number
  difficulty: Difficulty
  segments: GroundSegment[]
  props: PropSpec[]
  stars: Vec[]
  fuel: Vec[]
  checkpoints: Vec[]
  finishX: number
  length: number
}

export type Rng = () => number

export function mulberry32(seed: number): Rng {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const range = (rng: Rng, a: number, b: number) => a + rng() * (b - a)
const int = (rng: Rng, a: number, b: number) => Math.floor(range(rng, a, b + 1))

interface Ctx {
  x: number
  y: number
  rng: Rng
  /** Multiplicador de dificuldade (amplitudes). */
  k: number
}

interface FeatureResult {
  segment: GroundSegment
  props?: PropSpec[]
}

type Feature = (c: Ctx) => FeatureResult

/** Limita a altura para o cenário não subir/descer infinitamente (Y para baixo!). */
const MIN_Y = -25
const MAX_Y = 8
const clampY = (y: number) => Math.min(MAX_Y, Math.max(MIN_Y, y))

const flatPts = (c: Ctx, len: number) => [{ x: c.x, y: c.y }, { x: c.x + len, y: c.y }]

const flat: Feature = (c) => {
  const len = range(c.rng, 5, 12)
  const points = flatPts(c, len)
  c.x += len
  return { segment: { points, material: 'grass' } }
}

const slope: Feature = (c) => {
  const len = range(c.rng, 8, 18)
  const dy = clampY(c.y + range(c.rng, -0.45, 0.45) * c.k * len) - c.y
  const points: Vec[] = []
  const n = 10
  for (let i = 0; i <= n; i++) {
    const t = i / n
    const s = t * t * (3 - 2 * t) // ease in/out: sem quina nas pontas
    points.push({ x: c.x + len * t, y: c.y + dy * s })
  }
  c.x += len
  c.y += dy
  return { segment: { points, material: c.rng() < 0.6 ? 'grass' : 'sand' } }
}

const bumps: Feature = (c) => {
  const count = int(c.rng, 3, 7)
  const width = range(c.rng, 1.2, 3)
  const height = range(c.rng, 0.25, 0.9) * c.k
  const points: Vec[] = []
  const len = count * width
  for (let x = 0; x < len; x += 0.2) {
    points.push({ x: c.x + x, y: c.y - Math.pow(Math.sin((x / width) * Math.PI), 2) * height })
  }
  points.push({ x: c.x + len, y: c.y }) // fecha exatamente no fim (sem buraco até o próximo trecho)
  c.x += len
  return { segment: { points, material: 'grass' } }
}

const dirt: Feature = (c) => {
  const len = range(c.rng, 10, 22)
  const amp = range(c.rng, 0.1, 0.35) * c.k
  const points: Vec[] = []
  let off = 0
  for (let x = 0; x <= len; x += 0.5) {
    const edge = Math.min(1, x / 2, (len - x) / 2) // zera nas pontas
    off = off * 0.5 + (c.rng() - 0.5) * amp
    points.push({ x: c.x + x, y: c.y + off * edge })
  }
  points[points.length - 1].y = c.y
  c.x = points[points.length - 1].x
  return { segment: { points, material: 'dirt' } }
}

const stairs: Feature = (c) => {
  const steps = int(c.rng, 3, 6)
  const h = range(c.rng, 0.15, 0.32) * c.k
  const w = range(c.rng, 0.8, 1.6)
  const down = c.rng() < 0.5
  const points: Vec[] = [{ x: c.x, y: c.y }]
  let x = c.x
  let y = c.y
  for (let i = 0; i < steps; i++) {
    y += down ? h : -h
    points.push({ x, y }) // degrau vertical
    x += w
    points.push({ x, y })
  }
  c.x = x
  c.y = y
  return { segment: { points, material: 'wood' } }
}

const jump: Feature = (c) => {
  const rampLen = range(c.rng, 3, 6)
  const h = range(c.rng, 0.8, 1.6) * c.k
  const gap = range(c.rng, 3, 7)
  const points: Vec[] = [
    { x: c.x, y: c.y },
    { x: c.x + rampLen, y: c.y - h },
    { x: c.x + rampLen + 0.4, y: c.y - h },
    { x: c.x + rampLen + 0.6, y: c.y }, // queda
    { x: c.x + rampLen + gap, y: c.y },
  ]
  c.x += rampLen + gap
  return { segment: { points, material: 'rock' } }
}

const valley: Feature = (c) => {
  const len = range(c.rng, 6, 14)
  const depth = range(c.rng, 1, 3) * c.k
  const mud = c.rng() < 0.4
  const points: Vec[] = []
  for (let x = 0; x < len; x += 0.4) {
    points.push({ x: c.x + x, y: c.y + Math.sin((x / len) * Math.PI) * depth })
  }
  points.push({ x: c.x + len, y: c.y })
  c.x += len
  return { segment: { points, material: mud ? 'mud' : 'dirt' } }
}

const ice: Feature = (c) => {
  const len = range(c.rng, 8, 16)
  const dy = range(c.rng, -1, 1) * c.k
  const points = [{ x: c.x, y: c.y }, { x: c.x + len, y: c.y + dy }]
  c.x += len
  c.y += dy
  return { segment: { points, material: 'ice' } }
}

const obstacles: Feature = (c) => {
  const len = range(c.rng, 10, 18)
  const props: PropSpec[] = []
  const count = int(c.rng, 1, 4)
  for (let i = 0; i < count; i++) {
    const x = c.x + ((i + 0.5) / count) * len
    const r = c.rng()
    if (r < 0.4) {
      const s = range(c.rng, 0.3, 0.7)
      props.push({ kind: 'crate', x, y: c.y - s / 2, size: s })
    } else if (r < 0.7) {
      const radius = range(c.rng, 0.15, 0.3)
      props.push({ kind: 'log', x, y: c.y - radius, radius })
    } else {
      const w = range(c.rng, 0.5, 1.2)
      const h = range(c.rng, 0.2, 0.5) * c.k
      props.push({
        kind: 'rock',
        x,
        y: c.y,
        vertices: [
          { x: -w, y: 0.05 },
          { x: -w * 0.5, y: -h },
          { x: w * 0.3, y: -h * 1.1 },
          { x: w, y: 0.05 },
        ],
      })
    }
  }
  const points = flatPts(c, len)
  c.x += len
  return { segment: { points, material: 'grass' }, props }
}

const seesaw: Feature = (c) => {
  const length = range(c.rng, 5, 8)
  const height = range(c.rng, 0.5, 0.9) * c.k
  const len = length + 6
  const props: PropSpec[] = [{ kind: 'seesaw', x: c.x + len / 2, y: c.y, length, height }]
  const points = flatPts(c, len)
  c.x += len
  return { segment: { points, material: 'grass' }, props }
}

const bridge: Feature = (c) => {
  const length = range(c.rng, 6, 12)
  const depth = 4
  const x0 = c.x + 2
  const points: Vec[] = [
    { x: c.x, y: c.y },
    { x: x0, y: c.y },
    { x: x0, y: c.y + depth },
    { x: x0 + length, y: c.y + depth },
    { x: x0 + length, y: c.y },
    { x: x0 + length + 2, y: c.y },
  ]
  const props: PropSpec[] = [{ kind: 'bridge', x: x0, y: c.y, length, planks: Math.round(length / 0.5) }]
  c.x = x0 + length + 2
  return { segment: { points, material: 'rock' }, props }
}

const boost: Feature = (c) => {
  const len = range(c.rng, 10, 16)
  const props: PropSpec[] = [{ kind: 'boost', x: c.x + 2, y: c.y, length: 3 }]
  const points = flatPts(c, len)
  c.x += len
  return { segment: { points, material: 'rock' }, props }
}

const trampoline: Feature = (c) => {
  const len = range(c.rng, 14, 20)
  const props: PropSpec[] = [{ kind: 'trampoline', x: c.x + 4, y: c.y, width: 2 }]
  const points = flatPts(c, len)
  c.x += len
  return { segment: { points, material: 'grass' }, props }
}

const FEATURES: { f: Feature; weight: number; hardBonus?: number }[] = [
  { f: flat, weight: 1 },
  { f: slope, weight: 2 },
  { f: bumps, weight: 2 },
  { f: dirt, weight: 2 },
  { f: stairs, weight: 1.5, hardBonus: 1 },
  { f: jump, weight: 1, hardBonus: 1 },
  { f: valley, weight: 1.5 },
  { f: ice, weight: 0.7 },
  { f: obstacles, weight: 2 },
  { f: seesaw, weight: 0.8 },
  { f: bridge, weight: 0.8, hardBonus: 0.5 },
  { f: boost, weight: 0.7 },
  { f: trampoline, weight: 0.6 },
]

function pick(rng: Rng, hard: boolean): Feature {
  const w = (f: (typeof FEATURES)[number]) => f.weight + (hard ? (f.hardBonus ?? 0) : 0)
  const total = FEATURES.reduce((s, f) => s + w(f), 0)
  let r = rng() * total
  for (const f of FEATURES) {
    r -= w(f)
    if (r <= 0) return f.f
  }
  return FEATURES[0].f
}

/** Altura do chão em x (primeiro ponto encontrado), para posicionar estrelas. */
export function groundY(segments: GroundSegment[], x: number): number | null {
  for (const s of segments) {
    for (let i = 0; i < s.points.length - 1; i++) {
      const a = s.points[i]
      const b = s.points[i + 1]
      if (x >= a.x && x <= b.x && b.x > a.x) return a.y + ((x - a.x) / (b.x - a.x)) * (b.y - a.y)
    }
  }
  return null
}

export function generateTerrain(seed: number, difficulty: Difficulty = 'normal'): Terrain {
  const rng = mulberry32(seed)
  const conf = DIFFICULTIES[difficulty]
  const segments: GroundSegment[] = []
  const props: PropSpec[] = []
  const c: Ctx = { x: 12, y: 0, rng, k: conf.amp }

  // muro de início + pista plana de largada
  segments.push({ points: [{ x: -15, y: -10 }, { x: -15, y: 0 }, { x: 12, y: 0 }], material: 'grass' })

  while (c.x < conf.length) {
    const r = pick(rng, difficulty === 'hard')(c)
    segments.push(r.segment)
    if (r.props) props.push(...r.props)
  }

  const finishX = c.x + 5
  segments.push({ points: [{ x: c.x, y: c.y }, { x: c.x + 25, y: c.y }, { x: c.x + 25, y: c.y - 10 }], material: 'rock' })

  // estrelas: a cada ~15-30 m, flutuando acima do chão
  const stars: Vec[] = []
  for (let x = 25; x < finishX - 5; x += range(rng, 15, 30)) {
    const y = groundY(segments, x)
    if (y !== null) stars.push({ x, y: y - range(rng, 1.2, 2.6) })
  }

  // galões de combustível a cada ~110-150 m (menos no difícil)
  const fuel: Vec[] = []
  const fuelGap = difficulty === 'hard' ? 150 : difficulty === 'easy' ? 90 : 120
  for (let x = fuelGap; x < finishX - 10; x += fuelGap + range(rng, -15, 15)) {
    const y = groundY(segments, x)
    if (y !== null) fuel.push({ x, y: y - 0.6 })
  }

  // checkpoints a cada 100 m
  const checkpoints: Vec[] = [{ x: 0, y: 0 }]
  for (let x = 100; x < finishX; x += 100) {
    const y = groundY(segments, x)
    if (y !== null) checkpoints.push({ x, y })
  }

  return { seed, difficulty, segments, props, stars, fuel, checkpoints, finishX, length: c.x }
}
