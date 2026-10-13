import { Footprints, Mouse, Scan, Volume2, VolumeX } from 'lucide-react'
import { SETTING_LIMITS, type GameSettings } from '../engine/settings.ts'

type NumericKey = keyof typeof SETTING_LIMITS

const SLIDERS: { key: NumericKey; label: string; format: (value: number) => string; icon: typeof Mouse }[] = [
  { key: 'sensitivity', label: 'Sensibilidade do mouse', format: (v) => `${v.toFixed(2)}×`, icon: Mouse },
  { key: 'fov', label: 'Campo de visão', format: (v) => `${Math.round(v)}°`, icon: Scan },
  { key: 'volume', label: 'Volume', format: (v) => `${Math.round(v * 100)}%`, icon: Volume2 },
]

export function SettingsPanel({
  settings,
  onChange,
}: {
  settings: GameSettings
  onChange: (settings: GameSettings) => void
}) {
  return (
    <div className="settings">
      {SLIDERS.map(({ key, label, format, icon: Icon }) => {
        const { min, max, step } = SETTING_LIMITS[key]
        return (
          <label key={key} className="settings__row">
            <span className="settings__label">
              <Icon className="menu__icon" size={16} aria-hidden />
              {label}
              <output className="settings__value">{format(settings[key])}</output>
            </span>
            <input
              className="settings__slider"
              type="range"
              min={min}
              max={max}
              step={step}
              value={settings[key]}
              onChange={(event) => onChange({ ...settings, [key]: Number(event.target.value) })}
            />
          </label>
        )
      })}

      <div className="settings__toggles">
        <button
          type="button"
          className={`settings__toggle${settings.muted ? '' : ' settings__toggle--on'}`}
          aria-pressed={!settings.muted}
          onClick={() => onChange({ ...settings, muted: !settings.muted })}
        >
          {settings.muted ? <VolumeX size={16} aria-hidden /> : <Volume2 size={16} aria-hidden />}
          Som {settings.muted ? 'desligado' : 'ligado'}
        </button>
        <button
          type="button"
          className={`settings__toggle${settings.headBob ? ' settings__toggle--on' : ''}`}
          aria-pressed={settings.headBob}
          onClick={() => onChange({ ...settings, headBob: !settings.headBob })}
        >
          <Footprints size={16} aria-hidden />
          Balanço da câmera
        </button>
      </div>
    </div>
  )
}
