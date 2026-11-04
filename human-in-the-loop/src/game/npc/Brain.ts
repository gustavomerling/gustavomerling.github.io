import * as THREE from 'three'
import { RAPIER, type Physics } from '../engine/physics'
import type { Npc } from './Npc'
import type { Pose } from './poses'
import type { Region } from './Damage'
import type { BrainContext, BrainDebug, BrainDeps, NpcBrain, NpcConfig, NpcKind, PlayerInfo } from './types'
import { Memory } from './Memory'
import { NavGrid, solid } from './Navigation'

export type { BrainDebug, PlayerInfo }

/**
 * Cobertura: onde ficar (colado atrás do obstáculo, do lado oposto à
 * ameaça), a altura do topo do obstáculo e quanto agachar para a cabeça
 * sumir atrás dele (0 = em pé basta; 1 = agachado; `low` = precisa agachar).
 * `partial`: nem agachado a cabeça some, só o tronco.
 */
export interface Cover {
  pos: THREE.Vector3
  low: boolean
  crouch: number
  top: number
  partial: boolean
}

/**
 * Altura (m acima do chão) do topo da cabeça e do centro do peito do NPC
 * para um agachamento c (0..1), medidas no corpo físico (cenário
 * "cover: agachar" dos testes headless; ver CROUCH em Npc.ts).
 */
const crouchTable = (c: number, [a, b, d]: [number, number, number]) =>
  c <= 0.5 ? a + (b - a) * (Math.max(0, c) / 0.5) : b + (d - b) * ((Math.min(1, c) - 0.5) / 0.5)

export const COVER_BODY = {
  head: (c: number) => crouchTable(c, [1.78, 1.59, 1.14]),
  chest: (c: number) => crouchTable(c, [1.4, 1.26, 0.91]),
  /** Folga entre o corpo e o obstáculo (m, do centro do corpo à face). */
  hug: 0.47,
  /** Distância (m) a partir da qual ele começa a agachar chegando. */
  duckFrom: 1.4,
}

/**
 * IA do NPC (passos 21–25). Não move o corpo diretamente: decide uma
 * velocidade/direção (Npc.move), o agachamento, a pose de reflexo e para
 * onde olhar. O corpo continua 100% físico.
 *
 * Estados: ocioso → alerta (vê o jogador) → ameaçado (mira nele) →
 * esquivando / fugindo / cobertura. Caído, levantando e inconsciente vêm
 * do corpo e suspendem as decisões.
 */
export const AI = {
  /** Visão: meio-ângulo do cone (rad) e alcance (m). */
  fovHalf: 1.15,
  range: 30,
  /** Mira: distância (m) entre a linha de mira e o peito que conta como "mirando nele". */
  aimRadius: 0.9,
  /** Ameaça sobe por segundo mirado (×2 em iron sight) e desce sozinha. */
  threatGain: 1.4,
  threatDecay: 0.5,
  /** Ameaça para reagir. */
  threatLimit: 0.45,
  /** Perto disto (m) ele esquiva em vez de fugir. */
  dodgeRange: 7,
  dodgeCooldown: 1.6,
  /** Foge até esta distância (m) ou até ficar fora da vista. */
  safeDistance: 16,
  /** Distância que ele prefere manter de um jogador armado (m). */
  personalSpace: 2.2,
  /** Reflexos: objeto vindo a mais de X m/s, passando a menos de Y m, chegando em até Z s. */
  projectileSpeed: 3.5,
  projectileMiss: 0.75,
  projectileTime: 0.7,
}

export type AiState =
  | 'idle' | 'alert' | 'threatened' | 'dodging' | 'fleeing' | 'cover' | 'walkTo' | 'search' | 'body'
  // Zumbi
  | 'chase' | 'attack' | 'crawl' | 'dead'

