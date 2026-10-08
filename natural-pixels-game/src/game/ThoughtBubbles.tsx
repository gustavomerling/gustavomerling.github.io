import type { ThoughtBubble } from '../engine/Sandbox.ts'

interface ThoughtBubblesProps {
  bubbles: readonly ThoughtBubble[]
  /** Grid size, to place bubbles over their cells. */
  gridWidth: number
  gridHeight: number
}

/** Rows above the thinking cell where the bubble's tail points (a human's head top). */
const HEAD_ROWS = 2

/** Comic-style thought bubbles floating over the cells that think (humans). */
export function ThoughtBubbles({ bubbles, gridWidth, gridHeight }: ThoughtBubblesProps) {
  return (
    <div className="thoughts" aria-live="polite">
      {bubbles.map(({ key, x, y, icon: Icon, text, hint }) => {
        // Slide the bubble sideways near the edges so it never leaves the canvas.
        const along = Math.min(1, Math.max(0, x / gridWidth))
        return (
          <div
            key={key}
            className={`thought${hint ? ' thought--need' : ''}`}
            style={{
              left: `${((x + 0.5) / gridWidth) * 100}%`,
              top: `${((y - HEAD_ROWS) / gridHeight) * 100}%`,
              ['--along' as string]: along,
            }}
          >
            <div className="thought__cloud">
              <Icon size={14} aria-hidden="true" className="thought__icon" />
              <span className="thought__text">
                {text}
                {hint && <span className="thought__hint">{hint}</span>}
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}
