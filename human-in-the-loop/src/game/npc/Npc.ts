import * as THREE from 'three'
import type { Physics } from '../engine/physics'
import { POSES, type Pose, type PoseId } from './poses'
import { Ragdoll, type PhysicalMotor } from './Ragdoll'
import type { PartName } from './skeleton'

/**
 * Parâmetros do equilíbrio. Ficam num objeto para dar para ajustar em
 * testes (e futuramente num painel).
 */
export const BALANCE = {
  /**
   * Motores das pernas em pé (por força, N·m/rad e N·m·s/rad), na força 0,6.
   * O corpo como pêndulo invertido precisa de ~m·g·h ≈ 725 N·m/rad só para
   * não tombar; os dois tornozelos somam bem mais que isso.
   */
  kneeK: 2600,
  kneeD: 160,
  hipK: 2000,
  hipD: 140,
  /**
   * Assistência de postura no tronco (pélvis, abdômen, peito), em
   * aceleração angular: Kp em 1/s², Kd em 1/s. Aplicada quadro a quadro,
   * então Kd × dt precisa ficar bem abaixo de 1 para não oscilar.
   */
  uprightKp: 150,
  uprightKd: 18,
  /** Segura a direção para onde ele está virado (só na pélvis). */
  yawKp: 40,
  yawKd: 10,
  /**
   * Força de equilíbrio no tronco: empurra o ponto de captura de volta para
   * cima dos pés (m/s² por metro de erro). Com os pés presos pelo atrito,
   * equivale ao torque que o tornozelo faria. O teto (em fração do peso)
   * é o que torna empurrões fortes impossíveis de segurar parado.
   */
  comKp: 60,
  comMaxForce: 0.2,
  /** Pose: inclina os tornozelos junto (rad por metro), só para o visual acompanhar. */
  ankleGain: 1.2,
  maxAnkle: 0.25,
  /** Desiste (cai) acima desta inclinação da pélvis (rad) ou abaixo desta altura (m). */
  fallTilt: 0.75,
  fallPelvisHeight: 0.6,
  /** Força dos motores depois de cair (até o passo 11/12 existirem). */
  fallenStrength: 0.12,
}

export type NpcState = 'standing' | 'fallen'

export interface NpcDebug {
  state: NpcState
  /** Erro do ponto de captura em relação ao centro dos pés (m), na frente/lado. */
  captureForward: number
  captureSide: number
  tilt: number
}

const UP = new THREE.Vector3(0, 1, 0)
const TORSO: PartName[] = ['pelvis', 'abdomen', 'chest']

/**
 * O NPC: ragdoll ativo + controle de equilíbrio em pé.
 * Fluxo por passo de física: mede centro de massa e inclinação, ajusta a
 * pose-alvo (tornozelos/quadril), aplica a assistência de postura e
 * decide se desistiu de ficar em pé.
 */
export class Npc {
  readonly ragdoll: Ragdoll
  state: NpcState = 'standing'
  balanceEnabled = true
  strength = 0.6
  poseId: PoseId = 'stand'
  /** Direção (yaw) que ele tenta manter. */
  private heading = 0

  readonly debug: NpcDebug = { state: 'standing', captureForward: 0, captureSide: 0, tilt: 0 }

  private readonly com = new THREE.Vector3()
  private readonly comVel = new THREE.Vector3()
  private readonly tmpQ = new THREE.Quaternion()
  private readonly tmpV = new THREE.Vector3()

  constructor(physics: Physics, scene: THREE.Scene) {
    this.ragdoll = new Ragdoll(physics, scene)
  }

  /** Coloca de pé em `feet`, virado para `yaw`, e volta a se equilibrar. */
  spawn(feet: THREE.Vector3, yaw: number) {
    this.ragdoll.placeAt(feet, yaw)
    this.heading = yaw
    this.state = 'standing'
    this.applyMotors(POSES[this.poseId].pose)
  }

  /** Solta o corpo como no passo 6 (debug), já "caído". */
  drop(feet: THREE.Vector3, yaw: number, opts: Parameters<Ragdoll['placeAt']>[2]) {
    this.ragdoll.placeAt(feet, yaw, opts)
    this.heading = yaw
    this.fall()
  }

  /** Empurrão no peito (debug e, futuramente, impactos). */
  push(impulse: THREE.Vector3) {
    const chest = this.ragdoll.part('chest').body
    chest.applyImpulse(impulse, true)
  }

  setStrength(strength: number) {
    this.strength = strength
    if (this.state === 'standing') this.applyMotors(POSES[this.poseId].pose)
  }

  setPose(poseId: PoseId) {
    this.poseId = poseId
    if (this.state === 'standing') this.applyMotors(POSES[poseId].pose)
  }

  setBalance(enabled: boolean) {
    this.balanceEnabled = enabled
    this.applyMotors(POSES[this.poseId].pose)
  }

