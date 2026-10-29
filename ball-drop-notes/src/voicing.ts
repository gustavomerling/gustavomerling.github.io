import type { Melody, Segment } from './types'

// O gerador posiciona um bloco por nota, só pelo tempo de cada toque. Aqui cada bloco recebe o que
// o tempo não diz: quanto a nota soa (quando passa do tempo até a próxima) e as notas do acorde.
export function applyVoicing(segments: Segment[], melody: Melody, bpm: number): Segment[] {
  const beatSeconds = 60 / bpm
  let i = 0
  return segments.map((seg) => {
    if (seg.finish || i >= melody.notes.length) return seg
    const index = i++
    const voiced: Segment = { ...seg }
    const hold = melody.holds?.[index]
    if (hold !== undefined && hold > melody.beats[index] + 1e-6) voiced.sustain = hold * beatSeconds
    const chord = melody.extras?.[index]
    if (chord && chord.length > 0) {
      voiced.chord = chord.map((c) => ({ note: c.note, sustain: Math.max(c.hold, melody.beats[index]) * beatSeconds }))
    }
    return voiced
  })
}
