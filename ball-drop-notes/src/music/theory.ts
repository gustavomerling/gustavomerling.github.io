// Teoria básica: notas, escalas e utilitários de altura. Reexportado por music.ts.

// Notas: índice 0 é dó3 (MIDI 48); 37 notas cobrem 3 oitavas, de dó3 a dó6.
export const NOTE_NAMES = ['Dó', 'Dó#', 'Ré', 'Ré#', 'Mi', 'Fá', 'Fá#', 'Sol', 'Sol#', 'Lá', 'Lá#', 'Si']
export const NOTE_MIN_MIDI = 48
export const NOTE_COUNT = 37
export const NOTE_DEFAULT = 12 // dó4
export const SOFT_INTERVALS = [0, 3, 4, 5, 7, 8, 9] // intervalos (em semitons) que soam suaves

// Faixa confortável para melodias (índices de nota): de sol3 a sol5.
export const COMFORT_MIN = 5
export const COMFORT_MAX = 31

// Sustain: a largura do bloco (em px) vira a duração da nota. Ajuste NOTE_SUSTAIN_PER_PX para mudar a escala.
export const NOTE_SUSTAIN_PER_PX = 0.01 // segundos por pixel de largura (100 px = 1 s)

// Escalas para filtrar as notas, com tônica dó. Intervalos em semitons a partir do dó.
// As 5 primeiras têm índice fixo (o motor e a interface usam o índice); novas escalas vão no fim.
export const SCALES: { label: string; intervals: number[] }[] = [
  { label: 'Cromática', intervals: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] },
  { label: 'Dó maior', intervals: [0, 2, 4, 5, 7, 9, 11] },
  { label: 'Dó menor', intervals: [0, 2, 3, 5, 7, 8, 10] },
  { label: 'Pentatônica maior', intervals: [0, 2, 4, 7, 9] },
  { label: 'Pentatônica menor', intervals: [0, 3, 5, 7, 10] },
  { label: 'Dórica', intervals: [0, 2, 3, 5, 7, 9, 10] }, // 5
  { label: 'Blues', intervals: [0, 3, 5, 6, 7, 10] }, // 6
  { label: 'Japonesa (In)', intervals: [0, 1, 5, 7, 8] }, // 7
  { label: 'Harmônica menor', intervals: [0, 2, 3, 5, 7, 8, 11] }, // 8
  { label: 'Mixolídia', intervals: [0, 2, 4, 5, 7, 9, 10] }, // 9
  { label: 'Lídia', intervals: [0, 2, 4, 6, 7, 9, 11] }, // 10
]

// Teclas do teclado que tocam as primeiras notas da escala, a partir do dó4.
export const PIANO_KEYS = ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l']

export function noteName(index: number) {
  const midi = NOTE_MIN_MIDI + index
  return `${NOTE_NAMES[midi % 12]}${Math.floor(midi / 12) - 1}`
}

export function inScale(note: number, scaleIndex: number) {
  return (SCALES[scaleIndex] ?? SCALES[0]).intervals.includes(((note % 12) + 12) % 12)
}

// Todas as notas da escala entre min e max (inclusive), em ordem crescente.
export function scaleNotes(scaleIndex: number, min = 0, max = NOTE_COUNT - 1): number[] {
  const result: number[] = []
  for (let n = Math.max(0, min); n <= Math.min(NOTE_COUNT - 1, max); n++) {
    if (inScale(n, scaleIndex)) result.push(n)
  }
  return result
}

// Move cada nota `steps` graus dentro da escala (positivo sobe). Notas fora da escala
// vão antes para o grau mais próximo; o resultado fica limitado a 0..36.
export function transposeInScale(notes: number[], steps: number, scaleIndex: number): number[] {
  const pool = scaleNotes(scaleIndex)
  return notes.map((note) => {
    let index = 0
    for (let i = 0; i < pool.length; i++) {
      if (Math.abs(pool[i] - note) < Math.abs(pool[index] - note)) index = i
    }
    return pool[Math.max(0, Math.min(pool.length - 1, index + steps))]
  })
}

// Segunda voz: para cada nota, a terça diatônica abaixo (dois graus da escala), ou acima
// se não houver espaço. Na escala cromática usa dó maior. Bom para tocar junto ou desenhar
// uma pista paralela.
export function harmonize(notes: number[], scaleIndex: number): number[] {
  const scale = scaleIndex === 0 ? 1 : scaleIndex
  const pool = scaleNotes(scale)
  return notes.map((note) => {
    let index = pool.findIndex((n) => n >= note)
    if (index < 0) index = pool.length - 1
    const below = pool[index - 2]
    if (below !== undefined && note - below <= 5) return below
    return pool[Math.min(pool.length - 1, index + 2)]
  })
}
