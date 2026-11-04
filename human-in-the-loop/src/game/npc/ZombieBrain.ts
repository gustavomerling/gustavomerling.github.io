import * as THREE from 'three'
import { RAPIER, type Physics } from '../engine/physics'
import type { AiState } from './Brain'
import type { BrainContext, BrainDebug, BrainDeps, NpcBrain, NpcKind, PlayerInfo } from './types'
import type { Npc } from './Npc'
import type { Pose } from './poses'
import type { Region } from './Damage'

/**
 * Zumbi: tipo de NPC (`zombie`). Desarmado: só agarra e empurra, sem tirar
 * vida do jogador.
 *
 * Mesma interface do Brain comum, então o Game troca um pelo outro. O corpo
 * continua 100% físico: o cérebro só pede velocidade, olhar e poses.
 *
 * - Cambaleia: velocidade em surtos, paradas, perna esquerda arrastada,
 *   braços à frente, tronco e cabeça tortos (ver `shape`, chamado pelo Npc).
 * - Persegue pela visão ou por proximidade; lembra onde viu por um tempo e
 *   segue tiros ouvidos.
 * - Ataque corpo a corpo: levanta os braços, agarra (deixa o jogador lento
 *   e puxa) e depois empurra para longe. Sem dano de vida.
 * - Não se esquiva nem foge, e dor não o derruba: só morre com um tiro que
 *   destrua a cabeça (limiar próprio). Sem as pernas, rasteja com os braços.
 */
export const ZOMBIE = {
  /** Visão: meio-ângulo (rad) e alcance (m); perto disto (m) ele "sente" sem ver. */
  fovHalf: 1.0,
  range: 22,
  sense: 3.5,
  /** Quanto tempo (s) lembra do jogador depois de perdê-lo de vista. */
  memory: 10,
  /** Velocidade média da perseguição (m/s) e duração do ciclo de surtos (s). */
  speed: 0.95,
  lurchPeriod: 1.9,
  /** A cada tanto (s), para um instante (tropeça). */
  pauseEvery: [4, 8] as [number, number],
  pauseTime: 0.6,
  /** Alcance de agarrar em pé / rastejando (m, do peito do zumbi ao jogador no plano). */
  reach: 1.45,
  crawlReach: 1.1,
  windup: 0.45,
  /** Segura por no máximo isto (s), o jogador fica nesta fração da velocidade, e é puxado a esta velocidade (m/s). */
  holdTime: 1.4,
  holdSlow: 0.35,
  pull: 0.9,
  /** Empurrão final (m/s no jogador) e pausa até o próximo ataque (s). */
  shove: 7,
  /** Dano no jogador: por segundo agarrado e no empurrão final (modos com vida). */
  holdDamage: 9,
  shoveDamage: 8,
  cooldown: 1.8,
  /** Cabeça destruída: saúde da cabeça (0–100) em que um tiro mata. */
  headKillHealth: 35,
}

/** O que o Npc precisa saber para ser zumbi (campo `Npc.traits`). */
export interface NpcTraits {
  /** Saúde da cabeça em que um tiro a destrói (e mata). */
  headKillHealth: number
  /** Ajusta a pose em pé (andar arrastado, braços à frente). */
  shape(pose: Pose, legPhase: number, speed: number): void
}

const clone = (v: [number, number, number] | undefined): [number, number, number] => (v ? [v[0], v[1], v[2]] : [0, 0, 0])

/** Pose de ataque: braços erguidos e abertos para agarrar. */
const LUNGE: Pose = {
  upperArmL: [1.9, 0, -0.35],
  upperArmR: [1.9, 0, 0.35],
  forearmL: [0.15, 0, 0],
  forearmR: [0.15, 0, 0],
  head: [0.1, 0, 0],
  chest: [0.2, 0, 0],
}

export interface ZombieDebug {
  grabs: number
  shoves: number
  attack: 'none' | 'windup' | 'hold' | 'cooldown'
}

type Attack = ZombieDebug['attack']
const UP = new THREE.Vector3(0, 1, 0)

export class ZombieBrain implements NpcBrain {
  readonly kind: NpcKind
  state: AiState = 'idle'
  enabled = true
  readonly debug: BrainDebug = { ai: 'idle', sees: false, aimed: false, threat: 0, reflex: '', cover: false, memory: '' }
  readonly zdebug: ZombieDebug = { grabs: 0, shoves: 0, attack: 'none' }
  readonly cone: THREE.Mesh

