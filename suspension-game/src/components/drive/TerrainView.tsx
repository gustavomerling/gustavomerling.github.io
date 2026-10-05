import { memo } from 'react'
import type { Terrain } from '../../game/terrain/generate'
import { MATERIALS, type MaterialDef } from '../../game/terrain/materials'

const DEPTH = 60 // até onde o "chão" é pintado para baixo
const FADE = 1.5 // metros de mistura de cada lado da emenda entre dois materiais

/**
 * Paradas de um degradê horizontal: cada trecho tem a cor do seu material e, nas emendas,
 * a cor passa suavemente para a do próximo trecho (fade de até FADE m para cada lado).
 */
function gradientStops(terrain: Terrain, color: (m: MaterialDef) => string, x0: number, x1: number) {
  const segs = terrain.segments
  const span = x1 - x0
  const stops: { offset: number; color: string }[] = []
  const at = (x: number, c: string) => stops.push({ offset: Math.min(1, Math.max(0, (x - x0) / span)), color: c })
  const range = (i: number) => {
    const xs = segs[i].points.map((p) => p.x)
    return [Math.min(...xs), Math.max(...xs)]
  }
  at(x0, color(MATERIALS[segs[0].material]))
  for (let i = 0; i < segs.length - 1; i++) {
    const a = MATERIALS[segs[i].material]
    const b = MATERIALS[segs[i + 1].material]
    if (a === b) continue
    const [aStart, edge] = range(i)
    const [, bEnd] = range(i + 1)
    const f = Math.min(FADE, (edge - aStart) / 2, (bEnd - edge) / 2)
    at(edge - f, color(a))
    at(edge + f, color(b))
  }
  at(x1, color(MATERIALS[segs[segs.length - 1].material]))
  // offsets precisam ser crescentes
  for (let i = 1; i < stops.length; i++) stops[i].offset = Math.max(stops[i].offset, stops[i - 1].offset)
  return stops
}

/** Terreno estático: desenhado uma vez só (memo). Um único contorno com degradê entre materiais. */
export const TerrainView = memo(function TerrainView({ terrain }: { terrain: Terrain }) {
  const last = terrain.segments[terrain.segments.length - 1].points[0]
  const all = terrain.segments.flatMap((s) => s.points)
  const x0 = Math.min(...all.map((p) => p.x))
  const x1 = Math.max(...all.map((p) => p.x))
  const line = all.map((p, j) => `${j ? 'L' : 'M'}${p.x} ${p.y}`).join('')
  const fill = `${line}L${all[all.length - 1].x} ${DEPTH}L${all[0].x} ${DEPTH}Z`
  const id = `t${terrain.seed}${terrain.difficulty}`
  const grad = (name: string, color: (m: MaterialDef) => string) => (
    <linearGradient id={`${id}${name}`} gradientUnits="userSpaceOnUse" x1={x0} x2={x1} y1={0} y2={0}>
      {gradientStops(terrain, color, x0, x1).map((s, i) => (
        <stop key={i} offset={s.offset} stopColor={s.color} />
      ))}
    </linearGradient>
  )
  return (
    <g>
      <defs>
        {grad('fill', (m) => m.fill)}
        {grad('edge', (m) => m.edge)}
        <clipPath id={`${id}clip`}>
          <path d={fill} />
        </clipPath>
      </defs>
      <path d={fill} fill={`url(#${id}fill)`} />
      {/* faixa mais escura logo abaixo da superfície: dá profundidade ao solo */}
      <g clipPath={`url(#${id}clip)`}>
        <path d={line} fill="none" stroke="#00000022" strokeWidth={1.6} strokeLinejoin="round" transform="translate(0 0.8)" />
      </g>
      <path d={line} fill="none" stroke={`url(#${id}edge)`} strokeWidth={0.14} strokeLinejoin="round" strokeLinecap="round" />
      {/* placas de distância */}
      {Array.from({ length: Math.floor(terrain.finishX / 50) }, (_, i) => (i + 1) * 50).map((x) => (
        <text key={x} x={x} y={-7} fontSize={0.9} fontWeight={700} fill="#ffffff99" textAnchor="middle">
          {x} m
        </text>
      ))}
      <FinishLine x={terrain.finishX} y={last.y} />
    </g>
  )
})

function FinishLine({ x, y }: { x: number; y: number }) {
  const s = 0.35
  return (
    <g>
      <line x1={x} x2={x} y1={y} y2={y - 5} stroke="#333" strokeWidth={0.1} />
      {Array.from({ length: 12 }, (_, i) => (
        <rect key={i} x={x + (i % 4) * s} y={y - 5 + Math.floor(i / 4) * s} width={s} height={s} fill={(i + Math.floor(i / 4)) % 2 ? '#111' : '#fff'} />
      ))}
      <text x={x + 0.7} y={y - 5.4} fontSize={0.6} fontWeight={800} fill="#222" textAnchor="middle">
        CHEGADA
      </text>
    </g>
  )
}
