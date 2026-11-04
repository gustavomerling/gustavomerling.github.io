import * as THREE from 'three'
import type { Pose } from './poses'
import { JOINTS, PARTS, type JointDef, type PartDef, type PartName } from './skeleton'

/**
 * Cinemática direta do esqueleto: a partir da pélvis (posição + rotação) e
 * da rotação relativa de cada junta, calcula onde fica cada parte. Usada na
 * animação de levantar e para "apoiar" o corpo no chão.
 *
 * Convenção dos ângulos [x, y, z] (a mesma dos limites/motores do Rapier):
 * a parte imaginária do quatérnio relativo é (sen(x/2), sen(y/2), sen(z/2)).
 */

export interface PartTransform {
  pos: THREE.Vector3
  rot: THREE.Quaternion
}

export type JointRotations = Map<PartName, THREE.Quaternion>

const PART_BY_NAME = new Map(PARTS.map((p) => [p.name, p]))
/** Juntas em ordem da raiz para as pontas (pais antes dos filhos). */
const ORDERED_JOINTS: JointDef[] = (() => {
  const out: JointDef[] = []
  const visit = (name: PartName) => {
    for (const j of JOINTS.filter((j) => j.parent === name)) {
      out.push(j)
      visit(j.child)
    }
  }
  visit('pelvis')
  return out
})()

const clamp = (v: number, r?: [number, number]) => (r ? Math.min(r[1], Math.max(r[0], v)) : v)

/** Ângulos de uma junta → quatérnio relativo (respeitando os limites). */
export function jointQuat(def: JointDef, angles: [number, number, number] = [0, 0, 0]) {
  const x = Math.sin(clamp(angles[0], def.limits.x) / 2)
  const y = def.type === 'hinge' ? 0 : Math.sin(clamp(angles[1], def.limits.y) / 2)
  const z = def.type === 'hinge' ? 0 : Math.sin(clamp(angles[2], def.limits.z) / 2)
  const w = Math.sqrt(Math.max(0, 1 - x * x - y * y - z * z))
  return new THREE.Quaternion(x, y, z, w).normalize()
}

/** Pose (ângulos) → rotações relativas de todas as juntas. */
export function poseRotations(pose: Pose): JointRotations {
  const out: JointRotations = new Map()
  for (const j of JOINTS) out.set(j.child, jointQuat(j, pose[j.child]))
  return out
}

const v = (a: [number, number, number]) => new THREE.Vector3(...a)

/** Posição/rotação de todas as partes a partir da pélvis e das juntas. */
export function forwardKinematics(
  pelvisPos: THREE.Vector3,
  pelvisRot: THREE.Quaternion,
  joints: JointRotations,
): Map<PartName, PartTransform> {
  const out = new Map<PartName, PartTransform>()
  out.set('pelvis', { pos: pelvisPos.clone(), rot: pelvisRot.clone() })
  for (const j of ORDERED_JOINTS) {
    const parent = out.get(j.parent)!
    const pDef = PART_BY_NAME.get(j.parent)!
    const cDef = PART_BY_NAME.get(j.child)!
    const rot = parent.rot.clone().multiply(joints.get(j.child) ?? new THREE.Quaternion())
    const anchorWorld = v(j.anchor).sub(v(pDef.center)).applyQuaternion(parent.rot).add(parent.pos)
    const pos = anchorWorld.sub(v(j.anchor).sub(v(cDef.center)).applyQuaternion(rot))
    out.set(j.child, { pos, rot })
  }
  return out
}

/** Pontos extremos de uma parte (para achar o ponto mais baixo do corpo). */
function extremePoints(def: PartDef): THREE.Vector3[] {
  const s = def.shape
  switch (s.kind) {
    case 'box': {
      const [hx, hy, hz] = s.size.map((n) => n / 2)
      const pts: THREE.Vector3[] = []
      for (const x of [-hx, hx]) for (const y of [-hy, hy]) for (const z of [-hz, hz]) pts.push(new THREE.Vector3(x, y, z))
      return pts
    }
    case 'capsule': {
      const h = s.length / 2 - s.radius
      return [new THREE.Vector3(0, h, 0), new THREE.Vector3(0, -h, 0)]
    }
    case 'sphere':
      return [new THREE.Vector3()]
  }
}

function radiusOf(def: PartDef) {
  const s = def.shape
  return s.kind === 'capsule' || s.kind === 'sphere' ? s.radius : 0
}

/** Altura do ponto mais baixo do corpo numa configuração. */
export function lowestPoint(transforms: Map<PartName, PartTransform>) {
  let min = Infinity
  for (const [name, t] of transforms) {
    const def = PART_BY_NAME.get(name)!
    const r = radiusOf(def)
    for (const p of extremePoints(def)) {
      const y = p.applyQuaternion(t.rot).add(t.pos).y - r
      if (y < min) min = y
    }
  }
  return min
}

/** Rotação da pélvis "deitada/sentada": yaw (direção) e depois inclinação em X. */
export function rootRotation(yaw: number, pitch: number, roll = 0) {
  return new THREE.Quaternion().setFromEuler(new THREE.Euler(pitch, yaw, roll, 'YXZ'))
}
