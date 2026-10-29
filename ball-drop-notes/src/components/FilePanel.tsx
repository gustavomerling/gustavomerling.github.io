import { useRef } from 'react'
import { playUi } from '../audio'
import { EXAMPLES } from '../music'
import { Section } from './controls'
import { Icon } from './Icon'

export type Version = { label: string; time: string; text: string; blocks: number }

export function FilePanel({
  onSave,
  onOpenText,
  onExample,
  versions,
  onSaveVersion,
  onLoadVersion,
}: {
  onSave: () => void
  onOpenText: (text: string) => void
  onExample: (text: string, label: string) => void
  versions: Version[]
  onSaveVersion: () => void
  onLoadVersion: (version: Version) => void
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  return (
    <>
      <Section title="Arquivo">
        <div className="btn-row">
          <button type="button" className="btn" onClick={onSave}>
            <Icon name="save" size={18} />
            Salvar
          </button>
          <button
            type="button"
            className="btn"
            onClick={() => {
              playUi('click')
              fileRef.current?.click()
            }}
          >
            <Icon name="open" size={18} />
            Abrir
          </button>
        </div>
        <p className="muted small">Salva um arquivo .json com os blocos, notas e linhas de chegada.</p>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={async (e) => {
            const file = e.target.files?.[0]
            e.target.value = ''
            if (file) onOpenText(await file.text())
          }}
        />
      </Section>

      <Section title="Versões" hint="nesta sessão">
        <button
          type="button"
          className="btn"
          onClick={() => {
            playUi('click')
            onSaveVersion()
          }}
        >
          <Icon name="plus" size={18} />
          Guardar versão atual
        </button>
        {versions.length === 0 ? (
          <p className="muted small">Guarde versões para comparar ideias e voltar quando quiser.</p>
        ) : (
          <ul className="list">
            {versions.map((v) => (
              <li key={v.label}>
                <button type="button" className="list-item" onClick={() => onLoadVersion(v)}>
                  <span className="list-item-title">{v.label}</span>
                  <span className="list-item-sub">
                    {v.time} · {v.blocks} {v.blocks === 1 ? 'bloco' : 'blocos'}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Exemplos">
        <ul className="list">
          {EXAMPLES.map((ex) => (
            <li key={ex.label}>
              <button type="button" className="list-item" onClick={() => onExample(ex.text, ex.label)}>
                <span className="list-item-title">{ex.label}</span>
              </button>
            </li>
          ))}
        </ul>
      </Section>
    </>
  )
}
