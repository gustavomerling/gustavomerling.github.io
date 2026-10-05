import { useId } from 'react'
import type { ChassisDef } from '../../game/catalog/chassis'
import type { Vec } from '../../game/types'
import { DriverShape } from './DriverShape'

const toPoints = (pts: Vec[]) => pts.map((v) => `${v.x},${v.y}`).join(' ')

/** Chassi + piloto. O piloto fica atrás da lataria e aparece pelas janelas. */
export function ChassisShape({ def, driver = true }: { def: ChassisDef; driver?: boolean }) {
  const id = useId().replace(/:/g, '')
  return (
    <g>
      {driver && <DriverShape head={def.head} />}
      <polygon points={toPoints(def.outline)} fill={def.color} stroke="#0008" strokeWidth={0.04} strokeLinejoin="round" />
      {def.decor?.map((d, i) =>
        d.window ? (
          <g key={i}>
            <clipPath id={`win${id}${i}`}>
              <polygon points={toPoints(d.points)} />
            </clipPath>
            <polygon points={toPoints(d.points)} fill="#cfeaff" />
            {driver && (
              <g clipPath={`url(#win${id}${i})`}>
                <DriverShape head={def.head} />
              </g>
            )}
            <polygon points={toPoints(d.points)} fill={d.color} stroke="#0005" strokeWidth={0.02} />
          </g>
        ) : (
          <polygon key={i} points={toPoints(d.points)} fill={d.color} />
        ),
      )}
    </g>
  )
}
