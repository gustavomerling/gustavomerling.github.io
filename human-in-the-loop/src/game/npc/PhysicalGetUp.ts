import * as THREE from 'three'
import { Physics, RAPIER } from '../engine/physics'
import { FROM_BACK, FROM_FRONT, planGetUp, standFrame, type Anchor, type GetUpPlan, type Keyframe } from './getUp'
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
 * Levantar "semi-scriptado": uma animação de referência (quadros-chave,
 * apoiada no chão a cada quadro, partindo da pose da queda) e o corpo
 * DINÂMICO seguindo essa referência com forças de mola LIMITADAS.
 *
 * - Como o corpo nunca vira cinemático, ele colide normalmente: não afunda
 *   no chão e empurra caixas com força humana, em vez de arremessá-las.
 * - O tempo da animação se adapta: se o corpo não consegue acompanhar
 *   (preso, encostado em algo, escorregou), a animação desacelera e espera.
 *   Travado por muito tempo, recomeça da pose atual; depois de várias
 *   falhas, se arrasta para um lugar com mais espaço e tenta de novo.
 */
export const GETUP = {
  /** Mola de posição (1/s²), amortecimento (1/s) e teto da aceleração (m/s²). */
  posKp: 260,
  posKd: 26,
  maxAccel: 35,
  /** Mola de rotação (1/s²), amortecimento (1/s) e teto (rad/s²). */
  rotKp: 220,
  rotKd: 22,
  maxAngAccel: 120,
  /** Força dos motores das juntas (ajudam a manter a pose). */
  strength: 0.7,
  /** Erro médio de posição (m) a partir do qual a animação desacelera, e onde para. */
  slowError: 0.06,
  stopError: 0.22,
  /** Tempo travado antes de recomeçar (s) e falhas antes de mudar de lugar. */
  stuckTime: 1.2,
  maxFailures: 3,
  repositionTime: 1.6,
}

export type GetUpResult = 'running' | 'done'

export class PhysicalGetUp {
  plan: GetUpPlan
  private frames: Keyframe[] = []
  private index = 0
  /** Progresso (0..1) do trecho atual. */
  private u = 0
  private stuck = 0
  private failures = 0
  private reposition = 0
  private readonly repositionDir = new THREE.Vector3()
  private fromJoints: JointRotations = new Map()
  private fromRoot = new THREE.Quaternion()
  private anchorWorld = new THREE.Vector3()
  private ground = 0
  private prevTargets: Map<PartName, PartTransform> | null = null
  /** Erro médio de acompanhamento (m), para depuração. */
  trackingError = 0
  /** Escala dos membros pelos ferimentos (vem do NPC). */
  limbScale: Partial<Record<PartName, number>> = {}

  private readonly ragdoll: Ragdoll
  private readonly physics: Physics
  private readonly standPose: Pose

  constructor(ragdoll: Ragdoll, physics: Physics, standPose: Pose) {
    this.ragdoll = ragdoll
    this.physics = physics
    this.standPose = standPose
    this.plan = planGetUp(ragdoll)
    this.restart()
  }

  get label() {
    if (this.reposition > 0) return 'procurando espaço'
    return this.frames[Math.min(this.index, this.frames.length - 1)]?.label ?? ''
  }

  /** (Re)começa a partir da pose atual do corpo. */
  private restart() {
    this.plan = planGetUp(this.ragdoll)
    this.frames = [...(this.plan.fromBack ? FROM_BACK : FROM_FRONT), standFrame(this.standPose)]
    this.index = 0
    this.stuck = 0
    this.prevTargets = null
    this.ground = this.groundHeight()
    this.beginSegment(this.currentTransforms())
  }

  update(dt: number, strength: number): GetUpResult {
    if (this.reposition > 0) {
      this.updateReposition(dt)
      return 'running'
    }
    const frame = this.frames[this.index]

    // O tempo anda conforme o corpo consegue acompanhar.
    const pace = THREE.MathUtils.clamp(
      1 - (this.trackingError - GETUP.slowError) / (GETUP.stopError - GETUP.slowError),
      0,
      1,
    )
    this.u = Math.min(1, this.u + (dt / frame.duration) * pace)
    // Travado: a animação parou de andar, ou terminou o trecho e o corpo
    // não alcança a referência.
    const waiting = this.u >= 1 && this.trackingError >= GETUP.slowError * 1.5
    this.stuck = pace < 0.15 || waiting ? this.stuck + dt : 0
    if (this.stuck > GETUP.stuckTime) {
      this.fail()
      return 'running'
    }

    // Referência deste quadro.
    const s = this.u * this.u * (3 - 2 * this.u)
    const targetJoints = poseRotations(frame.pose)
    const joints: JointRotations = new Map()
    for (const [name, q] of this.fromJoints) joints.set(name, q.clone().slerp(targetJoints.get(name)!, s))
    const root = this.fromRoot.clone().slerp(rootRotation(this.plan.yaw, frame.pitch), s)
    const targets = this.place(root, joints, frame.anchor)

    // Motores puxam para a pose da etapa; forças levam cada parte à referência.
    this.ragdoll.setMotors(frame.pose, GETUP.strength * strength, {}, this.limbScale)
    this.trackingError = this.track(targets, dt, strength)
    this.prevTargets = targets

    if (this.u >= 1 && this.trackingError < GETUP.slowError * 1.5) {
      this.index++
      if (this.index >= this.frames.length) return 'done'
      this.beginSegment(targets)
    }
    return 'running'
  }

