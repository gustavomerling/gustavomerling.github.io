import type { ThoughtBubble } from '../engine/Sandbox.ts'

interface ThoughtBubblesProps {
  bubbles: readonly ThoughtBubble[]
  /** Grid size, to place bubbles over their cells. */
  gridWidth: number
  gridHeight: number
}

/** Rows above the thinking cell where the bubble's tail points (a human's head top). */
const HEAD_ROWS = 2
/** Bubbles whose thinkers stand closer than this (cells) would overlap: stack them. */
const CROWDED_X = 14
const CROWDED_Y = 8

/** Stacking level per bubble: neighbours to its left get stacked one above the other. */
function stackLevels(bubbles: readonly ThoughtBubble[]): number[] {
  const order = bubbles.map((_, i) => i).sort((a, b) => bubbles[a].x - bubbles[b].x || bubbles[a].key - bubbles[b].key)
  const levels = new Array<number>(bubbles.length).fill(0)
  order.forEach((i, n) => {
    const taken = new Set<number>()
    for (let m = 0; m < n; m++) {
      const j = order[m]
      if (Math.abs(bubbles[i].x - bubbles[j].x) < CROWDED_X && Math.abs(bubbles[i].y - bubbles[j].y) < CROWDED_Y) taken.add(levels[j])
    }
    while (taken.has(levels[i])) levels[i]++
  })
  return levels
}

/** Comic-style thought bubbles floating over the cells that think (humans). */
export function ThoughtBubbles({ bubbles, gridWidth, gridHeight }: ThoughtBubblesProps) {
  const levels = stackLevels(bubbles)
  return (
    <div className="thoughts" aria-live="polite">
      {bubbles.map(({ key, x, y, icon: Icon, text, hint, name }, index) => {
        // Slide the bubble sideways near the edges so it never leaves the canvas.
        const along = Math.min(1, Math.max(0, x / gridWidth))
        return (
          <div
            key={key}
            className={`thought${hint ? ' thought--need' : ''}${levels[index] > 0 ? ' thought--stacked' : ''}`}
            style={{
              left: `${((x + 0.5) / gridWidth) * 100}%`,
              top: `${((y - HEAD_ROWS) / gridHeight) * 100}%`,
              ['--along' as string]: along,
              ['--stack' as string]: levels[index],
            }}
          >
            <div className="thought__cloud">
              <Icon size={14} aria-hidden="true" className="thought__icon" />
              <span className="thought__text">
                {name && <span className="thought__name">{name}</span>}
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
