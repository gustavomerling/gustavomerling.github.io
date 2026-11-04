import * as THREE from 'three'
import type { Physics, RAPIER } from '../engine/physics'
import { GetUp } from './getUp'
import { POSES, type Pose, type PoseId } from './poses'
import { Ragdoll, type PhysicalMotor } from './Ragdoll'
import type { PartName } from './skeleton'

/**
 * Parâmetros do equilíbrio. Ficam num objeto para dar para ajustar em
 * testes (e futuramente num painel).
 */
export const BALANCE = {
  /**
   * Motores das pernas em pé (N·m/rad e N·m·s/rad), na força 0,6.
   * O corpo como pêndulo invertido precisa de ~m·g·h ≈ 725 N·m/rad só para
   * não tombar.
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
  /**
   * Braços no equilíbrio (rad por metro de erro do ponto de captura):
   * abrem para os lados e giram contra a queda, como um equilibrista.
   */
  armSpread: 3,
  armSwing: 2.5,
  armMax: 1.0,
  /** Zona morta (m): desequilíbrios menores não mexem os braços. */
  armDeadzone: 0.06,
  /**
   * Suavização (1/s) do desequilíbrio usado pelos braços e tornozelos: eles
   * reagem ao movimento geral, não a cada tremida do controle.
   */
  reactionSmoothing: 4,
  /** Desiste (cai) acima desta inclinação da pélvis (rad) ou abaixo desta altura (m). */
  fallTilt: 0.75,
  fallPelvisHeight: 0.6,
}

/** Passo de recuperação. Distâncias em m, tempos em s. */
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

/**
 * Volta à postura confortável depois de se estabilizar: pés lado a lado,
 * a uma largura natural, apontando para a frente. Medido um pé em relação
 * ao outro (não ao centro de massa, que o equilíbrio já centraliza), então
 * um passo resolve e ele não fica "corrigindo" para sempre.
 */
export const COMFORT = {
  /** Tempo estável antes de arrumar os pés (s). */
  settle: 0.6,
  /** Largura natural entre os pés (m). */
  width: 0.2,
  /** Desvios que justificam arrumar: largura/alinhamento (m) e giro do pé (rad). */
  tolerance: 0.08,
  yawTolerance: 0.35,
  duration: 0.4,
  height: 0.05,
  /** Tentativas seguidas antes de aceitar a postura (até o próximo desequilíbrio). */
  maxAttempts: 2,
}

/** Queda controlada e tempo no chão. */
export const FALL = {
  /** Força dos motores enquanto cai (pose de proteção). */
  strength: 0.55,
  /** Força deitado, relaxado. */
  downStrength: 0.15,
  /** Considera "parado no chão" abaixo desta velocidade (m/s). */
  restSpeed: 0.35,
  /** Tempo mínimo caindo e tempo deitado antes de levantar (s). */
  minFallTime: 0.6,
  maxFallTime: 3,
  downTime: 1.0,
}

/** Olhar: limites e suavidade. */
export const GAZE = {
  /** Fora deste ângulo (rad, para o lado) ele não tenta olhar (está atrás dele). */
  maxYaw: 2.0,
  /** Quanto do giro vai para o peito; o resto vai para o pescoço. */
  chestShare: 0.3,
  smoothing: 6,
}

type Side = 'L' | 'R'

interface Swing {
  side: Side
  start: THREE.Vector3
  target: THREE.Vector3
  t: number
  duration: number
  height: number
}

export type NpcState = 'standing' | 'falling' | 'down' | 'gettingUp'

export interface NpcDebug {
  state: NpcState
  /** Erro do ponto de captura em relação ao centro dos pés (m), na frente/lado. */
  captureForward: number
  captureSide: number
  tilt: number
  /** Passos de recuperação dados desde o último reset. */
  steps: number
  stepping: boolean
  /** Etapa atual da animação de levantar. */
  getUpStage: string
  /** Passos de conforto (arrumar os pés) desde o último reset. */
  comfortSteps: number
}

