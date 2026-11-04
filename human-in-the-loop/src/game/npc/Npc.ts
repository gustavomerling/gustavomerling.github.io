import * as THREE from 'three'
import type { Physics, RAPIER } from '../engine/physics'
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

/** Passo de recuperação (passo 10). Distâncias em m, tempos em s. */
export const STEP = {
  /** Dispara um passo quando o ponto de captura sai destes limites (em relação ao centro dos pés). */
  triggerForward: 0.1,
  triggerBack: 0.08,
  triggerSide: 0.16,
  duration: 0.25,
  height: 0.1,
  /** Pisa um pouco além do ponto de captura. */
  overshoot: 0.1,
  maxLength: 0.7,
  /** Distância lateral mínima entre os pés (não cruza as pernas). */
  minWidth: 0.16,
  /** Mola (aceleração) que leva o pé pela trajetória. */
  footKp: 700,
  footKd: 40,
  /** Joelho dobra no meio do passo (rad). */
  kneeLift: 1.0,
  cooldown: 0.05,
}

type Side = 'L' | 'R'

interface Swing {
  side: Side
  start: THREE.Vector3
  target: THREE.Vector3
  t: number
}

export type NpcState = 'standing' | 'fallen'

export interface NpcDebug {
  state: NpcState
  /** Erro do ponto de captura em relação ao centro dos pés (m), na frente/lado. */
  captureForward: number
  captureSide: number
  tilt: number
  /** Passos de recuperação dados desde o último reset. */
  steps: number
  stepping: boolean
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

  readonly debug: NpcDebug = { state: 'standing', captureForward: 0, captureSide: 0, tilt: 0, steps: 0, stepping: false }
  private swing: Swing | null = null
  private stepCooldown = 0

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
    this.swing = null
    this.debug.steps = 0
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
    const capture = new THREE.Vector3(this.com.x + this.comVel.x * t, 0, this.com.z + this.comVel.z * t)
    const fl = this.ragdoll.part('footL').body.translation()
    const fr = this.ragdoll.part('footR').body.translation()
    const mid = new THREE.Vector3((fl.x + fr.x) / 2, 0, (fl.z + fr.z) / 2)
    const err = this.toLocal(capture.clone().sub(mid))
    this.debug.captureForward = err.forward
    this.debug.captureSide = err.side

    // --- Passo de recuperação ----------------------------------------------
    this.stepCooldown -= dt
    if (!this.swing && this.stepCooldown <= 0) {
      const out =
        err.forward > STEP.triggerForward || err.forward < -STEP.triggerBack || Math.abs(err.side) > STEP.triggerSide
      if (out) this.startStep(capture, fl, fr, err)
    }
    const swing = this.swing
    this.debug.stepping = swing !== null

    // Apoio: os dois pés; durante o passo, só o pé que ficou no chão.
    const support = swing ? (swing.side === 'L' ? fr : fl) : mid
    const ex = capture.x - support.x
    const ez = capture.z - support.z

    // --- Pose: tornozelos acompanham; perna do passo dobra o joelho ---------
    const base: Pose = POSES[this.poseId].pose
    const pose: Pose = { ...base }
    const clampA = (v: number) => THREE.MathUtils.clamp(v, -BALANCE.maxAnkle, BALANCE.maxAnkle)
    // Centro de massa à frente: aponta os pés para baixo (x−) e empurra o corpo para trás.
    const ankleX = clampA(-BALANCE.ankleGain * err.forward)
    for (const side of ['L', 'R'] as const) {
      const foot = `foot${side}` as const
      const fb = base[foot] ?? [0, 0, 0]
      pose[foot] = [fb[0] + (swing?.side === side ? 0 : ankleX), fb[1], fb[2]]
    }
    if (swing) {
      const shin = `shin${swing.side}` as const
      const sb = base[shin] ?? [0, 0, 0]
      const lift = Math.sin(Math.PI * Math.min(1, swing.t / STEP.duration))
      pose[shin] = [sb[0] - STEP.kneeLift * lift, sb[1], sb[2]]
    }
    this.applyMotors(pose)
    if (swing) this.driveSwing(swing, dt)

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

  /** Vetor no plano: componentes "para a frente" e "para a direita" do NPC (olha para -Z local). */
  private toLocal(v: THREE.Vector3) {
    const sin = Math.sin(this.heading)
    const cos = Math.cos(this.heading)
    return { forward: -sin * v.x - cos * v.z, side: cos * v.x - sin * v.z }
  }

  private fromLocal(forward: number, side: number) {
    const sin = Math.sin(this.heading)
    const cos = Math.cos(this.heading)
    return new THREE.Vector3(-sin * forward + cos * side, 0, -cos * forward - sin * side)
  }