  /**
   * Força de mola limitada em cada parte, rumo à posição/rotação da
   * referência (com a velocidade da referência como alvo de velocidade).
   * Devolve o erro médio de posição.
   */
  private track(targets: Map<PartName, PartTransform>, dt: number, strength: number) {
    let errSum = 0
    for (const [name, target] of targets) {
      const part = this.ragdoll.part(name)
      const body = part.body
      const p = body.translation()
      const v = body.linvel()
      const prev = this.prevTargets?.get(name)
      const tv = prev ? target.pos.clone().sub(prev.pos).divideScalar(dt) : new THREE.Vector3()
      const err = target.pos.clone().sub(new THREE.Vector3(p.x, p.y, p.z))
      errSum += err.length()

      const accel = err
        .multiplyScalar(GETUP.posKp)
        .add(tv.sub(new THREE.Vector3(v.x, v.y, v.z)).multiplyScalar(GETUP.posKd))
      accel.y += 9.81 // compensa o peso (a referência "sustenta" o corpo)
      const max = GETUP.maxAccel * strength
      if (accel.length() > max) accel.setLength(max)
      body.applyImpulse(accel.multiplyScalar(part.def.mass * dt), true)

      // Rotação.
      const r = body.rotation()
      const q = new THREE.Quaternion(r.x, r.y, r.z, r.w)
      const delta = target.rot.clone().multiply(q.invert())
      if (delta.w < 0) delta.set(-delta.x, -delta.y, -delta.z, -delta.w)
      const angle = 2 * Math.acos(Math.min(1, delta.w))
      const sn = Math.sqrt(Math.max(1e-9, 1 - delta.w * delta.w))
      const w = body.angvel()
      const ang = new THREE.Vector3(delta.x / sn, delta.y / sn, delta.z / sn)
        .multiplyScalar(GETUP.rotKp * angle)
        .sub(new THREE.Vector3(w.x, w.y, w.z).multiplyScalar(GETUP.rotKd))
      const maxA = GETUP.maxAngAccel * strength
      if (ang.length() > maxA) ang.setLength(maxA)
      const inertia = body.principalInertia()
      body.applyTorqueImpulse(ang.multiplyScalar(((inertia.x + inertia.y + inertia.z) / 3) * dt), true)
    }
    return errSum / targets.size
  }

  /** Não acompanhou: recomeça da pose atual; depois de várias falhas, muda de lugar. */
  private fail() {
    this.failures++
    if (this.failures >= GETUP.maxFailures) {
      this.failures = 0
      this.startReposition()
      return
    }
    this.restart()
  }

  /** Guarda a configuração de partida do trecho e a posição da âncora. */
  private beginSegment(current: Map<PartName, PartTransform>) {
    this.u = 0
    this.fromRoot = current.get('pelvis')!.rot.clone()
    this.fromJoints = new Map()
    for (const j of JOINTS) {
      const parent = current.get(j.parent)!.rot
      const child = current.get(j.child)!.rot
      this.fromJoints.set(j.child, parent.clone().invert().multiply(child))
    }
    this.anchorWorld = anchorPoint(current, this.frames[this.index].anchor)
  }

  /** Posiciona a referência: âncora fixa no plano, ponto mais baixo no chão. */
  private place(root: THREE.Quaternion, joints: JointRotations, anchor: Anchor) {
    const local = forwardKinematics(new THREE.Vector3(), root, joints)
    const a = anchorPoint(local, anchor)
    const offset = new THREE.Vector3(this.anchorWorld.x - a.x, this.ground - lowestPoint(local), this.anchorWorld.z - a.z)
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

  // --- Mudar de lugar quando não consegue levantar -------------------------------

  /** Procura a direção mais livre (paredes, móveis em cima) e se arrasta para lá. */
  private startReposition() {
    const c = this.ragdoll.part('chest').body.translation()
    let best = -1
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2
      const dir = new THREE.Vector3(Math.sin(a), 0, Math.cos(a))
      const free = this.freeDistance(new THREE.Vector3(c.x, this.ground + 0.5, c.z), dir, 2)
      const above = this.freeDistance(
        new THREE.Vector3(c.x, this.ground + 0.3, c.z).addScaledVector(dir, 0.8),
        new THREE.Vector3(0, 1, 0),
        1.6,
      )
      const score = free + above
      if (score > best) {
        best = score
        this.repositionDir.copy(dir)
      }
    }
    this.reposition = GETUP.repositionTime
  }

  private updateReposition(dt: number) {
    this.reposition -= dt
    this.ragdoll.setMotors({}, 0.4, {}, this.limbScale)
    const mass = this.ragdoll.totalMass
    const push = this.repositionDir.clone().multiplyScalar(mass * 3.2 * dt * 0.5)
    this.ragdoll.part('pelvis').body.applyImpulse(push, true)
    this.ragdoll.part('chest').body.applyImpulse(push, true)
    if (this.reposition <= 0) this.restart()
  }

  private isOwn(c: RAPIER.Collider) {
    const b = c.parent()
    return !!b && this.ragdoll.hasBody(b)
  }

  private freeDistance(from: THREE.Vector3, dir: THREE.Vector3, max: number) {
    const hit = this.physics.world.castRay(
      new RAPIER.Ray(from, dir),
      max,
      true,
      undefined,
      undefined,
      undefined,
      undefined,
      (c) => !this.isOwn(c),
    )
    return hit ? hit.timeOfImpact : max
  }

  /** Altura do chão embaixo da pélvis (ignora o próprio corpo). */
  private groundHeight() {
    const p = this.ragdoll.part('pelvis').body.translation()
    const from = new THREE.Vector3(p.x, p.y + 0.3, p.z)
    const hit = this.physics.world.castRay(
      new RAPIER.Ray(from, { x: 0, y: -1, z: 0 }),
      3,
      true,
      undefined,
      undefined,
      undefined,
      undefined,
      (c) => !this.isOwn(c),
    )
    return hit ? from.y - hit.timeOfImpact : lowestPoint(this.currentTransforms())
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
