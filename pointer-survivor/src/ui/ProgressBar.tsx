interface Props {
  value: number
  max: number
  color?: string
  /** Solid fill instead of the classic segmented blocks. */
  smooth?: boolean
  width?: number | string
  label?: string
}

export function ProgressBar({ value, max, color, smooth, width, label }: Props) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0
  return (
    <div
      className={`progress ${smooth ? 'smooth' : ''}`}
      style={{ width }}
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={Math.round(value)}
    >
      <div className="progress-fill" style={{ width: `${pct}%`, ['--fill' as string]: color }} />
    </div>
  )
}
