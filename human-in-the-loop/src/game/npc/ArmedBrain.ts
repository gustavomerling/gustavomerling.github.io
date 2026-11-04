import * as THREE from 'three'
import type { Brain, Cover, PlayerInfo } from './Brain'
import type { Npc } from './Npc'
import type { NpcWeapon } from './NpcWeapon'
import { NPC_GUN } from './NpcWeapon'
import type { Pose } from './poses'

/**
 * IA do NPC armado. Roda DEPOIS de `Brain.update` (percepção, reflexos e
 * olhar continuam do Brain) e, enquanto ele empunha a arma e está de pé,
 * assume o movimento: encara o jogador, atira com cadência, vai para a
 * cobertura, espia e atira, recarrega. Sem arma (largou ou caiu), devolve
 * o controle ao Brain (esquiva, foge, procura cobertura).
 *
 * Estados: unarmed → engage ⇄ toCover → covered → peek → toCover ...
 */
export const ARMED = {
  /** Vê o jogador e vira hostil. */
  hostile: true,
  /** Memória (s) de onde viu o jogador por último. */
  memory: 6,
  /** Tempo (s) de braço apontado antes do primeiro tiro de uma espiada. */
  aimSettle: 0.35,
  /**
   * Mira: velocidade (1/s) com que o braço sobe até a mira e desce, e
   * ganho (1/s) das correções de altura (ombro + pulso) e de direção (giro
   * do corpo) que levam o cano até o alvo. Baixos de propósito: ele demora
   * a alinhar e, depois do coice, a mira volta aos poucos.
   */
  aimRaise: 2.2,
  aimLower: 6,
  elevGain: 2.2,
  yawGain: 1.6,
  /** Rajada ao espiar (tiros) e tempo atrás da cobertura (s). */
  burst: [2, 4] as [number, number],
  coverWait: [1.0, 2.4] as [number, number],
  /** Tempo atirando em pé antes de procurar cobertura (s). */
  engageTime: [3.5, 6.5] as [number, number],
  peekTimeout: 3.5,
  /** Faixa de distância preferida (m). */
  rangeMin: 5,
  rangeMax: 13,
  /**
   * Só larga a arma morto ou com o braço/mão destruídos (integridade 0–100
   * abaixo disto). Caindo ou levantando, continua segurando.
   */
  dropArm: 15,
  dropHand: 10,
  /** Parado para atirar: velocidade máxima (m/s) e tempo firme antes do 1º tiro (s). */
  stillSpeed: 0.3,
  /** Depois de uma rajada parado, dá um passo lateral (s) para não ser alvo fácil. */
  sidestep: 0.8,
  sidestepSpeed: 0.4,
  /** Dispersão (rad): base; + por movimento (velocidade/1,3 m/s); + ferimento no braço; + dor; + calor. */
  baseSpread: 0.012,
  moveSpread: 0.06,
  armWoundSpread: 0.12,
  painSpread: 0.08,
  heatSpread: 0.03,
  /** Recarrega se sobrar este tanto ou menos ao chegar à cobertura. */
  reloadAt: 4,
  /** Rigidez extra do braço que aponta a arma e do braço de apoio (multiplicador). */
  armBoost: 6,
  supportBoost: 3,
}

export type ArmedState = 'unarmed' | 'engage' | 'toCover' | 'covered' | 'peek'

export interface ArmedDebug {
  state: ArmedState
  held: boolean
  ammo: number
  reloading: boolean
  spread: number
}


const rand = (r: [number, number]) => r[0] + Math.random() * (r[1] - r[0])

export class ArmedBrain {
  state: ArmedState = 'unarmed'
  readonly debug: ArmedDebug = { state: 'unarmed', held: false, ammo: 0, reloading: false, spread: 0 }

  private stateTime = 0
  private sinceSeen = Infinity
  private readonly lastSeen = new THREE.Vector3()
  private cover: Cover | null = null
  private coverFail = 0
  private engageLimit = 5
  private coverWaitT = 1.5
  private strafe = 1
  private peekPoint: THREE.Vector3 | null = null
  private peekFails = 0
  /** Parado firme (s), tiros desta rajada e passo lateral restante (s). */
  private plantT = 0
  private plantShots = 0
  private plantBurst = 3
  private stepT = 0
  private burstLeft = 0
  private lastPain = 0
  private aimW = 0
  private aimTarget = 0
  /** Correção integrada (rad) do ângulo do ombro. */
  private elevCorr = 0
  /** Correção integrada (rad) do giro do corpo para o cano apontar no alvo. */
  private yawCorr = 0

  private readonly chest = new THREE.Vector3()
  /** Onde ele quer acertar (peito do jogador visto por último). */
  readonly aimPoint = new THREE.Vector3()

