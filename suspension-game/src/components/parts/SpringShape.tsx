import type { SuspensionDef } from '../../game/catalog/suspensions'
import type { Vec } from '../../game/types'

/** Coilover entre dois pontos (coordenadas do mundo, então estica/comprime sozinho). */
export function SpringShape({ def, top, bottom }: { def: SuspensionDef; top: Vec; bottom: Vec }) {
  const dx = bottom.x - top.x
  const dy = bottom.y - top.y
  const len = Math.hypot(dx, dy) || 0.001
  const angle = (Math.atan2(dy, dx) * 180) / Math.PI - 90
  const coils = 7
  const w = 0.1
  const pts: string[] = ['0,0', `0,${len * 0.12}`]
  for (let i = 0; i < coils; i++) {
    const y = len * (0.12 + (0.7 * (i + 0.5)) / coils)
    pts.push(`${i % 2 ? -w : w},${y}`)
  }
  pts.push(`0,${len * 0.85}`, `0,${len}`)
  return (
    <g transform={`translate(${top.x} ${top.y}) rotate(${angle})`}>
      {/* amortecedor por trás da mola */}
      <rect x={-0.035} y={len * 0.05} width={0.07} height={len * 0.55} rx={0.02} fill="#2b2f36" />
      <rect x={-0.02} y={len * 0.5} width={0.04} height={len * 0.45} fill="#9aa1ab" />
      <polyline points={pts.join(' ')} fill="none" stroke={def.color} strokeWidth={0.045} strokeLinejoin="round" strokeLinecap="round" />
      <circle r={0.06} fill="#222" stroke={def.color} strokeWidth={0.02} />
      <circle cy={len} r={0.05} fill="#222" />
    </g>
  )
}
