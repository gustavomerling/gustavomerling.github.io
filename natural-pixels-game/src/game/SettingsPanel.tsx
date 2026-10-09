import { useSettings, type Grain } from '../app/settings.ts'
import type { RenderMode } from '../engine/renderer/index.ts'
import { Panel } from '../ui/Panel.tsx'
import { Segmented } from '../ui/Segmented.tsx'

const GRAPHICS: readonly { value: RenderMode; label: string }[] = [
  { value: 'smooth', label: 'Smooth' },
  { value: 'pixel', label: 'Pixel' },
]

const GRAINS: readonly { value: Grain; label: string }[] = [
  { value: 'coarse', label: 'Coarse' },
  { value: 'normal', label: 'Normal' },
  { value: 'fine', label: 'Fine' },
]

const ON_OFF: readonly { value: 'on' | 'off'; label: string }[] = [
  { value: 'on', label: 'On' },
  { value: 'off', label: 'Off' },
]

interface SettingsPanelProps {
  onClose: () => void
  /** Opened from inside a running world: grain changes only apply to the next one. */
  inGame?: boolean
}

export function SettingsPanel({ onClose, inGame = false }: SettingsPanelProps) {
  const { settings, update } = useSettings()

  return (
    <Panel title="Settings" onClose={onClose}>
      <div className="settings">
        <div className="settings__row">
          <span className="settings__label">Graphics</span>
          <Segmented label="Graphics" value={settings.graphics} options={GRAPHICS} onChange={(graphics) => update({ graphics })} />
          <span className="settings__hint">Smooth uses your GPU; Pixel is crisp and lighter.</span>
        </div>

        <div className="settings__row">
          <span className="settings__label">Grain size</span>
          <Segmented label="Grain size" value={settings.grain} options={GRAINS} onChange={(grain) => update({ grain })} />
          <span className="settings__hint">
            Fine = more, smaller particles (heavier).{inGame && ' Applies next time you start a world.'}
          </span>
        </div>

        <div className="settings__row">
          <span className="settings__label">Day/night cycle</span>
          <Segmented
            label="Day/night cycle"
            value={settings.dayCycle ? 'on' : 'off'}
            options={ON_OFF}
            onChange={(v) => update({ dayCycle: v === 'on' })}
          />
        </div>

        <div className="settings__row">
          <span className="settings__label">Weather</span>
          <Segmented
            label="Weather"
            value={settings.weather ? 'on' : 'off'}
            options={ON_OFF}
            onChange={(v) => update({ weather: v === 'on' })}
          />
          <span className="settings__hint">It rains for a while every day, sometimes with lightning.</span>
        </div>

        <div className="settings__row">
          <span className="settings__label">Light &amp; shadow</span>
          <Segmented
            label="Light and shadow"
            value={settings.lighting ? 'on' : 'off'}
            options={ON_OFF}
            onChange={(v) => update({ lighting: v === 'on' })}
          />
          <span className="settings__hint">Shade under trees; caves and mines are dark unless something lights them.</span>
        </div>

        <div className="settings__row">
          <span className="settings__label">Thought bubbles</span>
          <Segmented
            label="Thought bubbles"
            value={settings.thoughts ? 'on' : 'off'}
            options={ON_OFF}
            onChange={(v) => update({ thoughts: v === 'on' })}
          />
          <span className="settings__hint">Shows what humans are thinking and what they need.</span>
        </div>

        <div className="settings__row">
          <span className="settings__label">Sound</span>
          <Segmented label="Sound" value={settings.sound ? 'on' : 'off'} options={ON_OFF} onChange={(v) => update({ sound: v === 'on' })} />
          <input
            className="settings__range"
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={settings.volume}
            disabled={!settings.sound}
            aria-label="Volume"
            onChange={(e) => update({ volume: Number(e.target.value) })}
          />
        </div>
      </div>
    </Panel>
  )
}
