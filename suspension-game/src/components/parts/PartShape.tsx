import { AXLES_BY_ID } from '../../game/catalog/axles'
import { BLOCKS_BY_ID } from '../../game/catalog/blocks'
import { FLAGS_BY_ID } from '../../game/catalog/flags'
import { SUSPENSIONS_BY_ID } from '../../game/catalog/suspensions'
import { WHEELS_BY_ID } from '../../game/catalog/wheels'
import { restBlob } from '../../game/car'
import { deg, rotate } from '../../game/geometry'
import type { PartKind } from '../../game/types'
import { AxleShape } from './AxleShape'
import { BlockShape } from './BlockShape'
import { FlagShape } from './FlagShape'
import { GooWheelShape } from './GooWheelShape'
import { SpringShape } from './SpringShape'
import { WheelShape } from './WheelShape'

/** Desenha qualquer peça isolada em (0,0). Usado na paleta e no "fantasma" do arraste. */
export function PartShape({ kind, typeId, angle = 0 }: { kind: PartKind; typeId: string; angle?: number }) {
  switch (kind) {
    case 'wheel': {
      const def = WHEELS_BY_ID[typeId]
      if (def.soft) {
        const hub = { x: 0, y: 0, angle: 0 }
        return <GooWheelShape def={def} outline={restBlob(def, hub)} hub={hub} />
      }
      return <WheelShape def={def} />
    }
    case 'axle':
      return (
        <g transform={`rotate(${deg(angle)})`}>
          <AxleShape def={AXLES_BY_ID[typeId]} />
        </g>
      )
    case 'block':
      return (
        <g transform={`rotate(${deg(angle)})`}>
          <BlockShape def={BLOCKS_BY_ID[typeId]} />
        </g>
      )
    case 'flag':
      return (
        <g transform={`rotate(${deg(angle)})`}>
          <FlagShape def={FLAGS_BY_ID[typeId]} />
        </g>
      )
    case 'suspension': {
      const def = SUSPENSIONS_BY_ID[typeId]
      return <SpringShape def={def} top={rotate({ x: 0, y: -def.length }, angle)} bottom={{ x: 0, y: 0 }} />
    }
  }
}
