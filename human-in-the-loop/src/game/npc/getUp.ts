import * as THREE from 'three'

import {
  forwardKinematics,
  lowestPoint,
  poseRotations,
  rootRotation,
  type JointRotations,
  type PartTransform,
} from './kinematics'
import type { Pose } from './poses'
import type { Ragdoll } from './Ragdoll'
import { JOINTS, type PartName } from './skeleton'

/**
 * Levantar do chão com animação scriptada.
 *
 * Durante a animação o corpo fica cinemático: cada parte segue a
 * configuração calculada por cinemática direta. Cada trecho interpola das
 * rotações atuais para o próximo quadro-chave e:
 * - "apoia" o corpo no chão (o ponto mais baixo fica na altura do chão);
 * - mantém fixa no plano a parte-âncora do trecho (pés, joelhos, mãos...),
 *   para nada escorregar.
 * O primeiro trecho parte da pose exata em que ele caiu.
 */

type Anchor = 'pelvis' | 'feet' | 'knees' | 'hands' | 'footL' | 'kneeR'

interface Keyframe {
  label: string
  /** Inclinação da pélvis em X: + deita para trás (barriga para cima), − para a frente. */
  pitch: number
  pose: Pose
  duration: number
  anchor: Anchor
}

const H = Math.PI / 2

/** De costas: senta, recolhe as pernas, agacha, levanta. */
const FROM_BACK: Keyframe[] = [
  {
    label: 'deitado',
    pitch: H,
    duration: 0.5,
    anchor: 'pelvis',
    pose: { upperArmL: [0, 0, -0.35], upperArmR: [0, 0, 0.35], forearmL: [0.2, 0, 0], forearmR: [0.2, 0, 0] },
  },
  {
    label: 'senta',
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
const FROM_FRONT: Keyframe[] = [
  {
    label: 'mãos no chão',
    pitch: -H,
    duration: 0.45,
    anchor: 'pelvis',
    pose: { upperArmL: [1.2, 0, -0.3], upperArmR: [1.2, 0, 0.3], forearmL: [1.8, 0, 0], forearmR: [1.8, 0, 0] },
  },
  {
    label: 'flexão',
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
function standFrame(pose: Pose): Keyframe {
  return { label: 'em pé', pitch: 0, duration: 0.5, anchor: 'feet', pose }
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

export class GetUp {
  readonly plan: GetUpPlan
  private readonly frames: Keyframe[]
  private readonly ragdoll: Ragdoll
  private readonly ground: number
  private index = 0
  private t = 0
  private fromJoints: JointRotations = new Map()
  private fromRoot = new THREE.Quaternion()
  private anchorWorld = new THREE.Vector3()
  done = false

  constructor(ragdoll: Ragdoll, standPose: Pose) {
    this.ragdoll = ragdoll
    this.plan = planGetUp(ragdoll)
    this.frames = [...(this.plan.fromBack ? FROM_BACK : FROM_FRONT), standFrame(standPose)]

    // Chão: o ponto mais baixo do corpo agora.
    const now = this.currentTransforms()
    this.ground = lowestPoint(now)
    ragdoll.setKinematic(true)
    this.beginSegment(now)
  }

  get label() {
    return this.frames[Math.min(this.index, this.frames.length - 1)].label
  }

  /** Avança a animação e posiciona as partes. */
  update(dt: number) {
    if (this.done) return
    const frame = this.frames[this.index]
    this.t += dt
    const u = Math.min(1, this.t / frame.duration)
    const s = u * u * (3 - 2 * u)

    const targetJoints = poseRotations(frame.pose)
    const joints: JointRotations = new Map()
    for (const [name, q] of this.fromJoints) joints.set(name, q.clone().slerp(targetJoints.get(name)!, s))
    const root = this.fromRoot.clone().slerp(rootRotation(this.plan.yaw, frame.pitch), s)

    const transforms = this.place(root, joints)
    for (const [name, t] of transforms) {
      const body = this.ragdoll.part(name).body
      body.setNextKinematicTranslation(t.pos)
      body.setNextKinematicRotation(t.rot)
    }

    if (u >= 1) {
      this.index++
      if (this.index >= this.frames.length) {
        this.finish()
        return
      }
      this.beginSegment(transforms)
    }
  }

  /** Interrompe (ex.: reset) devolvendo o corpo à física. */
  cancel() {
    if (this.done) return
    this.done = true
    this.ragdoll.setKinematic(false)
  }

  private finish() {
    this.done = true
    this.ragdoll.setKinematic(false)
    for (const p of this.ragdoll.parts.values()) {
      p.body.setLinvel({ x: 0, y: 0, z: 0 }, true)
      p.body.setAngvel({ x: 0, y: 0, z: 0 }, true)
    }
  }

  /** Guarda a configuração de partida do trecho e a posição da âncora. */
  private beginSegment(current: Map<PartName, PartTransform>) {
    this.t = 0
    const pelvis = current.get('pelvis')!
    this.fromRoot = pelvis.rot.clone()
    this.fromJoints = new Map()
    for (const j of JOINTS) {
      const parent = current.get(j.parent)!.rot
      const child = current.get(j.child)!.rot
      this.fromJoints.set(j.child, parent.clone().invert().multiply(child))
    }
    this.anchorWorld = anchorPoint(current, this.frames[this.index].anchor)
  }

  /** Posiciona a pélvis: âncora fixa no plano e ponto mais baixo no chão. */
  private place(root: THREE.Quaternion, joints: JointRotations) {
    const local = forwardKinematics(new THREE.Vector3(), root, joints)
    const anchor = anchorPoint(local, this.frames[this.index].anchor)
    const offset = new THREE.Vector3(this.anchorWorld.x - anchor.x, this.ground - lowestPoint(local), this.anchorWorld.z - anchor.z)
    for (const t of local.values()) t.pos.add(offset)
    return local
  }

  private currentTransforms() {
    const out = new Map<PartName, PartTransform>()
    for (const [name, p] of this.ragdoll.parts) {
      const t = p.body.translation()
      const r = p.body.rotation()
      out.set(name, { pos: new THREE.Vector3(t.x, t.y, t.z), rot: new THREE.Quaternion(r.x, r.y, r.z, r.w) })
    }
    return out
  }
}

function anchorPoint(t: Map<PartName, PartTransform>, anchor: Anchor): THREE.Vector3 {
  const mid = (a: PartName, b: PartName) => t.get(a)!.pos.clone().add(t.get(b)!.pos).multiplyScalar(0.5)
  switch (anchor) {
    case 'pelvis':
      return t.get('pelvis')!.pos.clone()
    case 'feet':
      return mid('footL', 'footR')
    case 'knees':
      return mid('shinL', 'shinR')
    case 'hands':
      return mid('handL', 'handR')
    case 'footL':
      return t.get('footL')!.pos.clone()
    case 'kneeR':
      return t.get('shinR')!.pos.clone()
  }
}