type FallDir = 'forward' | 'back' | 'left' | 'right'

const UP = new THREE.Vector3(0, 1, 0)
const TORSO: PartName[] = ['pelvis', 'abdomen', 'chest']

/** Poses de proteção na queda, por direção. */
const FALL_POSES: Record<FallDir, Pose> = {
  // Para a frente: braços à frente para amortecer, cabeça erguida.
  forward: {
    chest: [0.1, 0, 0],
    head: [0.35, 0, 0],
    upperArmL: [1.4, 0, -0.25],
    upperArmR: [1.4, 0, 0.25],
    forearmL: [0.3, 0, 0],
    forearmR: [0.3, 0, 0],
    thighL: [0.2, 0, 0],
    thighR: [0.2, 0, 0],
    shinL: [-0.4, 0, 0],
    shinR: [-0.4, 0, 0],
  },
  // Para trás: queixo encolhido, corpo curvado, "senta" e apoia as mãos atrás.
  back: {
    abdomen: [-0.4, 0, 0],
    chest: [-0.35, 0, 0],
    head: [-0.6, 0, 0],
    upperArmL: [-0.6, 0, -0.4],
    upperArmR: [-0.6, 0, 0.4],
    forearmL: [0.4, 0, 0],
    forearmR: [0.4, 0, 0],
    thighL: [1.0, 0, 0],
    thighR: [1.0, 0, 0],
    shinL: [-1.2, 0, 0],
    shinR: [-1.2, 0, 0],
  },
  // Para a direita: braço direito abre para apoiar, cabeça inclina para o outro lado.
  right: {
    head: [0, 0, 0.4],
    upperArmR: [0.3, 0, 1.3],
    forearmR: [0.3, 0, 0],
    upperArmL: [0.8, 0, 0.25],
    forearmL: [1.2, 0, 0],
    thighL: [0.3, 0, 0],
    thighR: [0.3, 0, 0],
    shinL: [-0.5, 0, 0],
    shinR: [-0.5, 0, 0],
  },
  left: {
    head: [0, 0, -0.4],
    upperArmL: [0.3, 0, -1.3],
    forearmL: [0.3, 0, 0],
    upperArmR: [0.8, 0, -0.25],
    forearmR: [1.2, 0, 0],
    thighL: [0.3, 0, 0],
    thighR: [0.3, 0, 0],
    shinL: [-0.5, 0, 0],
    shinR: [-0.5, 0, 0],
  },
}

/**
 * O NPC: ragdoll ativo com estados.
 * - em pé: equilíbrio (ponto de captura), passos de recuperação, volta à
 *   postura confortável, braços ajudando, olhar para o jogador;
 * - caindo: pose de proteção conforme a direção da queda;
 * - no chão: relaxa um instante;
 * - levantando: animação scriptada conforme caiu (de costas ou de bruços).
 */
export class Npc {
  readonly ragdoll: Ragdoll
  state: NpcState = 'standing'
  balanceEnabled = true
  /** Levanta sozinho depois de cair. */
  autoGetUp = true
  strength = 0.6
  poseId: PoseId = 'stand'
  /** Ponto que ele tenta olhar (olhos do jogador), ou null. */
  lookTarget: THREE.Vector3 | null = null
  /** Direção (yaw) que ele tenta manter. */
  private heading = 0

  readonly debug: NpcDebug = {
    state: 'standing',
    captureForward: 0,
    captureSide: 0,
    tilt: 0,
    steps: 0,
    stepping: false,
    getUpStage: '',
    comfortSteps: 0,
  }

