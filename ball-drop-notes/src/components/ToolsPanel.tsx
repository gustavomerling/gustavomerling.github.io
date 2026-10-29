import { playUi } from '../audio'
import { PATTERNS, SCALES, SONGS } from '../music'
import type { StartMode } from '../types'
import { ChipGroup, Section, Switch } from './controls'
import { Icon } from './Icon'
import { NotePicker } from './NotePicker'

const START_MODES: { value: StartMode; label: string }[] = [
  { value: 'suggest', label: 'Subir na escala' },
  { value: 'repeat', label: 'Igual ao anterior' },
]

const TRANSPOSE: { label: string; title: string; semitones: number }[] = [
  { label: '−8ª', title: 'Uma oitava abaixo', semitones: -12 },
  { label: '−½', title: 'Um semitom abaixo', semitones: -1 },
  { label: '+½', title: 'Um semitom acima', semitones: 1 },
  { label: '+8ª', title: 'Uma oitava acima', semitones: 12 },
]

export function ToolsPanel({
  scale,
  onScale,
  startMode,
  onStartMode,
  snap,
  onSnap,
  showTrail,
  onShowTrail,
  paint,
  onPaint,
  sequence,
  onSequence,
  loop,
  onLoop,
  onMarkLoop,
  onTranspose,
  onPattern,
  onClear,
  blockCount,
}: {
  scale: number
  onScale: (i: number) => void
  startMode: StartMode
  onStartMode: (m: StartMode) => void
  snap: boolean
  onSnap: (on: boolean) => void
  showTrail: boolean
  onShowTrail: (on: boolean) => void
  paint: number | null
  onPaint: (note: number | null) => void
  sequence: number | null
  onSequence: (song: number | null) => void
  loop: boolean
  onLoop: (on: boolean) => void
  onMarkLoop: () => void
  onTranspose: (semitones: number) => void
  onPattern: (beats: number[]) => void
  onClear: () => void
  blockCount: number
}) {
  return (
    <>
      <Section title="Escala" hint="tônica em dó">
        <ChipGroup
          label="Escala"
          options={SCALES.map((s, i) => ({ value: i, label: s.label }))}
          value={scale}
          onChange={onScale}
        />
      </Section>

      <Section title="Desenho">
        <Switch
          label="Encaixe no tempo"
          description="O comprimento dos blocos vai para frações de batida"
          checked={snap}
          onChange={onSnap}
        />
        <Switch
          label="Rastro e previsão"
          description="Mostra o caminho e por onde a bolinha vai"
          checked={showTrail}
          onChange={onShowTrail}
        />
        <div className="field-label">Nota dos blocos novos</div>
        <ChipGroup label="Nota dos blocos novos" options={START_MODES} value={startMode} onChange={onStartMode} />
      </Section>

      <Section title="Pincel" hint={paint === null ? 'desligado' : 'arraste sobre os blocos'}>
        <p className="muted small">Escolha uma nota e clique ou arraste sobre os blocos para pintá-los. Toque de novo na nota para desligar.</p>
        <NotePicker
          label="Nota do pincel"
          value={paint}
          scaleIndex={scale}
          onPick={(n) => {
            playUi('toggle')
            onPaint(paint === n ? null : n)
          }}
        />
        {paint !== null && (
          <button type="button" className="link-btn" onClick={() => onPaint(null)}>
            Desligar pincel
          </button>
        )}
      </Section>

      <Section title="Transpor tudo">
        <div className="btn-row">
          {TRANSPOSE.map((t) => (
            <button
              key={t.semitones}
              type="button"
              className="btn btn-small"
              title={t.title}
              aria-label={t.title}
              disabled={blockCount === 0}
              onClick={() => onTranspose(t.semitones)}
            >
              {t.label}
            </button>
          ))}
        </div>
      </Section>

      <Section title="Padrões rítmicos" hint="acrescenta no fim">
        <div className="btn-row">
          {PATTERNS.map((p) => (
            <button key={p.label} type="button" className="btn btn-small" onClick={() => onPattern(p.beats)}>
              <Icon name="plus" size={14} />
              {p.label}
            </button>
          ))}
        </div>
      </Section>

      <Section title="Notas de uma música" hint="na ordem dos blocos">
        <p className="muted small">Os blocos recebem as notas da música, na ordem em que foram desenhados.</p>
        <ChipGroup
          label="Música para os blocos"
          options={[{ value: -1, label: 'Nenhuma' }, ...SONGS.map((s, i) => ({ value: i, label: s.title }))]}
          value={sequence ?? -1}
          onChange={(v) => onSequence(v < 0 ? null : v)}
        />
      </Section>

      <Section title="Repetir trecho">
        <p className="muted small">Marque o início com a bolinha no ponto desejado; o trecho se repete em loop.</p>
        <div className="btn-row">
          <button
            type="button"
            className="btn btn-small"
            onClick={() => {
              playUi('click')
              onMarkLoop()
            }}
          >
            <Icon name="flag" size={14} />
            Marcar início aqui
          </button>
        </div>
        <Switch label="Loop" checked={loop} onChange={onLoop} />
      </Section>

      <Section title="Recomeçar">
        <button type="button" className="btn btn-danger" disabled={blockCount === 0} onClick={onClear}>
          <Icon name="trash" size={16} />
          Apagar todos os blocos
        </button>
      </Section>
    </>
  )
}
