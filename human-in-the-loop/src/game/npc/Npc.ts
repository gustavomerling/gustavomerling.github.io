import * as THREE from 'three'
import type { Physics, RAPIER } from '../engine/physics'
import type { NpcTraits } from './ZombieBrain'
import { Damage, OUT_COLD, type DeathCause, REGIONS, REGION_OF, type HitKind, type Region } from './Damage'
import { Grip } from './Grip'
import { Idle, Stride, TERRAIN, adaptSwing, groundAt } from './Locomotion'
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

/** Rastejar: ciclo (s), fração dele alcançando, mola da mão no chão e forças (N). */
export const CRAWL = {
  period: 1.5,
  reach: 0.4,
  gripKp: 300,
  gripKd: 25,
  pull: 700,
  zombiePull: 1500,
  legPush: 260,
}

/** Esquiva: impulso lateral no tronco (N·s) e duração da agachada (s). */
export const DODGE = {
  impulse: 48,
  dip: 0.45,
}

/** Olhar: limites e suavidade. */
export const GAZE = {
  /** Fora deste ângulo (rad, para o lado) ele não tenta olhar (está atrás dele). */
  maxYaw: 2.0,
  /** Quanto do giro vai para o peito; o resto vai para o pescoço. */
  chestShare: 0.3,
  smoothing: 6,
}

/**
 * Locomoção (passos 19–20): o caminhar é uma sequência de passos gerados
 * por tempo (alternando os pés), com o pé posto à frente do centro de massa
 * na medida da velocidade (como um pêndulo invertido "caindo para a
 * frente"). A força de equilíbrio no tronco passa a seguir uma velocidade
 * desejada em vez de um ponto fixo. Tudo continua físico: empurrões no meio
 * do caminho entram na colocação do próximo pé.
 */
export const GAIT = {
  walkSpeed: 1.3,
  runSpeed: 2.3,
  strafeSpeed: 0.6,
  backSpeed: 0.9,
  /** Aceleração máxima da velocidade desejada (m/s²). */
  accel: 2.2,
  runAccel: 3.5,
  /** Duração do passo (s) e altura do pé. */
  walkDuration: 0.34,
  runDuration: 0.25,
  walkHeight: 0.08,
  runHeight: 0.13,
  /** Correção da colocação do pé pelo erro de velocidade (s). */
  velGain: 0.25,
  /** Freando: o pé vai mais para a frente (perto do ponto de captura). */
  brakeGain: 0.5,
  /** Meia-largura da passada (m). */
  halfWidth: 0.1,
  /** Passada máxima (m). */
  maxStepWalk: 0.85,
  maxStepRun: 1.25,
  /** Força que segue a velocidade desejada (1/s) e seu teto (fração do peso). */
  forceKv: 5,
  maxForce: 0.3,
  runMaxForce: 0.45,
  /** Giro máximo da direção (rad/s) e quanto a pélvis pode girar à frente dos pés (rad). */
  turnRate: 3.0,
  maxFootLead: 0.55,
  /** Giro do tronco que pede um passo de virar no lugar (rad). */
  turnStep: 0.3,
  armSwing: 0.35,
  runArmSwing: 0.75,
  /** Inclinação do tronco para a frente por m/s (rad). */
  lean: 0.05,
  /** Joelho de apoio andando e correndo (rad, negativo dobra). */
  /** Sustentação andando: mola (1/s²), amortecimento (1/s) e teto (fração do peso). */
  supportKp: 100,
  supportKd: 8,
  supportMax: 0.6,
  walkKnee: -0.12,
  runKnee: -0.3,
  /** Comprimento quadril→centro do pé (m) e fração usada andando/correndo (joelho dobrado). */
  legLength: 0.88,
  walkLegUse: 0.985,
  runLegUse: 0.97,
  /** Pélvis acima do quadril (m). */
  hipToPelvis: 0.06,
  /** Correndo: o quadril afunda no meio do apoio (m). */
  runCompress: 0.02,
  /** Oscilação da velocidade ao longo do passo (fração). */
  surge: 0.07,
  /** Ponta do pé no fim do apoio (rad, empurrão do calcanhar). */
  toeOff: 0.2,
}

/** Agachado (crouch = 1): quanto a pélvis desce (m) e a inclinação do tronco (rad). */
export const CROUCH = {
  drop: 0.3,
  lean: 0.4,
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

/** Ferimento localizado, enviado a quem escuta `npc.onLimbDamaged`. */
export interface LimbDamageInfo {
  part: PartName
  region: Region
  kind: HitKind
  /** Dano deste golpe (pontos) e integridade restante da parte (0–100). */
  amount: number
  integrity: number
  /** Impulso (N·s) do golpe. */
  impulse: number
  /** A parte chegou a 0 agora (candidata a desmembramento). */
  destroyed: boolean
  /** Abriu/aumentou um ferimento que sangra. */
  bleeding: boolean
}

export class Emitter<T> {
  private fns = new Set<(v: T) => void>()
  /** Registra; devolve a função que desfaz. */
  add(fn: (v: T) => void) {
    this.fns.add(fn)
    return () => this.fns.delete(fn)
  }
  emit(v: T) {
    for (const fn of this.fns) fn(v)
  }
}

export type NpcState = 'standing' | 'falling' | 'down' | 'gettingUp' | 'unconscious' | 'crawling' | 'dead'

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
  /** Vida total (0–100), perda por sangramento (vida/s), morto e causa. */
  life: number
  bleedRate: number
  dead: boolean
  deathCause: DeathCause | ''
  /** Agarrar ao tropeçar: '', 'alcançando' ou 'segurando'. */
  grip: string
}

type FallDir = 'forward' | 'back' | 'left' | 'right'

