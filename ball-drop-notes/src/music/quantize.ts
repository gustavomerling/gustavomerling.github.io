import type { Melody } from '../types'

// Quantização de uma gravação ao vivo: transforma as notas tocadas (em batidas do metrônomo,
// com todas as imprecisões humanas) em melodia. Há duas versões:
// - fiel: cada nota vai para a semicolcheia mais perto, sem perder nenhuma;
// - refinada: antes de encaixar, descobre o tempo e o atraso de quem tocou, e escolhe a grade
//   de cada batida (semínima, colcheia, tercina ou semicolcheia) que explica melhor as notas.

// beat é quando a tecla desceu; end, quando subiu (em batidas desde o primeiro tempo).
export type Take = { beat: number; note: number; end?: number }

export type Refined = Melody & {
  bpm: number // tempo que a pessoa realmente tocou
  offsetMs: number // atraso (+) ou adiantamento (−) constante compensado
  averageShiftMs: number // quanto cada nota foi movida, em média
}

const FINE_GRID = 0.25 // semicolcheia: grade da versão fiel e menor distância entre notas
const MAX_BEATS = 4 // nota mais longa (pausas longas encurtam)
// Grades de referência para achar tempo e atraso: semínima, colcheia e tercina. Cada uma dá um
// candidato; fica o que resulta na quantização mais simples e com menos erro.
const FIT_GRIDS = [1, 0.5, 1 / 3]
const SCALE_RANGE = 0.12 // procura tempos até 12% mais rápidos ou mais lentos
const OFFSET_RANGE = 0.3 // e atrasos até 0,3 batida
// Divisões de uma batida, da mais simples para a mais complexa, com o custo de complexidade.
const DIVISIONS: [number, number][] = [
  [1, 0],
  [2, 0.002],
  [4, 0.006],
  [3, 0.008],
]

const snapTo = (value: number, grid: number) => Math.round(value / grid) * grid

// Garante notas em ordem, com pelo menos FINE_GRID entre uma e outra (empurra as que colidem).
function spread(onsets: number[]) {
  let previous = -Infinity
  return onsets.map((b) => (previous = Math.max(b, previous + FINE_GRID - 1e-9)))
}

// Durações: cada nota dura até a próxima começar; a última, o tempo segurado (ou 1 batida).
function durations(onsets: number[], lastLength: number) {
  return onsets.map((b, i) => {
    const length = i + 1 < onsets.length ? onsets[i + 1] - b : lastLength
    return Math.min(MAX_BEATS, Math.max(FINE_GRID, Math.round(length * 1000) / 1000))
  })
}

const byBeat = (takes: Take[]) => [...takes].sort((a, b) => a.beat - b.beat)

export function quantizeFaithful(takes: Take[]): Melody {
  const sorted = byBeat(takes)
  const onsets = spread(sorted.map((t) => snapTo(t.beat, FINE_GRID)))
  const last = sorted[sorted.length - 1]
  const held = last?.end === undefined ? 1 : snapTo(last.end - last.beat, FINE_GRID)
  return { notes: sorted.map((t) => t.note), beats: durations(onsets, held) }
}

// Acha a escala de tempo s e o atraso o que melhor alinham (beat − o) / s à grade dada,
// com uma leve preferência por não mexer (s = 1, o = 0).
function fitTiming(beats: number[], grid: number) {
  const cap = grid * 0.4
  const n = beats.length
  const cost = (s: number, o: number) => {
    let c = 0
    for (const b of beats) {
      const p = (b - o) / s
      const d = Math.min(cap, Math.abs(p - snapTo(p, grid)))
      c += d * d
    }
    return c + n * (0.004 * ((s - 1) / 0.1) ** 2 + 0.002 * (o / OFFSET_RANGE) ** 2)
  }
  let best = { s: 1, o: 0, c: cost(1, 0) }
  if (n < 3) return best
  for (let s = 1 - SCALE_RANGE; s <= 1 + SCALE_RANGE + 1e-9; s += 0.004) {
    for (let o = -OFFSET_RANGE; o <= OFFSET_RANGE + 1e-9; o += 0.01) {
      const c = cost(s, o)
      if (c < best.c) best = { s, o, c }
    }
  }
  return best
}

// Em cada batida, escolhe a divisão mais simples que encaixa as notas sem juntar duas no mesmo ponto.
// Devolve as posições encaixadas e o custo total (erro² + complexidade).
function snapPerBeat(positions: number[]) {
  const result = positions.slice()
  let total = 0
  const groups = new Map<number, number[]>()
  positions.forEach((p, i) => {
    // Uma nota um pouquinho antes da batida pertence a ela.
    const k = Math.floor(p + 0.125)
    groups.set(k, [...(groups.get(k) ?? []), i])
  })
  for (const [k, indices] of groups) {
    let best: { cost: number; slots: number[] } | null = null
    for (const [d, penalty] of DIVISIONS) {
      const slots = indices.map((i) => k + Math.round((positions[i] - k) * d) / d)
      if (new Set(slots.map((s) => s.toFixed(4))).size < slots.length) continue
      const cost = indices.reduce((sum, i, j) => sum + (positions[i] - slots[j]) ** 2, 0) + penalty * indices.length
      if (!best || cost < best.cost) best = { cost, slots }
    }
    // Notas demais para uma batida: semicolcheias, e o spread empurra o que sobrar.
    const slots = best?.slots ?? indices.map((i) => snapTo(positions[i], FINE_GRID))
    total += best?.cost ?? 1
    indices.forEach((i, j) => {
      result[i] = slots[j]
    })
  }
  return { slots: result, cost: total }
}

export function quantizeRefined(takes: Take[], bpm: number): Refined {
  const sorted = byBeat(takes)
  if (sorted.length === 0) return { notes: [], beats: [], bpm, offsetMs: 0, averageShiftMs: 0 }
  const beats = sorted.map((t) => t.beat)
  let chosen = { s: 1, o: 0, slots: [] as number[], cost: Infinity }
  for (const { s, o } of [{ s: 1, o: 0 }, ...FIT_GRIDS.map((grid) => fitTiming(beats, grid))]) {
    const { slots, cost } = snapPerBeat(beats.map((b) => (b - o) / s))
    // Mesma preferência leve por não mexer no tempo, em unidades do custo da quantização.
    const total = cost + beats.length * 0.002 * ((s - 1) / 0.1) ** 2
    if (total < chosen.cost) chosen = { s, o, slots, cost: total }
  }
  const { s, o } = chosen
  const onsets = spread(chosen.slots)

  // A última nota: o tempo segurado em colcheias (pelo menos 1 batida), e se faltar pouco para
  // fechar o compasso, vai até o fim dele.
  const last = sorted[sorted.length - 1]
  const lastOnset = onsets[onsets.length - 1]
  let lastLength = last.end === undefined ? 1 : Math.max(1, snapTo((last.end - last.beat) / s, 0.5))
  const barEnd = Math.ceil((lastOnset + lastLength) / 4 - 1e-9) * 4
  if (barEnd - (lastOnset + lastLength) <= 1) lastLength = barEnd - lastOnset

  const beatMs = 60000 / bpm
  const averageShift =
    sorted.reduce((sum, t, i) => sum + Math.abs(t.beat - (o + s * onsets[i])), 0) / sorted.length
  return {
    notes: sorted.map((t) => t.note),
    beats: durations(onsets, lastLength),
    bpm: Math.round(bpm / s),
    offsetMs: Math.round(o * beatMs),
    averageShiftMs: Math.round(averageShift * beatMs),
  }
}
