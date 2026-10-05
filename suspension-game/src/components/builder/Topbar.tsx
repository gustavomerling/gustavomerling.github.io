import { Dices, Eraser, MapPin, Menu, Play, Redo2, RotateCcw, Undo2 } from 'lucide-react'
import { DIFFICULTIES, type Difficulty } from '../../game/terrain/generate'
import { Emblem } from '../menu/Logo'

const DIFF_COLORS: Record<Difficulty, string> = { easy: '#66bb6a', normal: '#ffb300', hard: '#ef5350' }

interface Props {
  seed: number
  difficulty: Difficulty
  canUndo: boolean
  canRedo: boolean
  onMenu: () => void
  onUndo: () => void
  onRedo: () => void
  onClear: () => void
  onReset: () => void
  onSeed: (s: number) => void
  onRandomSeed: () => void
  onDifficulty: (d: Difficulty) => void
  onDrive: () => void
}

/** Barra superior da garagem: marca, histórico, escolha da pista e "Dirigir". */
export function Topbar(p: Props) {
  return (
    <header className="g-top">
      <button className="g-iconbtn" onClick={p.onMenu} title="Menu principal" aria-label="Menu principal">
        <Menu size={18} />
      </button>
      <div className="g-brand">
        <Emblem className="g-emblem" />
        <span>GARAGEM</span>
      </div>

      <div className="g-seg">
        <button onClick={p.onUndo} disabled={!p.canUndo} title="Desfazer (Ctrl+Z)" aria-label="Desfazer">
          <Undo2 size={16} />
        </button>
        <button onClick={p.onRedo} disabled={!p.canRedo} title="Refazer (Ctrl+Y)" aria-label="Refazer">
          <Redo2 size={16} />
        </button>
        <i />
        <button onClick={p.onClear} title="Remover todas as peças">
          <Eraser size={15} /> Limpar
        </button>
        <button onClick={p.onReset} title="Voltar ao carro padrão">
          <RotateCcw size={15} /> Padrão
        </button>
      </div>

      <div className="spacer" />

      <div className="g-track">
        <label className="g-seed" title="Número da pista: a mesma semente gera sempre a mesma pista">
          <MapPin size={15} />
          <span>Pista</span>
          <input type="number" value={p.seed} min={0} max={99999} onChange={(e) => p.onSeed(Math.max(0, Math.floor(+e.target.value || 0)))} />
          <button onClick={p.onRandomSeed} title="Pista aleatória" aria-label="Pista aleatória">
            <Dices size={16} />
          </button>
        </label>
        <div className="g-diff" role="radiogroup" aria-label="Dificuldade">
          {(Object.keys(DIFFICULTIES) as Difficulty[]).map((d) => (
            <button
              key={d}
              role="radio"
              aria-checked={p.difficulty === d}
              className={p.difficulty === d ? 'active' : ''}
              style={{ '--diff': DIFF_COLORS[d] } as React.CSSProperties}
              onClick={() => p.onDifficulty(d)}
            >
              <i />
              {DIFFICULTIES[d].name}
            </button>
          ))}
        </div>
      </div>

      <button className="g-drive" onClick={p.onDrive}>
        DIRIGIR <Play size={18} fill="currentColor" />
      </button>
    </header>
  )
}