  private readonly npc: Npc
  private readonly brain: Brain
  private readonly weapon: NpcWeapon

  constructor(npc: Npc, brain: Brain, weapon: NpcWeapon) {
    this.npc = npc
    this.brain = brain
    this.weapon = weapon
  }

  reset() {
    this.weapon.reset()
    this.state = 'unarmed'
    this.cover = null
    this.peekPoint = null
    this.sinceSeen = Infinity
    this.aimW = 0
    this.elevCorr = 0
    this.yawCorr = 0
    this.lastPain = 0
    this.coverFail = 0
    this.peekFails = 0
  }

  update(dt: number, player: PlayerInfo) {
    const npc = this.npc
    const w = this.weapon
    w.update(dt)
    this.stateTime += dt
    this.coverFail = Math.max(0, this.coverFail - dt)

    // Dor nova (levou um tiro/golpe agora).
    const pain = npc.damage.pain
    const hurtNow = pain > this.lastPain + 0.04
    this.lastPain = pain

    // Larga a arma: braço/mão ferido, ou o corpo saiu de pé (caiu, desmaiou, levanta).
    // Larga a arma só morto ou sem condição de segurá-la (braço/mão destruído ou perdido).
    if (
      w.held &&
      (npc.isDead ||
        !npc.ragdoll.isAttached('handR') ||
        npc.damage.region('armR') < ARMED.dropArm ||
        (npc.damage.health.get('handR') ?? 100) < ARMED.dropHand)
    ) {
      w.drop()
    }

    const active = w.held && this.brain.enabled && npc.state === 'standing'
    if (this.brain.debug.sees) {
      this.lastSeen.copy(player.eye)
      this.sinceSeen = 0
    } else this.sinceSeen += dt
    const aware = this.sinceSeen < ARMED.memory

    if (!active || !ARMED.hostile || !aware) {
      if (this.state !== 'unarmed') this.setState('unarmed')
      this.aimTarget = 0
      this.finish(dt)
      this.publish(0)
      return
    }
    if (this.state === 'unarmed') this.setState('engage')

    // Geometria.
    const cp = npc.ragdoll.part('chest').body.translation()
    this.chest.set(cp.x, cp.y, cp.z)
    this.aimPoint.copy(this.lastSeen).y -= 0.35
    const toPlayer = this.aimPoint.clone().sub(this.chest).setY(0)
    const dist = toPlayer.length()
    const face = Math.atan2(-toPlayer.x, -toPlayer.z) + this.yawCorr
    const speed = Math.hypot(npc.velocity.x, npc.velocity.z)
    const los = this.sinceSeen < 0.4 && this.brain.clearLine(w.muzzle, this.aimPoint, player.collider)
    const spread = this.spread(speed)

    switch (this.state) {
      case 'engage': {
        npc.crouch = 0
        this.aimTarget = 1
        // Atira PARADO: planta os pés, firma a mira e solta uma rajada; depois
        // dá um passo para o lado e planta de novo (alvo difícil, mira firme).
        let planted = false
        if (!los) {
          // Perdeu a linha: aproxima até o último ponto visto.
          this.brain.steerTo(this.lastSeen.clone().setY(0), false, 3, face)
        } else if (dist < ARMED.rangeMin) {
          npc.move(toPlayer.clone().normalize().multiplyScalar(-0.8), face)
        } else if (dist > ARMED.rangeMax) {
          npc.move(toPlayer.clone().normalize().multiplyScalar(1.2), face)
        } else if (this.stepT > 0) {
          this.stepT -= dt
          const side = new THREE.Vector3(-toPlayer.z, 0, toPlayer.x).normalize().multiplyScalar(ARMED.sidestepSpeed * this.strafe)
          npc.move(side, face)
        } else {
          npc.move(null, face)
          planted = true
        }
        if (los && planted && this.shootStill(dt, speed, spread)) {
          if (++this.plantShots >= this.plantBurst) {
            this.plantShots = 0
            this.plantBurst = Math.round(rand(ARMED.burst)) + 1
            this.stepT = ARMED.sidestep
            this.strafe = -this.strafe
          }
        } else if (!planted) this.plantT = 0
        if (w.ammo === 0 || (hurtNow && Math.random() < 0.7) || this.stateTime > this.engageLimit) {
          if (this.coverFail <= 0) this.setState('toCover')
          else if (w.ammo === 0) w.startReload()
        }
        break
      }
      case 'toCover': {
        this.aimTarget = 0
        if (!this.cover || !this.holds(this.cover, player)) this.cover = this.brain.findCover(player)
        if (!this.cover) {
          // Sem cobertura: luta no lugar (recarrega em pé).
          this.coverFail = 4
          if (w.ammo < NPC_GUN.magazine) w.startReload()
          this.setState('engage')
          break
        }
        // Caminho planejado (contorna obstáculos, passa escondido) e agacha chegando.
        if (this.brain.approachCover(this.cover, player.eye)) this.setState('covered')
        else if (this.stateTime > 8) {
          this.cover = null
          this.coverFail = 3
          this.setState('engage')
        }
        break
      }
      case 'covered': {
        const c = this.cover
        if (!c) {
          this.setState('engage')
          break
        }
        this.aimTarget = 0
        npc.crouch = c.crouch
        npc.move(null, face)
        if (w.ammo <= ARMED.reloadAt && !w.reloading) w.startReload()
        if (!this.holds(c, player)) {
          const next = this.brain.findCover(player)
          if (next) this.cover = next
          else {
            this.cover = null
            this.setState('engage')
          }
          break
        }
        if (this.stateTime > this.coverWaitT && !w.reloading && w.ammo > 0) this.setState('peek')
        break
      }
      case 'peek': {
        const c = this.cover
        if (!c) {
          this.setState('engage')
          break
        }
        if (!this.peekPoint) {
          this.peekPoint = this.pickPeek(c, player)
          this.plantT = 0
          this.burstLeft = Math.round(rand(ARMED.burst))
          if (!this.peekPoint) {
            // Sem ângulo para espiar: espera mais; depois de falhar muito, parte para cima.
            this.peekFails++
            if (this.peekFails >= 3) {
              this.peekFails = 0
              this.cover = null
              this.coverFail = 6
              this.setState('engage')
            } else {
              this.setState('covered')
              this.coverWaitT = 1.5 + this.peekFails
            }
            break
          }
        }
        npc.crouch = 0
        this.aimTarget = 1
        const at = this.brain.steerTo(this.peekPoint, false, 0.25, face)
        if (los && !at) npc.move(null, face)
        if (los) {
          this.peekFails = 0
          // Só atira parado (firma antes do primeiro tiro).
          if (this.shootStill(dt, speed, spread)) this.burstLeft--
        } else this.plantT = 0
        // Acabou a rajada, demorou, ou levou tiro: volta para trás da cobertura.
        if (this.burstLeft <= 0 || w.ammo === 0 || hurtNow || this.stateTime > ARMED.peekTimeout) {
          this.peekPoint = null
          this.setState('toCover')
        }
        break
      }
      default:
        break
    }
    this.finish(dt)
    this.publish(spread)
  }

