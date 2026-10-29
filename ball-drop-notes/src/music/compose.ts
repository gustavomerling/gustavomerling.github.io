// Composição: climas, compositor de melodias, sugestão de tempo e de próximas notas.
// Reexportado por music.ts.
import type { Melody } from '../types'
import { COMFORT_MAX, COMFORT_MIN, NOTE_COUNT, NOTE_DEFAULT, SCALES, inScale, scaleNotes } from './theory'

// Acorde: classes de altura (0 = dó ... 11 = si), todas dentro da escala do clima.
type Chord = number[]

// Clima da música: define escala, tempo e o jeito da melodia.
// range: faixa de notas (índices); rhythms: vocabulário de ritmos de um compasso (somam 4);
// progression: acordes, um por compasso; cadence: acorde da semicadência (meio da música);
// leap: chance de salto em vez de passo (0..1); arch: quanto a melodia sobe no clímax (graus).
export type Mood = {
  id: string
  label: string
  emoji: string
  description: string
  scaleIndex: number
  bpm: number
  range?: [number, number]
  rhythms?: number[][]
  progression?: Chord[]
  cadence?: Chord
  leap?: number
  arch?: number
}

const I = [0, 4, 7]
const IV = [5, 9, 0]
const V = [7, 11, 2]
const vi = [9, 0, 4]

