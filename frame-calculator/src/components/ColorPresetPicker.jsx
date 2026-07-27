import { Pipette, Upload } from 'lucide-react'
import { COLOR_PRESETS, GRADIENT_PRESETS } from '../config/frameOptions'
import './ColorPresetPicker.css'

function getContrastTextColor(hex) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luminance > 0.6 ? '#0F172A' : '#FFFFFF'
}

function ColorPresetPicker({ value, onChange, allowImageUpload = false }) {
  const isSolidColor = /^#/.test(value)
  const isImage = value.startsWith('url(')
  const isPreset = COLOR_PRESETS.includes(value) || GRADIENT_PRESETS.includes(value)
  const isCustomActive = isSolidColor && !isPreset

  const handleFileChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => onChange(`url("${reader.result}") center / cover no-repeat`)
    reader.readAsDataURL(file)
  }

  return (
    <div className="color-preset-picker">
      <div className="preset-swatches">
        {COLOR_PRESETS.map((color) => (
          <button
            key={color}
            type="button"
            className={`preset-swatch ${value === color ? 'active' : ''}`}
            style={{ background: color }}
            title={color}
            onClick={() => onChange(color)}
          />
        ))}
        {GRADIENT_PRESETS.map((gradient) => (
          <button
            key={gradient}
            type="button"
            className={`preset-swatch ${value === gradient ? 'active' : ''}`}
            style={{ background: gradient }}
            title="Gradiente"
            onClick={() => onChange(gradient)}
          />
        ))}
        {allowImageUpload && (
          <label
            className={`preset-swatch preset-swatch-image ${isImage ? 'active' : ''}`}
            style={isImage ? { background: value } : undefined}
            title="Enviar imagem"
          >
            {!isImage && <Upload size={14} />}
            <input type="file" accept="image/*" onChange={handleFileChange} />
          </label>
        )}
        <label
          className={`preset-swatch preset-swatch-custom ${isCustomActive ? 'active' : ''}`}
          style={isCustomActive ? { background: value } : undefined}
          title="Cor personalizada"
        >
          {isCustomActive ? (
            <span className="custom-swatch-hex" style={{ color: getContrastTextColor(value) }}>
              {value}
            </span>
          ) : (
            <Pipette size={14} />
          )}
          <input
            type="color"
            value={isSolidColor ? value : '#ffffff'}
            onChange={(e) => onChange(e.target.value)}
          />
        </label>
      </div>
    </div>
  )
}

export default ColorPresetPicker