  /**
   * Escolhe o pé e o ponto onde pisar. Desequilíbrio para o lado: pisa com o
   * pé daquele lado (sem cruzar). Para frente/trás: o pé mais longe do
   * ponto de captura, que vira o novo apoio.
   */
  private startStep(capture: THREE.Vector3, fl: RAPIER.Vector, fr: RAPIER.Vector, err: { forward: number; side: number }) {
    let side: Side
    if (Math.abs(err.side) > STEP.triggerSide && Math.abs(err.side) > Math.abs(err.forward)) {
      side = err.side > 0 ? 'R' : 'L'
    } else {
      const dl = Math.hypot(fl.x - capture.x, fl.z - capture.z)
      const dr = Math.hypot(fr.x - capture.x, fr.z - capture.z)
      side = dl > dr ? 'L' : 'R'
    }
    const swingFoot = side === 'L' ? fl : fr
    const stance = side === 'L' ? fr : fl
    const start = new THREE.Vector3(swingFoot.x, swingFoot.y, swingFoot.z)

    // Alvo: ponto de captura + um pouco além, na direção do desequilíbrio.
    const dir = this.fromLocal(err.forward, err.side)
    if (dir.lengthSq() > 1e-6) dir.normalize()
    const target = capture.clone().addScaledVector(dir, STEP.overshoot)
    // Garante a largura mínima em relação ao pé de apoio (não cruza).
    const rel = this.toLocal(new THREE.Vector3(target.x - stance.x, 0, target.z - stance.z))
    rel.side = side === 'R' ? Math.max(rel.side, STEP.minWidth) : Math.min(rel.side, -STEP.minWidth)
    target.copy(this.fromLocal(rel.forward, rel.side)).add(new THREE.Vector3(stance.x, 0, stance.z))
    // Comprimento máximo do passo.
    const delta = target.clone().sub(start).setY(0)
    if (delta.length() > STEP.maxLength) delta.setLength(STEP.maxLength)
    target.copy(start).add(delta)
    target.y = start.y

    this.swing = { side, start, target, t: 0 }
    this.debug.steps++
  }

  /** Leva o pé pela trajetória (arco) com uma mola; a canela vai junto. */
  private driveSwing(swing: Swing, dt: number) {
    swing.t += dt
    const u = Math.min(1, swing.t / STEP.duration)
    const s = u * u * (3 - 2 * u)
    const desired = swing.start.clone().lerp(swing.target, s)
    desired.y += Math.sin(Math.PI * u) * STEP.height

    const foot = this.ragdoll.part(`foot${swing.side}`)
    const shin = this.ragdoll.part(`shin${swing.side}`)
    const p = foot.body.translation()
    const v = foot.body.linvel()
    const accel = new THREE.Vector3(desired.x - p.x, desired.y - p.y, desired.z - p.z)
      .multiplyScalar(STEP.footKp)
      .sub(new THREE.Vector3(v.x, v.y, v.z).multiplyScalar(STEP.footKd))
    accel.y += 9.81 // compensa o peso da perna no ar
    for (const part of [foot, shin]) part.body.applyImpulse(accel.clone().multiplyScalar(part.def.mass * dt), true)
    this.orientFlat(`foot${swing.side}`, dt)

    if (u >= 1) {
      this.swing = null
      this.stepCooldown = STEP.cooldown
    }
  }

  /** Mantém o pé reto e apontando para a frente durante o passo. */
  private orientFlat(name: PartName, dt: number) {
    const body = this.ragdoll.part(name).body
    const r = body.rotation()
    const q = this.tmpQ.set(r.x, r.y, r.z, r.w)
    const up = new THREE.Vector3(0, 1, 0).applyQuaternion(q)
    const accel = new THREE.Vector3().crossVectors(up, UP).multiplyScalar(300)
    const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(q)
    const yaw = Math.atan2(-fwd.x, -fwd.z)
    accel.y += 150 * Math.atan2(Math.sin(this.heading - yaw), Math.cos(this.heading - yaw))
    const w = body.angvel()
    accel.sub(new THREE.Vector3(w.x, w.y, w.z).multiplyScalar(25))
    const inertia = body.principalInertia()
    accel.multiplyScalar(((inertia.x + inertia.y + inertia.z) / 3) * dt)
    body.applyTorqueImpulse(accel, true)
  }

  private fall() {
    this.swing = null
    this.debug.stepping = false
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
    // A perna que está dando o passo fica com os motores normais (mais
    // macios), para a mola do pé conseguir levá-la.
    const swing = this.swing?.side
    this.ragdoll.setMotors(pose, this.strength, {
      ...(swing === 'L' ? {} : { shinL: knee, thighL: hip }),
      ...(swing === 'R' ? {} : { shinR: knee, thighR: hip }),
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