export const MOODS: Mood[] = [
  {
    id: 'happy',
    label: 'Alegre',
    emoji: '😄',
    description: 'Dó maior saltitante, com notas curtas e sorriso no rosto.',
    scaleIndex: 1,
    bpm: 120,
    range: [12, 28],
    rhythms: [
      [1, 1, 1, 1],
      [1, 0.5, 0.5, 1, 1],
      [0.5, 0.5, 1, 0.5, 0.5, 1],
      [1.5, 0.5, 1, 1],
      [1, 1, 0.5, 0.5, 1],
    ],
    progression: [I, V, vi, IV],
    cadence: V,
    leap: 0.2,
    arch: 3,
  },
  {
    id: 'calm',
    label: 'Calmo',
    emoji: '🌿',
    description: 'Pentatônica tranquila, notas longas como uma brisa.',
    scaleIndex: 3,
    bpm: 84,
    range: [10, 26],
    rhythms: [
      [2, 1, 1],
      [1, 1, 2],
      [1.5, 0.5, 2],
      [1, 1, 1, 1],
      [2, 2],
    ],
    progression: [I, vi, [2, 7, 9], [7, 2, 4]],
    cadence: [7, 2],
    leap: 0.15,
    arch: 2,
  },
  {
    id: 'sad',
    label: 'Melancólico',
    emoji: '🥀',
    description: 'Dó menor devagar, uma saudade que suspira.',
    scaleIndex: 2,
    bpm: 76,
    range: [7, 24],
    rhythms: [
      [1.5, 0.5, 1, 1],
      [1, 1, 2],
      [2, 1, 1],
      [1, 0.5, 0.5, 2],
      [1, 1, 1, 1],
    ],
    progression: [
      [0, 3, 7],
      [8, 0, 3],
      [3, 7, 10],
      [10, 2, 5],
    ],
    cadence: [7, 10, 2],
    leap: 0.15,
    arch: 2,
  },
  {
    id: 'mystery',
    label: 'Misterioso',
    emoji: '🔮',
    description: 'Menor harmônica cheia de suspense, como um segredo no escuro.',
    scaleIndex: 8,
    bpm: 92,
    range: [7, 26],
    rhythms: [
      [1.5, 0.5, 2],
      [1, 0.5, 0.5, 2],
      [0.5, 0.5, 1, 2],
      [1, 1, 1, 1],
      [2, 1.5, 0.5],
    ],
    progression: [
      [0, 3, 7],
      [5, 8, 0],
      [8, 0, 3],
      [7, 11, 2],
    ],
    cadence: [7, 11, 2],
    leap: 0.25,
    arch: 2,
  },
  {
    id: 'epic',
    label: 'Épico',
    emoji: '⚔️',
    description: 'Modo dórico heroico, saltos largos e ritmo de aventura.',
    scaleIndex: 5,
    bpm: 112,
    range: [7, 31],
    rhythms: [
      [1.5, 0.5, 1, 1],
      [1, 1, 2],
      [1.5, 0.5, 2],
      [0.5, 0.5, 1, 1, 1],
      [1, 1, 1, 1],
    ],
    progression: [
      [0, 3, 7],
      [10, 2, 5],
      [5, 9, 0],
      [0, 3, 7],
    ],
    cadence: [10, 2, 5],
    leap: 0.35,
    arch: 4,
  },
  {
    id: 'lullaby',
    label: 'Canção de ninar',
    emoji: '🌙',
    description: 'Balanço suave e notas perto umas das outras, para fechar os olhos.',
    scaleIndex: 1,
    bpm: 72,
    range: [10, 24],
    rhythms: [
      [2, 1, 1],
      [1.5, 0.5, 2],
      [3, 1],
      [1, 1, 2],
      [2, 2],
    ],
    progression: [I, IV, I, V],
    cadence: V,
    leap: 0.1,
    arch: 1,
  },
  {
    id: 'dance',
    label: 'Dança',
    emoji: '💃',
    description: 'Mixolídio com síncopes, para mexer o pé.',
    scaleIndex: 9,
    bpm: 128,
    range: [12, 28],
    rhythms: [
      [1.5, 1.5, 1],
      [0.5, 1, 0.5, 1, 1],
      [1, 0.5, 1, 0.5, 1],
      [1.5, 0.5, 1, 1],
      [0.5, 0.5, 0.5, 0.5, 1, 1],
    ],
    progression: [I, [10, 2, 5], IV, I],
    cadence: [10, 2, 5],
    leap: 0.25,
    arch: 2,
  },
  {
    id: 'rain',
    label: 'Chuva / Gotas',
    emoji: '💧',
    description: 'Pentatônica menor no agudo, gotinhas pingando sem pressa.',
    scaleIndex: 4,
    bpm: 100,
    range: [15, 31],
    rhythms: [
      [0.5, 0.5, 1, 0.5, 0.5, 1],
      [0.5, 0.5, 0.5, 0.5, 2],
      [1, 0.5, 0.5, 1, 1],
      [0.5, 1, 0.5, 2],
      [1, 1, 0.5, 0.5, 1],
    ],
    progression: [
      [0, 3, 7],
      [10, 3, 5],
      [5, 10, 0],
      [7, 10, 3],
    ],
    cadence: [7, 10],
    leap: 0.3,
    arch: 2,
  },
  {
    id: 'zen',
    label: 'Jardim japonês',
    emoji: '🎋',
    description: 'Escala japonesa In, contemplativa, com pausas longas.',
    scaleIndex: 7,
    bpm: 80,
    range: [10, 27],
    rhythms: [
      [2, 2],
      [1.5, 0.5, 2],
      [1, 1, 2],
      [3, 1],
      [2, 1, 1],
    ],
    progression: [
      [0, 7],
      [1, 5, 8],
      [5, 8, 0],
      [7, 0],
    ],
    cadence: [5, 8],
    leap: 0.2,
    arch: 2,
  },
]

export type ComposeOptions = {
  mood: string // id de MOODS
  bars: number // compassos de 4 batidas
  seed?: number // mesma semente, mesma melodia
}

// mood: id do clima; form: forma por compasso (ex.: 'AABA'); chords: acorde de cada compasso.
export type Composition = Melody & {
  bpm: number
  scaleIndex: number
  title: string
  mood?: string
  form?: string
  chords?: number[][]
  seed?: number
}

// Gerador pseudoaleatório com semente (mulberry32): mesma semente, mesma sequência.
export function seededRandom(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const hashText = (text: string) => {
  let h = 2166136261
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619)
  return h >>> 0
}

type Random = () => number
const pick = <T>(random: Random, list: T[]): T => list[Math.floor(random() * list.length) % list.length]
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))

// Papel de cada compasso: letra da forma e tipo de final de frase.
type BarRole = { letter: string; part: number; end: 'none' | 'half' | 'final' }