/** Poses de reflexo, somadas por cima da pose em pé. */
const REFLEX: Record<'face' | 'chest' | 'head' | 'armL' | 'armR' | 'legL' | 'legR', Pose> = {
  // Braços na frente do rosto, queixo encolhido.
  face: {
    upperArmL: [1.55, 0, 0.45],
    upperArmR: [1.55, 0, -0.45],
    forearmL: [2.3, 0, 0],
    forearmR: [2.3, 0, 0],
    head: [-0.25, 0, 0],
    chest: [-0.1, 0, 0],
  },
  // Segura o peito/barriga.
  chest: { upperArmR: [0.55, 0, -0.35], forearmR: [2.0, 0, 0], upperArmL: [0.45, 0, 0.3], forearmL: [1.7, 0, 0], chest: [-0.15, 0, 0] },
  head: { upperArmL: [2.2, 0, -0.2], upperArmR: [2.2, 0, 0.2], forearmL: [2.2, 0, 0], forearmR: [2.2, 0, 0], head: [-0.2, 0, 0] },
  // Uma mão segura o outro braço.
  armL: { upperArmR: [0.7, 0, -0.4], forearmR: [1.5, 0, 0] },
  armR: { upperArmL: [0.7, 0, 0.4], forearmL: [1.5, 0, 0] },
  legL: { upperArmL: [0.15, 0, 0.05], forearmL: [0.5, 0, 0], chest: [-0.2, 0, 0], abdomen: [-0.15, 0, 0] },
  legR: { upperArmR: [0.15, 0, -0.05], forearmR: [0.5, 0, 0], chest: [-0.2, 0, 0], abdomen: [-0.15, 0, 0] },
}

const UP = new THREE.Vector3(0, 1, 0)

/** Cérebro do civil (e, por enquanto, base provisória dos outros tipos). */
export class Brain implements NpcBrain {
  readonly kind: NpcKind
  state: AiState = 'idle'
  enabled = true
  readonly debug: BrainDebug = { ai: 'idle', sees: false, aimed: false, threat: 0, reflex: '', cover: false, memory: '' }

  /** Memória (últimas posições, tiros, coberturas, feridas). */
  readonly memory = new Memory()
  private searchDone = false
  private searchLook = 0
  private readonly npc: Npc
  private readonly physics: Physics
  private readonly config: NpcConfig
  private stateTime = 0
  private threat = 0
  private sees = false
  private lastSeen = new THREE.Vector3()
  private sinceSeen = Infinity
  /** Algo chamou a atenção (tiro, golpe): olha para lá. */
  private attention: THREE.Vector3 | null = null
  private attentionTime = 0
  private dodgeCooldown = 0
  private dodgeDir = new THREE.Vector3()
  private zigTimer = 0
  private hiddenTime = 0
  private zig = 1
  private cover: Cover | null = null
  /** Caminho atual (navegação em grade) e controle de progresso. */
  private readonly grid: NavGrid
  private nav: { target: THREE.Vector3; path: THREE.Vector3[]; i: number; age: number; best: number; stuck: number } | null = null
  private coverCheck = 0
  private walkTarget: THREE.Vector3 | null = null
  private walkRun = false
  /** Reflexo ativo: pose, peso e tempo restante. */
  private reflexPose: Pose | null = null
  private reflexName = ''
  private reflexTime = 0
  private reflexWeight = 0
  /** Região atingida há pouco (para segurar e proteger). */
  private hurt: { region: Region; time: number } | null = null

  private readonly head = new THREE.Vector3()
  private readonly chest = new THREE.Vector3()
  private readonly tmp = new THREE.Vector3()

  /** Cone de visão (debug). */
  readonly cone: THREE.Mesh

  constructor(kind: NpcKind, { npc, physics, scene, config }: BrainDeps) {
    this.kind = kind
    this.npc = npc
    this.physics = physics
    this.config = config
    this.grid = new NavGrid(physics, { own: (b) => npc.owns(b) })
    const geo = new THREE.ConeGeometry(Math.tan(config.vision.fovHalf) * 4, 4, 24, 1, true)
    geo.translate(0, -2, 0)
    geo.rotateX(-Math.PI / 2)
    this.cone = new THREE.Mesh(
      geo,
      new THREE.MeshBasicMaterial({ color: 0xffc400, transparent: true, opacity: 0.08, depthWrite: false, side: THREE.DoubleSide }),
    )
    this.cone.visible = false
    scene.add(this.cone)
  }

  reset() {
    this.state = 'idle'
    this.threat = 0
    this.sinceSeen = Infinity
    this.attention = null
    this.cover = null
    this.nav = null
    this.walkTarget = null
    this.reflexPose = null
    this.reflexWeight = 0
    this.hurt = null
    this.memory.clear()
    this.searchDone = false
    this.npc.move(null)
    this.npc.crouch = 0
    this.npc.overlay = null
    this.npc.overlayWeight = 0
  }

  /** Ordem de debug: andar (ou correr) até um ponto. */
  walkTo(point: THREE.Vector3, run: boolean) {
    this.walkTarget = point.clone().setY(0)
    this.walkRun = run
    this.cover = null
    this.nav = null
    this.setState('walkTo')
  }

