import * as THREE from 'three'
import type { Pose } from './poses'
import type { Ragdoll } from './Ragdoll'

/**
 * Etapas para levantar do chão (poses e inclinação da pélvis) e a escolha
 * de como levantar. Quem executa é o PhysicalGetUp: as etapas são alvos para
 * os motores e para forças de apoio limitadas, com o corpo sempre dinâmico.
 */

export type Anchor = 'pelvis' | 'feet' | 'knees' | 'hands' | 'footL' | 'kneeR'

export interface Keyframe {
  label: string
  /** Inclinação da pélvis em X: + deita para trás (barriga para cima), − para a frente. */
  pitch: number
  pose: Pose
  duration: number
  anchor: Anchor
  /** Altura da pélvis acima do chão com a etapa cumprida (m). */
  height: number
}

const H = Math.PI / 2

/** De costas: senta, recolhe as pernas, agacha, levanta. */
export const FROM_BACK: Keyframe[] = [
  {
    label: 'deitado',
    height: 0.1,
    pitch: H,
    duration: 0.5,
    anchor: 'pelvis',
    pose: { upperArmL: [0, 0, -0.35], upperArmR: [0, 0, 0.35], forearmL: [0.2, 0, 0], forearmR: [0.2, 0, 0] },
  },
  {
    label: 'senta',
    height: 0.12,
    pitch: 0.5,
    duration: 0.7,
    anchor: 'pelvis',
    pose: {
      chest: [-0.2, 0, 0],
      head: [-0.3, 0, 0],
      upperArmL: [-0.9, 0, -0.3],
      upperArmR: [-0.9, 0, 0.3],
      forearmL: [0.1, 0, 0],
      forearmR: [0.1, 0, 0],
      thighL: [H - 0.5, 0, -0.1],
      thighR: [H - 0.5, 0, 0.1],
    },
  },
  {
    label: 'recolhe as pernas',
    height: 0.12,
    pitch: 0.2,
    duration: 0.6,
    anchor: 'pelvis',
    pose: {
      abdomen: [-0.3, 0, 0],
      chest: [-0.2, 0, 0],
      upperArmL: [-0.6, 0, -0.3],
      upperArmR: [-0.6, 0, 0.3],
      forearmL: [0.2, 0, 0],
      forearmR: [0.2, 0, 0],
      thighL: [1.7, 0, -0.15],
      thighR: [1.7, 0, 0.15],
      shinL: [-2.3, 0, 0],
      shinR: [-2.3, 0, 0],
      footL: [0.4, 0, 0],
      footR: [0.4, 0, 0],
    },
  },
  {
    label: 'agacha',
    height: 0.45,
    pitch: -0.35,
    duration: 0.6,
    anchor: 'feet',
    pose: {
      abdomen: [-0.3, 0, 0],
      chest: [-0.1, 0, 0],
      head: [0.25, 0, 0],
      upperArmL: [1.3, 0, 0],
      upperArmR: [1.3, 0, 0],
      forearmL: [0.3, 0, 0],
      forearmR: [0.3, 0, 0],
      thighL: [1.65, 0, -0.15],
      thighR: [1.65, 0, 0.15],
      shinL: [-1.8, 0, 0],
      shinR: [-1.8, 0, 0],
      footL: [0.5, 0, 0],
      footR: [0.5, 0, 0],
    },
  },
  {
    label: 'levantando',
    height: 0.72,
    pitch: -0.2,
    duration: 0.45,
    anchor: 'feet',
    pose: {
      abdomen: [-0.15, 0, 0],
      upperArmL: [0.6, 0, 0],
      upperArmR: [0.6, 0, 0],
      forearmL: [0.3, 0, 0],
      forearmR: [0.3, 0, 0],
      thighL: [0.9, 0, -0.05],
      thighR: [0.9, 0, 0.05],
      shinL: [-1.0, 0, 0],
      shinR: [-1.0, 0, 0],
      footL: [0.3, 0, 0],
      footR: [0.3, 0, 0],
    },
  },
]

