import type { CSSProperties } from 'react'
import { noteName } from '../music'
import type { Melody } from '../types'
import { noteColor } from './ui'

// Mini piano-roll: cada nota é uma barrinha, posição pelo tempo, altura pela nota.
export function MelodyRoll({
  melody,
  playingIndex,
  onNoteClick,
}: {
  melody: Melody
  playingIndex: number | null
  onNoteClick?: (note: number) => void
}) {
  const total = melody.beats.reduce((a, b) => a + b, 0) || 1
  const low = Math.min(...melody.notes)
  const high = Math.max(...melody.notes)
  const range = high - low + 1
  // Início de cada nota, em batidas.
  const starts = melody.beats.reduce<number[]>((acc, _, i) => {
    acc.push(i === 0 ? 0 : acc[i - 1] + (melody.beats[i - 1] ?? 1))
    return acc
  }, [])
  return (
    <div className="roll" role="list" aria-label={`Melodia com ${melody.notes.length} notas`}>
      {/* Linhas de compasso, a cada 4 batidas. */}
      {Array.from({ length: Math.floor((total - 0.001) / 4) }, (_, i) => (
        <span key={`bar-${i}`} className="roll-bar" style={{ left: `${(((i + 1) * 4) / total) * 100}%` }} />
      ))}
      {melody.notes.map((note, i) => {
        const beat = melody.beats[i] ?? 1
        const start = starts[i] ?? 0
        const style = {
          left: `${(start / total) * 100}%`,
          width: `calc(${(beat / total) * 100}% - 2px)`,
          top: `${((high - note) / range) * 100}%`,
          height: `max(6px, ${100 / range}%)`,
          '--note': noteColor(note),
        } as CSSProperties
        return (
          <button
            key={i}
            type="button"
            role="listitem"
            tabIndex={-1}
            className={`roll-note${playingIndex === i ? ' is-playing' : ''}`}
            style={style}
            title={noteName(note)}
            aria-label={noteName(note)}
            onClick={() => onNoteClick?.(note)}
          />
        )
      })}
    </div>
  )
}
