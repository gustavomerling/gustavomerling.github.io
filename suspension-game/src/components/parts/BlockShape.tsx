import { wedgeVertices, type BlockDef } from '../../game/catalog/blocks'

export function BlockShape({ def }: { def: BlockDef }) {
  switch (def.shape) {
    case 'circle':
      return (
        <g>
          <circle r={def.w / 2} fill={def.color} stroke="#0006" strokeWidth={0.03} />
          <circle cx={-def.w * 0.12} cy={-def.w * 0.12} r={def.w * 0.14} fill="#ffffff55" />
        </g>
      )
    case 'wedge':
      return (
        <polygon
          points={wedgeVertices(def).map((v) => `${v.x},${v.y}`).join(' ')}
          fill={def.color}
          stroke="#0006"
          strokeWidth={0.03}
          strokeLinejoin="round"
        />
      )
    default:
      return (
        <rect x={-def.w / 2} y={-def.h / 2} width={def.w} height={def.h} rx={0.03} fill={def.color} stroke="#0006" strokeWidth={0.03} />
      )
  }
}
