import * as THREE from 'three'
import { RAPIER, type Physics } from '../engine/physics'
import type { Ragdoll } from './Ragdoll'

/**
 * Agarrar ao tropeçar (passo 26): ao perder o equilíbrio, a mão procura
 * uma superfície por perto (parede, mesa, pilar, objeto pesado) na direção
 * da queda, vai até ela com uma mola e, ao encostar, prende-se com uma
 * junta temporária mão-objeto. Solta quando se estabiliza, quando cansa ou
 * quando o corpo apaga.
 */
export const GRIP = {
  /** Alcance a partir do ombro (m). */
  reach: 0.65,
  /** Tempo máximo tentando alcançar (s) e segurando (s). */
  reachTime: 0.6,
  holdTime: 2.2,
  /** Mola da mão até o ponto (1/s²), amortecimento (1/s) e teto (m/s²). */
  kp: 500,
  kd: 30,
  maxAccel: 120,
  /** Distância (m) em que a mão "pega". */
  catchDistance: 0.13,
  /** Objetos soltos só servem de apoio acima desta massa (kg). */
  minMass: 30,
  cooldown: 1.2,
}

type Side = 'L' | 'R'

interface Attempt {
  side: Side
  point: THREE.Vector3
  normal: THREE.Vector3
  body: RAPIER.RigidBody | null
  collider: RAPIER.Collider
  t: number
}

export class Grip {
  private attempt: Attempt | null = null
  private joint: RAPIER.ImpulseJoint | null = null
  private anchor: RAPIER.RigidBody | null = null
  private holdT = 0
  private cooldown = 0
  side: Side | null = null
  /** Colisor do jogador (não se agarra nele). */
  ignore: RAPIER.Collider | null = null

  private readonly ragdoll: Ragdoll
  private readonly physics: Physics

  constructor(ragdoll: Ragdoll, physics: Physics) {
    this.ragdoll = ragdoll
    this.physics = physics
  }

  get state(): '' | 'alcançando' | 'segurando' {
    return this.joint ? 'segurando' : this.attempt ? 'alcançando' : ''
  }

  get holding() {
    return this.joint !== null
  }

  /**
   * Procura onde se agarrar na direção `dir` (horizontal, para onde ele
   * está caindo). Retorna true se começou a alcançar.
   */
  tryGrab(dir: THREE.Vector3, armOk: Record<Side, boolean>) {
    if (this.attempt || this.joint || this.cooldown > 0) return false
    const d = dir.clone().setY(0)
    if (d.lengthSq() < 1e-4) return false
    d.normalize()
    let best: Attempt | null = null
    let bestDist = Infinity
    for (const side of ['L', 'R'] as const) {
      if (!armOk[side]) continue
      const sh = this.shoulder(side)
      const right = new THREE.Vector3(-d.z, 0, d.x)
      const sideSign = side === 'R' ? 1 : -1
      for (const a of [0, 0.5, 1.0]) {
        for (const down of [-0.2, -0.55]) {
          const ray = d.clone().addScaledVector(right, a * sideSign).normalize()
          ray.y = down
          ray.normalize()
          const hit = this.physics.world.castRayAndGetNormal(
            new RAPIER.Ray(sh, ray),
            GRIP.reach,
            true,
            undefined,
            undefined,
            this.ignore ?? undefined,
            undefined,
            (c) => {
              const b = c.parent()
              if (b && this.ragdoll.hasBody(b)) return false
              if (b?.isDynamic() && b.mass() < GRIP.minMass) return false
              return true
            },
          )
          if (!hit) continue
          // Chão não conta (para isso existem as mãos da queda).
          if (hit.normal.y > 0.8 && sh.y + ray.y * hit.timeOfImpact < 0.25) continue
          if (hit.timeOfImpact < bestDist) {
            bestDist = hit.timeOfImpact
            const body = hit.collider.parent()
            best = {
              side,
              point: sh.clone().addScaledVector(ray, hit.timeOfImpact),
              normal: new THREE.Vector3(hit.normal.x, hit.normal.y, hit.normal.z),
              body: body && body.isDynamic() ? body : null,
              collider: hit.collider,
              t: 0,
            }
          }
        }
      }
    }
    if (!best) return false
    this.attempt = best
    this.side = best.side
    return true
  }

