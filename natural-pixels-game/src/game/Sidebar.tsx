import { EMPTY } from '../elements/registry.ts'
import { ElementPalette } from './ElementPalette.tsx'
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
}

/** Left-hand panel: simulation controls, brush, and the element families. */
export function Sidebar({ tool, onTool, brush, onBrush, ...playback }: SidebarProps) {
  return (
    <aside className="sidebar" aria-label="Tools and elements">
      <section className="sidebar__section">
        <h2 className="sidebar__label">Simulation</h2>
        <PlaybackControls {...playback} />
      </section>

      <section className="sidebar__section">
        <h2 className="sidebar__label">Brush</h2>
        <BrushControls brush={brush} onBrush={onBrush} erasing={tool === EMPTY} onEraser={() => onTool(EMPTY)} />
      </section>

      <section className="sidebar__section">
        <h2 className="sidebar__label">Elements</h2>
        <ElementPalette tool={tool} onSelect={onTool} />
      </section>
    </aside>
  )
}