/** De bruços: flexão, quatro apoios, ajoelhado, um joelho, levanta. */
export const FROM_FRONT: Keyframe[] = [
  {
    label: 'mãos no chão',
    height: 0.11,
    pitch: -H,
    duration: 0.45,
    anchor: 'pelvis',
    pose: { upperArmL: [1.2, 0, -0.3], upperArmR: [1.2, 0, 0.3], forearmL: [1.8, 0, 0], forearmR: [1.8, 0, 0] },
  },
  {
    label: 'flexão',
    height: 0.18,
    pitch: -1.0,
    duration: 0.5,
    anchor: 'hands',
    pose: {
      abdomen: [0.3, 0, 0],
      chest: [0.25, 0, 0],
      head: [0.3, 0, 0],
      upperArmL: [0.45, 0, -0.15],
      upperArmR: [0.45, 0, 0.15],
      thighL: [-0.5, 0, 0],
      thighR: [-0.5, 0, 0],
      footL: [-0.6, 0, 0],
      footR: [-0.6, 0, 0],
    },
  },
  {
    label: 'quatro apoios',
    height: 0.5,
    pitch: -H,
    duration: 0.6,
    anchor: 'hands',
    pose: {
      head: [0.4, 0, 0],
      upperArmL: [H, 0, -0.1],
      upperArmR: [H, 0, 0.1],
      thighL: [H, 0, -0.05],
      thighR: [H, 0, 0.05],
      shinL: [-H, 0, 0],
      shinR: [-H, 0, 0],
      footL: [-0.6, 0, 0],
      footR: [-0.6, 0, 0],
    },
  },
  {
    label: 'ajoelhado',
    height: 0.6,
    pitch: 0,
    duration: 0.6,
    anchor: 'knees',
    pose: {
      forearmL: [0.3, 0, 0],
      forearmR: [0.3, 0, 0],
      thighL: [0, 0, -0.05],
      thighR: [0, 0, 0.05],
      shinL: [-H, 0, 0],
      shinR: [-H, 0, 0],
      footL: [-0.6, 0, 0],
      footR: [-0.6, 0, 0],
    },
  },
  {
    label: 'um joelho',
    height: 0.58,
    pitch: -0.15,
    duration: 0.55,
    anchor: 'kneeR',
    pose: {
      abdomen: [-0.1, 0, 0],
      upperArmL: [0.4, 0, 0],
      forearmL: [0.6, 0, 0],
      forearmR: [0.3, 0, 0],
      thighL: [H, 0, -0.1],
      shinL: [-H, 0, 0],
      thighR: [0, 0, 0.05],
      shinR: [-H, 0, 0],
      footR: [-0.6, 0, 0],
    },
  },
  {
    label: 'levantando',
    height: 0.72,
    pitch: -0.08,
    duration: 0.55,
    anchor: 'footL',
    pose: {
      abdomen: [-0.05, 0, 0],
      upperArmL: [0.5, 0, 0],
      upperArmR: [0.5, 0, 0],
      forearmL: [0.4, 0, 0],
      forearmR: [0.4, 0, 0],
      thighL: [0.9, 0, -0.05],
      shinL: [-1.0, 0, 0],
      footL: [0.3, 0, 0],
      thighR: [0.4, 0, 0.05],
      shinR: [-0.6, 0, 0],
      footR: [0.2, 0, 0],
    },
  },
]

/** Último quadro de qualquer sequência: em pé, pés no lugar. */
export function standFrame(pose: Pose): Keyframe {
  return { label: 'em pé', pitch: 0, duration: 0.5, anchor: 'feet', pose, height: 0.9 }
}

export interface GetUpPlan {
  /** Direção (yaw) em que ele termina virado. */
  yaw: number
  fromBack: boolean
}

/**
 * Decide como levantar a partir de como o corpo está: barriga para cima ou
 * para baixo, e para onde a cabeça aponta (define a direção final).
 */
export function planGetUp(ragdoll: Ragdoll): GetUpPlan {
  const r = ragdoll.part('pelvis').body.rotation()
  const q = new THREE.Quaternion(r.x, r.y, r.z, r.w)
  const up = new THREE.Vector3(0, 1, 0).applyQuaternion(q) // ao longo do tronco, para a cabeça
  const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(q) // para onde a barriga aponta
  const fromBack = forward.y > 0
  // Deitado de costas e sentando, ele termina olhando para os pés (oposto da
  // cabeça); de bruços, termina olhando para onde a cabeça estava.
  const yaw = fromBack ? Math.atan2(up.x, up.z) : Math.atan2(-up.x, -up.z)
  return { yaw, fromBack }
}
