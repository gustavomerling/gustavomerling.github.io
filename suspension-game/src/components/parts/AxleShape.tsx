import type { AxleDef } from '../../game/catalog/axles'

/** Barra do eixo com pivô no centro e marcas nas pontas (onde encaixam as rodas). */
export function AxleShape({ def }: { def: AxleDef }) {
  const h = def.length / 2
  const t = def.thickness
  return (
    <g>
      <rect x={-h - t / 2} y={-t / 2} width={def.length + t} height={t} rx={t / 2} fill={def.color} />
      <circle r={t * 0.7} fill="#999" stroke="#333" strokeWidth={0.02} />
      <circle cx={-h} r={t * 0.35} fill="#222" />
      <circle cx={h} r={t * 0.35} fill="#222" />
    </g>
  )
}
