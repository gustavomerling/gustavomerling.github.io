import { Sun, SunMoon } from 'lucide-react'
import { EMPTY } from '../elements/registry.ts'
import { Button } from '../ui/Button.tsx'
import type { Sandbox } from '../engine/Sandbox.ts'
import { ElementPalette } from './ElementPalette.tsx'
import { SceneControls } from './SceneControls.tsx'
import { BrushControls, PlaybackControls } from './SimControls.tsx'

interface SidebarProps {
  tool: number
  onTool: (tool: number) => void
  brush: number
  onBrush: (index: number) => void
  paused: boolean
  onTogglePause: () => void
  onStep: () => void
  speed: number
  onSpeed: (index: number) => void
  onClear: () => void
  dayCycle: boolean
  onDayCycle: (on: boolean) => void
  getSandbox: () => Sandbox | null
}

/** Left-hand panel: simulation controls, brush, element families and scene save/load. */
export function Sidebar({ tool, onTool, brush, onBrush, dayCycle, onDayCycle, getSandbox, ...playback }: SidebarProps) {
  return (
    <aside className="sidebar" aria-label="Tools and elements">
      <section className="sidebar__section">
        <h2 className="sidebar__label">Simulation</h2>
        <PlaybackControls {...playback} />
        <Button
          variant="ghost"
          size="sm"
          icon={dayCycle ? SunMoon : Sun}
          className={dayCycle ? 'btn--active' : ''}
          aria-pressed={dayCycle}
          title="Plants only grow by day and birds sleep at night. Off = endless day."
          onClick={() => onDayCycle(!dayCycle)}
        >
          Day/night cycle {dayCycle ? 'on' : 'off'}
        </Button>
      </section>

      <section className="sidebar__section">
        <h2 className="sidebar__label">Brush</h2>
        <BrushControls brush={brush} onBrush={onBrush} erasing={tool === EMPTY} onEraser={() => onTool(EMPTY)} />
      </section>

      <section className="sidebar__section">
        <h2 className="sidebar__label">Elements</h2>
        <ElementPalette tool={tool} onSelect={onTool} />
      </section>

      <section className="sidebar__section">
        <h2 className="sidebar__label">Scene</h2>
        <SceneControls getSandbox={getSandbox} />
      </section>
    </aside>
  )
}
