import * as THREE from 'three'
import type { Physics, RAPIER } from '../engine/physics'
import { Damage, OUT_COLD, REGIONS, REGION_OF, type HitKind, type Region } from './Damage'
import { PhysicalGetUp } from './PhysicalGetUp'
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

/**
 * Atordoamento por impacto: um golpe/tiro forte enfraquece o equilíbrio por
 * um instante (o corpo "acusa" o golpe). Impactos fracos quase não afetam.
 */
export const STAGGER = {
  /** Impulso (N·s) abaixo do qual não atordoa. */
  threshold: 20,
  /** Segundos de atordoamento por N·s acima do limiar, e o máximo. */
  secondsPerImpulse: 0.012,
  max: 1.2,
  /** Fração da força de equilíbrio e dos motores durante o atordoamento. */
  balanceScale: 0.35,
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

export type NpcState = 'standing' | 'falling' | 'down' | 'gettingUp' | 'unconscious' | 'crawling'

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
  /** Atordoado por um impacto forte. */
  staggered: boolean
  /** Integridade por região (0–100), saúde geral e dor (0–1). */
  health: Record<Region, number>
  overall: number
  pain: number
  /** Desmaio permanente (até o reset). */
  outCold: boolean
}

type FallDir = 'forward' | 'back' | 'left' | 'right'