// Plano de forma: 1 compasso = frase única; 2 = pergunta e resposta; 3 = A A' B;
// 4 ou mais = AABA ou ABAC, cada letra ocupando bars/4 compassos.
function planForm(bars: number, random: Random): { roles: BarRole[]; form: string } {
  if (bars === 1) return { form: 'A', roles: [{ letter: 'A', part: 0, end: 'final' }] }
  if (bars === 2) {
    return {
      form: 'AA',
      roles: [
        { letter: 'A', part: 0, end: 'none' },
        { letter: 'A', part: 0, end: 'final' },
      ],
    }
  }
  if (bars === 3) {
    return {
      form: 'AAB',
      roles: [
        { letter: 'A', part: 0, end: 'none' },
        { letter: 'A', part: 0, end: 'half' },
        { letter: 'B', part: 0, end: 'final' },
      ],
    }
  }
  const form = pick(random, ['AABA', 'ABAC', 'AABA', 'ABAB'])
  const roles: BarRole[] = []
  const halfBar = Math.floor(bars / 2) - 1
  for (let i = 0; i < bars; i++) {
    const slot = Math.floor((i * 4) / bars)
    const start = Math.ceil((slot * bars) / 4)
    roles.push({
      letter: form[slot],
      part: i - start,
      end: i === bars - 1 ? 'final' : i === halfBar ? 'half' : 'none',
    })
  }
  return { form, roles }
}

// Final de frase: mantém o começo do ritmo e transforma o resto numa nota longa (≥ minLast).
function endRhythm(rhythm: number[], minLast = 2): number[] {
  const result: number[] = []
  let sum = 0
  for (const b of rhythm) {
    if (sum + b > 4 - minLast) break
    result.push(b)
    sum += b
  }
  if (result.length === 0) return [4 - minLast, minLast]
  result.push(4 - sum)
  return result
}

// Contorno do motivo, em graus da escala relativos à primeira nota: quase sempre passos,
// às vezes saltos, e todo salto é resolvido por passo na direção contrária.
function makeShape(length: number, random: Random, leap: number, start: number[] = [0]): number[] {
  const shape = start.slice(0, length)
  if (shape.length === 0) shape.push(0)
  let dir = random() < 0.5 ? 1 : -1
  while (shape.length < length) {
    const last = shape[shape.length - 1]
    const prevMove = shape.length > 1 ? last - shape[shape.length - 2] : 0
    let move: number
    if (Math.abs(prevMove) >= 2 && random() < 0.85) {
      move = -Math.sign(prevMove)
    } else {
      if (random() < 0.3) dir = -dir
      const r = random()
      if (r < leap) move = dir * pick(random, [2, 2, 2, 3, 3, 4])
      else if (r < leap + 0.15 && prevMove !== 0) move = 0
      else move = dir
    }
    let next = last + move
    if (next > 5 || next < -4) next = last - move
    shape.push(clamp(next, -4, 5))
  }
  return shape
}

// Ajusta um contorno a um novo tamanho, mantendo o começo (desenvolvimento do motivo).
const fitShape = (shape: number[], length: number, random: Random, leap: number) =>
  makeShape(length, random, leap, shape.slice(0, length))

const invert = (shape: number[]) => shape.map((s) => -s)

// Célula de um compasso: ritmo + contorno.
type Cell = { rhythm: number[]; shape: number[] }

// --- Títulos -----------------------------------------------------------------

type Noun = { word: string; f: boolean }
const NOUNS: Noun[] = [
  { word: 'Bolinha', f: true },
  { word: 'Estrela', f: true },
  { word: 'Lua', f: true },
  { word: 'Nuvem', f: true },
  { word: 'Formiguinha', f: true },
  { word: 'Baleia', f: true },
  { word: 'Pipoca', f: true },
  { word: 'Gato', f: false },
  { word: 'Vento', f: false },
  { word: 'Pinguim', f: false },
  { word: 'Foguete', f: false },
  { word: 'Sapo', f: false },
  { word: 'Vaga-lume', f: false },
  { word: 'Balão', f: false },
]