  private readonly npc: Npc
  private readonly physics: Physics
  private time = 0
  private sees = false
  private sinceSeen = Infinity
  private readonly lastSeen = new THREE.Vector3()
  private attention: THREE.Vector3 | null = null
  private attack: Attack = 'none'
  private attackT = 0
  private pauseT = 0
  private nextPause = 5
  private walkTarget: THREE.Vector3 | null = null
  private lungeWeight = 0

  private readonly head = new THREE.Vector3()
  private readonly chest = new THREE.Vector3()

  constructor(kind: NpcKind, { npc, physics, scene }: BrainDeps) {
    this.kind = kind
    this.npc = npc
    this.physics = physics
    npc.traits = {
      headKillHealth: ZOMBIE.headKillHealth,
      shape: (pose, phase, speed) => this.shape(pose, phase, speed),
    }
    npc.damage.undying = true
    const geo = new THREE.ConeGeometry(Math.tan(ZOMBIE.fovHalf) * 4, 4, 24, 1, true)
    geo.translate(0, -2, 0)
    geo.rotateX(-Math.PI / 2)
    this.cone = new THREE.Mesh(
      geo,
      new THREE.MeshBasicMaterial({ color: 0x7ab800, transparent: true, opacity: 0.08, depthWrite: false, side: THREE.DoubleSide }),
    )
    this.cone.visible = false
    scene.add(this.cone)
    this.scheduleNextPause()
  }

  reset() {
    this.state = 'idle'
    this.sinceSeen = Infinity
    this.attention = null
    this.walkTarget = null
    this.attack = 'none'
    this.lungeWeight = 0
    this.pauseT = 0
    this.npc.move(null)
    this.npc.crouch = 0
    this.npc.overlay = null
    this.npc.overlayWeight = 0
  }

  /** Ordem de debug (M): vai até o ponto como se tivesse ouvido algo ali. */
  walkTo(point: THREE.Vector3, _run: boolean) {
    this.walkTarget = point.clone().setY(0)
  }

  /** Ouviu um tiro ou golpe: vai para lá (sem se assustar). */
  notice(point: THREE.Vector3, _fright: number) {
    this.attention = point.clone().setY(0)
  }

  /** Dor não o abala. */
  wounded(_region: Region) {}

  dispose() {
    // Troca de tipo: o corpo volta a ser humano comum.
    this.npc.traits = null
    this.npc.damage.undying = false
    this.cone.removeFromParent()
    this.cone.geometry.dispose()
    ;(this.cone.material as THREE.Material).dispose()
  }

  update(dt: number, { player }: BrainContext) {
    const npc = this.npc
    this.time += dt
    const hp = npc.ragdoll.part('head').body.translation()
    this.head.set(hp.x, hp.y, hp.z)
    const cp = npc.ragdoll.part('chest').body.translation()
    this.chest.set(cp.x, cp.y, cp.z)
    this.cone.position.copy(this.head)
    this.cone.rotation.set(0, npc.facing, 0)

    const flat = new THREE.Vector3(player.eye.x - this.chest.x, 0, player.eye.z - this.chest.z)
    const dist = flat.length()
    this.sees = this.canSee(player)
    const near = dist < ZOMBIE.sense
    if (this.sees || near) {
      this.lastSeen.copy(player.eye)
      this.sinceSeen = 0
    } else this.sinceSeen += dt
    this.debug.sees = this.sees
    this.debug.threat = 0
    this.debug.aimed = false
    this.debug.reflex = ''

    // A pose de ataque sobe rápido e desce devagar; só vale em pé.
    const wantLunge = this.attack === 'windup' || this.attack === 'hold' ? 1 : 0
    this.lungeWeight += (wantLunge - this.lungeWeight) * (1 - Math.exp(-(wantLunge ? 10 : 4) * dt))
    npc.overlay = LUNGE
    npc.overlayWeight = npc.state === 'standing' ? this.lungeWeight : 0

    if (!this.enabled) {
      this.setState('idle')
      npc.move(null)
      npc.lookTarget = null
      return
    }
    if (npc.isDead) {
      this.setState('dead')
      this.attack = 'none'
      npc.move(null)
      return
    }
    if (npc.state === 'crawling') {
      // Sem as pernas: sente o jogador de longe e rasteja até ele.
      npc.lookTarget = dist < 30 ? player.eye.clone() : null
      this.setState('crawl')
      this.fight(dt, player, dist, flat, ZOMBIE.crawlReach, 0.5)
      return
    }
    if (npc.state !== 'standing') {
      // Caído, caindo ou levantando: o corpo decide.
      this.setState('body')
      this.attack = 'none'
      npc.move(null)
      return
    }

    // --- Em pé: objetivo = onde viu o jogador, senão o último barulho -------
    let goal: THREE.Vector3 | null = null
    if (this.sinceSeen < ZOMBIE.memory) goal = this.lastSeen
    else if (this.walkTarget) goal = this.walkTarget
    else if (this.attention) goal = this.attention
    npc.lookTarget = this.sees || near ? player.eye.clone() : goal ? goal.clone().setY(1.5) : null
    if (!goal) {
      this.setState('idle')
      this.attack = 'none'
      npc.move(null)
      return
    }
    if (this.fight(dt, player, dist, flat, ZOMBIE.reach, ZOMBIE.holdSlow)) return

    this.setState('chase')
    const to = new THREE.Vector3(goal.x - this.chest.x, 0, goal.z - this.chest.z)
    if (to.length() < 0.8) {
      // Chegou ao ponto sem achar ninguém.
      if (goal === this.attention) this.attention = null
      if (goal === this.walkTarget) this.walkTarget = null
      npc.move(null)
      return
    }
    this.steer(to.normalize(), dt)
  }

