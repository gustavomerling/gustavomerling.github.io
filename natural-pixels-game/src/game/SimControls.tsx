import { Circle, Eraser, Gauge, Minus, Pause, Play, Plus, StepForward, Trash } from 'lucide-react'
import { Button } from '../ui/Button.tsx'
import { BRUSH_SIZES, SPEEDS } from './settings.ts'

interface PlaybackControlsProps {
  paused: boolean
  onTogglePause: () => void
  onStep: () => void
  speed: number
  onSpeed: (index: number) => void
  onClear: () => void
}

/** Play/pause, single step, speed and clear. */
export function PlaybackControls({ paused, onTogglePause, onStep, speed, onSpeed, onClear }: PlaybackControlsProps) {
  return (
    <div className="control-group">
      <Button
        variant={paused ? 'primary' : 'ghost'}
        size="sm"
        icon={paused ? Play : Pause}
        aria-label={paused ? 'Play (Space)' : 'Pause (Space)'}
        onClick={onTogglePause}
      />
      <Button variant="ghost" size="sm" icon={StepForward} aria-label="Step one tick (N)" disabled={!paused} onClick={onStep} />
      <Button variant="ghost" size="sm" icon={Gauge} aria-label="Simulation speed" onClick={() => onSpeed((speed + 1) % SPEEDS.length)}>
        {SPEEDS[speed]}×
      </Button>
      <Button variant="ghost" size="sm" icon={Trash} aria-label="Clear everything" onClick={onClear} />
    </div>
  )
}

interface BrushControlsProps {
  brush: number
  onBrush: (index: number) => void
  erasing: boolean
  onEraser: () => void
}

/** Brush size and the eraser tool. */
export function BrushControls({ brush, onBrush, erasing, onEraser }: BrushControlsProps) {
  return (
    <div className="control-group">
      <div className="control-group" title="Brush size ([ and ])">
        <Button variant="ghost" size="sm" icon={Minus} aria-label="Smaller brush" disabled={brush === 0} onClick={() => onBrush(brush - 1)} />
        <span className="control-value">
          <Circle size={8 + brush * 1.5} strokeWidth={2.4} aria-hidden />
        </span>
        <Button
          variant="ghost"
          size="sm"
          icon={Plus}
          aria-label="Bigger brush"
          disabled={brush === BRUSH_SIZES.length - 1}
          onClick={() => onBrush(brush + 1)}
        />
      </div>
      <Button
        variant="ghost"
        size="sm"
        icon={Eraser}
        className={erasing ? 'btn--active' : ''}
        aria-pressed={erasing}
        aria-label="Eraser"
        title="Eraser: remove anything. Right-click also erases. (E)"
        onClick={onEraser}
      />
    </div>
  )
}
