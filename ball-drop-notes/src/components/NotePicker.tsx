import type { CSSProperties } from 'react'
import { inScale, NOTE_COUNT, NOTE_NAMES, noteName } from '../music'
import { noteColor } from './ui'

// Seletor visual de nota: uma linha por oitava (agudos em cima), colorida pela classe da nota.
// Notas fora da escala ficam apagadas e não podem ser escolhidas (exceto a nota atual).
export function NotePicker({
  value,
  scaleIndex,
  onPick,
  label,
}: {
  value: number | null
  scaleIndex: number
  onPick: (note: number) => void
  label: string
}) {
  const octaves = Math.ceil(NOTE_COUNT / 12)
  const rows = Array.from({ length: octaves }, (_, o) => octaves - 1 - o)
  return (
    <div className="note-picker" role="group" aria-label={label}>
      {rows.map((octave) => (
        <div className="note-row" key={octave}>
          <span className="note-row-label" aria-hidden="true">
            {octave + 3}
          </span>
          {Array.from({ length: 12 }, (_, pc) => {
            const note = octave * 12 + pc
            if (note >= NOTE_COUNT) return <span key={pc} className="note-cell is-empty" />
            const sharp = NOTE_NAMES[pc].endsWith('#')
            const allowed = inScale(note, scaleIndex) || note === value
            return (
              <button
                key={pc}
                type="button"
                className={`note-cell${sharp ? ' is-sharp' : ''}`}
                style={{ '--note': noteColor(note) } as CSSProperties}
                aria-pressed={note === value}
                aria-label={noteName(note)}
                title={noteName(note)}
                disabled={!allowed}
                onClick={() => onPick(note)}
              >
                {sharp ? '♯' : NOTE_NAMES[pc]}
              </button>
            )
          })}
        </div>
      ))}
    </div>
  )
}

// Chip de nota, para sugestões e listas curtas.
export function NoteChip({ note, onClick, active }: { note: number; onClick?: () => void; active?: boolean }) {
  return (
    <button
      type="button"
      className="note-chip"
      aria-pressed={active}
      style={{ '--note': noteColor(note) } as CSSProperties}
      onClick={onClick}
    >
      <span className="note-dot" aria-hidden="true" />
      {noteName(note)}
    </button>
  )
}