  /** Ouviu um tiro ou levou um golpe: presta atenção (e se assusta). */
  notice(point: THREE.Vector3, fright: number) {
    this.attention = point.clone()
    this.memory.heardShot(point)
    this.attentionTime = 2.5
    this.threat = Math.min(2, this.threat + fright)
  }

  /** Foi atingido numa região: segura o lugar e se vira para protegê-lo. */
  wounded(region: Region) {
    this.hurt = { region, time: 2.2 }
    // Se estava na cobertura e foi atingido, ela está exposta.
    if (this.state === 'cover' && this.cover) this.memory.coverExposed(this.cover.pos)
    this.memory.wound(region, this.sees ? this.lastSeen : this.attention ?? this.memory.lastPlayer()?.pos ?? null)
    this.threat = Math.min(2, this.threat + 0.6)
    if (region !== 'head') this.reflex(REFLEX[region === 'torso' ? 'chest' : region], `segura ${region}`, 1.4)
    else this.reflex(REFLEX.head, 'segura a cabeça', 1.2)
  }

  dispose() {
    this.cone.removeFromParent()
    this.cone.geometry.dispose()
    ;(this.cone.material as THREE.Material).dispose()
  }

  update(dt: number, { player }: BrainContext) {
    const npc = this.npc
    if (npc.isDead) {
      npc.lookTarget = null
      return
    }
    this.stateTime += dt
    this.memory.update(dt)
    this.dodgeCooldown = Math.max(0, this.dodgeCooldown - dt)
    this.attentionTime -= dt
    if (this.attentionTime <= 0) this.attention = null
    if (this.hurt && (this.hurt.time -= dt) <= 0) this.hurt = null

    const hp = npc.ragdoll.part('head').body.translation()
    this.head.set(hp.x, hp.y, hp.z)
    const cp = npc.ragdoll.part('chest').body.translation()
    this.chest.set(cp.x, cp.y, cp.z)
    this.updateCone()

    // --- Percepção ----------------------------------------------------------
    this.sees = this.canSee(player)
    if (this.sees) {
      this.lastSeen.copy(player.eye)
      this.sinceSeen = 0
      this.memory.seenPlayer(player.eye)
      this.searchDone = false
    } else this.sinceSeen += dt
    const caution = this.memory.caution
    // Ferido, fica atento por mais tempo e se assusta mais cedo.
    const aware = this.sinceSeen < 4 + caution * 4
    const aimed = this.sees && player.weapon === 'gun' && this.aimDistance(player) < AI.aimRadius * (1 - 0.3 * player.ads)
    const gain = aimed ? AI.threatGain * (1 + player.ads) : -AI.threatDecay
    this.threat = THREE.MathUtils.clamp(this.threat + gain * dt, 0, 2)
    const toPlayer = this.tmp.copy(player.eye).sub(this.chest).setY(0)
    const dist = toPlayer.length()
    // Exposto = o jogador tem linha livre até o peito (mesmo de costas).
    const exposed = this.clearLine(player.eye, this.chest, player.collider)
    this.hiddenTime = exposed ? 0 : this.hiddenTime + dt

    // Para onde olhar: o jogador se vê, senão onde algo aconteceu.
    npc.lookTarget = this.sees ? player.eye.clone() : this.attention ?? (aware ? this.lastSeen.clone() : null)

    // --- Reflexos (rodam mesmo durante outras ações) -------------------------
    if (npc.state === 'standing') {
      const incoming = this.incoming(player)
      if (incoming) {
        this.reflex(REFLEX.face, 'protege o rosto', 0.6)
        // Dá tempo: sai da frente.
        if (incoming.time > 0.25 && this.dodgeCooldown <= 0) this.dodge(incoming.side)
      }
      if (player.swinging && dist < 2.4 && this.sees) this.reflex(REFLEX.face, 'guarda (golpe)', 0.5)
    }
    this.updateReflex(dt)

    this.debug.sees = this.sees
    this.debug.aimed = aimed
    this.debug.threat = this.threat
    this.debug.reflex = this.reflexTime > 0 ? this.reflexName : ''
    this.debug.memory = this.memory.summary()
    this.debug.cover = this.cover !== null && this.state === 'cover'

    if (!this.enabled) {
      if (this.state !== 'idle') this.setState('idle')
      npc.move(null)
      npc.crouch = 0
      return
    }
    // Corpo fora de controle: nada a decidir.
    if (npc.state !== 'standing') {
      if (this.state !== 'body') this.setState('body')
      npc.move(null)
      npc.crouch = 0
      this.debug.ai = 'body'
      return
    }
    if (this.state === 'body') this.setState(aware ? 'alert' : 'idle')

    // --- Decisão --------------------------------------------------------------
    const facePlayer = aware ? Math.atan2(-(this.lastSeen.x - this.chest.x), -(this.lastSeen.z - this.chest.z)) : null
    const scared = this.threat > AI.threatLimit * (1 - 0.4 * caution)

    switch (this.state) {
      case 'walkTo': {
        if (!this.walkTarget) break
        if (this.navigateTo(this.walkTarget, this.walkRun, 0.35)) {
          this.walkTarget = null
          this.setState('idle')
        }
        if (scared) this.setState('threatened')
        break
      }
      case 'search': {
        const last = this.memory.lastPlayer()
        if (!last || this.searchDone) {
          this.setState('idle')
          break
        }
        if (scared) {
          this.setState('threatened')
          break
        }
        if (this.sees) {
          this.setState('alert')
          break
        }
        // Chega devagar (mais cauteloso, mais devagar) e varre o olhar.
        const target = last.pos
        if (this.navigateTo(target, false, 1.0)) {
          this.searchLook += dt
          const base = Math.atan2(-(target.x - this.chest.x), -(target.z - this.chest.z))
          npc.move(null, base + Math.sin(this.searchLook * 1.3) * 1.3)
          npc.lookTarget = null
          if (this.searchLook > 5) {
            this.searchDone = true
            this.setState('idle')
          }
        } else if (this.stateTime > 12) {
          this.searchDone = true
          this.setState('idle')
        }
        break
      }
      case 'idle':
      case 'alert': {
        npc.crouch = 0
        if (scared) {
          this.setState('threatened')
          break
        }
        if (this.state === 'idle' && (aware || this.attention)) this.setState('alert')
        if (this.state === 'alert' && !aware && !this.attention && this.stateTime > 3) {
          // Perdeu o jogador: vai olhar onde o viu por último, em vez de esquecer.
          if (!this.searchDone && this.memory.lastPlayer()) {
            this.searchLook = 0
            this.setState('search')
          } else this.setState('idle')
        }
        // Encara o jogador (depois de frear); armado e perto demais, recua devagar.
        const fast = Math.hypot(npc.velocity.x, npc.velocity.z) > 1
        let face = fast ? null : facePlayer
        if (face === null && this.attention) face = Math.atan2(-(this.attention.x - this.chest.x), -(this.attention.z - this.chest.z))
        if (face !== null && this.hurt) face += this.protectTurn()
        if (aware && player.weapon !== 'hands' && dist < AI.personalSpace) {
          const away = toPlayer.clone().normalize().multiplyScalar(-0.7)
          npc.move(away, face)
        } else npc.move(null, face)
        break
      }
      case 'threatened': {
        // Decide: perto esquiva, longe procura cobertura ou foge.
        if (dist < AI.dodgeRange && this.dodgeCooldown <= 0) {
          this.dodge(this.sideOfAim(player))
          this.setState('dodging')
        } else {
          const cover = this.findCover(player)
          if (cover) {
            this.cover = cover
            this.setState('cover')
          } else {
            this.zigTimer = 0
            this.setState('fleeing')
          }
        }
        break
      }
      case 'dodging': {
        npc.move(null, facePlayer)
        this.threat = Math.max(this.threat, AI.threatLimit)
        if (this.stateTime > 0.9) {
          // Ainda mirado de perto: outra esquiva ou parte para a cobertura.
          if (scared) {
            const cover = dist > 3 ? this.findCover(player) : null
            if (cover) {
              this.cover = cover
              this.setState('cover')
            } else if (this.dodgeCooldown <= 0) {
              this.dodge(-Math.sign(this.dodgeDir.x || 1))
              this.stateTime = 0
            } else if (dist > 4) this.setState('fleeing')
          } else this.setState('alert')
        }
        break
      }
      case 'fleeing': {
        npc.crouch = 0
        this.threat = Math.max(this.threat, AI.threatLimit + 0.1)
        // Corre para longe em zigue-zague (sai da linha de tiro).
        this.zigTimer -= dt
        if (this.zigTimer <= 0) {
          this.zigTimer = 1.0 + Math.random() * 0.5
          this.zig = -this.zig
        }
        const away = this.chest.clone().sub(this.lastSeen).setY(0).normalize()
        away.applyAxisAngle(UP, this.zig * 0.3)
        const target = this.chest.clone().addScaledVector(away, 3)
        this.steerTo(target, true, 0)
        // Seguro: longe ou fora da linha de tiro por um tempo.
        if ((dist > AI.safeDistance || this.hiddenTime > 1) && this.stateTime > 1.5) {
          const cover = this.findCover(player)
          if (cover) {
            this.cover = cover
            this.setState('cover')
          } else this.setState('alert')
        }
        // Periodicamente procura cobertura melhor no caminho.
        if (this.stateTime > 1 && Math.floor(this.stateTime * 2) !== Math.floor((this.stateTime - dt) * 2)) {
          const cover = this.findCover(player)
          if (cover) {
            this.cover = cover
            this.setState('cover')
          }
        }
        break
      }
      case 'cover': {
        const c = this.cover
        if (!c) {
          this.setState('alert')
          break
        }
        const threatPos = this.threatPos(player)
        if (this.approachCover(c, threatPos)) this.memory.coverUsed(c.pos)
        // Cobertura "furada" (o jogador deu a volta): procura outra.
        this.coverCheck -= dt
        if (this.coverCheck <= 0) {
          this.coverCheck = 0.5
          if (!this.coverHolds(c, this.threatPos(player), player.collider)) {
            this.memory.coverExposed(c.pos)
            const next = this.findCover(player)
            if (next) this.cover = next
            else {
              this.cover = null
              this.setState(scared ? 'fleeing' : 'alert')
            }
          }
        }
        // Calmo há um tempo: sai da cobertura.
        if (!scared && this.stateTime > 6 && this.threat < 0.05) {
          this.cover = null
          npc.crouch = 0
          this.setState('alert')
        }
        break
      }
      default:
        break
    }
    this.debug.ai = this.state
  }