const UP = new THREE.Vector3(0, 1, 0)
/** Duração da transição de pouso de um passo (s). */
const LANDING = 0.1
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
    staggered: false,
    health: { head: 100, torso: 100, armL: 100, armR: 100, legL: 100, legR: 100 },
    overall: 100,
    pain: 0,
    outCold: false,
  }
  readonly damage = new Damage()
  /** Tempo restante desmaiado (Infinity = até o reset). */
  private knockout = 0
  /** Ciclo do rastejar (s). */
  private crawlT = 0

  private swing: Swing | null = null
  private stepCooldown = 0
  private stableTime = 0
  /**
   * Pouso: depois de um passo, o pé que pousou passa aos poucos (LANDING s)
   * dos motores macios do passo para os de apoio, e o tornozelo dele
   * acompanha o equilíbrio aos poucos. Evita um "tranco" visual no pouso.
   */
  private landing: { side: Side; t: number } | null = null
  /** Passos de conforto seguidos desde o último desequilíbrio. */
  private comfortAttempts = 0
  private stateTime = 0
  private getUp: PhysicalGetUp | null = null
  private readonly physics: Physics
  /** Tempo restante de atordoamento (s). */
  private stagger = 0
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
    this.physics = physics
    this.ragdoll = new Ragdoll(physics, scene)
  }

  /** Coloca de pé em `feet`, virado para `yaw`, e volta a se equilibrar. */
  spawn(feet: THREE.Vector3, yaw: number) {
    this.getUp = null
    this.ragdoll.placeAt(feet, yaw)
    this.heading = yaw
    this.heal()
    this.debug.steps = 0
    this.debug.comfortSteps = 0
    this.enterStanding()
  }

  /** Solta o corpo (debug): já entra caindo. */
  drop(feet: THREE.Vector3, yaw: number, opts: Parameters<Ragdoll['placeAt']>[2]) {
    this.getUp = null
    this.ragdoll.placeAt(feet, yaw, opts)
    this.heading = yaw
    this.enterFalling('forward')
  }

  /** Empurrão no peito (debug e, futuramente, impactos). */
  push(impulse: THREE.Vector3) {
    // Empurrão forte no meio da animação de levantar devolve o corpo à física.
    if (this.state === 'gettingUp' && impulse.length() > 30) {
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
  hit(body: RAPIER.RigidBody, impulse: THREE.Vector3, point: THREE.Vector3, kind?: HitKind) {
    const strength = impulse.length()
    if (kind) this.wound(body, strength, kind)
    if (this.state === 'standing' && strength > STAGGER.threshold) {
      const s = (strength - STAGGER.threshold) * STAGGER.secondsPerImpulse
      this.stagger = Math.min(STAGGER.max, this.stagger + s)
    }
    if (this.state !== 'gettingUp' || strength < 8) return
    this.getUp = null
    this.enterFalling('back')
    body.applyImpulseAtPoint(impulse, point, true)
  }

  /** Aplica o dano de um impacto e reage (desmaio, perder as pernas...). */
  private wound(body: RAPIER.RigidBody, impulse: number, kind: HitKind) {
    const part = this.ragdoll.partOf(body)
    if (!part) return
    const ev = this.damage.apply(part, impulse, kind)
    this.ragdoll.setDamageTint(part, 1 - this.damage.health.get(part)! / 100)
    if (this.damage.overall < OUT_COLD) {
      this.knockOut(Infinity)
    } else if (ev.knockout) {
      this.knockOut(2.5 + Math.random() * 2)
    } else if (this.state === 'standing' && !this.damage.canStand) {
      this.enterFalling('forward')
    }
  }

  private heal() {
    this.damage.reset()
    this.knockout = 0
    for (const name of Object.keys(REGION_OF) as PartName[]) this.ragdoll.setDamageTint(name, 0)
  }

  /** Desmaia: corpo mole por um tempo (ou até o reset). */
  private knockOut(seconds: number) {
    this.getUp = null
    this.knockout = Math.max(this.knockout, seconds)
    this.swing = null
    this.setState('unconscious')
    this.ragdoll.setMotors(POSES.stand.pose, 0.02)
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
    this.damage.update(dt)
    this.updateDamageDebug()
    this.updateGaze(dt)
    switch (this.state) {
      case 'unconscious':
        return this.updateUnconscious(dt)
      case 'crawling':
        return this.updateCrawling(dt)
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
    this.stagger = 0
    this.swing = null
    this.stableTime = 0
    this.applyStandingMotors(POSES[this.poseId].pose)
  }

  private enterFalling(dir: FallDir) {
    this.setState('falling')
    this.swing = null
    this.fallPose = FALL_POSES[dir]
    this.ragdoll.setMotors(this.fallPose, FALL.strength * (1 - 0.35 * this.damage.pain), {}, this.limbScale())
  }

  private updateStanding(dt: number) {
    if (!this.damage.canStand) {
      this.enterFalling('forward')
      return
    }
    if (this.landing) {
      this.landing.t += dt
      if (this.landing.t >= LANDING) this.landing = null
    }
    this.stagger = Math.max(0, this.stagger - dt)
    this.debug.staggered = this.stagger > 0
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
    // Perna ferida: apoia o peso na outra (manca).
    const bias = THREE.MathUtils.clamp((this.damage.region('legR') - this.damage.region('legL')) / 100, -1, 1) * 0.45
    const shifted = mid.clone().lerp(new THREE.Vector3(bias > 0 ? fr.x : fl.x, 0, bias > 0 ? fr.z : fl.z), Math.abs(bias))
    const support = swing ? (swing.side === 'L' ? fr : fl) : shifted
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
    const staggerScale = this.stagger > 0 ? STAGGER.balanceScale : 1
    const legs = Math.min(1, (this.damage.region('legL') + this.damage.region('legR')) / 160)
    const maxF = BALANCE.comMaxForce * mass * 9.81 * Math.min(1, this.muscle / 0.6) * staggerScale * legs
    if (force.length() > maxF) force.setLength(maxF)
    force.multiplyScalar(dt / 2)
    this.ragdoll.part('pelvis').body.applyImpulse(force, true)
    this.ragdoll.part('chest').body.applyImpulse(force, true)

    // --- Assistência de postura (torques "invisíveis") ----------------------
    if (this.stagger <= 0) for (const part of TORSO) this.assistUpright(part, part === 'pelvis', dt)
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
    if (!this.damage.canStand) {
      this.setState('crawling')
      this.crawlT = 0
      return
    }
    this.getUp = new PhysicalGetUp(this.ragdoll, this.physics, POSES.stand.pose)
    this.heading = this.getUp.plan.yaw
    this.setState('gettingUp')
  }

  private updateGettingUp(dt: number) {
    const g = this.getUp
    if (!g) return this.enterStanding()
    if (!this.damage.canStand) {
      // Ferido demais para ficar em pé: desiste e rasteja.
      this.getUp = null
      this.setState('crawling')
      this.crawlT = 0
      return
    }
    g.limbScale = this.limbScale()
    const result = g.update(dt, Math.min(1, this.muscle / 0.6))
    this.heading = g.plan.yaw
    this.debug.getUpStage = g.label
    if (result === 'done') {
      this.getUp = null
      this.debug.steps = 0
      this.enterStanding()
    }
  }

  // --- Ferimentos: desmaio e rastejar -------------------------------------------

  private updateUnconscious(dt: number) {
    if (this.knockout === Infinity) return
    this.knockout -= dt
    if (this.knockout <= 0 && this.pelvisSpeed() < FALL.restSpeed) {
      this.setState('down')
      this.ragdoll.setMotors(POSES.stand.pose, FALL.downStrength, {}, this.limbScale())
    }
  }

  /**
   * Rastejar (pernas sem condição de sustentar): de bruços, alterna
   * estender os braços à frente e puxar o corpo, afastando-se do jogador.
   * Se estiver de costas, primeiro rola para ficar de bruços.
   */
  private updateCrawling(dt: number) {
    if (this.damage.canStand) {
      this.setState('down')
      return
    }
    this.crawlT += dt
    const pelvis = this.ragdoll.part('pelvis').body
    const chest = this.ragdoll.part('chest').body
    const r = chest.rotation()
    const q = new THREE.Quaternion(r.x, r.y, r.z, r.w)
    const belly = new THREE.Vector3(0, 0, -1).applyQuaternion(q)
    const headDir = new THREE.Vector3(0, 1, 0).applyQuaternion(q).setY(0)
    if (headDir.lengthSq() < 1e-4) headDir.set(0, 0, -1)
    headDir.normalize()
    const limbs = { ...this.limbScale(), thighL: 0.1, thighR: 0.1, shinL: 0.1, shinR: 0.1, footL: 0.1, footR: 0.1 }

    if (belly.y > -0.4) {
      // De costas ou de lado: rola para ficar de bruços, como uma pessoa:
      // empurra o chão com um ombro (impulso para cima naquele lado) e
      // cruza o braço do outro lado por cima do corpo.
      const axis = new THREE.Vector3(0, 1, 0).applyQuaternion(q)
      const rightSide = new THREE.Vector3(1, 0, 0).applyQuaternion(q)
      // Rola para o lado que já está mais baixo (menos esforço).
      const turn = rightSide.y <= 0 ? 1 : -1
      const pushSide = rightSide.clone().multiplyScalar(-turn) // ombro que empurra o chão
      const c = chest.translation()
      const shoulder = new THREE.Vector3(c.x, c.y, c.z).addScaledVector(pushSide, 0.16)
      chest.applyImpulseAtPoint({ x: 0, y: 260 * dt, z: 0 }, shoulder, true)
      for (const name of ['pelvis', 'abdomen', 'chest'] as const) {
        const b = this.ragdoll.part(name).body
        const inertia = b.principalInertia()
        const i = (inertia.x + inertia.y + inertia.z) / 3
        b.applyTorqueImpulse(axis.clone().multiplyScalar(-turn * 120 * i * dt), true)
      }
      const across: Pose =
        turn > 0
          ? { upperArmL: [1.2, 0, 0.25], forearmL: [0.6, 0, 0], upperArmR: [0.2, 0, 0.8] }
          : { upperArmR: [1.2, 0, -0.25], forearmR: [0.6, 0, 0], upperArmL: [0.2, 0, -0.8] }
      this.ragdoll.setMotors(across, 0.5, {}, limbs)
      return
    }

    // Ciclo: estende os braços (alcançar) e depois puxa.
    const period = 1.4
    const phase = (this.crawlT % period) / period
    const reach = phase < 0.5
    const armPose: Pose = reach
      ? { upperArmL: [2.6, 0, -0.35], upperArmR: [2.6, 0, 0.35], forearmL: [0.2, 0, 0], forearmR: [0.2, 0, 0], head: [0.4, 0, 0] }
      : { upperArmL: [0.9, 0, -0.5], upperArmR: [0.9, 0, 0.5], forearmL: [1.8, 0, 0], forearmR: [1.8, 0, 0], head: [0.4, 0, 0] }
    this.ragdoll.setMotors(armPose, 0.55 * (1 - 0.35 * this.damage.pain), {}, limbs)

    if (!reach) {
      // Puxada: força no tronco na direção da cabeça (como as mãos agarrando o chão).
      const pull = Math.sin(((phase - 0.5) / 0.5) * Math.PI) * 1100 * (this.damage.overall / 100)
      const impulse = headDir.clone().multiplyScalar(pull * dt * 0.5)
      chest.applyImpulse(impulse, true)
      pelvis.applyImpulse(impulse, true)
    }

    // Vira a cabeça (direção do rastejar) para longe do jogador.
    if (this.lookTarget) {
      const p = pelvis.translation()
      const away = new THREE.Vector3(p.x - this.lookTarget.x, 0, p.z - this.lookTarget.z).normalize()
      const yawErr = Math.atan2(headDir.clone().cross(away).y, headDir.dot(away))
      const w = pelvis.angvel()
      for (const name of ['pelvis', 'chest'] as const) {
        const b = this.ragdoll.part(name).body
        const inertia = b.principalInertia()
        const i = (inertia.x + inertia.y + inertia.z) / 3
        b.applyTorqueImpulse({ x: 0, y: (20 * yawErr - 6 * w.y) * i * dt, z: 0 }, true)
      }
    }
  }

  private updateDamageDebug() {
    for (const r of REGIONS) this.debug.health[r] = this.damage.region(r)
    this.debug.overall = this.damage.overall
    this.debug.pain = this.damage.pain
    this.debug.outCold = this.knockout === Infinity
  }

  /** 0 logo após pousar o pé deste lado → 1 depois do pouso. */
  private landingWeight(side: Side) {
    if (!this.landing || this.landing.side !== side) return 1
    const u = Math.min(1, this.landing.t / LANDING)
    return u * u * (3 - 2 * u)
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
    for (const side of ['L', 'R'] as const) {
      if (swing?.side === side) continue
      add(`foot${side}`, ankleX * this.landingWeight(side), 0, 0)
    }

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

    // Perna ferida: joelho levemente dobrado (alivia o peso).
    for (const side of ['L', 'R'] as const) {
      const hurt = 1 - this.damage.region(side === 'L' ? 'legL' : 'legR') / 100
      if (hurt > 0.3) add(`shin${side}`, -0.35 * hurt, 0, 0)
    }

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
      this.landing = { side: swing.side, t: 0 }
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

  /** Força efetiva: a dor tira um pouco da força dos músculos. */
  get muscle() {
    return this.strength * (1 - 0.35 * this.damage.pain)
  }

  /**
   * Multiplicador de força por parte, pelos ferimentos: braço muito ferido
   * fica mole (pendurado); perna ferida perde força aos poucos.
   */
  private limbScale(): Partial<Record<PartName, number>> {
    const out: Partial<Record<PartName, number>> = {}
    for (const side of ['L', 'R'] as const) {
      const arm = this.damage.region(side === 'L' ? 'armL' : 'armR')
      const a = arm < 40 ? 0.03 : 0.5 + (0.5 * arm) / 100
      out[`upperArm${side}`] = a
      out[`forearm${side}`] = a
      out[`hand${side}`] = a
      const leg = this.damage.region(side === 'L' ? 'legL' : 'legR')
      const l = Math.max(0.15, leg / 100) ** 1.5
      out[`thigh${side}`] = l
      out[`shin${side}`] = l
      out[`foot${side}`] = l
    }
    return out
  }

  private applyStandingMotors(pose: Pose) {
    const scale = this.limbScale()
    if (!this.balanceEnabled) {
      this.ragdoll.setMotors(pose, this.muscle, {}, scale)
      return
    }
    // Rigidez das pernas escala com a força (0,6 = valores nominais).
    const f = (this.muscle / 0.6) ** 2
    const m = (k: number, d: number): PhysicalMotor => ({ stiffness: k * f, damping: d * Math.sqrt(f) })
    const knee = m(BALANCE.kneeK, BALANCE.kneeD)
    const hip = m(BALANCE.hipK, BALANCE.hipD)
    // A perna que está dando o passo fica com os motores normais (mais
    // macios), para a mola do pé conseguir levá-la.
    const swing = this.swing?.side
    const limbs = scale
    // Perna pousando: rigidez de apoio cresce aos poucos.
    const leg = (side: Side) => {
      // Começa com metade da rigidez (a perna precisa sustentar logo).
      const w = 0.5 + 0.5 * this.landingWeight(side)
      const scale = (pm: PhysicalMotor): PhysicalMotor => ({ stiffness: pm.stiffness * w, damping: pm.damping * w })
      const hurt = (scale_: PhysicalMotor): PhysicalMotor => ({
        stiffness: scale_.stiffness * (limbs[`thigh${side}`] ?? 1),
        damping: scale_.damping * Math.sqrt(limbs[`thigh${side}`] ?? 1),
      })
      return { [`shin${side}`]: hurt(scale(knee)), [`thigh${side}`]: hurt(scale(hip)) }
    }
    this.ragdoll.setMotors(
      pose,
      this.muscle,
      {
        ...(swing === 'L' ? {} : leg('L')),
        ...(swing === 'R' ? {} : leg('R')),
      },
      limbs,
    )
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
    accel.multiplyScalar(i * dt * Math.min(1, this.muscle / 0.6))
    body.applyTorqueImpulse(accel, true)
  }
}
