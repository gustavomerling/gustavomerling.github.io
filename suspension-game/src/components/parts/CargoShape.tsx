import type { CargoSpec } from '../../game/catalog/chassis'

export function CargoShape({ spec }: { spec: CargoSpec }) {
  const s = spec.size
  switch (spec.kind) {
    case 'crate':
      return (
        <g>
          <rect x={-s / 2} y={-s / 2} width={s} height={s} fill="#d79b4f" stroke="#7a4f22" strokeWidth={0.03} />
          <rect x={-s / 2 + 0.05} y={-s / 2 + 0.05} width={s - 0.1} height={s - 0.1} fill="none" stroke="#7a4f22" strokeWidth={0.02} />
        </g>
      )
    case 'barrel':
      return (
        <g>
          <rect x={-s * 0.75} y={-s} width={s * 1.5} height={s * 2} rx={0.06} fill="#c0392b" stroke="#6d1f17" strokeWidth={0.03} />
          <line x1={-s * 0.75} x2={s * 0.75} y1={-s * 0.4} y2={-s * 0.4} stroke="#6d1f17" strokeWidth={0.03} />
          <line x1={-s * 0.75} x2={s * 0.75} y1={s * 0.4} y2={s * 0.4} stroke="#6d1f17" strokeWidth={0.03} />
        </g>
      )
    case 'ball':
      return (
        <g>
          <circle r={s} fill="#f5f5f5" stroke="#333" strokeWidth={0.02} />
          <path d={`M${-s} 0A${s} ${s} 0 0 0 ${s} 0Z`} fill="#e74c3c" />
        </g>
      )
  }
}