  /** `stable` = o corpo já se recuperou; `limp` = apagou (solta). */
  update(dt: number, stable: boolean, limp: boolean) {
    this.cooldown = Math.max(0, this.cooldown - dt)
    if (limp) return this.release()
    const a = this.attempt
    if (a) {
      a.t += dt
      const hand = this.ragdoll.part(`hand${a.side}`).body
      const forearm = this.ragdoll.part(`forearm${a.side}`).body
      const target = a.point.clone().addScaledVector(a.normal, 0.06)
      if (a.body) {
        // Alvo em objeto solto acompanha o objeto (aproximação: velocidade dele).
        const v = a.body.linvel()
        target.addScaledVector(new THREE.Vector3(v.x, v.y, v.z), dt)
      }
      const p = hand.translation()
      const err = new THREE.Vector3(target.x - p.x, target.y - p.y, target.z - p.z)
      // Pega ao chegar no ponto ou ao encostar a mão na superfície (borda).
      let touching = false
      if (err.length() < 0.35) {
        this.physics.world.contactPair(hand.collider(0), a.collider, (m) => {
          if (m.numContacts() > 0) touching = true
        })
      }
      if (err.length() < GRIP.catchDistance || touching) {
        this.attach(a, hand)
        return
      }
      if (a.t > GRIP.reachTime) {
        this.attempt = null
        this.side = null
        this.cooldown = GRIP.cooldown * 0.5
        return
      }
      const v = hand.linvel()
      const accel = err.multiplyScalar(GRIP.kp).sub(new THREE.Vector3(v.x, v.y, v.z).multiplyScalar(GRIP.kd))
      if (accel.length() > GRIP.maxAccel) accel.setLength(GRIP.maxAccel)
      accel.y += 9.81
      hand.applyImpulse(accel.clone().multiplyScalar(this.ragdoll.part(`hand${a.side}`).def.mass * dt), true)
      forearm.applyImpulse(accel.clone().multiplyScalar(this.ragdoll.part(`forearm${a.side}`).def.mass * dt * 0.6), true)
      return
    }
    if (this.joint) {
      this.holdT += dt
      if (stable && this.holdT > 0.6) this.release()
      else if (this.holdT > GRIP.holdTime) this.release()
    }
  }

  release() {
    if (this.joint) this.physics.world.removeImpulseJoint(this.joint, true)
    if (this.anchor) this.physics.world.removeRigidBody(this.anchor)
    if (this.joint || this.attempt) this.cooldown = GRIP.cooldown
    this.joint = null
    this.anchor = null
    this.attempt = null
    this.side = null
    this.holdT = 0
  }

  private attach(a: Attempt, hand: RAPIER.RigidBody) {
    const world = this.physics.world
    const hp = hand.translation()
    const at = new THREE.Vector3(hp.x, hp.y, hp.z)
    const local1 = new THREE.Vector3(0, 0, 0)
    let other = a.body
    let local2: THREE.Vector3
    if (other) {
      const t = other.translation()
      const r = other.rotation()
      local2 = at.clone().sub(new THREE.Vector3(t.x, t.y, t.z)).applyQuaternion(new THREE.Quaternion(r.x, r.y, r.z, r.w).invert())
    } else {
      // Cenário: âncora fixa invisível no ponto.
      this.anchor = world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(at.x, at.y, at.z))
      other = this.anchor
      local2 = new THREE.Vector3()
    }
    this.joint = world.createImpulseJoint(RAPIER.JointData.spherical(local1, local2), hand, other, true)
    this.joint.setContactsEnabled(false)
    this.attempt = null
    this.holdT = 0
  }

  private shoulder(side: Side) {
    const chest = this.ragdoll.part('chest').body
    const t = chest.translation()
    const r = chest.rotation()
    return new THREE.Vector3(side === 'R' ? 0.25 : -0.25, 0.1, 0)
      .applyQuaternion(new THREE.Quaternion(r.x, r.y, r.z, r.w))
      .add(new THREE.Vector3(t.x, t.y, t.z))
  }

  dispose() {
    this.release()
  }
}
