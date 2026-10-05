import { AXLES_BY_ID } from '../../game/catalog/axles'
import { BLOCKS_BY_ID } from '../../game/catalog/blocks'
import { FLAGS_BY_ID } from '../../game/catalog/flags'
import { getChassis } from '../../game/catalog/chassis'
import { SUSPENSIONS_BY_ID } from '../../game/catalog/suspensions'
import { WHEELS_BY_ID } from '../../game/catalog/wheels'
import { deg } from '../../game/geometry'
import type { CarDesign, CarPoses, Part } from '../../game/types'
import { AxleShape } from './AxleShape'
import { BlockShape } from './BlockShape'
import { CargoShape } from './CargoShape'
import { ChassisShape } from './ChassisShape'
import { FlagShape } from './FlagShape'
import { GooWheelShape } from './GooWheelShape'
import { SpringShape } from './SpringShape'
import { poseTransform } from './transform'
import { WheelShape } from './WheelShape'

interface Props {
  design: CarDesign
  poses: CarPoses
  /** Só no editor: permite clicar/arrastar peças. */
  onPartPointerDown?: (part: Part, e: React.PointerEvent) => void
  selectedId?: string | null
  hiddenIds?: string[]
}

/** Desenha o carro inteiro. Usado tanto na garagem (poses estáticas) quanto na pista (poses da física). */
export function CarView({ design, poses, onPartPointerDown, selectedId, hiddenIds }: Props) {
  const chassis = getChassis(design)
  const visible = design.parts.filter((p) => !hiddenIds?.includes(p.id))
  const of = (kind: Part['kind']) => visible.filter((p) => p.kind === kind)

  const wrap = (p: Part, child: React.ReactNode, transform?: string) => (
    <g
      key={p.id}
      transform={transform}
      onPointerDown={onPartPointerDown && ((e) => onPartPointerDown(p, e))}
      className={onPartPointerDown ? (selectedId === p.id ? 'part selected' : 'part') : undefined}
    >
      {child}
    </g>
  )

  return (
    <g>
      {/* bandeiras atrás de tudo: a base some atrás da lataria */}
      {of('flag').map((p) =>
        wrap(p, <FlagShape def={FLAGS_BY_ID[p.typeId]} state={poses.flags[p.id]} />, poseTransform(poses.parts[p.id] ?? { x: p.x, y: p.y, angle: p.angle ?? 0 })),
      )}
      {chassis.cargo?.map((c, i) => (
        <g key={i} transform={poseTransform(poses.cargo[i] ?? { x: c.x, y: c.y, angle: 0 })}>
          <CargoShape spec={c} />
        </g>
      ))}
      <g transform={poseTransform(poses.chassis)}>
        <ChassisShape def={chassis} />
        {of('block').map((p) =>
          wrap(p, <BlockShape def={BLOCKS_BY_ID[p.typeId]} />, `translate(${p.x} ${p.y}) rotate(${deg(p.angle ?? 0)})`),
        )}
      </g>
      {of('axle').map((p) => wrap(p, <AxleShape def={AXLES_BY_ID[p.typeId]} />, poseTransform(poses.parts[p.id])))}
      {of('wheel').map((p) => {
        const def = WHEELS_BY_ID[p.typeId]
        const blob = poses.blobs[p.id]
        if (def.soft && blob) return wrap(p, <GooWheelShape def={def} outline={blob} hub={poses.parts[p.id]} />)
        return wrap(
          p,
          <>
            <WheelShape def={def} />
            {p.driven === false && <circle r={def.radius * 0.14} fill="#7cf" />}
          </>,
          poseTransform(poses.parts[p.id]),
        )
      })}
      {/* molas por cima, para a suspensão ficar visível */}
      {of('suspension').map((p) => {
        const s = poses.springs[p.id]
        return wrap(p, s && <SpringShape def={SUSPENSIONS_BY_ID[p.typeId]} top={s.top} bottom={s.bottom} />)
      })}
    </g>
  )
}