  /**
   * Atira só com o corpo parado e depois de firmar a mira um instante.
   * Devolve true se disparou.
   */
  private shootStill(dt: number, speed: number, spread: number) {
    if (speed > ARMED.stillSpeed) {
      this.plantT = 0
      return false
    }
    this.plantT += dt
    return this.plantT > ARMED.aimSettle && this.weapon.fire(this.aimPoint, spread)
  }

  /** Dispersão (rad) agora: movimento, braço ferido, dor e disparos seguidos. */
  private spread(speed: number) {
    const armWound = 1 - this.npc.damage.region('armR') / 100
    return (
      ARMED.baseSpread +
      ARMED.moveSpread * Math.min(1, speed / 1.3) +
      ARMED.armWoundSpread * armWound +
      ARMED.painSpread * this.npc.damage.pain +
      ARMED.heatSpread * this.weapon.heat
    )
  }

  /** A cobertura ainda esconde o NPC da linha de visão do jogador? */
  private holds(c: Cover, player: PlayerInfo) {
    return this.brain.coverHolds(c, player.eye, player.collider)
  }

  /** Ponto ao lado da cobertura (ou em pé nela, se baixa) de onde o jogador é visível. */
  private pickPeek(c: Cover, player: PlayerInfo): THREE.Vector3 | null {
    const n = player.eye.clone().sub(c.pos).setY(0).normalize()
    const perp = new THREE.Vector3(-n.z, 0, n.x)
    const offsets = c.low ? [0, 0.8, -0.8, 1.4, -1.4] : [0.8, -0.8, 1.4, -1.4, 2.0, -2.0]
    for (const o of offsets) {
      const p = c.pos.clone().addScaledVector(perp, o).setY(0)
      if (this.brain.clearLine(p.clone().setY(1.45), this.aimPoint, player.collider)) return p
    }
    return null
  }

