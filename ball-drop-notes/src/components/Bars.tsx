import { type CSSProperties, type Ref, useEffect, useState } from 'react'
import { noteName } from '../music'
import { Icon, type IconName } from './Icon'
import { noteColor, type PanelId } from './ui'

// Botão redondo da barra, com dica (tooltip) que mostra o atalho.
function BarButton({
  icon,
  label,
  shortcut,
  onClick,
  disabled,
  pressed,
  controls,
  text,
  className = '',
}: {
  icon: IconName
  label: string
  shortcut?: string
  onClick: () => void
  disabled?: boolean
  pressed?: boolean
  controls?: string
  text?: string
  className?: string
}) {
  const tip = shortcut ? `${label} (${shortcut})` : label
  return (
    <button
      type="button"
      className={`bar-btn ${text ? 'bar-btn--tab' : ''} ${className}`}
      aria-label={tip}
      data-tip={tip}
      aria-pressed={pressed}
      aria-controls={controls}
      aria-expanded={controls ? pressed : undefined}
      disabled={disabled}
      onClick={onClick}
    >
      <Icon name={icon} />
      {text && <span className="bar-btn-text">{text}</span>}
    </button>
  )
}

const TABS: { id: PanelId; icon: IconName; label: string }[] = [
  { id: 'compose', icon: 'compose', label: 'Compor' },
  { id: 'sound', icon: 'sound', label: 'Som' },
  { id: 'tools', icon: 'tools', label: 'Ferramentas' },
  { id: 'file', icon: 'file', label: 'Arquivo' },
]

export function TransportBar({
  barRef,
  running,
  onToggle,
  onReset,
  onStep,
  onRewind,
  onUndo,
  onFit,
  panel,
  onPanel,
  onHelp,
  piano,
  onPiano,
}: {
  barRef: Ref<HTMLElement>
  running: boolean
  onToggle: () => void
  onReset: () => void
  onStep: () => void
  onRewind: () => void
  onUndo: () => void
  onFit: () => void
  panel: PanelId | null
  onPanel: (id: PanelId) => void
  onHelp: () => void
  piano: boolean
  onPiano: () => void
}) {
  return (
    <nav ref={barRef} className="bar glass" aria-label="Controles">
      <div className="bar-group">
        <BarButton icon="rewind" label="Voltar 5 s" shortcut="," onClick={onRewind} />
        <BarButton icon="step" label="Avançar um passo" shortcut="." onClick={onStep} />
        <button
          type="button"
          className={`play-btn${running ? ' is-running' : ''}`}
          aria-label={running ? 'Pausar (Espaço)' : 'Tocar (Espaço)'}
          data-tip={running ? 'Pausar (Espaço)' : 'Tocar (Espaço)'}
          onClick={onToggle}
        >
          <Icon name={running ? 'pause' : 'play'} size={28} />
        </button>
        <BarButton icon="reset" label="Reiniciar" shortcut="R" onClick={onReset} />
      </div>
      <span className="bar-sep" aria-hidden="true" />
      <div className="bar-group">
        <BarButton icon="undo" label="Desfazer" shortcut="Ctrl+Z" onClick={onUndo} />
        <BarButton icon="fit" label="Enquadrar tudo" shortcut="0" onClick={onFit} />
      </div>
      <span className="bar-sep" aria-hidden="true" />
      <div className="bar-group">
        {TABS.map((t) => (
          <BarButton
            key={t.id}
            icon={t.icon}
            label={t.label}
            text={t.label}
            pressed={panel === t.id}
            controls={`panel-${t.id}`}
            className={`tab-${t.id}`}
            onClick={() => onPanel(t.id)}
          />
        ))}
        <BarButton
          icon="piano"
          label="Piano"
          text="Piano"
          pressed={piano}
          className="tab-piano"
          onClick={onPiano}
        />
        <BarButton icon="help" label="Ajuda e atalhos" shortcut="?" onClick={onHelp} />
      </div>
    </nav>
  )
}

export function Hud({
  subscribeNotes,
  blockCount,
  bpm,
  running,
  paint,
  loop,
  onPaintOff,
  onBpm,
}: {
  subscribeNotes: (listener: (note: number) => void) => () => void
  blockCount: number
  bpm: number
  running: boolean
  paint: number | null
  loop: boolean
  onPaintOff: () => void
  onBpm: () => void
}) {
  // id muda a cada nota, para reiniciar a animação de "pulso" mesmo com a mesma nota.
  const [lastNote, setLastNote] = useState<{ note: number; id: number } | null>(null)
  useEffect(
    () => subscribeNotes((note) => setLastNote((last) => ({ note, id: (last?.id ?? 0) + 1 }))),
    [subscribeNotes],
  )
  return (
    <div className="hud">
      <div className="hud-pill glass hud-brand" aria-hidden="true">
        <span className={`hud-ball${running ? ' is-running' : ''}`} />
        <span className="hud-brand-text">Ball Drop Notes</span>
      </div>
      <div className="hud-pill glass" aria-live="off">
        <span
          key={lastNote?.id ?? 0}
          className={`hud-note${lastNote ? ' is-hit' : ''}`}
          style={{ '--note': lastNote ? noteColor(lastNote.note) : 'var(--muted)' } as CSSProperties}
          title="Última nota tocada"
        >
          <span className="note-dot" aria-hidden="true" />
          {lastNote ? noteName(lastNote.note) : '—'}
        </span>
        <span className="hud-sep" aria-hidden="true" />
        <span className="hud-stat" title="Blocos na pista">
          <b>{blockCount}</b> {blockCount === 1 ? 'bloco' : 'blocos'}
        </span>
        <span className="hud-sep" aria-hidden="true" />
        <button type="button" className="hud-stat hud-link" title="Mudar o tempo" onClick={onBpm}>
          <b>{bpm}</b> BPM
        </button>
      </div>
      {loop && (
        <div className="hud-pill glass hud-badge">
          <Icon name="loop" size={14} /> Loop
        </div>
      )}
      {paint !== null && (
        <button
          type="button"
          className="hud-pill glass hud-badge hud-paint"
          style={{ '--note': noteColor(paint) } as CSSProperties}
          onClick={onPaintOff}
          title="Desligar o pincel"
        >
          <span className="note-dot" aria-hidden="true" />
          Pincel {noteName(paint)}
          <Icon name="close" size={14} />
        </button>
      )}
    </div>
  )
}