  private swing: Swing | null = null
  private stepCooldown = 0
  private stableTime = 0
  /** Passos de conforto seguidos desde o último desequilíbrio. */
  private comfortAttempts = 0
  private stateTime = 0
  private getUp: GetUp | null = null
  private fallPose: Pose = {}
  /** Desequilíbrio suavizado (para braços e tornozelos). */
  private readonly smoothErr = { forward: 0, side: 0 }
  /** Olhar suavizado: giro (yaw) e inclinação (pitch) da cabeça. */
  private gazeYaw = 0
  private gazePitch = 0

  private readonly com = new THREE.Vector3()
  private readonly comVel = new THREE.Vector3()
  private readonly tmpQ = new THREE.Quaternion()
  private readonly tmpV = new THREE.Vector3()

  constructor(physics: Physics, scene: THREE.Scene) {
    this.ragdoll = new Ragdoll(physics, scene)
  }

  /** Coloca de pé em `feet`, virado para `yaw`, e volta a se equilibrar. */
  spawn(feet: THREE.Vector3, yaw: number) {
    this.getUp?.cancel()
    this.getUp = null
    this.ragdoll.placeAt(feet, yaw)
    this.heading = yaw
    this.debug.steps = 0
    this.debug.comfortSteps = 0
    this.enterStanding()
  }

  /** Solta o corpo (debug): já entra caindo. */
  drop(feet: THREE.Vector3, yaw: number, opts: Parameters<Ragdoll['placeAt']>[2]) {
    this.getUp?.cancel()
    this.getUp = null
    this.ragdoll.placeAt(feet, yaw, opts)
    this.heading = yaw
    this.enterFalling('forward')
  }

  /** Empurrão no peito (debug e, futuramente, impactos). */
  push(impulse: THREE.Vector3) {
    // Empurrão forte no meio da animação de levantar devolve o corpo à física.
    if (this.state === 'gettingUp' && impulse.length() > 30) {
      this.getUp?.cancel()
      this.getUp = null
      this.enterFalling('back')
    }
    this.ragdoll.part('chest').body.applyImpulse(impulse, true)
  }

  /**
   * Impacto num ponto do corpo (tiro, golpe). Em pé ou caído, a física
   * cuida (o impulso já foi aplicado). Levantando (corpo cinemático), um
   * impacto relevante interrompe a animação e devolve o corpo à física.
   */
  hit(body: RAPIER.RigidBody, impulse: THREE.Vector3, point: THREE.Vector3) {
    if (this.state !== 'gettingUp' || impulse.length() < 8) return
    this.getUp?.cancel()
    this.getUp = null
    this.enterFalling('back')
    body.applyImpulseAtPoint(impulse, point, true)
  }

  /** O corpo rígido pertence ao NPC? */
  owns(body: RAPIER.RigidBody) {
    return this.ragdoll.hasBody(body)
  }

  setStrength(strength: number) {
    this.strength = strength
    if (this.state === 'standing') this.applyStandingMotors(POSES[this.poseId].pose)
  }

  setPose(poseId: PoseId) {
    this.poseId = poseId
    if (this.state === 'standing') this.applyStandingMotors(POSES[poseId].pose)
  }

  setBalance(enabled: boolean) {
    this.balanceEnabled = enabled
    if (this.state === 'standing') this.applyStandingMotors(POSES[this.poseId].pose)
  }

  update(dt: number) {
    this.stateTime += dt
    this.debug.state = this.state
    this.updateGaze(dt)
    switch (this.state) {
      case 'standing':
        return this.updateStanding(dt)
      case 'falling':
        return this.updateFalling()
      case 'down':
        return this.updateDown()
      case 'gettingUp':
        return this.updateGettingUp(dt)
    }
  }

  dispose() {
    this.getUp?.cancel()
    this.ragdoll.dispose()
  }

  // --- Estados -----------------------------------------------------------------

  private setState(state: NpcState) {
    this.state = state
    this.stateTime = 0
    this.debug.state = state
    this.debug.stepping = false
    this.debug.getUpStage = ''
  }

  private enterStanding() {
    this.setState('standing')
    this.swing = null
    this.stableTime = 0
    this.applyStandingMotors(POSES[this.poseId].pose)
  }