// Por clima: formas musicais e adjetivos [masculino, feminino].
const TITLE_WORDS: Record<string, { forms: string[]; adjectives: [string, string][]; nouns?: Noun[] }> = {
  happy: {
    forms: ['Polca', 'Marchinha', 'Cantiga', 'Festa'],
    adjectives: [['Saltitante', 'Saltitante'], ['Contente', 'Contente'], ['Sorridente', 'Sorridente'], ['Serelepe', 'Serelepe']],
  },
  calm: {
    forms: ['Toada', 'Canção', 'Melodia', 'Brisa'],
    adjectives: [['Tranquilo', 'Tranquila'], ['Sereno', 'Serena'], ['Preguiçoso', 'Preguiçosa'], ['Leve', 'Leve']],
  },
  sad: {
    forms: ['Modinha', 'Balada', 'Valsa', 'Lamento'],
    adjectives: [['Saudoso', 'Saudosa'], ['Solitário', 'Solitária'], ['Tristonho', 'Tristonha'], ['Distante', 'Distante']],
  },
  mystery: {
    forms: ['Enigma', 'Noturno', 'Segredo', 'Sombra'],
    adjectives: [['Misterioso', 'Misteriosa'], ['Invisível', 'Invisível'], ['Escondido', 'Escondida'], ['Encantado', 'Encantada']],
  },
  epic: {
    forms: ['Fanfarra', 'Saga', 'Hino', 'Jornada'],
    adjectives: [['Valente', 'Valente'], ['Lendário', 'Lendária'], ['Destemido', 'Destemida'], ['Gigante', 'Gigante']],
  },
  lullaby: {
    forms: ['Acalanto', 'Canção de Ninar', 'Valsa', 'Cantiga'],
    adjectives: [['Sonhador', 'Sonhadora'], ['Sonolento', 'Sonolenta'], ['Pequenino', 'Pequenina'], ['Quentinho', 'Quentinha']],
  },
  dance: {
    forms: ['Baião', 'Xote', 'Forró', 'Dança', 'Chorinho'],
    adjectives: [['Dançarino', 'Dançarina'], ['Rebolante', 'Rebolante'], ['Animado', 'Animada'], ['Faceiro', 'Faceira']],
  },
  rain: {
    forms: ['Chuvisco', 'Garoa', 'Pingos', 'Aquarela'],
    adjectives: [['Molhado', 'Molhada'], ['Gotejante', 'Gotejante'], ['Cristalino', 'Cristalina'], ['Friozinho', 'Friozinha']],
    nouns: [
      { word: 'Gota', f: true },
      { word: 'Poça', f: true },
      { word: 'Guarda-chuva', f: false },
      { word: 'Sapo', f: false },
    ],
  },
  zen: {
    forms: ['Haicai', 'Jardim', 'Lago', 'Chá'],
    adjectives: [['Silencioso', 'Silenciosa'], ['Florido', 'Florida'], ['Sábio', 'Sábia'], ['Calmo', 'Calma']],
    nouns: [
      { word: 'Carpa', f: true },
      { word: 'Cerejeira', f: true },
      { word: 'Bambu', f: false },
      { word: 'Bonsai', f: false },
    ],
  },
}

function makeTitle(moodId: string, random: Random): string {
  const words = TITLE_WORDS[moodId] ?? TITLE_WORDS.happy
  const noun = pick(random, [...(words.nouns ?? []), ...(words.nouns ?? []), ...NOUNS])
  const adjective = pick(random, words.adjectives)[noun.f ? 1 : 0]
  const form = pick(random, words.forms)
  const of = noun.f ? 'da' : 'do'
  const style = random()
  if (style < 0.6) return `${form} ${of} ${noun.word} ${adjective}`
  if (style < 0.8) return `${form} para ${noun.f ? 'uma' : 'um'} ${noun.word} ${adjective}`
  return `${noun.f ? 'A' : 'O'} ${noun.word} ${adjective}`
}

// --- Compositor ----------------------------------------------------------------