  /** Braço (altura da mira) e mistura com o overlay de reflexos do Brain. */
  private finish(dt: number) {
    const npc = this.npc
    if (this.weapon.reloading) this.aimTarget = 0
    const rate = this.aimTarget > this.aimW ? ARMED.aimRaise : ARMED.aimLower
    this.aimW += (this.aimTarget - this.aimW) * (1 - Math.exp(-rate * dt))
    // Braço esticado segurando a arma: motores mais firmes (proporcional à mira).
    npc.armBoost.R = 1 + (ARMED.armBoost - 1) * this.aimW
    npc.armBoost.L = 1 + (ARMED.supportBoost - 1) * this.aimW
    if (this.aimW < 0.02) return
    // Empunhadura firme com as duas mãos (torque no cano + mão de apoio).
    if (this.weapon.held && npc.state === 'standing') this.weapon.steady(this.aimPoint, this.aimW, dt)

    const sh = npc.ragdoll.part('upperArmR').body.translation()
    const hd = Math.hypot(this.aimPoint.x - sh.x, this.aimPoint.z - sh.z)
    const elev = THREE.MathUtils.clamp(Math.atan2(this.aimPoint.y - sh.y, Math.max(0.3, hd)), -0.8, 0.9)
    // Realimentação: o braço cede sob o peso/recuo; corrige o ângulo até o cano estar na altura da mira.
    if (this.weapon.held && this.aimW > 0.5) {
      const to = this.aimPoint.clone().sub(this.weapon.muzzle)
      const ideal = Math.atan2(to.y, Math.max(0.3, Math.hypot(to.x, to.z)))
      const actual = Math.asin(THREE.MathUtils.clamp(this.weapon.barrel.y, -1, 1))
      this.elevCorr = THREE.MathUtils.clamp(this.elevCorr + (ideal - actual) * ARMED.elevGain * dt, -0.4, 0.9)
      // Direção: gira o corpo um pouco até o cano apontar para o alvo.
      const wantYaw = Math.atan2(-to.x, -to.z)
      const barrelYaw = Math.atan2(-this.weapon.barrel.x, -this.weapon.barrel.z)
      const dy = Math.atan2(Math.sin(wantYaw - barrelYaw), Math.cos(wantYaw - barrelYaw))
      // Só parado: andando (passo lateral), o corpo volta a encarar o alvo.
      const still = Math.hypot(npc.velocity.x, npc.velocity.z) < ARMED.stillSpeed
      this.yawCorr = still
        ? THREE.MathUtils.clamp(this.yawCorr + dy * ARMED.yawGain * dt, -0.3, 0.3)
        : this.yawCorr * (1 - Math.min(1, 3 * dt))
    }
    const a = this.aimW
    // Braço esticado para a frente, na altura do alvo (x+ leva a ponta do braço para a frente).
    // Duas mãos: o braço esquerdo vem para a frente e para dentro, cotovelo
    // um pouco dobrado, até a empunhadura (a mola da mão de apoio fecha).
    const aim: Record<'upperArmR' | 'forearmR' | 'handR' | 'upperArmL' | 'forearmL', [number, number, number]> = {
      upperArmR: [(Math.PI / 2 - 0.03 + elev + 0.6 * this.elevCorr) * a, 0, -0.04 * a],
      forearmR: [0.08 * a, 0, 0],
      // Pulso firme: compensa o peso da arma (parte da correção de altura).
      handR: [0.4 * this.elevCorr * a, 0, 0],
      upperArmL: [(Math.PI / 2 - 0.12 + elev) * a, 0, 0.42 * a],
      forearmL: [0.45 * a, 0, 0],
    }
    const out: Pose = {}
    const base = npc.overlay
    const rw = npc.overlayWeight
    if (base && rw > 0.01) {
      for (const [k, v] of Object.entries(base) as [keyof Pose, [number, number, number]][]) out[k] = [v[0] * rw, v[1] * rw, v[2] * rw]
    }
    for (const k of ['upperArmR', 'forearmR', 'handR', 'upperArmL', 'forearmL'] as const) {
      const r = out[k] ?? [0, 0, 0]
      const t = aim[k]
      out[k] = [t[0] + (r[0] - t[0]) * rw, t[1] + (r[1] - t[1]) * rw, t[2] + (r[2] - t[2]) * rw]
    }
    npc.overlay = out
    npc.overlayWeight = 1
  }

  private publish(spread: number) {
    this.debug.state = this.state
    this.debug.held = this.weapon.held
    this.debug.ammo = this.weapon.ammo
    this.debug.reloading = this.weapon.reloading
    this.debug.spread = spread
  }

  private setState(s: ArmedState) {
    this.state = s
    this.stateTime = 0
    if (s === 'engage') this.engageLimit = rand(ARMED.engageTime)
    if (s === 'peek') this.peekPoint = null
    if (s === 'covered') this.coverWaitT = rand(ARMED.coverWait)
  }
}
