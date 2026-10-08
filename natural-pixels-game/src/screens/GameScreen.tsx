import { ArrowLeft, Moon, Settings, Sun, Thermometer } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { Navigate } from '../app/screens.ts'
import { SoundEngine } from '../audio/SoundEngine.ts'
import { GRAIN_CELLS, useSettings } from '../app/settings.ts'
import { EMPTY, PALETTE, elementIndex } from '../elements/registry.ts'
import { daylightAt } from '../engine/daylight.ts'
import type { SandboxStats } from '../engine/Sandbox.ts'
import { SandboxView, type SandboxHandle } from '../game/SandboxView.tsx'
import { BRUSH_SIZES, SPEEDS } from '../game/settings.ts'
import { SettingsPanel } from '../game/SettingsPanel.tsx'
import { PeopleBar } from '../game/PeopleBar.tsx'
import { Sidebar } from '../game/Sidebar.tsx'
import { Button } from '../ui/Button.tsx'

/** Elements whose numbers drive the ambient sound. */
const SOUND_SOURCES = {
  fire: elementIndex('fire'),
  steam: elementIndex('steam'),
  cloud: elementIndex('cloud'),
  birds: elementIndex('bird'),
  bees: elementIndex('bee'),
  grass: elementIndex('grass'),
}

/** Time of day (0..1) as a 24h clock, e.g. 0.5 -> "12:00". */
function clock(timeOfDay: number): string {
  const minutes = Math.floor(timeOfDay * 24 * 60)
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`
}

export function GameScreen({ onNavigate }: { onNavigate: Navigate }) {
  const { settings, update } = useSettings()
  const sandboxRef = useRef<SandboxHandle>(null)
  const [tool, setTool] = useState(() => elementIndex('sand'))
  const [brush, setBrush] = useState(3)
  const [paused, setPaused] = useState(false)
  const [speed, setSpeed] = useState(1)
  const [stats, setStats] = useState<SandboxStats>({
    fps: 0,
    particles: 0,
    hover: null,
    timeOfDay: 0.32,
    counts: new Uint32Array(0),
    people: [],
  })
  const isDay = stats.timeOfDay >= 0.25 && stats.timeOfDay < 0.75
  const [settingsOpen, setSettingsOpen] = useState(false)
  const closeSettings = useCallback(() => setSettingsOpen(false), [])

  // Ambient sound: starts on the first click/key (browser rule), follows the settings,
  // and listens to the world through the stats.
  const soundRef = useRef<SoundEngine | null>(null)
  const pausedRef = useRef(paused)
  useEffect(() => {
    pausedRef.current = paused
  }, [paused])

  useEffect(() => {
    const sound = new SoundEngine()
    soundRef.current = sound
    const unlock = () => sound.unlock()
    window.addEventListener('pointerdown', unlock)
    window.addEventListener('keydown', unlock)
    return () => {
      window.removeEventListener('pointerdown', unlock)
      window.removeEventListener('keydown', unlock)
      sound.dispose()
      soundRef.current = null
    }
  }, [])

  useEffect(() => {
    soundRef.current?.setVolume(settings.sound, settings.volume)
  }, [settings.sound, settings.volume])

  const handleStats = useCallback((next: SandboxStats) => {
    setStats(next)
    const { counts } = next
    const level = (index: number) => (pausedRef.current ? 0 : counts[index])
    soundRef.current?.update({
      fire: level(SOUND_SOURCES.fire),
      steam: level(SOUND_SOURCES.steam),
      cloud: level(SOUND_SOURCES.cloud),
      birds: level(SOUND_SOURCES.birds),
      bees: level(SOUND_SOURCES.bees),
      grass: level(SOUND_SOURCES.grass),
      light: daylightAt(next.timeOfDay),
    })
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // The settings panel handles its own keys (Escape closes it).
      if (settingsOpen || e.ctrlKey || e.metaKey || e.altKey) return
      // Keys 1–9 pick the first nine elements, 0 the tenth.
      if (/^[0-9]$/.test(e.key)) {
        const slot = e.key === '0' ? 9 : Number(e.key) - 1
        if (slot < PALETTE.length) setTool(elementIndex(PALETTE[slot].id))
        return
      }
      switch (e.key) {
        case 'Escape':
          onNavigate('menu')
          break
        case ' ':
          // Keep Space from also "clicking" whichever toolbar button has focus.
          e.preventDefault()
          if (document.activeElement instanceof HTMLElement) document.activeElement.blur()
          setPaused((p) => !p)
          break
        case 'n':
        case 'N':
          sandboxRef.current?.step()
          break
        case 'e':
        case 'E':
          setTool(EMPTY)
          break
        case '[':
          setBrush((b) => Math.max(0, b - 1))
          break
        case ']':
          setBrush((b) => Math.min(BRUSH_SIZES.length - 1, b + 1))
          break
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onNavigate, settingsOpen])

  return (
    <main className="screen game">
      <header className="game__bar">
        <Button variant="ghost" size="sm" icon={ArrowLeft} onClick={() => onNavigate('menu')}>
          Menu
        </Button>
        <span className="game__title">Natural Pixels</span>
        <PeopleBar people={stats.people} />
        <span className="game__stats">
          {stats.hover && (
            <span className="game__probe game__probe--hover" title={stats.hover.detail}>
              <Thermometer size={14} aria-hidden />
              {stats.hover.name} · {Math.round(stats.hover.temp)} °C
              {stats.hover.detail && <span className="game__detail">{stats.hover.detail}</span>}
            </span>
          )}
          <span className="game__probe" title={settings.dayCycle ? 'Time of day' : 'Day/night cycle off'}>
            {isDay ? <Sun size={14} aria-hidden /> : <Moon size={14} aria-hidden />}
            {clock(stats.timeOfDay)}
          </span>
          {stats.particles.toLocaleString('en-US')} particles · {stats.fps} fps
        </span>
        <Button variant="ghost" size="sm" icon={Settings} aria-label="Settings" onClick={() => setSettingsOpen(true)} />
      </header>

      <div className="game__body">
        <Sidebar
          tool={tool}
          onTool={setTool}
          brush={brush}
          onBrush={setBrush}
          paused={paused}
          onTogglePause={() => setPaused((p) => !p)}
          onStep={() => sandboxRef.current?.step()}
          speed={speed}
          onSpeed={setSpeed}
          onClear={() => sandboxRef.current?.clear()}
          dayCycle={settings.dayCycle}
          onDayCycle={(dayCycle) => update({ dayCycle })}
          getSandbox={() => sandboxRef.current?.sandbox ?? null}
        />

        <SandboxView
          ref={sandboxRef}
          tool={tool}
          brushRadius={BRUSH_SIZES[brush]}
          paused={paused}
          speed={SPEEDS[speed]}
          dayCycle={settings.dayCycle}
          weather={settings.weather}
          cellTarget={GRAIN_CELLS[settings.grain]}
          renderMode={settings.graphics}
          showThoughts={settings.thoughts}
          onStats={handleStats}
        />
      </div>

      {settingsOpen && <SettingsPanel inGame onClose={closeSettings} />}
    </main>
  )
}