  // --- Ataque -----------------------------------------------------------------

  /**
   * Ciclo agarrar/empurrar. Retorna true se está atacando (não anda).
   * Sequência: windup (braços erguidos) → hold (agarra: jogador lento e
   * puxado) → shove (empurra para longe) → cooldown.
   */
  private fight(dt: number, player: PlayerInfo, dist: number, flat: THREE.Vector3, reach: number, slow: number) {
    const inReach = dist < reach && Math.abs(player.eye.y - this.chest.y) < 1.6 && (this.sees || dist < ZOMBIE.sense)
    this.attackT += dt
    switch (this.attack) {
      case 'none':
        if (inReach) {
          this.attack = 'windup'
          this.attackT = 0
        }
        break
      case 'windup':
        if (!inReach && this.attackT > 0.2) this.attack = 'none'
        else if (this.attackT >= ZOMBIE.windup) {
          this.attack = 'hold'
          this.attackT = 0
          this.zdebug.grabs++
        }
        break
      case 'hold': {
        // Alcance folgado: se o jogador escapou, solta.
        if (dist > reach * 1.35) {
          this.attack = 'cooldown'
          this.attackT = ZOMBIE.cooldown * 0.5
          break
        }
        player.slow?.(slow)
        player.damage?.(ZOMBIE.holdDamage * dt)
        const dir = flat.clone().setY(0).normalize()
        player.shove?.(-dir.x * ZOMBIE.pull * dt * 5, -dir.z * ZOMBIE.pull * dt * 5)
        if (this.attackT >= ZOMBIE.holdTime) {
          // Empurra para longe (no sentido zumbi → jogador).
          player.shove?.(dir.x * ZOMBIE.shove, dir.z * ZOMBIE.shove)
          player.damage?.(ZOMBIE.shoveDamage)
          this.zdebug.shoves++
          this.attack = 'cooldown'
          this.attackT = 0
        }
        break
      }
      case 'cooldown':
        if (this.attackT >= ZOMBIE.cooldown) this.attack = 'none'
        break
    }
    this.zdebug.attack = this.attack
    if (this.attack === 'none') return false
    // Atacando: fica perto devagar (sem empurrar o jogador com o corpo).
    if (this.npc.state === 'standing') {
      const dir = flat.clone().setY(0).normalize()
      this.npc.move(dist > 0.9 && this.attack !== 'cooldown' ? dir.multiplyScalar(0.3) : null, null)
    }
    this.state = this.npc.state === 'standing' ? 'attack' : this.state
    this.debug.ai = this.state
    return this.npc.state === 'standing'
  }

  // --- Movimento --------------------------------------------------------------

