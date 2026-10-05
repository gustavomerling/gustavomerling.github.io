import type { Pose } from '../../game/types'

export const poseTransform = (p: Pose) => `translate(${p.x} ${p.y}) rotate(${(p.angle * 180) / Math.PI})`