const UP = new THREE.Vector3(0, 1, 0)
const LEG_LINE_STANDING = true
/** Erro do ponto de captura (m) a partir do qual ele procura onde se agarrar. */
const GRIP_TRIGGER = 0.28
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
  /** Da ficha do tipo (NpcConfig): multiplica a marcha; divide a força dos ferimentos. */
  speedScale = 1
  resistance = 1
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
    life: 100,
    bleedRate: 0,
    dead: false,
    deathCause: '',
    grip: '',
  }
  readonly damage = new Damage()
  /** Eventos para outros módulos (sangue, desmembramento, zumbi...). */
  readonly onLimbDamaged = new Emitter<LimbDamageInfo>()
  readonly onDeath = new Emitter<DeathCause>()
  readonly onRevive = new Emitter<void>()
  /** Uma parte vai se soltar (desmembramento), emitido antes de remover a junta. */
  readonly onDetach = new Emitter<PartName>()
  private dead = false
  causeOfDeath: DeathCause | null = null
  /** Tempo restante desmaiado (Infinity = até o reset). */
  private knockout = 0
  /** Ciclo do rastejar (s) e onde cada mão fincou no chão. */
  private crawlT = 0
  private readonly crawlAnchor: Record<Side, THREE.Vector3 | null> = { L: null, R: null }

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

  // --- Locomoção ---
  /** Velocidade pedida pela IA (m/s, mundo, no plano). */
  private readonly cmdVel = new THREE.Vector3()
  /** Direção que a IA quer encarar (yaw) ou null (encara para onde anda). */
  private cmdFace: number | null = null
  private running = false
  /** Agachamento pedido (0 = em pé, 1 = agachado atrás de cobertura). */
  crouch = 0
  private crouchNow = 0
  /** Tempo restante da agachada da esquiva (s). */
  private dodgeDip = 0
  /** Velocidade desejada suavizada (rampa de aceleração). */
  readonly walkVel = new THREE.Vector3()
  /** Último pé de um passo do caminhar e "fase" das pernas (-1 = esquerda atrás, 1 = à frente). */
  private lastGait: Side = 'R'
  private wasMoving = false
  /** Passos do caminhar seguidos (0 = parado). */
  private gaitStreak = 0
  private legPhase = 0
  /** Poses extras somadas por cima da pose em pé (reflexos, guarda). */
  overlay: Pose | null = null
  /** Multiplicador da rigidez dos motores de cada braço (o NPC armado sobe o direito para sustentar a arma esticada). */
  readonly armBoost: Record<Side, number> = { L: 1, R: 1 }
  overlayWeight = 0

  private readonly com = new THREE.Vector3()
  private readonly comVel = new THREE.Vector3()
  private readonly tmpQ = new THREE.Quaternion()
  private readonly tmpV = new THREE.Vector3()

  readonly grip: Grip

  /** Terreno e naturalidade (ver Locomotion.ts). */
  private readonly stride = new Stride()
  private readonly idle = new Idle()
  /** Fator de velocidade pelo relevo à frente (1 = plano) e subida do pé de apoio. */
  private terrainSlow = 1
  private readonly acceptGround = (c: RAPIER.Collider) => {
    const b = c.parent()
    return !b || (!this.ragdoll.partOf(b) && (b.isFixed() || b.mass() >= 20))
  }

  constructor(physics: Physics, scene: THREE.Scene) {
    this.physics = physics
    this.ragdoll = new Ragdoll(physics, scene)
    this.grip = new Grip(this.ragdoll, physics)
  }

  /** Coloca de pé em `feet`, virado para `yaw`, e volta a se equilibrar. */
  spawn(feet: THREE.Vector3, yaw: number) {
    this.getUp = null
    this.grip.release()
    this.move(null)
    this.crouch = 0
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
    this.grip.release()
    this.ragdoll.placeAt(feet, yaw, opts)
    this.heading = yaw
    this.enterFalling('forward')
  }

  /** Vida total (0–100): partes ponderadas menos sangramento. */
  get health() {
    return this.damage.life
  }

  get isDead() {
    return this.dead
  }

  /** Perda de vida por segundo por sangramento. */
  get bleedRate() {
    return this.damage.bleedRate
  }

  /** Mata (debug/outros módulos): motores desligam aos poucos, ragdoll passivo. */
  kill(cause: DeathCause = 'trauma') {
    if (this.dead) return
    this.dead = true
    this.causeOfDeath = cause
    this.getUp = null
    this.grip.release()
    this.move(null)
    this.swing = null
    this.lookTarget = null
    this.setState('dead')
    this.onDeath.emit(cause)
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
    if (kind) this.wound(body, strength / this.resistance, kind)
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
    if (!part || this.ragdoll.isDetached(part)) return
    const was = this.damage.health.get(part)!
    const bled = this.damage.bleeding.get(part) ?? 0
    const ev = this.damage.apply(part, impulse, kind)
    const integrity = this.damage.health.get(part)!
    this.onLimbDamaged.emit({
      part,
      region: REGION_OF[part],
      kind,
      amount: ev.amount,
      integrity,
      impulse,
      destroyed: was > 0 && integrity <= 0,
      bleeding: (this.damage.bleeding.get(part) ?? 0) > bled,
    })
    if (impulse > 6) this.onWound?.(REGION_OF[part])
    this.ragdoll.setDamageTint(part, 1 - integrity / 100)
    // Desmembramento vale também para o corpo morto.
    const sever = this.damage.severTarget(part, ev.amount, was)
    if (sever && this.detachLimb(sever)) return
    if (this.dead) return
    if (this.headshotKills && kind === 'shot' && part === 'head') {
      this.kill('critical')
      return
    }
    const t = this.traits
    if (t) {
      // Zumbi: dor e desmaio não contam; só um tiro que destrói a cabeça mata.
      if (kind === 'shot' && part === 'head' && integrity <= t.headKillHealth) this.kill('critical')
      else if (this.state === 'standing' && !this.damage.canStand) this.enterFalling('forward')
      return
    }
    const cause = this.damage.deathCause
    if (cause) {
      this.kill(cause)
    } else if (this.damage.overall < OUT_COLD) {
      this.knockOut(Infinity)
    } else if (ev.knockout) {
      this.knockOut(2.5 + Math.random() * 2)
    } else if (this.state === 'standing' && !this.damage.canStand) {
      this.enterFalling('forward')
    }
  }

  /**
   * Desmembramento: destaca `part` (e o que pende dela) do corpo. O toco
   * fica; o membro vira corpo livre. Perna ausente = rasteja, braço ausente =
   * sem apoio, cabeça = morte (`kill('critical')`). Devolve false se
   * não dá para destacar (tronco ou já solta).
   */
  detachLimb(part: PartName): boolean {
    if (this.ragdoll.isDetached(part) || REGION_OF[part] === 'torso') return false
    // Antes de soltar: quem segura o corpo (mãos do jogador) solta, senão restaura o grupo de colisão antigo.
    this.onDetach.emit(part)
    const freed = this.ragdoll.detach(part)
    if (!freed.length) return false
    for (const name of freed) {
      this.damage.health.set(name, 0)
      this.ragdoll.setDamageTint(name, 1)
    }
    this.damage.pain = Math.min(1, this.damage.pain + 0.5)
    const region = REGION_OF[part]
    if (this.grip.side && (region === 'armL' || region === 'armR') && this.grip.side === region.slice(-1)) this.grip.release()
    this.swing = null
    if (this.dead) return true
    this.onWound?.(region)
    const cause = region === 'head' ? 'critical' : this.damage.deathCause
    if (cause) this.kill(cause)
    else if (!this.damage.undying && this.damage.overall < OUT_COLD) this.knockOut(Infinity)
    else if (this.state === 'standing' && !this.damage.canStand) this.enterFalling('forward')
    else this.refreshMotors()
    return true
  }

  /** Reaplica os motores do estado atual (depois de perder um membro). */
  private refreshMotors() {
    if (this.state === 'standing') this.applyStandingMotors(POSES[this.poseId].pose)
  }

  private heal() {
    const wasDead = this.dead
    this.dead = false
    this.causeOfDeath = null
    this.damage.reset()
    this.damage.undying = this.traits !== null
    this.knockout = 0
    for (const name of Object.keys(REGION_OF) as PartName[]) this.ragdoll.setDamageTint(name, 0)
    if (wasDead) this.onRevive.emit()
  }

  /** Desmaia: corpo mole por um tempo (ou até o reset). */
  private knockOut(seconds: number) {
    if (this.dead) return
    this.getUp = null
    this.grip.release()
    this.knockout = Math.max(this.knockout, seconds)
    this.swing = null
    this.setState('unconscious')
    this.ragdoll.setMotors(POSES.stand.pose, 0.02)
  }

  /**
   * Esquiva: um impulso lateral no tronco e uma agachada rápida. Os passos
   * de recuperação seguram o corpo, então a esquiva é física (e pode falhar
   * se ele estiver ferido ou encostado em algo).
   */
  dodge(dir: THREE.Vector3) {
    if (this.state !== 'standing') return
    const legs = Math.min(1, (this.damage.region('legL') + this.damage.region('legR')) / 160)
    const impulse = dir.clone().setY(0).normalize().multiplyScalar(DODGE.impulse * legs * Math.min(1, this.muscle / 0.6))
    this.ragdoll.part('pelvis').body.applyImpulse(impulse.clone().multiplyScalar(0.55), true)
    this.ragdoll.part('chest').body.applyImpulse(impulse.clone().multiplyScalar(0.45), true)
    this.dodgeDip = DODGE.dip
  }

  /** Chamado quando uma região é ferida (a IA reage). */
  onWound: ((region: Region) => void) | null = null

  /** Tipo especial de NPC (zumbi, ver ZombieBrain.ts); null = humano comum. */
  traits: NpcTraits | null = null
  /** Masmorra: qualquer tiro na cabeça mata na hora. */
  headshotKills = false

  /** O corpo rígido pertence ao NPC? */
  owns(body: RAPIER.RigidBody) {
    return this.ragdoll.hasBody(body)
  }

  /** Aplica a ficha do tipo (velocidade, resistência). Força e visão são do Game/cérebro. */
  applyConfig(config: { speed: number; resistance: number }) {
    this.speedScale = config.speed
    this.resistance = config.resistance
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

  /**
   * Comando de locomoção: velocidade no plano (m/s, mundo; null/zero =
   * parar) e, opcionalmente, a direção a encarar (andar de costas ou de
   * lado = encarar uma direção e andar para outra).
   */
  move(vel: THREE.Vector3 | null, face: number | null = null, run = false) {
    if (vel) this.cmdVel.set(vel.x, 0, vel.z)
    else this.cmdVel.set(0, 0, 0)
    this.cmdFace = face
    this.running = run
  }

  /** Está andando (ou ainda freando)? */
  get isMoving() {
    return this.state === 'standing' && (this.walkVel.lengthSq() > 0.0025 || this.cmdVel.lengthSq() > 0.0025)
  }

  get facing() {
    return this.heading
  }

  /** Posição da pélvis no chão (x, z) e velocidade do centro de massa. */
  position(out: THREE.Vector3) {
    const p = this.ragdoll.part('pelvis').body.translation()
    return out.set(p.x, p.y, p.z)
  }

  get velocity() {
    return this.comVel
  }

  update(dt: number) {
    this.stateTime += dt
    this.debug.state = this.state
    this.damage.update(dt, !this.dead)
    if (this.traits) this.damage.pain = 0
    if (!this.dead) {
      const cause = this.damage.deathCause
      if (cause) this.kill(cause)
    }
    this.ragdoll.cleanup(this.position(this.tmpV))
    this.updateDamageDebug()
    this.updateGaze(dt)
    const limp = this.state === 'unconscious' || this.state === 'dead' || this.state === 'down' || this.state === 'crawling' || this.state === 'gettingUp'
    const calm =
      this.state === 'standing' && !this.swing && Math.hypot(this.debug.captureForward, this.debug.captureSide) < 0.08
    this.grip.update(dt, calm, limp)
    this.debug.grip = this.grip.state
    switch (this.state) {
      case 'dead':
        return this.updateDead()
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
    this.grip.dispose()
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
    this.walkVel.set(0, 0, 0)
    this.stagger = 0
    this.swing = null
    this.stableTime = 0
    this.applyStandingMotors(POSES[this.poseId].pose)
  }

  private enterFalling(dir: FallDir) {
    this.setState('falling')
    this.swing = null
    this.fallPose = FALL_POSES[dir]
    // Procura onde se segurar na direção da queda.
    this.ragdoll.centerOfMass(this.com, this.comVel)
    const fallDir = new THREE.Vector3(this.comVel.x, 0, this.comVel.z)
    if (fallDir.lengthSq() < 0.04) fallDir.copy(this.fromLocal(dir === 'forward' ? 1 : dir === 'back' ? -1 : 0, dir === 'right' ? 1 : dir === 'left' ? -1 : 0))
    this.grip.tryGrab(fallDir, this.armsOk())
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
    if (tilt > BALANCE.fallTilt || pelvisHeight < BALANCE.fallPelvisHeight - 0.25 * this.crouchNow) {
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
    // Muito desequilibrado (tropeçando): tenta se apoiar em algo por perto.
    // Andando, o ponto de captura fica naturalmente bem à frente dos pés
    // (é assim que se anda); o que conta é o desvio da velocidade pretendida
    // (empurrão, tropeço) e o tronco tombando. Sem isso ele agarrava
    // paredes ao passar rente a elas (esquinas).
    const walking = this.wasMoving && this.stagger <= 0
    const slip = walking
      ? new THREE.Vector3(this.comVel.x - this.walkVel.x, 0, this.comVel.z - this.walkVel.z).multiplyScalar(t)
      : this.fromLocal(err.forward, err.side)
    if (walking && tilt > 0.35) slip.addScaledVector(new THREE.Vector3(pelvisUp.x, 0, pelvisUp.z).normalize(), tilt - 0.35)
    if (slip.length() > GRIP_TRIGGER && !this.grip.holding) this.grip.tryGrab(slip, this.armsOk())

    // --- Locomoção: rampa da velocidade e direção ---------------------------
    this.dodgeDip = Math.max(0, this.dodgeDip - dt)
    const crouchGoal = Math.max(this.crouch, this.dodgeDip > 0 ? 0.45 : 0)
    this.crouchNow += (crouchGoal - this.crouchNow) * (1 - Math.exp(-(this.dodgeDip > 0 ? 10 : 4) * dt))
    const legsOk = Math.min(1, (this.damage.region('legL') + this.damage.region('legR')) / 160)
    // Só dispara a correr já virado para onde vai.
    const aligned = this.cmdVel.lengthSq() < 0.01 || Math.abs(Npc.angleDiff(Npc.yawOf(this.cmdVel), this.heading)) < 0.5
    const runNow = this.running && (aligned || this.walkVel.length() > GAIT.walkSpeed)
    // Relevo à frente: degrau/rampa à frente = anda mais devagar.
    {
      const dir = this.cmdVel.lengthSq() > 1e-3 ? this.cmdVel : this.walkVel
      let slow = 1
      if (dir.lengthSq() > 1e-3) {
        const y0 = (this.ragdoll.part('footL').body.translation().y + this.ragdoll.part('footR').body.translation().y) / 2
        const a = groundAt(this.physics, this.com.x + dir.x / dir.length() * 0.7, this.com.z + dir.z / dir.length() * 0.7, y0 + TERRAIN.rayUp + 0.4, this.acceptGround)
        if (a !== null) slow = 1 - 0.5 * THREE.MathUtils.clamp((a - (y0 - TERRAIN.footRest) - 0.06) / 0.25, 0, 1)
      }
      this.terrainSlow += (slow - this.terrainSlow) * (1 - Math.exp(-4 * dt))
    }
    const maxSpeed =
      (runNow ? GAIT.runSpeed : GAIT.walkSpeed) * this.speedScale * (0.35 + 0.65 * legsOk) * (1 - 0.5 * this.crouchNow) * this.terrainSlow
    const want = this.cmdVel.clone()
    if (want.length() > maxSpeed) want.setLength(maxSpeed)
    if (this.stagger > 0) want.multiplyScalar(0.3)
    // De lado e de costas é mais lento (as pernas não cruzam).
    {
      const loc = this.toLocal(want)
      const side = THREE.MathUtils.clamp(loc.side, -GAIT.strafeSpeed, GAIT.strafeSpeed)
      const fwd = Math.max(loc.forward, -GAIT.backSpeed)
      want.copy(this.fromLocal(fwd, side))
    }
    // Sem direção pedida, vira primeiro e acelera conforme fica de frente.
    if (this.cmdFace === null && want.lengthSq() > 1e-4) {
      const off = Math.abs(Npc.angleDiff(Npc.yawOf(want), this.heading))
      want.multiplyScalar(Math.max(0.15, Math.cos(Math.min(off, Math.PI / 2))) ** 2)
    }
    // Rápido: a direção da velocidade gira aos poucos (curva), o módulo
    // segue a rampa. Devagar: muda direto (passos curtos viram fácil).
    const curSpeed = this.walkVel.length()
    if (curSpeed > 1 && want.lengthSq() > 0.01) {
      const turnMax = (GAIT.turnRate / (1 + 0.4 * curSpeed)) * dt
      const d = Npc.angleDiff(Npc.yawOf(want), Npc.yawOf(this.walkVel))
      const yaw = Npc.yawOf(this.walkVel) + THREE.MathUtils.clamp(d, -turnMax, turnMax)
      const maxDs = (this.running ? GAIT.runAccel : GAIT.accel) * dt
      const speed = curSpeed + THREE.MathUtils.clamp(want.length() * Math.max(0, Math.cos(d)) - curSpeed, -maxDs, maxDs)
      this.walkVel.set(-Math.sin(yaw) * speed, 0, -Math.cos(yaw) * speed)
    } else {
      const dv = want.sub(this.walkVel)
      const maxDv = (this.running ? GAIT.runAccel : GAIT.accel) * dt
      if (dv.length() > maxDv) dv.setLength(maxDv)
      this.walkVel.add(dv)
    }
    // Continua no modo "andando" até frear de verdade.
    const comSpeed = Math.hypot(this.comVel.x, this.comVel.z)
    const moving = this.walkVel.lengthSq() > 0.0025 || this.cmdVel.lengthSq() > 0.0025 || (this.wasMoving && comSpeed > 0.25)
    this.wasMoving = moving
    if (!moving) this.gaitStreak = 0
    this.updateHeading(dt, moving)

    // --- Passo de recuperação ou de conforto -------------------------------
    this.stepCooldown -= dt
    if (moving) {
      if (!this.swing && this.stepCooldown <= 0) this.startGaitStep(fl, fr)
    } else if (!this.swing && this.stepCooldown <= 0 && this.turnNeeded()) {
      this.tryComfortStep(true)
    } else if (!this.swing && this.stepCooldown <= 0) {
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
    const bias0 = THREE.MathUtils.clamp((this.damage.region('legR') - this.damage.region('legL')) / 100, -1, 1) * 0.45
    this.idle.update(dt, !moving && !swing && this.stagger <= 0 && this.crouchNow < 0.05 && this.damage.canStand)
    const bias = THREE.MathUtils.clamp(bias0 + (moving ? 0 : this.idle.bias * 0.5), -1, 1)
    const shifted = mid.clone().lerp(new THREE.Vector3(bias > 0 ? fr.x : fl.x, 0, bias > 0 ? fr.z : fl.z), Math.abs(bias))
    const support = swing ? (swing.side === 'L' ? fr : fl) : shifted
    const ex = capture.x - support.x
    const ez = capture.z - support.z

    // --- Pose: tornozelos, braços, olhar e a perna do passo -----------------
    const k = 1 - Math.exp(-BALANCE.reactionSmoothing * dt)
    this.smoothErr.forward += (err.forward - this.smoothErr.forward) * k
    this.smoothErr.side += (err.side - this.smoothErr.side) * k
    if (swing) {
      const u = Math.min(1, swing.t / swing.duration)
      this.legPhase = swing.side === 'L' ? -1 + 2 * u : 1 - 2 * u
    }
    const pose = this.standingPose(moving ? { forward: 0, side: this.smoothErr.side * 0.3 } : this.smoothErr, swing, moving)
    if (!moving) this.idle.apply(pose, this.idle.active ? 1 : 0)
    this.applyStandingMotors(pose)
    if (swing) this.driveSwing(swing, dt)

    // --- Força de equilíbrio no tronco -------------------------------------
    const mass = this.ragdoll.totalMass
    const staggerScale = this.stagger > 0 ? STAGGER.balanceScale : 1
    const legs = legsOk
    let force: THREE.Vector3
    let maxF: number
    if (moving) {
      // Andando: segue a velocidade desejada e, de lado, mantém o ponto de
      // captura entre os pés (não deriva para fora da passada).
      // Andando, a velocidade oscila com a passada: mais lenta no meio do
      // apoio (corpo passando por cima da perna), mais rápida no duplo apoio.
      const surge = swing && !this.running ? 1 + GAIT.surge * Math.cos(2 * Math.PI * Math.min(1, swing.t / swing.duration)) : 1
      force = this.walkVel.clone().multiplyScalar(surge).sub(new THREE.Vector3(this.comVel.x, 0, this.comVel.z)).multiplyScalar(mass * GAIT.forceKv)
      const dir = this.walkVel.lengthSq() > 1e-4 ? this.walkVel.clone().normalize() : this.fromLocal(1, 0)
      const perp = new THREE.Vector3(-dir.z, 0, dir.x)
      const lat = perp.dot(new THREE.Vector3(capture.x - mid.x, 0, capture.z - mid.z))
      force.addScaledVector(perp, -lat * mass * BALANCE.comKp * 0.5)
      maxF = (this.running ? GAIT.runMaxForce : GAIT.maxForce) * mass * 9.81
    } else {
      force = new THREE.Vector3(-ex, 0, -ez).multiplyScalar(mass * BALANCE.comKp)
      maxF = BALANCE.comMaxForce * mass * 9.81
    }
    maxF *= Math.min(1, this.muscle / 0.6) * staggerScale * legs
    if (moving || this.crouchNow > 0.05) {
      // Sustentação: andando (ou agachado), a perna de apoio é ajudada a
      // não ceder (o joelho físico sozinho afunda quando o pé fica atrás).
      // A altura pedida sai da geometria da perna (ver supportHeight): sem
      // isso o quadril ficava "pendurado" acima do que a perna alcança e
      // os pés mal tocavam o chão (andar flutuando).
      const { want, stanceY } = this.supportHeight(swing, fl, fr, moving)
      const h = pelvis.translation().y - stanceY
      const vy = pelvis.linvel().y
      const up = THREE.MathUtils.clamp(mass * (GAIT.supportKp * (want - h) - GAIT.supportKd * vy), 0, (GAIT.supportMax + 0.5 * THREE.MathUtils.clamp((want - h) / 0.2, 0, 1)) * mass * 9.81 * legs)
      pelvis.applyImpulse({ x: 0, y: up * dt, z: 0 }, true)
    }
    if (force.length() > maxF) force.setLength(maxF)
    force.multiplyScalar(dt / 2)
    this.ragdoll.part('pelvis').body.applyImpulse(force, true)
    this.ragdoll.part('chest').body.applyImpulse(force, true)

    // --- Assistência de postura (torques "invisíveis") ----------------------
    if (this.stagger <= 0) for (const part of TORSO) this.assistUpright(part, part === 'pelvis', dt)
  }

  private updateFalling() {
    // Segurando em algo e ainda quase em pé: volta a se equilibrar.
    if (this.grip.holding && this.damage.canStand && this.stateTime > 0.15) {
      const pelvis = this.ragdoll.part('pelvis').body
      const r = pelvis.rotation()
      const tilt = this.tmpV.copy(UP).applyQuaternion(this.tmpQ.set(r.x, r.y, r.z, r.w)).angleTo(UP)
      const feetY = Math.min(this.ragdoll.part('footL').body.translation().y, this.ragdoll.part('footR').body.translation().y)
      if (tilt < 0.55 && pelvis.translation().y - feetY > 0.72) {
        this.enterStanding()
        return
      }
    }
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

  /** Motores desligam gradualmente até o corpo ficar totalmente passivo. */
  private updateDead() {
    const k = Math.max(0, 1 - this.stateTime / 1.5)
    this.ragdoll.setMotors(POSES.stand.pose, 0.15 * k * k + 0.0005)
  }

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

    // Rastejar "de comando": os braços alternam. Cada braço alcança à
    // frente com a mão no ar, finca a mão no chão (âncora) e puxa o corpo
    // até ela, dobrando o cotovelo. A perna boa encolhe (joelho para o
    // lado) junto com o alcance do braço oposto e empurra junto com a
    // puxada dele. O corpo é arrastado pela mão, não empurrado do nada.
    const period = CRAWL.period * (this.traits ? 0.8 : 1)
    const vigor = (this.traits ? Math.max(0.5, this.damage.overall / 100) : this.damage.overall / 100) * (1 - 0.3 * this.damage.pain)
    const pose: Pose = { head: [0.45, 0, 0], chest: [-0.05, 0, 0] }
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(q).setY(0)
    if (right.lengthSq() < 1e-4) right.set(-headDir.z, 0, headDir.x)
    right.normalize()
    const phaseOf = (side: Side) => (this.crawlT / period + (side === 'R' ? 0.5 : 0)) % 1
    const smooth = (x: number) => THREE.MathUtils.smoothstep(x, 0, 1)
    const legPush = new THREE.Vector3()
    for (const side of ['L', 'R'] as const) {
      const out = side === 'L' ? -1 : 1
      const phase = phaseOf(side)
      const hand = this.ragdoll.isAttached(`hand${side}`) ? this.ragdoll.part(`hand${side}`).body : null
      const armOk = hand && this.damage.region(side === 'L' ? 'armL' : 'armR') >= 25
      if (phase < CRAWL.reach) {
        // Alcança: braço vai por cima, à frente da cabeça, cotovelo estica.
        const u = smooth(phase / CRAWL.reach)
        pose[`upperArm${side}`] = [0.9 + 1.7 * u, 0, out * 0.4]
        pose[`forearm${side}`] = [1.9 - 1.6 * u, 0, 0]
        this.crawlAnchor[side] = null
      } else {
        const u = (phase - CRAWL.reach) / (1 - CRAWL.reach)
        // Puxa: o braço volta para baixo do peito e o cotovelo dobra.
        pose[`upperArm${side}`] = [2.6 - 1.9 * smooth(u), 0, out * (0.4 + 0.2 * u)]
        pose[`forearm${side}`] = [0.3 + 1.6 * smooth(u), 0, 0]
        if (hand && armOk) {
          const hp = hand.translation()
          let anchor = this.crawlAnchor[side]
          // Mão escorregou para longe (corpo girou, foi empurrado): finca de novo.
          if (!anchor || Math.hypot(anchor.x - hp.x, anchor.z - hp.z) > 0.35) anchor = this.crawlAnchor[side] = new THREE.Vector3(hp.x, 0, hp.z)
          // A mão fica presa onde fincou (atrito da palma no chão).
          const hv = hand.linvel()
          const m = hand.mass()
          hand.applyImpulse(
            { x: (CRAWL.gripKp * (anchor.x - hp.x) - CRAWL.gripKd * hv.x) * m * dt, y: 0, z: (CRAWL.gripKp * (anchor.z - hp.z) - CRAWL.gripKd * hv.z) * m * dt },
            true,
          )
          // O ombro é puxado em direção à mão.
          const c = chest.translation()
          const shoulder = new THREE.Vector3(c.x, c.y, c.z).addScaledVector(right, out * 0.18)
          const toHand = new THREE.Vector3(anchor.x - shoulder.x, 0, anchor.z - shoulder.z)
          const dist = toHand.length()
          if (dist > 0.12) {
            toHand.divideScalar(dist)
            // Ainda puxa um pouco para a frente mesmo com a mão de lado.
            toHand.lerp(headDir, 0.35).normalize()
            const f = Math.sin(Math.PI * u) * (this.traits ? CRAWL.zombiePull : CRAWL.pull) * vigor * Math.min(1, dist / 0.3)
            chest.applyImpulseAtPoint(toHand.clone().multiplyScalar(f * 0.6 * dt), shoulder, true)
            pelvis.applyImpulse(toHand.multiplyScalar(f * 0.4 * dt), true)
          }
        }
      }
      // Perna deste lado acompanha o braço do outro lado.
      const other = phaseOf(side === 'L' ? 'R' : 'L')
      const legHealth = this.damage.region(side === 'L' ? 'legL' : 'legR')
      const legOk = this.ragdoll.isAttached(`foot${side}`) && legHealth >= 30
      if (other < CRAWL.reach) {
        const u = smooth(other / CRAWL.reach)
        pose[`thigh${side}`] = [0.9 * u, 0, out * 0.75 * u]
        pose[`shin${side}`] = [-1.6 * u, 0, 0]
      } else {
        const u = smooth((other - CRAWL.reach) / (1 - CRAWL.reach))
        pose[`thigh${side}`] = [0.9 * (1 - u), 0, out * (0.75 - 0.5 * u)]
        pose[`shin${side}`] = [-1.6 * (1 - u) - 0.15, 0, 0]
        if (legOk) legPush.addScaledVector(headDir, Math.sin(Math.PI * u) * CRAWL.legPush * (legHealth / 100) * vigor)
      }
    }
    if (legPush.lengthSq() > 0) pelvis.applyImpulse(legPush.multiplyScalar(dt), true)
    const legScale = (side: Side) => {
      const h = this.damage.region(side === 'L' ? 'legL' : 'legR')
      return h >= 30 ? 0.25 + 0.25 * (h / 100) : 0.04
    }
    const crawlLimbs = {
      ...this.limbScale(),
      thighL: legScale('L'),
      shinL: legScale('L'),
      footL: 0.05,
      thighR: legScale('R'),
      shinR: legScale('R'),
      footR: 0.05,
    }
    this.ragdoll.setMotors(pose, 0.55 * (1 - 0.35 * this.damage.pain), {}, crawlLimbs)

    // Vira a cabeça (direção do rastejar) para longe do jogador.
    if (this.lookTarget) {
      const p = pelvis.translation()
      const away = new THREE.Vector3(p.x - this.lookTarget.x, 0, p.z - this.lookTarget.z).normalize()
      // Zumbi rasteja em direção ao alvo; os outros, para longe dele.
      if (this.traits) away.negate()
      const yawErr = Math.atan2(headDir.clone().cross(away).y, headDir.dot(away))
      const w = pelvis.angvel()
      for (const name of ['pelvis', 'chest'] as const) {
        const b = this.ragdoll.part(name).body
        const inertia = b.principalInertia()
        const i = (inertia.x + inertia.y + inertia.z) / 3
        b.applyTorqueImpulse({ x: 0, y: ((this.traits ? 70 : 20) * yawErr - (this.traits ? 14 : 6) * w.y) * i * dt, z: 0 }, true)
      }
    }
  }

  private updateDamageDebug() {
    for (const r of REGIONS) this.debug.health[r] = this.damage.region(r)
    this.debug.overall = this.damage.overall
    this.debug.pain = this.damage.pain
    this.debug.outCold = this.knockout === Infinity
    this.debug.life = this.damage.life
    this.debug.bleedRate = this.damage.bleedRate
    this.debug.dead = this.dead
    this.debug.deathCause = this.causeOfDeath ?? ''
  }

  /**
   * Altura da pélvis (acima do centro do pé de apoio) que a perna de apoio
   * realmente alcança: quanto mais longe o pé está do quadril na
   * horizontal, mais baixo o quadril (perna como um compasso). Isso dá o
   * sobe-e-desce natural do andar: alto no meio do apoio, baixo quando os
   * dois pés estão no chão. Correndo, o joelho cede no meio do apoio.
   */
  private supportHeight(swing: Swing | null, fl: RAPIER.Vector, fr: RAPIER.Vector, moving: boolean) {
    const crouch = CROUCH.drop * this.crouchNow
    const stand = GAIT.legLength + GAIT.hipToPelvis
    if (!moving) return { want: stand - 0.005 - crouch, stanceY: (fl.y + fr.y) / 2 }
    const p = this.ragdoll.part('pelvis').body.translation()
    const use = this.running ? GAIT.runLegUse : GAIT.walkLegUse
    const L = GAIT.legLength * use
    const reachFrom = (side: Side, foot: RAPIER.Vector) => {
      const hip = this.fromLocal(0, side === 'R' ? 0.1 : -0.1)
      const d = Math.hypot(foot.x - (p.x + hip.x), foot.z - (p.z + hip.z))
      return Math.sqrt(Math.max(L * L - d * d, 0.55 * 0.55)) + GAIT.hipToPelvis
    }
    let want: number
    let stanceY: number
    if (swing) {
      const side: Side = swing.side === 'L' ? 'R' : 'L'
      const foot = side === 'L' ? fl : fr
      want = reachFrom(side, foot)
      stanceY = foot.y
      if (this.running) want -= GAIT.runCompress * Math.sin(Math.PI * Math.min(1, swing.t / swing.duration))
    } else {
      // Duplo apoio: a perna mais esticada manda (quadril no ponto baixo).
      const l = reachFrom('L', fl) + fl.y
      const r = reachFrom('R', fr) + fr.y
      stanceY = (fl.y + fr.y) / 2
      want = Math.min(l, r) - stanceY
    }
    return { want: THREE.MathUtils.clamp(want, 0.87, stand) - crouch, stanceY }
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
  private standingPose(err: { forward: number; side: number }, swing: Swing | null, moving = false): Pose {
    const base: Pose = POSES[this.poseId].pose
    const pose: Pose = { ...base }
    const add = (name: PartName, dx: number, dy: number, dz: number) => {
      const b = pose[name] ?? [0, 0, 0]
      pose[name] = [b[0] + dx, b[1] + dy, b[2] + dz]
    }

    // Agachado (cobertura): joelhos e quadril dobram, pé fica plano.
    const c = this.crouchNow
    if (c > 0.01) {
      for (const side of ['L', 'R'] as const) {
        add(`thigh${side}`, 1.1 * c, 0, 0)
        add(`shin${side}`, -1.65 * c, 0, 0)
        add(`foot${side}`, 0.55 * c, 0, 0)
      }
      add('abdomen', -0.3 * c, 0, 0)
      add('chest', -0.15 * c, 0, 0)
      add('head', 0.4 * c, 0, 0)
    }

    if (!moving && LEG_LINE_STANDING) {
      // Parado: a perna de apoio também aponta para onde o pé está (pés
      // abertos depois de andar não "torcem" a pélvis).
      for (const side of ['L', 'R'] as const) {
        if (swing?.side === side) continue
        const [pitch, roll] = this.legLine(side, this.footPos(side))
        const b = pose[`thigh${side}`] ?? [0, 0, 0]
        pose[`thigh${side}`] = [b[0] + pitch, b[1], b[2] + roll]
      }
    }
    if (moving) {
      // Pernas: o quadril aponta a coxa para onde o pé está (apoio) ou deve
      // ir (passo), em vez de lutar contra a passada.
      const knee = (this.running ? GAIT.runKnee : GAIT.walkKnee) - 1.1 * c
      for (const side of ['L', 'R'] as const) {
        const swingThis = swing?.side === side
        const footAt = swingThis ? this.swingDesired(swing!) : this.footPos(side)
        const [pitch, roll] = this.legLine(side, footAt)
        const lift = swingThis ? Math.sin(Math.PI * Math.min(1, swing!.t / swing!.duration)) : 0
        const k = swingThis
          ? (pose[`shin${side}`]?.[0] ?? 0) - STEP.kneeLift * lift * Math.min(1.6, swing!.height / STEP.height)
          : knee
        pose[`thigh${side}`] = [pitch + Math.abs(k) / 2, 0, roll]
        if (!swingThis) {
          pose[`shin${side}`] = [k, 0, 0]
          // Fim do apoio (o outro pé quase pousando): o calcanhar sobe e a
          // ponta do pé empurra o chão.
          const u = swing ? Math.min(1, swing.t / swing.duration) : 0
          const toe = swing && pitch < 0 ? GAIT.toeOff * THREE.MathUtils.smoothstep(u, 0.45, 1) : 0
          pose[`foot${side}`] = [-(pitch + Math.abs(k) / 2) - k - toe, 0, 0]
        }
      }
      // Braços balançam contra as pernas; correndo, cotovelos dobrados.
      const amp = this.running ? GAIT.runArmSwing : GAIT.armSwing
      const speedK = Math.min(1, this.walkVel.length() / GAIT.walkSpeed)
      const g = this.legPhase * amp * speedK
      add('upperArmL', -g, 0, -0.08)
      add('upperArmR', g, 0, 0.08)
      if (this.running) {
        add('forearmL', 1.2, 0, 0)
        add('forearmR', 1.2, 0, 0)
      }
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
      add(`shin${swing.side}`, -STEP.kneeLift * lift * Math.min(1.6, swing.height / STEP.height), 0, 0)
    }
    this.traits?.shape(pose, this.legPhase, this.walkVel.length())
    if (this.overlay && this.overlayWeight > 0.01) {
      const w = this.overlayWeight
      for (const [name, v] of Object.entries(this.overlay) as [PartName, [number, number, number]][]) {
        const b = pose[name] ?? [0, 0, 0]
        pose[name] = [b[0] + (v[0] - b[0]) * w, b[1] + (v[1] - b[1]) * w, b[2] + (v[2] - b[2]) * w]
      }
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
    adaptSwing(this.physics, this.swing, this.acceptGround)
    this.debug.steps++
  }

  /**
   * Postura confortável: com o corpo calmo, confere os pés um em relação ao
   * outro (largura, alinhamento frente/trás e giro). Se estiverem fora,
   * move o pé mais longe do centro de massa para o lado do outro, na
   * largura natural.
   */
  private tryComfortStep(force = false) {
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
    if (force) this.comfortAttempts = 0

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
    adaptSwing(this.physics, this.swing, this.acceptGround)
    this.debug.comfortSteps++
    this.comfortAttempts++
    this.stableTime = 0
  }

  // --- Locomoção: direção, passos do caminhar e geometria das pernas ----------

  /** Yaw (0 = -Z) de um vetor no plano. */
  private static yawOf(v: { x: number; z: number }) {
    return Math.atan2(-v.x, -v.z)
  }

  private static angleDiff(a: number, b: number) {
    return Math.atan2(Math.sin(a - b), Math.cos(a - b))
  }

  /** Direção média dos dois pés (yaw). */
  private feetYaw() {
    let sx = 0
    let sz = 0
    for (const side of ['L', 'R'] as const) {
      const r = this.ragdoll.part(`foot${side}`).body.rotation()
      const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(this.tmpQ.set(r.x, r.y, r.z, r.w))
      const yaw = Math.atan2(-fwd.x, -fwd.z)
      sx += Math.sin(yaw)
      sz += Math.cos(yaw)
    }
    return Math.atan2(sx, sz)
  }

  /**
   * Gira a direção desejada para encarar o alvo (ou para onde anda), com
   * velocidade limitada e sem deixar a pélvis girar demais à frente dos pés
   * (os pés precisam dar passos para virar).
   */
  private updateHeading(dt: number, moving: boolean) {
    let target = this.heading
    if (this.cmdFace !== null) target = this.cmdFace
    else if (this.walkVel.length() > 0.6) target = Npc.yawOf(this.walkVel)
    else if (this.cmdVel.length() > 0.1) target = Npc.yawOf(this.cmdVel)
    else if (this.walkVel.length() > 0.3) target = Npc.yawOf(this.walkVel)
    const d = Npc.angleDiff(target, this.heading)
    // Correndo, curva mais aberta (giro mais lento).
    const maxTurn = (GAIT.turnRate / (1 + 0.4 * this.walkVel.length())) * dt
    let h = this.heading + THREE.MathUtils.clamp(d, -maxTurn, maxTurn)
    // Parado, vira no máximo um pouco além dos pés (os passos de virar
    // alcançam). Andando, os pés seguem a direção a cada passo.
    if (!moving) {
      const feet = this.feetYaw()
      const before = Npc.angleDiff(this.heading, feet)
      const lead = Npc.angleDiff(h, feet)
      if (Math.abs(lead) > GAIT.maxFootLead && Math.abs(lead) > Math.abs(before)) h = this.heading
    }
    this.heading = Math.atan2(Math.sin(h), Math.cos(h))
  }

  /** Parado mas girado em relação aos pés: precisa de um passo para virar. */
  private turnNeeded() {
    return Math.abs(Npc.angleDiff(this.heading, this.feetYaw())) > GAIT.turnStep
  }

  private footPos(side: Side) {
    const p = this.ragdoll.part(`foot${side}`).body.translation()
    return new THREE.Vector3(p.x, p.y, p.z)
  }

  /** Onde a mola está levando o pé do passo agora. */
  private swingDesired(swing: Swing) {
    const u = Math.min(1, swing.t / swing.duration)
    const s = u * u * (3 - 2 * u)
    const d = swing.start.clone().lerp(swing.target, s)
    d.y += Math.sin(Math.PI * u) * swing.height
    return d
  }

  /**
   * Ângulos do quadril (frente/trás e lado, na convenção das juntas) que
   * apontam a perna do quadril até `foot` (centro do pé), relativos à pose
   * de referência.
   */
  private legLine(side: Side, foot: THREE.Vector3): [number, number] {
    // Referencial "pélvis em pé" (só o giro dela): se a pélvis tomba, o
    // quadril empurra de volta em vez de acompanhar.
    const pelvis = this.ragdoll.part('pelvis').body
    const r = pelvis.rotation()
    const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(new THREE.Quaternion(r.x, r.y, r.z, r.w))
    const q = new THREE.Quaternion().setFromAxisAngle(UP, Math.atan2(-fwd.x, -fwd.z))
    const t = pelvis.translation()
    const hipLocal = new THREE.Vector3(side === 'R' ? 0.1 : -0.1, 0.92 - 0.98, 0)
    const hip = hipLocal.clone().applyQuaternion(q).add(new THREE.Vector3(t.x, t.y, t.z))
    const d = foot.clone().sub(hip).applyQuaternion(q.invert())
    // Referência: pé 0,88 m abaixo do quadril e 5 cm à frente.
    const pitch = Math.atan2(-d.z, -d.y) - Math.atan2(0.05, 0.88)
    const roll = Math.atan2(d.x, -d.y) - 0
    return [THREE.MathUtils.clamp(pitch, -0.5, 1.6), THREE.MathUtils.clamp(roll, -0.4, 0.4)]
  }

  /**
   * Um passo do caminhar: pé que está mais atrás (no sentido do movimento)
   * vai para à frente do centro de massa previsto, na meia-passada, ao lado
   * do corpo. O erro de velocidade (empurrões) desloca o pé para segurar.
   */
  private startGaitStep(fl: RAPIER.Vector, fr: RAPIER.Vector) {
    const v = new THREE.Vector3(this.comVel.x, 0, this.comVel.z)
    const vd = this.walkVel
    const dir = vd.lengthSq() > 1e-3 ? vd.clone().normalize() : v.lengthSq() > 1e-3 ? v.clone().normalize() : this.fromLocal(1, 0)
    const com = new THREE.Vector3(this.com.x, 0, this.com.z)
    const bl = new THREE.Vector3(fl.x, 0, fl.z).sub(com).dot(dir)
    const br = new THREE.Vector3(fr.x, 0, fr.z).sub(com).dot(dir)
    // Já andando: alterna os pés (também ao andar de lado: o pé da frente
    // abre e o outro fecha). Começando: sai com o pé que está mais atrás.
    let side: Side
    if (this.gaitStreak > 0 || Math.abs(bl - br) < 0.06) side = this.lastGait === 'L' ? 'R' : 'L'
    else side = bl < br ? 'L' : 'R'
    // Não repete o mesmo pé duas vezes seguidas se o outro ficou para trás.
    const swingFoot = side === 'L' ? fl : fr
    const stance = side === 'L' ? fr : fl
    const run = this.running && vd.length() > GAIT.walkSpeed + 0.2
    const duration = (run ? GAIT.runDuration : GAIT.walkDuration) * this.stride.duration(vd.length(), GAIT.walkSpeed, GAIT.runSpeed, side)
    const period = duration + STEP.cooldown
    // Velocidade prevista no pouso: a desejada continua subindo na rampa.
    const want = this.cmdVel.clone()
    const ahead = want.sub(vd)
    const maxDv = (run ? GAIT.runAccel : GAIT.accel) * duration
    if (ahead.length() > maxDv) ahead.setLength(maxDv)
    const vPred = vd.clone().add(ahead)
    const braking = vPred.length() < v.length() - 0.1
    const land = com.clone().addScaledVector(v.clone().add(vPred).multiplyScalar(0.5), duration)
    const target = land
      .addScaledVector(vPred, period / 2)
      // Diferença entre a velocidade real e a pretendida: o pé vai para o
      // ponto de captura (freia ou segura um empurrão).
      .addScaledVector(v.clone().sub(vd), braking ? GAIT.brakeGain : GAIT.velGain)
      .add(this.fromLocal(0, side === 'R' ? GAIT.halfWidth : -GAIT.halfWidth))
    // De lado: o pé do lado do movimento abre o dobro e o outro só fecha
    // (as pernas não cruzam, então cada ciclo anda o que o pé da frente abriu).
    const vSide = this.toLocal(vPred).side
    const lead = (side === 'R') === vSide > 0
    target.add(this.fromLocal(0, vSide * period * 0.5 * (lead ? 1 : -1)))
    // Largura mínima em relação ao pé de apoio (não cruza as pernas).
    const rel = this.toLocal(new THREE.Vector3(target.x - stance.x, 0, target.z - stance.z))
    rel.side = side === 'R' ? Math.max(rel.side, STEP.minWidth) : Math.min(rel.side, -STEP.minWidth)
    target.copy(this.fromLocal(rel.forward, rel.side)).add(new THREE.Vector3(stance.x, 0, stance.z))
    // Passada máxima, medida a partir do pé de apoio.
    const fromStance = target.clone().sub(new THREE.Vector3(stance.x, 0, stance.z))
    const maxLen = run ? GAIT.maxStepRun : GAIT.maxStepWalk
    if (fromStance.length() > maxLen) target.copy(fromStance.setLength(maxLen)).add(new THREE.Vector3(stance.x, 0, stance.z))
    const start = new THREE.Vector3(swingFoot.x, swingFoot.y, swingFoot.z)
    target.y = start.y
    this.swing = { side, start, target, t: 0, duration, height: run ? GAIT.runHeight : GAIT.walkHeight }
    adaptSwing(this.physics, this.swing, this.acceptGround)
    this.lastGait = side
    this.gaitStreak++
    this.debug.steps++
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
  /** Braços em condição de agarrar algo. */
  private armsOk() {
    return {
      L: this.damage.region('armL') >= 40 && this.ragdoll.isAttached('handL'),
      R: this.damage.region('armR') >= 40 && this.ragdoll.isAttached('handR'),
    }
  }

  private limbScale(): Partial<Record<PartName, number>> {
    const out: Partial<Record<PartName, number>> = {}
    for (const side of ['L', 'R'] as const) {
      const arm = this.damage.region(side === 'L' ? 'armL' : 'armR')
      const a = arm < 40 ? 0.03 : (0.5 + (0.5 * arm) / 100) * this.armBoost[side]
      out[`upperArm${side}`] = a
      out[`forearm${side}`] = a
      out[`hand${side}`] = a
      // Braço que está alcançando/segurando: motores cedem para a mão ir.
      if (this.grip.side === side && !this.grip.holding) {
        out[`upperArm${side}`] = a * 0.12
        out[`forearm${side}`] = a * 0.12
        out[`hand${side}`] = a * 0.12
      }
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
    // Vertical desejado: inclina um pouco na direção do caminhar.
    const goal = UP.clone().addScaledVector(this.walkVel, GAIT.lean)
    // Agachado: o tronco inclina para a frente (centro de massa sobre os pés).
    if (name !== 'pelvis' && this.crouchNow > 0.01) goal.add(this.fromLocal(CROUCH.lean * this.crouchNow, 0))
    goal.normalize()
    // Eixo (e seno do ângulo) para levar `up` ao vertical: up × Y.
    const accel = new THREE.Vector3().crossVectors(up, goal).multiplyScalar(BALANCE.uprightKp)
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
