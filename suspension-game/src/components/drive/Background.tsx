import { memo } from 'react'
import { mulberry32 } from '../../game/terrain/generate'

const PERIOD = 1600 // px: largura de um "tile" de cada camada

/** Silhueta de montanhas que se repete a cada PERIOD px. */
function ridge(seed: number, base: number, amp: number, step: number): string {
  const rng = mulberry32(seed)
  const pts: number[] = []
  for (let x = 0; x <= PERIOD; x += step) pts.push(base - rng() * amp)
  pts[pts.length - 1] = pts[0] // emenda sem costura
  let d = `M0 2000L0 ${pts[0]}`
  pts.forEach((y, i) => (d += `L${i * step} ${y}`))
  return d + `L${PERIOD} 2000Z`
}

const LAYERS = [
  { d: ridge(7, 0, 260, 80), color: '#a9c9e2', factor: 0.08, offsetY: 0.55 },
  { d: ridge(11, 0, 180, 50), color: '#8fb5a0', factor: 0.18, offsetY: 0.68 },
  { d: ridge(23, 0, 90, 30), color: '#6f9c6a', factor: 0.35, offsetY: 0.8 },
]

const CLOUDS = Array.from({ length: 7 }, (_, i) => {
  const r = mulberry32(100 + i)
  return { x: r() * PERIOD, y: 40 + r() * 160, s: 0.6 + r() * 0.9 }
})

interface Props {
  camX: number
  camY: number
  scale: number
  width: number
  height: number
}

const Layer = memo(function Layer({ d, color }: { d: string; color: string }) {
  return (
    <>
      <path d={d} fill={color} />
      <path d={d} fill={color} transform={`translate(${PERIOD} 0)`} />
    </>
  )
})

export function Background({ camX, camY, scale, width, height }: Props) {
  const shift = (f: number) => -(((camX * scale * f) % PERIOD) + PERIOD) % PERIOD
  const tiles = Math.ceil(width / PERIOD) + 1
  return (
    <svg className="bg" width={width} height={height}>
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#5fa8e0" />
          <stop offset="1" stopColor="#d7eef8" />
        </linearGradient>
      </defs>
      <rect width={width} height={height} fill="url(#sky)" />
      <circle cx={width * 0.82} cy={height * 0.16} r={46} fill="#fff6c8" opacity={0.9} />
      {Array.from({ length: tiles }, (_, t) => (
        <g key={`c${t}`} transform={`translate(${shift(0.04) + t * PERIOD} 0)`} fill="#ffffffcc">
          {CLOUDS.map((c, i) => (
            <g key={i} transform={`translate(${c.x} ${c.y}) scale(${c.s})`}>
              <ellipse rx={60} ry={18} />
              <ellipse cx={-25} cy={-12} rx={30} ry={18} />
              <ellipse cx={20} cy={-16} rx={35} ry={22} />
            </g>
          ))}
        </g>
      ))}
      {LAYERS.map((l, i) => (
        <g key={i} transform={`translate(${shift(l.factor)} ${height * l.offsetY - camY * scale * l.factor * 0.5})`}>
          {Array.from({ length: Math.ceil(tiles / 2) + 1 }, (_, t) => (
            <g key={t} transform={`translate(${t * PERIOD * 2} 0)`}>
              <Layer d={l.d} color={l.color} />
            </g>
          ))}
        </g>
      ))}
    </svg>
  )
}