  // --- Percepção ----------------------------------------------------------------

  /** Jogador dentro do cone de visão e sem nada no caminho. */
  private canSee(player: PlayerInfo) {
    const to = player.eye.clone().sub(this.head)
    const dist = to.length()
    if (dist > this.config.vision.range) return false
    const yaw = this.npc.facing
    const fwd = new THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw))
    const flat = to.clone().setY(0).normalize()
    if (Math.acos(THREE.MathUtils.clamp(fwd.dot(flat), -1, 1)) > this.config.vision.fovHalf) {
      // Muito perto, "sente" a presença mesmo fora do cone.
      return dist < 1.2
    }
    return this.clearLine(this.head, player.eye, player.collider)
  }

  /** Linha livre entre dois pontos (ignora o próprio NPC e o jogador). */
  clearLine(from: THREE.Vector3, to: THREE.Vector3, player?: RAPIER.Collider) {
    const world = this.physics.world
    const dir = to.clone().sub(from)
    const len = dir.length()
    if (len < 1e-3) return true
    dir.divideScalar(len)
    const hit = world.castRay(
      new RAPIER.Ray(from, dir),
      len,
      true,
      undefined,
      undefined,
      player,
      undefined,
      (c) => {
        const b = c.parent()
        if (b && this.npc.owns(b)) return false
        // Objetos pequenos e soltos não bloqueiam a visão.
        if (b?.isDynamic() && b.mass() < 15) return false
        return true
      },
    )
    return !hit
  }

  /** Distância (m) do peito do NPC até a linha de mira do jogador. */
  private aimDistance(player: PlayerInfo) {
    const rel = this.chest.clone().sub(player.eye)
    const t = rel.dot(player.aimDir)
    if (t < 0) return Infinity
    return rel.addScaledVector(player.aimDir, -t).length()
  }

  /** De que lado da linha de mira ele está (+1 = direita dele): esquiva para esse lado. */
  private sideOfAim(player: PlayerInfo) {
    const yaw = this.npc.facing
    const right = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw))
    const rel = this.chest.clone().sub(player.eye)
    const t = rel.dot(player.aimDir)
    const off = rel.addScaledVector(player.aimDir, -t)
    const s = off.dot(right)
    return Math.abs(s) < 0.05 ? (Math.random() < 0.5 ? -1 : 1) : Math.sign(s)
  }

  /**
   * Objeto vindo na direção dele (arremessado, chutado): o mais perigoso
   * que passa perto da cabeça/peito em pouco tempo.
   */
  private incoming(player: PlayerInfo): { time: number; side: number } | null {
    let best: { time: number; side: number } | null = null
    const yaw = this.npc.facing
    const right = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw))
    const target = this.chest.clone().lerp(this.head, 0.5)
    this.physics.world.bodies.forEach((b) => {
      if (!b.isDynamic() || this.npc.owns(b) || b.isSleeping()) return
      if (player.collider.parent()?.handle === b.handle) return
      const v = b.linvel()
      const speed = Math.hypot(v.x, v.y, v.z)
      if (speed < AI.projectileSpeed) return
      const p = b.translation()
      const rel = new THREE.Vector3(target.x - p.x, target.y - p.y, target.z - p.z)
      const vel = new THREE.Vector3(v.x, v.y, v.z)
      const t = rel.dot(vel) / (speed * speed)
      if (t < 0 || t > AI.projectileTime) return
      // Ponto mais próximo (com um pouco de queda pela gravidade).
      const closest = new THREE.Vector3(p.x, p.y, p.z).addScaledVector(vel, t)
      closest.y -= 0.5 * 9.81 * t * t
      const miss = closest.clone().sub(target)
      if (miss.length() > AI.projectileMiss) return
      // Sai para o lado contrário de onde vem / de onde vai passar.
      const s = miss.dot(right)
      const side = Math.abs(s) > 0.05 ? -Math.sign(s) : Math.sign(new THREE.Vector3(-vel.z, 0, vel.x).dot(right) || 1)
      this.memory.danger(closest, speed)
      if (!best || t < best.time) best = { time: t, side }
    })
    return best
  }

  // --- Ações -------------------------------------------------------------------

  /** Esquiva física: um impulso lateral no tronco + agachada; os passos de recuperação seguram. */
  private dodge(side: number) {
    if (this.dodgeCooldown > 0) return
    this.dodgeCooldown = AI.dodgeCooldown
    const yaw = this.npc.facing
    this.dodgeDir.set(Math.cos(yaw), 0, -Math.sin(yaw)).multiplyScalar(side)
    this.npc.dodge(this.dodgeDir)
  }

  private reflex(pose: Pose, name: string, seconds: number) {
    // Proteger o rosto tem prioridade sobre segurar um ferimento.
    if (this.reflexTime > 0 && this.reflexName.startsWith('protege') && !name.startsWith('protege')) return
    this.reflexPose = pose
    this.reflexName = name
    this.reflexTime = Math.max(seconds, name === this.reflexName ? this.reflexTime : 0)
  }

  private updateReflex(dt: number) {
    this.reflexTime -= dt
    const want = this.reflexTime > 0 ? 1 : 0
    // Sobe rápido (reflexo), desce devagar.
    const rate = want > this.reflexWeight ? 14 : 3
    this.reflexWeight += (want - this.reflexWeight) * (1 - Math.exp(-rate * dt))
    this.npc.overlay = this.reflexPose
    this.npc.overlayWeight = this.reflexWeight
  }

  /** Giro (rad) para afastar o lado ferido do jogador. */
  private protectTurn() {
    const r = this.hurt?.region
    if (r === 'armL' || r === 'legL') return -0.45
    if (r === 'armR' || r === 'legR') return 0.45
    return 0
  }

  /**
   * Anda até um ponto desviando de obstáculos simples (raios à frente na
   * altura da cintura). Retorna true ao chegar.
   */
  steerTo(target: THREE.Vector3, run: boolean, radius: number, face: number | null = null, remaining?: number) {
    const to = target.clone().sub(this.chest).setY(0)
    const dist = to.length()
    if (dist < Math.max(radius, 0.2)) {
      this.npc.move(null, face)
      return true
    }
    let dir = to.divideScalar(dist)
    const look = Math.min(1.6, dist)
    // Raios na altura do joelho/cintura (acima de um degrau, abaixo de uma
    // caixa) e do peito: caixas baixas também contam como obstáculo.
    const feetY = this.chest.y - 1.4
    const blocked = (d: THREE.Vector3) => {
      for (const h of [0.5, 1.1]) {
        const from = this.chest.clone().setY(feetY + h)
        if (!this.clearLine(from, from.clone().addScaledVector(d, look))) return true
      }
      return false
    }
    if (blocked(dir)) {
      for (const a of [0.5, -0.5, 1.0, -1.0, 1.5, -1.5]) {
        const d = dir.clone().applyAxisAngle(UP, a)
        if (!blocked(d)) {
          dir = d
          break
        }
      }
    }
    // Freia chegando.
    const left = remaining ?? dist
    // Freia chegando (o corpo tem inércia: chegar rápido numa parede derruba).
    const speed = Math.min(run ? 9 : 1.3, 0.3 + left * 0.9)
    // Continua no modo corrida enquanto a rampa de freada ainda está acima do andar
    // (trocar de repente para o andar com o corpo embalado faz tropeçar).
    this.npc.move(dir.multiplyScalar(speed), face, run && speed > 1.3)
    return false
  }

  /** Onde está a ameaça: o jogador, se visto; senão onde foi visto/ouvido. */
  threatPos(player: PlayerInfo) {
    if (this.sees) return player.eye.clone()
    if (this.sinceSeen < 8) return this.lastSeen.clone()
    return this.attention?.clone() ?? player.eye.clone()
  }

  /**
   * Anda por um caminho planejado (grade + A*) até `target`, desviando de
   * paredes e caixas; com `threat`, prefere passar escondido. Replaneja se
   * o alvo muda, se empaca ou de tempos em tempos. Retorna true ao chegar.
   */
  navigateTo(target: THREE.Vector3, run: boolean, radius: number, face: number | null = null, threat: THREE.Vector3 | null = null) {
    const me = this.chest.clone().setY(0)
    const goal = target.clone().setY(0)
    if (me.distanceTo(goal) < Math.max(radius, 0.2)) {
      this.npc.move(null, face)
      this.nav = null
      return true
    }
    const dt = 1 / 60
    let nav = this.nav
    if (!nav || nav.target.distanceTo(goal) > 0.5 || nav.age > 4 || nav.stuck > 1.5) {
      const path = this.grid.plan(me, goal, threat)
      if (!path) {
        this.nav = null
        return this.steerTo(goal, run, radius, face)
      }
      nav = this.nav = { target: goal, path, i: 1, age: 0, best: Infinity, stuck: 0 }
    }
    nav.age += dt
    // Avança o ponto do caminho quando chega perto dele.
    while (nav.i < nav.path.length - 1 && me.distanceTo(nav.path[nav.i]) < 0.55) nav.i++
    let remaining = me.distanceTo(nav.path[nav.i])
    for (let k = nav.i; k < nav.path.length - 1; k++) remaining += nav.path[k].distanceTo(nav.path[k + 1])
    // Empacou (sem progresso)? Replaneja.
    if (remaining < nav.best - 0.25) {
      nav.best = remaining
      nav.stuck = 0
    } else nav.stuck += dt
    // A velocidade freia pela distância que falta no caminho, não até a curva.
    this.steerTo(nav.path[nav.i], run, 0.05, face, remaining)
    return false
  }

  /**
   * Vai até a cobertura e se abaixa conforme a altura dela: começa a
   * agachar perto, e lá fica encarando a ameaça. Retorna true se está lá.
   */
  approachCover(c: Cover, threat: THREE.Vector3) {
    const npc = this.npc
    const d = this.chest.clone().setY(0).distanceTo(c.pos)
    const face = Math.atan2(-(threat.x - this.chest.x), -(threat.z - this.chest.z))
    // Longe: corre olhando o caminho; perto: encara a ameaça.
    const there = this.navigateTo(c.pos, d > 3, 0.3, d < 2 ? face : null, threat)
    const duck = THREE.MathUtils.clamp((COVER_BODY.duckFrom - d) / (COVER_BODY.duckFrom - 0.3), 0, 1)
    npc.crouch = c.crouch * (there ? 1 : duck)
    if (there) npc.move(null, face)
    return there
  }

  /**
   * Procura cobertura contra a ameaça: amostra pontos ao redor, acha o
   * obstáculo entre cada ponto e a ameaça e se cola atrás dele; mede a
   * altura do obstáculo para saber se dá para ficar em pé ou quanto
   * agachar. Escolhe pelo comprimento do caminho real (A*), evitando ir em
   * direção à ameaça e coberturas que só escondem o tronco.
   */
  findCover(player: PlayerInfo, threat: THREE.Vector3 = this.threatPos(player)): Cover | null {
    const world = this.physics.world
    const own = (b: RAPIER.RigidBody) => this.npc.owns(b)
    const me = this.chest.clone().setY(0)
    const threatFlat = threat.clone().setY(0)
    const seen: THREE.Vector3[] = []
    const cands: (Cover & { score: number })[] = []
    const rayHit = (from: THREE.Vector3, dir: THREE.Vector3, len: number) =>
      world.castRay(new RAPIER.Ray(from, dir), len, true, undefined, undefined, player.collider, undefined, (c: RAPIER.Collider) => solid(c, own))
    const DOWN = new THREE.Vector3(0, -1, 0)
    for (let r = 1.5; r <= 12; r += 1.5) {
      const n = Math.round(6 + r * 2.5)
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2
        const p = me.clone().add(new THREE.Vector3(Math.cos(a) * r, 0, Math.sin(a) * r))
        // Da amostra em direção à ameaça, na altura do peito agachado:
        // tem um obstáculo perto? Esse é o anteparo.
        const toThreat = threatFlat.clone().sub(p)
        const tDist = toThreat.length()
        if (tDist < 4) continue
        toThreat.divideScalar(tDist)
        const probeY = 0.75
        const hit = rayHit(p.clone().setY(probeY), toThreat, Math.min(3, tDist - 1))
        if (!hit) continue
        const face = p.clone().addScaledVector(toThreat, hit.timeOfImpact)
        const pos = face.clone().addScaledVector(toThreat, -COVER_BODY.hug).setY(0)
        if (seen.some((q) => q.distanceTo(pos) < 0.5)) continue
        seen.push(pos)
        if (pos.distanceTo(threatFlat) < 4 || this.memory.isCoverBad(pos)) continue
        if (!this.grid.free(pos.x, pos.z)) continue
        // Altura do topo do obstáculo logo à frente da face.
        let top = probeY
        for (const inset of [0.08, 0.2]) {
          const down = rayHit(face.clone().addScaledVector(toThreat, inset).setY(3), DOWN, 3)
          if (down) top = Math.max(top, 3 - down.timeOfImpact)
        }
        // Quanto agachar para a cabeça sumir (checando a linha da ameaça).
        let crouch = -1
        for (const c of [0, 0.35, 0.7, 1]) {
          if (!this.clearLine(threat, pos.clone().setY(COVER_BODY.head(c) - 0.08), player.collider)) {
            crouch = c
            break
          }
        }
        const partial = crouch < 0
        if (partial) {
          // Nem agachado: serve se ao menos o peito agachado some.
          if (this.clearLine(threat, pos.clone().setY(COVER_BODY.chest(1)), player.collider)) continue
          crouch = 1
        }
        // Cobertura de ponta (meio corpo para fora) vale menos: confere
        // um pouco para cada lado.
        const perp = new THREE.Vector3(-toThreat.z, 0, toThreat.x)
        const yHide = partial ? COVER_BODY.chest(1) : COVER_BODY.head(crouch) - 0.08
        let edge = 0
        for (const s of [-0.35, 0.35]) if (this.clearLine(threat, pos.clone().addScaledVector(perp, s).setY(yHide), player.collider)) edge++
        const away = pos.clone().sub(me)
        const towards = away.lengthSq() > 1e-4 ? away.normalize().dot(threatFlat.clone().sub(me).normalize()) : 0
        const score = me.distanceTo(pos) + crouch * 0.6 + (partial ? 4 : 0) + edge * 1.5 + Math.max(0, towards) * 6
        cands.push({ pos, low: crouch > 0, crouch, top, partial, score })
      }
    }
    cands.sort((a, b) => a.score - b.score)
    // Confirma com o caminho de verdade (contornando obstáculos, escondido).
    let best: (Cover & { score: number }) | null = null
    for (const c of cands.slice(0, 4)) {
      const path = this.grid.plan(me, c.pos, threat)
      if (!path) continue
      let len = 0
      for (let k = 0; k < path.length - 1; k++) len += path[k].distanceTo(path[k + 1])
      const score = c.score + (len - me.distanceTo(c.pos))
      if (!best || score < best.score) best = { ...c, score }
    }
    if (!best) return null
    const { score: _score, ...cover } = best
    return cover
  }

  /** A cobertura ainda esconde (a cabeça no agachamento dela, ou o peito se for parcial)? */
  coverHolds(c: Cover, eye: THREE.Vector3, collider?: RAPIER.Collider) {
    const y = c.partial ? COVER_BODY.chest(1) : COVER_BODY.head(c.crouch) - 0.08
    return !this.clearLine(eye, c.pos.clone().setY(y), collider)
  }

  private setState(s: AiState) {
    this.state = s
    this.stateTime = 0
    this.debug.ai = s
  }

  private updateCone() {
    const yaw = this.npc.facing
    this.cone.position.copy(this.head)
    this.cone.rotation.set(0, yaw, 0)
  }
}