// Gera uma melodia nova para o clima escolhido. Técnica: um motivo (ritmo + contorno)
// desenvolvido por repetição, sequência (o motivo acompanha o acorde) e inversão; forma
// em frases (pergunta e resposta, AABA, ABAC...); um acorde por compasso, com nota do
// acorde nos tempos fortes; finais de frase em nota longa; termina na tônica (dó).
export function composeMelody(options: ComposeOptions): Composition {
  const mood = MOODS.find((m) => m.id === options.mood) ?? MOODS[0]
  const seed = options.seed ?? Math.floor(Math.random() * 1e9)
  const random = seededRandom(seed ^ hashText(mood.id))
  const bars = clamp(Math.round(options.bars) || 4, 1, 64)
  const scaleIndex = mood.scaleIndex
  const [lo, hi] = mood.range ?? [12, 28]
  const pool = scaleNotes(scaleIndex, clamp(lo, 0, NOTE_COUNT - 1), clamp(hi, 0, NOTE_COUNT - 1))
  const rhythms = mood.rhythms ?? [[1, 1, 1, 1]]
  const progression = mood.progression ?? [[0, 4, 7]]
  const tonicChord = progression[0]
  const cadence = mood.cadence ?? progression[progression.length - 1]
  const leap = mood.leap ?? 0.2
  const arch = mood.arch ?? 2

  const { roles, form } = planForm(bars, random)

  // Motivo principal: prefere ritmos com 3 a 5 notas (marcantes, nem lentos nem corridos).
  const motifRhythms = rhythms.filter((r) => r.length >= 3 && r.length <= 5)
  const motif: Cell = { rhythm: pick(random, motifRhythms.length ? motifRhythms : rhythms), shape: [] }
  motif.shape = makeShape(motif.rhythm.length, random, leap)

  const cells = new Map<string, Cell>()
  const cellFor = (letter: string, part: number): Cell => {
    const key = `${letter}${part}`
    const known = cells.get(key)
    if (known) return known
    let cell: Cell
    if (part > 0) {
      // Continuação dentro da mesma letra: mesmo ritmo, contorno em sequência ou invertido.
      const head = cellFor(letter, 0)
      const rhythm = random() < 0.6 ? head.rhythm : pick(random, rhythms)
      const base = random() < 0.5 ? head.shape : invert(head.shape)
      cell = { rhythm, shape: fitShape(base, rhythm.length, random, leap) }
    } else if (letter === 'A') {
      cell = motif
    } else {
      // Contraste: ritmo diferente; contorno nasce do motivo invertido (B) ou retrógrado (C).
      const others = rhythms.filter((r) => r !== motif.rhythm)
      const rhythm = pick(random, others.length ? others : rhythms)
      const base =
        letter === 'B'
          ? invert(motif.shape)
          : motif.shape
              .slice()
              .reverse()
              .map((s, _, all) => s - all[0])
      cell = { rhythm, shape: fitShape(base.slice(0, 2), rhythm.length, random, leap) }
    }
    cells.set(key, cell)
    return cell
  }

  const chordIndexes = (chord: Chord) => pool.map((n, i) => (chord.includes(n % 12) ? i : -1)).filter((i) => i >= 0)
  const nearestIndex = (indexes: number[], target: number) =>
    indexes.reduce((best, i) => (Math.abs(i - target) < Math.abs(best - target) ? i : best), indexes[0])

  const center = Math.floor(pool.length / 2) - 1
  const notes: number[] = []
  const beats: number[] = []
  const chords: number[][] = []
  let prev = nearestIndex(chordIndexes(tonicChord), center) // índice no pool
  const seen = new Map<string, number>()

  roles.forEach((role, bar) => {
    const chord =
      role.end === 'final' ? tonicChord : role.end === 'half' ? cadence : progression[bar % progression.length]
    chords.push(chord)
    const cell = cellFor(role.letter, role.part)
    const key = `${role.letter}${role.part}`
    const repeat = seen.get(key) ?? 0
    seen.set(key, repeat + 1)

    let rhythm = cell.rhythm
    let shape = cell.shape
    if (role.end !== 'none') {
      rhythm = endRhythm(rhythm)
      shape = fitShape(shape, rhythm.length, random, leap)
    } else if (repeat > 0 && shape.length > 2 && random() < 0.5) {
      // Variação: muda só a última nota da repetição.
      shape = shape.slice()
      shape[shape.length - 1] += random() < 0.5 ? 1 : -1
    }

    // Âncora: nota do acorde que cabe o contorno, perto da nota anterior e do registro
    // planejado (arco: a melodia sobe até o meio e desce para o fim).
    const lift = Math.round(Math.sin((Math.PI * (bar + 0.5)) / bars) * arch)
    const target = center + lift
    const low = Math.min(...shape)
    const high = Math.max(...shape)
    const candidates = chordIndexes(chord).filter((i) => i + low >= 0 && i + high < pool.length)
    const options = candidates.length ? candidates : chordIndexes(chord)
    let anchor = options[0]
    let bestCost = Infinity
    for (const i of options) {
      const cost = Math.abs(i - prev) * 1.2 + Math.abs(i - target) * 0.7 + (i === prev ? 0.8 : 0) + random() * 0.5
      if (cost < bestCost) {
        bestCost = cost
        anchor = i
      }
    }

    const indexes = shape.map((s) => clamp(anchor + s, 0, pool.length - 1))

    // Tempo forte do meio do compasso (batida 2): nota do acorde.
    let onset = 0
    rhythm.forEach((b, k) => {
      if (onset === 2 && k > 0 && !chord.includes(pool[indexes[k]] % 12)) {
        const up = indexes[k] + 1
        const down = indexes[k] - 1
        const direction = indexes[k] >= indexes[k - 1] ? [up, down] : [down, up]
        const fix = direction.find((i) => i >= 0 && i < pool.length && chord.includes(pool[i] % 12))
        if (fix !== undefined) indexes[k] = fix
      }
      onset += b
    })

    // Final de frase: última nota na tônica (final) ou no acorde da semicadência,
    // chegando por passo.
    if (role.end !== 'none') {
      const last = indexes.length - 1
      const before = last > 0 ? indexes[last - 1] : prev
      const goal = role.end === 'final' ? chordIndexes([0]) : chordIndexes(cadence).filter((i) => pool[i] % 12 !== 0)
      const end = nearestIndex(goal.length ? goal : chordIndexes(cadence), before)
      indexes[last] = end
      if (last > 0 && Math.abs(indexes[last - 1] - end) > 2) {
        indexes[last - 1] = clamp(end + (indexes[last - 1] > end ? 1 : -1), 0, pool.length - 1)
      }
      if (last > 0 && indexes[last - 1] === end) indexes[last - 1] = clamp(end + 1, 0, pool.length - 1)
    }

    // Saltos grandes entre compassos: se passar de uma sexta, aproxima a primeira nota.
    if (notes.length && Math.abs(pool[indexes[0]] - notes[notes.length - 1]) > 9) {
      indexes[0] = clamp(prev + Math.sign(indexes[0] - prev) * 2, 0, pool.length - 1)
    }

    indexes.forEach((index, k) => {
      notes.push(pool[index])
      beats.push(rhythm[k])
    })
    prev = indexes[indexes.length - 1]
  })

  return {
    notes,
    beats,
    bpm: mood.bpm,
    scaleIndex,
    title: makeTitle(mood.id, random),
    mood: mood.id,
    form,
    chords,
    seed,
  }
}