  private enterFalling(dir: FallDir) {
    this.setState('falling')
    this.swing = null
    this.fallPose = FALL_POSES[dir]
    this.ragdoll.setMotors(this.fallPose, FALL.strength)
  }

  private updateStanding(dt: number) {
    const pelvis = this.ragdoll.part('pelvis').body
    const r = pelvis.rotation()
    this.tmpQ.set(r.x, r.y, r.z, r.w)
    const pelvisUp = this.tmpV.copy(UP).applyQuaternion(this.tmpQ)
    const tilt = pelvisUp.angleTo(UP)
    this.debug.tilt = tilt

    const feetY = Math.min(this.ragdoll.part('footL').body.translation().y, this.ragdoll.part('footR').body.translation().y)
    const pelvisHeight = pelvis.translation().y - feetY
    if (tilt > BALANCE.fallTilt || pelvisHeight < BALANCE.fallPelvisHeight) {
      this.enterFalling(this.fallDirection(pelvisUp))
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

    // --- Passo de recuperação ou de conforto -------------------------------
    this.stepCooldown -= dt
    if (!this.swing && this.stepCooldown <= 0) {
      const out =
        err.forward > STEP.triggerForward || err.forward < -STEP.triggerBack || Math.abs(err.side) > STEP.triggerSide
      if (out) {
        this.startStep(capture, fl, fr, err)
        this.stableTime = 0
        this.comfortAttempts = 0
      } else {
        const calm = Math.hypot(err.forward, err.side) < 0.05 && Math.hypot(this.comVel.x, this.comVel.z) < 0.15
        this.stableTime = calm ? this.stableTime + dt : 0
        if (this.stableTime > COMFORT.settle && this.comfortAttempts < COMFORT.maxAttempts) this.tryComfortStep()
      }
    }
    const swing = this.swing
    this.debug.stepping = swing !== null

    // Apoio: os dois pés; durante o passo, só o pé que ficou no chão.
    const support = swing ? (swing.side === 'L' ? fr : fl) : mid
    const ex = capture.x - support.x
    const ez = capture.z - support.z

    // --- Pose: tornozelos, braços, olhar e a perna do passo -----------------
    const k = 1 - Math.exp(-BALANCE.reactionSmoothing * dt)
    this.smoothErr.forward += (err.forward - this.smoothErr.forward) * k
    this.smoothErr.side += (err.side - this.smoothErr.side) * k
    const pose = this.standingPose(this.smoothErr, swing)
    this.applyStandingMotors(pose)
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

  private updateFalling() {
    // Espera o corpo parar no chão.
    const speed = this.pelvisSpeed()
    const settled = this.stateTime > FALL.minFallTime && speed < FALL.restSpeed
    if (settled || this.stateTime > FALL.maxFallTime) {
      this.setState('down')
      this.ragdoll.setMotors(POSES.stand.pose, FALL.downStrength)
    }
  }

  private updateDown() {
    if (!this.autoGetUp || this.stateTime < FALL.downTime) return
    const speed = this.pelvisSpeed()
    if (speed > FALL.restSpeed) return
    this.getUp = new GetUp(this.ragdoll, POSES.stand.pose)
    this.heading = this.getUp.plan.yaw
    this.setState('gettingUp')
  }

  private updateGettingUp(dt: number) {
    const g = this.getUp
    if (!g) return this.enterStanding()
    g.update(dt)
    this.debug.getUpStage = g.label
    if (g.done) {
      this.getUp = null
      this.debug.steps = 0
      this.enterStanding()
    }
  }

  private pelvisSpeed() {
    const v = this.ragdoll.part('pelvis').body.linvel()
    return Math.hypot(v.x, v.y, v.z)
  }

  // --- Em pé: pose -------------------------------------------------------------

  /**
   * Pose em pé com os ajustes do momento: tornozelos acompanham o
   * equilíbrio, braços compensam, cabeça e peito olham para o alvo e a
   * perna do passo dobra o joelho.
   */
  private standingPose(err: { forward: number; side: number }, swing: Swing | null): Pose {
    const base: Pose = POSES[this.poseId].pose
    const pose: Pose = { ...base }
    const add = (name: PartName, dx: number, dy: number, dz: number) => {
      const b = pose[name] ?? [0, 0, 0]
      pose[name] = [b[0] + dx, b[1] + dy, b[2] + dz]
    }

    // Tornozelos: centro de massa à frente, aponta os pés para baixo.
    const ankleX = THREE.MathUtils.clamp(-BALANCE.ankleGain * err.forward, -BALANCE.maxAnkle, BALANCE.maxAnkle)
    if (swing?.side !== 'L') add('footL', ankleX, 0, 0)
    if (swing?.side !== 'R') add('footR', ankleX, 0, 0)

    // Braços: abrem com o tamanho do desequilíbrio e giram contra ele.
    // Caindo para trás, os braços vão à frente (e vice-versa); para um
    // lado, o braço do outro lado sobe mais.
    const mag = Math.hypot(err.forward, err.side)
    const clampArm = (v: number) => THREE.MathUtils.clamp(v, -BALANCE.armMax, BALANCE.armMax)
    const dz = BALANCE.armDeadzone
    const soft = (v: number) => Math.sign(v) * Math.max(0, Math.abs(v) - dz)
    const spread = clampArm(BALANCE.armSpread * Math.max(0, mag - dz))
    const swingFwd = clampArm(-BALANCE.armSwing * soft(err.forward))
    const lateral = clampArm(BALANCE.armSwing * soft(err.side))
    add('upperArmL', swingFwd, 0, -spread - Math.max(0, lateral))
    add('upperArmR', swingFwd, 0, spread + Math.max(0, -lateral))
    add('forearmL', spread * 0.3, 0, 0)
    add('forearmR', spread * 0.3, 0, 0)

    // Olhar.
    add('head', this.gazePitch, this.gazeYaw * (1 - GAZE.chestShare), 0)
    add('chest', 0, this.gazeYaw * GAZE.chestShare, 0)

    // Perna do passo: joelho dobra no meio.
    if (swing) {
      const lift = Math.sin(Math.PI * Math.min(1, swing.t / swing.duration))
      add(`shin${swing.side}`, -STEP.kneeLift * lift * (swing.height / STEP.height), 0, 0)
    }
    return pose
  }

  /**
   * Atualiza o olhar suavizado em direção ao alvo, no referencial do peito.
   * Chamado a cada passo, antes de montar a pose.
   */
  updateGaze(dt: number) {
    let yaw = 0
    let pitch = 0
    if (this.lookTarget && this.state === 'standing') {
      const chest = this.ragdoll.part('chest').body
      const head = this.ragdoll.part('head').body.translation()
      const r = chest.rotation()
      const inv = this.tmpQ.set(r.x, r.y, r.z, r.w).invert()
      const d = this.lookTarget.clone().sub(new THREE.Vector3(head.x, head.y, head.z)).applyQuaternion(inv)
      // Ele olha para -Z local; +yaw vira para a esquerda (-X).
      const targetYaw = Math.atan2(-d.x, -d.z)
      if (Math.abs(targetYaw) < GAZE.maxYaw) {
        yaw = targetYaw
        pitch = Math.atan2(d.y, Math.hypot(d.x, d.z))
      }
    }
    const k = 1 - Math.exp(-GAZE.smoothing * dt)
    this.gazeYaw += (yaw - this.gazeYaw) * k
    this.gazePitch += (pitch - this.gazePitch) * k
  }

  // --- Em pé: passos -------------------------------------------------------------

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

  /** Direção da queda pela inclinação da pélvis, no referencial do NPC. */
  private fallDirection(pelvisUp: THREE.Vector3): FallDir {
    const lean = this.toLocal(new THREE.Vector3(pelvisUp.x, 0, pelvisUp.z))
    if (Math.abs(lean.forward) >= Math.abs(lean.side)) return lean.forward > 0 ? 'forward' : 'back'
    return lean.side > 0 ? 'right' : 'left'
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

    this.swing = { side, start, target, t: 0, duration: STEP.duration, height: STEP.height }
    this.debug.steps++
  }

  /**
   * Postura confortável: com o corpo calmo, confere os pés um em relação ao
   * outro (largura, alinhamento frente/trás e giro). Se estiverem fora,
   * move o pé mais longe do centro de massa para o lado do outro, na
   * largura natural.
   */
  private tryComfortStep() {
    const fl = this.ragdoll.part('footL').body
    const fr = this.ragdoll.part('footR').body
    const pl = fl.translation()
    const pr = fr.translation()
    // Posição do pé direito vista do esquerdo, no referencial do NPC.
    const rel = this.toLocal(new THREE.Vector3(pr.x - pl.x, 0, pr.z - pl.z))
    const widthErr = Math.abs(rel.side - COMFORT.width)
    const alignErr = Math.abs(rel.forward)
    const yawL = this.footYawError(fl)
    const yawR = this.footYawError(fr)
    const twisted = Math.max(yawL, yawR) > COMFORT.yawTolerance
    const off = Math.max(widthErr, alignErr) > COMFORT.tolerance || twisted
    if (!off) return

    // Pé girado: move esse pé. Senão, o mais longe do centro de massa.
    let side: Side
    if (twisted) {
      side = yawL > yawR ? 'L' : 'R'
    } else {
      const dl = Math.hypot(pl.x - this.com.x, pl.z - this.com.z)
      const dr = Math.hypot(pr.x - this.com.x, pr.z - this.com.z)
      side = dl > dr ? 'L' : 'R'
    }
    const stance = side === 'L' ? pr : pl
    const moving = side === 'L' ? pl : pr
    const target = this.fromLocal(0, side === 'R' ? COMFORT.width : -COMFORT.width).add(
      new THREE.Vector3(stance.x, moving.y, stance.z),
    )
    this.swing = {
      side,
      start: new THREE.Vector3(moving.x, moving.y, moving.z),
      target,
      t: 0,
      duration: COMFORT.duration,
      height: COMFORT.height,
    }
    this.debug.comfortSteps++
    this.comfortAttempts++
    this.stableTime = 0
  }

  /** Quanto o pé está girado em relação à direção do corpo (rad). */
  private footYawError(body: RAPIER.RigidBody) {
    const r = body.rotation()
    const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(this.tmpQ.set(r.x, r.y, r.z, r.w))
    const yaw = Math.atan2(-fwd.x, -fwd.z)
    return Math.abs(Math.atan2(Math.sin(this.heading - yaw), Math.cos(this.heading - yaw)))
  }

  /** Leva o pé pela trajetória (arco) com uma mola; a canela vai junto. */
  private driveSwing(swing: Swing, dt: number) {
    swing.t += dt
    const u = Math.min(1, swing.t / swing.duration)
    const s = u * u * (3 - 2 * u)
    const desired = swing.start.clone().lerp(swing.target, s)
    desired.y += Math.sin(Math.PI * u) * swing.height

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
    accel.y += 400 * Math.atan2(Math.sin(this.heading - yaw), Math.cos(this.heading - yaw))
    const w = body.angvel()
    accel.sub(new THREE.Vector3(w.x, w.y, w.z).multiplyScalar(25))
    const inertia = body.principalInertia()
    accel.multiplyScalar(((inertia.x + inertia.y + inertia.z) / 3) * dt)
    body.applyTorqueImpulse(accel, true)
  }

  // --- Motores e assistência ---------------------------------------------------

  private applyStandingMotors(pose: Pose) {
    if (!this.balanceEnabled) {
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
