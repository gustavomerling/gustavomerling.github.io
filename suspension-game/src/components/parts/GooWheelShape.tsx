import type { WheelDef } from '../../game/catalog/wheels'
import { smoothClosedPath } from '../../game/geometry'
import type { Pose, Vec } from '../../game/types'
import { poseTransform } from './transform'

/** Pneu gosma: contorno deformável (coordenadas do mundo) + cubo girando. */
export function GooWheelShape({ def, outline, hub }: { def: WheelDef; outline: Vec[]; hub: Pose }) {
  const hubR = def.radius * (def.soft?.hubRatio ?? 0.4)
  const d = smoothClosedPath(outline)
  return (
    <g>
      <path d={d} fill={def.tire} fillOpacity={0.88} stroke={def.rim} strokeWidth={0.04} strokeLinejoin="round" />
      <path d={d} fill="none" stroke="#ffffff50" strokeWidth={0.03} transform="translate(-0.03 -0.03)" />
      <g transform={poseTransform(hub)}>
        <circle r={hubR} fill={def.rim} />
        <line x1={-hubR} x2={hubR} stroke="#0005" strokeWidth={0.04} />
        <line y1={-hubR} y2={hubR} stroke="#0005" strokeWidth={0.04} />
        <circle cx={hubR * 0.35} cy={-hubR * 0.35} r={hubR * 0.2} fill="#ffffff66" />
      </g>
    </g>
  )
}