// --- Tempo ---------------------------------------------------------------------

// Marcações de metrônomo clássicas: o BPM sugerido sempre cai numa delas.
export const METRONOME_MARKS = [
  60, 63, 66, 69, 72, 76, 80, 84, 88, 92, 96, 100, 104, 108, 112, 116, 120, 126, 132, 138, 144, 152, 160,
]

// Sugere um tempo (BPM) para uma melodia, pela densidade: notas curtas pedem tempo mais lento
// (a bolinha precisa de ~0,28 s entre blocos), notas longas aguentam um tempo mais vivo, mas
// sem exagero (cresce devagar). O resultado cai numa marcação de metrônomo.
export function suggestBpm(melody: Melody): number {
  const beats = melody.beats.filter((b) => b > 0)
  if (beats.length === 0) return 100
  const sorted = beats.slice().sort((a, b) => a - b)
  const median = sorted[Math.floor(sorted.length / 2)]
  const average = beats.reduce((a, b) => a + b, 0) / beats.length
  const typical = (median + average) / 2
  let bpm = 100 * Math.pow(typical, 0.3)
  bpm = Math.min(bpm, (60 * sorted[0]) / 0.28)
  // Melodias com muitos saltos grandes pedem um pouco mais de calma.
  let leaps = 0
  for (let i = 1; i < melody.notes.length; i++) if (Math.abs(melody.notes[i] - melody.notes[i - 1]) > 7) leaps++
  bpm *= 1 - 0.15 * (leaps / Math.max(1, melody.notes.length - 1))
  bpm = clamp(bpm, 60, 160)
  return METRONOME_MARKS.reduce((best, m) => (Math.abs(m - bpm) < Math.abs(best - bpm) ? m : best))
}

