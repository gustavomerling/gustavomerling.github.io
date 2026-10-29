import type { Melody } from './types'
import { NOTE_COUNT, NOTE_DEFAULT, NOTE_MIN_MIDI } from './music/theory'
import type { Song } from './music/songs'

// Música: ponto único de importação. O conteúdo fica dividido em src/music/:
// theory.ts (notas, escalas, harmonia), songs.ts (músicas de domínio público) e
// compose.ts (climas, compositor, sugestões de tempo e de notas).
export * from './music/theory'
export * from './music/songs'
export * from './music/compose'

// Padrões rítmicos, em batidas. Cada número é a duração de um bloco.
// Os três primeiros têm índice fixo; novos padrões vão no fim.
export const PATTERNS: { label: string; beats: number[] }[] = [
  { label: 'Dois tempos', beats: [1, 1] },
  { label: 'Síncope', beats: [0.5, 1, 0.5, 1] },
  { label: 'Valsa', beats: [1, 1, 1] },
  { label: 'Marcha', beats: [1, 1, 2] },
  { label: 'Balada', beats: [2, 1, 1] },
  { label: 'Pontuado', beats: [1.5, 0.5] },
  { label: 'Galope', beats: [1, 0.5, 0.5] },
  { label: 'Baião', beats: [1.5, 1.5, 1] },
  { label: 'Habanera', beats: [1.5, 0.5, 1, 1] },
  { label: 'Notas longas', beats: [2, 2] },
  { label: 'Pingos', beats: [0.5, 0.5, 1] },
  { label: 'Sobe e desce', beats: [1, 0.5, 0.5, 1, 1] },
]

// Converte uma música em melodia (índices de nota), descartando notas fora do alcance.
export function songMelody(song: Song): Melody {
  const notes: number[] = []
  const beats: number[] = []
  song.midi.forEach((m, i) => {
    const n = m - NOTE_MIN_MIDI
    if (n < 0 || n >= NOTE_COUNT) return
    notes.push(n)
    beats.push(song.beats[i] ?? 1)
  })
  return { notes, beats }
}

// Duração total de uma melodia, em batidas.
export function melodyBeats(melody: Melody): number {
  return melody.beats.reduce((a, b) => a + b, 0)
}

// Duração total de uma melodia, em segundos, no BPM dado.
export function melodySeconds(melody: Melody, bpm: number): number {
  return (melodyBeats(melody) * 60) / Math.max(1, bpm)
}

// Exemplos prontos, no mesmo formato do arquivo salvo.
export const EXAMPLES: { label: string; text: string }[] = [
  {
    label: 'Escada de dó maior',
    text: JSON.stringify({
      version: 1,
      blocks: [0, 2, 4, 5, 7, 9, 11, 12].map((semitone, i) => ({
        x1: i * 120,
        y1: i * 30,
        x2: i * 120 + 120,
        y2: i * 30 + 30,
        note: NOTE_DEFAULT + semitone,
        finish: false,
      })),
    }),
  },
  {
    label: 'Quatro notas com chegada',
    text: JSON.stringify({
      version: 1,
      blocks: [12, 16, 19, 24].map((note, i) => ({
        x1: i * 100,
        y1: 0,
        x2: i * 100 + 100,
        y2: 0,
        note,
        finish: i === 3,
      })),
    }),
  },
]
