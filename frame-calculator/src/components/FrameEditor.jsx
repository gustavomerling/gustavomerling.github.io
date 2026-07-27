import { Tag, Ruler, Frame, TreePine, Droplet, Sun, Layers, EyeOff, Palette, Image } from 'lucide-react'
import { SIZES, WOOD_TYPES, GLASS_TYPES } from '../config/frameOptions'
import ColorPresetPicker from './ColorPresetPicker'
import './FrameEditor.css'

const GLASS_ICONS = {
  'vidro-comum': Droplet,
  'vidro-uv': Sun,
  'acrilico': Layers,
  'sem-vidro': EyeOff,
}

function FrameEditor({ frame, onUpdateFrame }) {
  return (
    <div className="frame-editor">
      <h2 className="editor-title">Configurações do Quadro</h2>

      {/* Nome do Quadro */}
      <div className="editor-group">
        <label><Tag size={14} /> Nome do Quadro</label>
        <input
          type="text"
          value={frame.name}
          onChange={(e) => onUpdateFrame({ name: e.target.value })}
          placeholder="Ex: Quadro da Sala"
          className="editor-input"
        />
      </div>

      {/* Tamanho */}
      <div className="editor-group">
        <label><Ruler size={14} /> Tamanho do Quadro</label>
        <div className="option-grid option-grid-size">
          {SIZES.map((s) => (
            <button
              key={s.value}
              type="button"
              className={`option-button ${frame.size === s.value ? 'active' : ''}`}
              onClick={() => onUpdateFrame({ size: s.value })}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Madeira */}
      <div className="editor-group">
        <label><TreePine size={14} /> Tipo de Madeira</label>
        <div className="option-grid option-grid-wood">
          {WOOD_TYPES.map((w) => (
            <button
              key={w.value}
              type="button"
              className={`option-button ${frame.woodType === w.value ? 'active' : ''}`}
              onClick={() => onUpdateFrame({ woodType: w.value })}
            >
              <span
                className="wood-swatch"
                style={{ backgroundColor: w.swatch, backgroundImage: `url('${w.image}')` }}
              ></span>
              {w.label}
            </button>
          ))}
        </div>
      </div>

      {/* Grossura da Moldura */}
      <div className="editor-group">
        <label><Frame size={14} /> Grossura da Moldura</label>
        <div className="slider-group">
          <input
            type="range"
            min="2"
            max="20"
            value={frame.frameThickness}
            onChange={(e) => onUpdateFrame({ frameThickness: parseInt(e.target.value) })}
            className="editor-slider"
          />
          <span className="slider-value">{frame.frameThickness}cm</span>
        </div>
      </div>

      {/* Vidro/Película */}
      <div className="editor-group">
        <label><Layers size={14} /> Vidro / Película</label>
        <div className="option-grid option-grid-glass">
          {GLASS_TYPES.map((g) => {
            const Icon = GLASS_ICONS[g.value]
            return (
              <button
                key={g.value}
                type="button"
                className={`option-button ${frame.glassType === g.value ? 'active' : ''}`}
                onClick={() => onUpdateFrame({ glassType: g.value })}
              >
                <Icon size={16} />
                {g.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Cor de Fundo do Quadro */}
      <div className="editor-group">
        <label><Palette size={14} /> Cor de Fundo do Quadro</label>
        <ColorPresetPicker
          value={frame.frameBackground}
          onChange={(value) => onUpdateFrame({ frameBackground: value })}
          allowImageUpload
        />
      </div>

      {/* Cor de Fundo da Simulação */}
      <div className="editor-group">
        <label><Image size={14} /> Cor de Fundo da Simulação</label>
        <ColorPresetPicker
          value={frame.simulationBackground}
          onChange={(value) => onUpdateFrame({ simulationBackground: value })}
          allowImageUpload
        />
      </div>
    </div>
  )
}

export default FrameEditor