  /** Cambaleia na direção `dir`: surtos de velocidade, paradas e desvio de obstáculos. */
  private steer(dir: THREE.Vector3, dt: number) {
    if (this.pauseT > 0) {
      this.pauseT -= dt
      this.npc.move(null, null)
      return
    }
    if (this.time > this.nextPause) {
      this.pauseT = ZOMBIE.pauseTime
      this.scheduleNextPause()
    }
    const surge = 0.45 + 0.55 * Math.max(0, Math.sin((this.time / ZOMBIE.lurchPeriod) * Math.PI * 2))
    const blocked = (d: THREE.Vector3) => {
      for (const h of [0.45, 1.0]) {
        const from = this.chest.clone().setY(this.chest.y - 1.35 + h + 0.3)
        if (!this.clearLine(from, from.clone().addScaledVector(d, 1.5))) return true
      }
      return false
    }
    let d = dir
    if (blocked(d)) {
      for (const a of [0.5, -0.5, 1.0, -1.0, 1.5, -1.5]) {
        const c = dir.clone().applyAxisAngle(UP, a)
        if (!blocked(c)) {
          d = c
          break
        }
      }
    }
    this.npc.move(d.clone().multiplyScalar(ZOMBIE.speed * surge * 1.35), null, false)
  }

  private scheduleNextPause() {
    const [a, b] = ZOMBIE.pauseEvery
    this.nextPause = this.time + a + Math.random() * (b - a)
  }

  /**
   * Postura de zumbi, somada pelo Npc à pose em pé: braços à frente
   * balançando pouco, tronco curvado e torto, cabeça caída de lado, perna
   * esquerda arrastada (menos joelho dobrado, pé rente ao chão).
   */
  private shape(pose: Pose, phase: number, speed: number) {
    const sway = Math.sin(this.time * 1.3)
    const arm = Math.min(1, speed / 0.5)
    pose.upperArmL = [1.35 + 0.12 * sway, 0, -0.18]
    pose.upperArmR = [1.45 - 0.12 * sway, 0, 0.14]
    pose.forearmL = [0.3, 0, 0]
    pose.forearmR = [0.45, 0, 0]
    const chest = clone(pose.chest)
    pose.chest = [chest[0] + 0.2, chest[1] + 0.08 * sway, chest[2] + 0.1]
    const head = clone(pose.head)
    pose.head = [head[0] + 0.1, head[1], head[2] + 0.28]
    if (speed > 0.1) {
      // Assimetria: a perna esquerda não levanta, arrasta.
      const shin = clone(pose.shinL)
      const thigh = clone(pose.thighL)
      pose.shinL = [shin[0] * 0.35, shin[1], shin[2]]
      pose.thighL = [thigh[0] * 0.75, thigh[1], thigh[2] + 0.06]
      const foot = clone(pose.footL)
      pose.footL = [foot[0] + 0.25 * arm, foot[1], foot[2]]
      // Quadril cai um pouco para o lado da perna arrastada.
      const abd = clone(pose.abdomen)
      pose.abdomen = [abd[0], abd[1] + 0.1 * phase, abd[2] - 0.08]
    }
  }

  // --- Percepção --------------------------------------------------------------

  private canSee(player: PlayerInfo) {
    const to = player.eye.clone().sub(this.head)
    if (to.length() > ZOMBIE.range) return false
    const yaw = this.npc.facing
    const fwd = new THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw))
    const flat = to.clone().setY(0).normalize()
    if (Math.acos(THREE.MathUtils.clamp(fwd.dot(flat), -1, 1)) > ZOMBIE.fovHalf) return false
    return this.clearLine(this.head, player.eye, player.collider)
  }

  private clearLine(from: THREE.Vector3, to: THREE.Vector3, player?: RAPIER.Collider) {
    const dir = to.clone().sub(from)
    const len = dir.length()
    if (len < 1e-3) return true
    dir.divideScalar(len)
    const hit = this.physics.world.castRay(new RAPIER.Ray(from, dir), len, true, undefined, undefined, player, undefined, (c) => {
      const b = c.parent()
      if (b && this.npc.owns(b)) return false
      if (b?.isDynamic() && b.mass() < 15) return false
      return true
    })
    return !hit
  }

  private setState(s: AiState) {
    if (this.attack === 'none' || s === 'dead' || s === 'body') this.state = s
    this.debug.ai = this.state
  }
}
