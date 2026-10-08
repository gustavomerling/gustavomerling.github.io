import { ArrowLeft, Moon, Sun, Thermometer } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { Navigate } from '../app/screens.ts'
import { GRAIN_CELLS, useSettings } from '../app/settings.ts'
import { EMPTY, PALETTE, elementIndex } from '../elements/registry.ts'
import type { SandboxStats } from '../engine/Sandbox.ts'
import { SandboxView, type SandboxHandle } from '../game/SandboxView.tsx'
import { BRUSH_SIZES, SPEEDS } from '../game/settings.ts'
import { Sidebar } from '../game/Sidebar.tsx'
import { Button } from '../ui/Button.tsx'

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
  })
  const isDay = stats.timeOfDay >= 0.25 && stats.timeOfDay < 0.75

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return
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
  }, [onNavigate])

  return (
    <main className="screen game">
      <header className="game__bar">
        <Button variant="ghost" size="sm" icon={ArrowLeft} onClick={() => onNavigate('menu')}>
          Menu
        </Button>
        <span className="game__title">Natural Pixels</span>
        <span className="game__stats">
          {stats.hover && (
            <span className="game__probe">
              <Thermometer size={14} aria-hidden />
              {stats.hover.name} · {Math.round(stats.hover.temp)} °C
            </span>
          )}
          <span className="game__probe" title={settings.dayCycle ? 'Time of day' : 'Day/night cycle off'}>
            {isDay ? <Sun size={14} aria-hidden /> : <Moon size={14} aria-hidden />}
            {clock(stats.timeOfDay)}
          </span>
          {stats.particles.toLocaleString('en-US')} particles · {stats.fps} fps
        </span>
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
        />

        <SandboxView
          ref={sandboxRef}
          tool={tool}
          brushRadius={BRUSH_SIZES[brush]}
          paused={paused}
          speed={SPEEDS[speed]}
          dayCycle={settings.dayCycle}
          cellTarget={GRAIN_CELLS[settings.grain]}
          renderMode={settings.graphics}
          onStats={setStats}
        />
      </div>
    </main>
  )
}
