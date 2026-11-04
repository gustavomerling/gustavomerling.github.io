import type { BuildState } from '../game/build/BuildMode'
import { CATALOG } from '../game/build/catalog'

/** Barra inferior do modo construção. */
export function BuildBar({ build }: { build: BuildState }) {
  return (
    <div className="build-bar">
      <div className="build-title">Construção</div>
      <div className="build-items">
        {CATALOG.map((item, i) => (
          <div key={item.id} className={i === build.selected ? 'build-item selected' : 'build-item'}>
            <kbd>{i + 1}</kbd>
            {item.name}
            <small>{item.dynamic ? 'solto' : 'fixo'}</small>
          </div>
        ))}
      </div>
      <div className="build-hint">
        clique: colocar · botão direito: remover · Q/E: girar · roda/1–{CATALOG.length}: escolher · B: sair
      </div>
    </div>
  )
}
