import type { CSSProperties } from 'react'
import { NOTE_SUSTAIN_PER_PX, noteName } from '../music'
import type { Selection } from '../types'
import { Icon } from './Icon'
import { NoteChip, NotePicker } from './NotePicker'
import { noteColor } from './ui'

const formatNumber = (n: number, digits = 1) =>
  n.toLocaleString('pt-BR', { maximumFractionDigits: digits, minimumFractionDigits: 0 })

// Cartão do bloco selecionado: nota (teclado visual), sugestões, largura, chegada e apagar.
export function SelectionCard({
  selection,
  scale,
  bpm,
  suggestions,
  onNote,
  onFinish,
  onDelete,
  onClose,
}: {
  selection: Selection
  scale: number
  bpm: number
  suggestions: number[]
  onNote: (note: number) => void
  onFinish: (finish: boolean) => void
  onDelete: () => void
  onClose: () => void
}) {
  const seconds = selection.width * NOTE_SUSTAIN_PER_PX
  const beats = seconds / (60 / bpm)
  return (
    <aside
      className="selection-card glass"
      aria-label="Bloco selecionado"
      style={{ '--note': selection.finish ? 'var(--danger)' : noteColor(selection.note) } as CSSProperties}
    >
      <header className="selection-head">
        <span className="selection-swatch" aria-hidden="true" />
        <div className="selection-heading">
          <div className="selection-note">{selection.finish ? 'Linha de chegada' : noteName(selection.note)}</div>
          <div className="selection-meta">
            {Math.round(selection.width)} px · {formatNumber(seconds)} s · ~{formatNumber(beats)}{' '}
            {beats >= 0.95 && beats < 1.05 ? 'batida' : 'batidas'}
          </div>
        </div>
        <button
          type="button"
          className="icon-btn icon-btn--danger"
          aria-label="Apagar bloco (Delete)"
          title="Apagar bloco (Delete)"
          onClick={onDelete}
        >
          <Icon name="trash" size={18} />
        </button>
        <button type="button" className="icon-btn" aria-label="Fechar (Esc)" title="Fechar (Esc)" onClick={onClose}>
          <Icon name="close" size={18} />
        </button>
      </header>

      {!selection.finish && (
        <>
          <NotePicker label="Nota do bloco" value={selection.note} scaleIndex={scale} onPick={onNote} />
          {suggestions.length > 0 && (
            <div className="suggestions">
              <span className="field-label">Combina depois do bloco anterior:</span>
              <div className="chip-row">
                {suggestions.map((n) => (
                  <NoteChip key={n} note={n} active={n === selection.note} onClick={() => onNote(n)} />
                ))}
              </div>
            </div>
          )}
        </>
      )}

      <button
        type="button"
        role="switch"
        aria-checked={selection.finish}
        className="switch-row switch-row--compact"
        onClick={() => onFinish(!selection.finish)}
      >
        <span className="switch-text">
          <span className="switch-label">
            <Icon name="flag" size={16} /> Linha de chegada
          </span>
          <span className="switch-desc">Não toca som; pausa ao ser tocada</span>
        </span>
        <span className="switch" aria-hidden="true">
          <span className="switch-knob" />
        </span>
      </button>
    </aside>
  )
}