  update(dt: number) {
    this.debug.state = this.state
    if (this.state !== 'standing') return

    const pelvis = this.ragdoll.part('pelvis').body
    const r = pelvis.rotation()
    this.tmpQ.set(r.x, r.y, r.z, r.w)
    const pelvisUp = this.tmpV.copy(UP).applyQuaternion(this.tmpQ)
    const tilt = pelvisUp.angleTo(UP)
    this.debug.tilt = tilt

    const feetY = Math.min(this.ragdoll.part('footL').body.translation().y, this.ragdoll.part('footR').body.translation().y)
    const pelvisHeight = pelvis.translation().y - feetY
    if (tilt > BALANCE.fallTilt || pelvisHeight < BALANCE.fallPelvisHeight) {
      this.fall()
      return
    }
    if (!this.balanceEnabled) return

    // --- Ponto de captura: onde o centro de massa "vai parar" -------------
    this.ragdoll.centerOfMass(this.com, this.comVel)
    const height = Math.max(0.3, this.com.y - feetY)
    const t = Math.sqrt(height / 9.81)
    const fl = this.ragdoll.part('footL').body.translation()
    const fr = this.ragdoll.part('footR').body.translation()
    // O centro do apoio fica um pouco à frente do tornozelo (meio do pé).
    const supportX = (fl.x + fr.x) / 2
    const supportZ = (fl.z + fr.z) / 2
    const ex = this.com.x + this.comVel.x * t - supportX
    const ez = this.com.z + this.comVel.z * t - supportZ
    // Para o espaço do NPC (olha para -Z local).
    const sin = Math.sin(this.heading)
    const cos = Math.cos(this.heading)
    const forward = -sin * ex - cos * ez
    const side = cos * ex - sin * ez
    this.debug.captureForward = forward
    this.debug.captureSide = side

    // --- Estratégia do tornozelo e do quadril ------------------------------
    const base: Pose = POSES[this.poseId].pose
    const pose: Pose = { ...base }
    const clampA = (v: number) => THREE.MathUtils.clamp(v, -BALANCE.maxAnkle, BALANCE.maxAnkle)
    // Centro de massa à frente → aponta os pés para baixo (x−) e empurra o corpo para trás.
    const ankleX = clampA(-BALANCE.ankleGain * forward)
    for (const s of ['L', 'R'] as const) {
      const foot = `foot${s}` as const
      const fb = base[foot] ?? [0, 0, 0]
      pose[foot] = [fb[0] + ankleX, fb[1], fb[2]]
    }
    this.applyMotors(pose)

    // --- Força de equilíbrio no tronco -------------------------------------
    const mass = this.ragdoll.totalMass
    const force = new THREE.Vector3(-ex, 0, -ez).multiplyScalar(mass * BALANCE.comKp)
    const maxF = BALANCE.comMaxForce * mass * 9.81 * Math.min(1, this.strength / 0.6)
    if (force.length() > maxF) force.setLength(maxF)
    force.multiplyScalar(dt / 2)
    this.ragdoll.part('pelvis').body.applyImpulse(force, true)
    this.ragdoll.part('chest').body.applyImpulse(force, true)

    // --- Assistência de postura (torques "invisíveis") ----------------------
    for (const part of TORSO) this.assistUpright(part, part === 'pelvis', dt)
  }

  dispose() {
    this.ragdoll.dispose()
  }

  private fall() {
    this.state = 'fallen'
    this.debug.state = 'fallen'
    this.ragdoll.setMotors(POSES.stand.pose, BALANCE.fallenStrength)
  }

  private applyMotors(pose: Pose) {
    const stance = this.state === 'standing' && this.balanceEnabled
    if (!stance) {
      this.ragdoll.setMotors(pose, this.strength)
      return
    }
    // Rigidez das pernas escala com a força (0,6 = valores nominais).
    const f = (this.strength / 0.6) ** 2
    const m = (k: number, d: number): PhysicalMotor => ({ stiffness: k * f, damping: d * Math.sqrt(f) })
    const knee = m(BALANCE.kneeK, BALANCE.kneeD)
    const hip = m(BALANCE.hipK, BALANCE.hipD)
    this.ragdoll.setMotors(pose, this.strength, {
      shinL: knee,
      shinR: knee,
      thighL: hip,
      thighR: hip,
    })
  }

  /**
   * Torque PD (em aceleração) que leva o "para cima" da parte de volta ao
   * vertical e, na pélvis, segura a direção. O impulso é multiplicado pela
   * inércia da própria parte, então o efeito é igual em peças leves e
   * pesadas. Escala com a força dos motores: um NPC fraco se sustenta menos.
   */
  private assistUpright(name: PartName, holdYaw: boolean, dt: number) {
    const body = this.ragdoll.part(name).body
    const r = body.rotation()
    const q = this.tmpQ.set(r.x, r.y, r.z, r.w)
    const up = new THREE.Vector3(0, 1, 0).applyQuaternion(q)
    // Eixo (e seno do ângulo) para levar `up` ao vertical: up × Y.
    const accel = new THREE.Vector3().crossVectors(up, UP).multiplyScalar(BALANCE.uprightKp)
    const w = body.angvel()
    accel.x -= BALANCE.uprightKd * w.x
    accel.z -= BALANCE.uprightKd * w.z
    if (holdYaw) {
      const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(q)
      const yaw = Math.atan2(-fwd.x, -fwd.z)
      const err = Math.atan2(Math.sin(this.heading - yaw), Math.cos(this.heading - yaw))
      accel.y += BALANCE.yawKp * err - BALANCE.yawKd * w.y
    }
    const inertia = body.principalInertia()
    const i = (inertia.x + inertia.y + inertia.z) / 3
    accel.multiplyScalar(i * dt * Math.min(1, this.strength / 0.6))
    body.applyTorqueImpulse(accel, true)
  }
}