// --- Sugestão de notas -----------------------------------------------------------

// Sugere as próximas notas depois das notas dadas, dentro da escala, da melhor para a pior.
// Critérios: resolução (si→dó, fá→mi...), notas do acorde da tônica, passo depois de passo,
// passo contrário depois de salto, repetição do motivo já tocado, faixa confortável.
export function suggestNextNotes(previous: number[], scaleIndex: number, count = 3): number[] {
  const history = previous.filter((n) => n >= 0 && n < NOTE_COUNT)
  const last = history[history.length - 1] ?? NOTE_DEFAULT
  const before = history[history.length - 2]
  const lastMove = before === undefined ? 0 : last - before
  const intervals = (SCALES[scaleIndex] ?? SCALES[0]).intervals
  const major = intervals.includes(4) || !intervals.includes(3)
  const tonicChord = major ? [0, 4, 7] : [0, 3, 7]
  const scale = scaleIndex === 0 ? 1 : scaleIndex // na cromática, pensa em dó maior

  // Continuação do motivo: onde o mesmo intervalo (ou a mesma nota) já apareceu, o que veio depois?
  const motifVotes = new Map<number, number>()
  for (let i = 1; i < history.length - 1; i++) {
    const sameMove = before !== undefined && history[i] - history[i - 1] === lastMove
    const sameNote = history[i] === last
    if (!sameMove && !sameNote) continue
    const next = last + (history[i + 1] - history[i])
    motifVotes.set(next, (motifVotes.get(next) ?? 0) + (sameMove ? 2 : 1) * (sameNote ? 1.5 : 1))
  }

  const scored: { note: number; score: number }[] = []
  for (let n = Math.max(0, last - 12); n <= Math.min(NOTE_COUNT - 1, last + 12); n++) {
    if (!inScale(n, scale) && !(scaleIndex === 0 && inScale(n, 0) && Math.abs(n - last) === 1)) continue
    const d = n - last
    const size = Math.abs(d)
    const pc = n % 12
    let score = 0
    if (size === 0) score += 0.5
    else if (size <= 2) score += 3
    else if (size <= 4) score += 2
    else if (size <= 7) score += 1
    else score -= (size - 7) * 0.4
    // Depois de salto, volta por passo no sentido contrário.
    if (Math.abs(lastMove) > 4) {
      if (Math.sign(d) === -Math.sign(lastMove) && size <= 2 && size > 0) score += 3
      else if (Math.sign(d) === Math.sign(lastMove)) score -= 1.5
    } else if (lastMove !== 0 && Math.sign(d) === Math.sign(lastMove) && size <= 2 && size > 0) {
      score += 0.8 // continua a escadinha
    }
    // Resoluções de tendência.
    const lastPc = last % 12
    if (lastPc === 11 && pc === 0 && d === 1) score += 4
    if (lastPc === 5 && pc === 4 && d === -1) score += 2
    if (lastPc === 2 && pc === 0 && d === -2) score += 1.5
    if (lastPc === 8 && pc === 7 && d === -1) score += 2
    if (lastPc === 10 && pc === 8 && d === -2) score += 0.5
    if (tonicChord.includes(pc)) score += 1
    if (pc === 0) score += 0.5
    score += (motifVotes.get(n) ?? 0) * 1.2
    // Evita a mesma nota três vezes seguidas.
    if (size === 0 && before === last) score -= 2.5
    if (n < COMFORT_MIN || n > COMFORT_MAX) score -= 1.5
    scored.push({ note: n, score: score - size * 0.01 })
  }
  scored.sort((a, b) => b.score - a.score)
  return scored.slice(0, Math.max(0, count)).map((s) => s.note)
}
