import { HEAD_RADIUS } from '../../game/catalog/chassis'
import type { Vec } from '../../game/types'

/** Piloto: tronco + capacete com viseira. `head` = centro do capacete. */
export function DriverShape({ head, color = '#ff6b3d' }: { head: Vec; color?: string }) {
  const r = HEAD_RADIUS
  return (
    <g transform={`translate(${head.x} ${head.y})`}>
      <rect x={-r * 0.8} y={r * 0.7} width={r * 1.6} height={r * 2.6} rx={r * 0.5} fill="#2d3e50" />
      <circle r={r} fill="#fafafa" stroke="#222" strokeWidth={0.02} />
      <path d={`M${-r} ${-r * 0.05}A${r} ${r} 0 0 1 ${r} ${-r * 0.05}`} fill="none" stroke={color} strokeWidth={r * 0.35} />
      <path d={`M${r * 0.05} ${-r * 0.35}L${r * 0.95} ${-r * 0.2}L${r * 0.9} ${r * 0.35}L${r * 0.05} ${r * 0.3}Z`} fill="#223" />
      <circle cx={r * 0.6} cy={-r * 0.1} r={r * 0.12} fill="#9fd8ff" />
    </g>
  )
}
