import { useId } from 'react'

interface LogoMarkProps {
  size?: number
  className?: string
}

/** The game's stamp: a pixel-art sprout under a sun, on a little patch of soil (16×16 grid). */
export function LogoMark({ size = 32, className = '' }: LogoMarkProps) {
  // Each mark clips its own corners: ids must stay unique when several are on screen.
  const clip = useId()
  return (
    <svg
      className={`logo-mark ${className}`}
      width={size}
      height={size}
      viewBox="0 0 16 16"
      shapeRendering="crispEdges"
      aria-hidden
    >
      <defs>
        <clipPath id={clip}>
          <rect width="16" height="16" rx="3.5" />
        </clipPath>
      </defs>
      <g clipPath={`url(#${clip})`}>
        <rect width="16" height="16" fill="#cfe5ec" />
        {/* Sun */}
        <rect x="11" y="2" width="3" height="3" fill="#f6d77e" />
        <rect x="12" y="1" width="1" height="5" fill="#f6d77e" />
        <rect x="10" y="3" width="5" height="1" fill="#f6d77e" />
        {/* Cloud */}
        <rect x="2" y="4" width="4" height="1" fill="#fffaf0" />
        <rect x="3" y="3" width="2" height="1" fill="#fffaf0" />
        {/* Hill, grass and soil */}
        <rect x="10" y="10" width="6" height="1" fill="#b5d3a3" />
        <rect x="0" y="11" width="16" height="1" fill="#9cc48a" />
        <rect x="0" y="12" width="16" height="4" fill="#cfa47c" />
        <rect x="3" y="13" width="1" height="1" fill="#b0845e" />
        <rect x="11" y="14" width="1" height="1" fill="#b0845e" />
        <rect x="7" y="15" width="1" height="1" fill="#b0845e" />
        {/* Sprout */}
        <rect x="7" y="6" width="1" height="5" fill="#6f9e62" />
        <rect x="5" y="6" width="2" height="1" fill="#8dc07a" />
        <rect x="4" y="5" width="2" height="1" fill="#8dc07a" />
        <rect x="8" y="5" width="2" height="1" fill="#8dc07a" />
        <rect x="9" y="4" width="2" height="1" fill="#8dc07a" />
      </g>
    </svg>
  )
}

/** Decorative pastel landscape for the title screens: a soft sun and rolling paper hills. */
export function Scenery() {
  return (
    <div className="scenery" aria-hidden>
      <span className="scenery__sun" />
      <svg className="scenery__hills" viewBox="0 0 1200 240" preserveAspectRatio="none">
        <path d="M0 120 C 180 60 340 70 520 120 S 860 170 1020 100 S 1160 70 1200 90 V240 H0Z" fill="#dbe8cf" />
        <path d="M0 170 C 160 120 300 130 460 165 S 760 200 920 150 S 1120 120 1200 150 V240 H0Z" fill="#c4dbb4" />
        <path d="M0 210 C 220 180 420 190 620 208 S 980 220 1200 196 V240 H0Z" fill="#e6cfae" />
      </svg>
    </div>
  )
}
