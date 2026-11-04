import * as THREE from 'three'
import { Physics, RAPIER } from '../engine/physics'
import type { Input } from '../player/Input'
import type { WeaponDef } from './weapons'

/** Tempo máximo carregando (s): segurar o botão = golpe mais forte. */
const MAX_CHARGE = 0.6
/** Fração do impulso máximo num golpe sem carga. */
const MIN_POWER = 0.28

/** Golpe com taco: arco da direita para a esquerda. Soco: reto para a frente. */
const SWING = {
  // Ângulo em Y: negativo = à direita, positivo = à esquerda (convenção do Three).
  bat: { duration: 0.2, recover: 0.28, fromYaw: -1.1, toYaw: 1.25, pitch: -0.12 },
  hands: { duration: 0.11, recover: 0.2 },
}

export type MeleePhase = 'idle' | 'charging' | 'swinging' | 'recovering'

export interface MeleeHit {
  body: RAPIER.RigidBody
  point: THREE.Vector3
  impulse: THREE.Vector3
}

/**
 * Golpes corpo a corpo. Carrega enquanto segura o botão, solta para golpear.
 * Durante o golpe, varre o caminho da arma com raios a cada quadro (com
 * subdivisões, para não "pular" alvos finos) e aplica, no primeiro corpo
 * atingido, um impulso no ponto de contato: maior com mais carga e mais
 * perto da ponta. Bater em algo fixo interrompe o golpe.
 */
export const BAT_SWING = SWING.bat

export class Melee {
  phase: MeleePhase = 'idle'
  /** 0..1 da fase atual (carga, golpe ou recuperação). */
  progress = 0
  /** Carga usada no golpe atual (0..1). */
  power = 0
  /** Tranco ao bater em algo fixo (para o visual). */
  blocked = false

  private chargeTime = 0
  private t = 0
  private prevSwing = 0
  private readonly struck = new Set<number>()
  private readonly physics: Physics
  private readonly excluded: RAPIER.Collider

  constructor(physics: Physics, playerCollider: RAPIER.Collider) {
    this.physics = physics
    this.excluded = playerCollider
  }

  /** Cancela (ex.: trocou de arma). */
  reset() {
    this.phase = 'idle'
    this.progress = 0
    this.chargeTime = 0
    this.blocked = false
  }

  /**
   * Avança o golpe. Devolve os acertos deste quadro (aplicados já na física).
   * `camera` dá a origem e a orientação do golpe.
   */
  update(dt: number, input: Input | null, weapon: WeaponDef, camera: THREE.Camera): MeleeHit[] {
    const kind = weapon.id === 'bat' ? 'bat' : weapon.kind === 'hands' ? 'hands' : null
    if (!kind) {
      this.reset()
      return []
    }
    const hits: MeleeHit[] = []
    switch (this.phase) {
      case 'idle':
        if (input?.consume('Mouse0') || input?.isDown('Mouse0')) {
          this.phase = 'charging'
          this.chargeTime = 0
        }
        break
      case 'charging':
        this.chargeTime = Math.min(MAX_CHARGE, this.chargeTime + dt)
        this.progress = this.chargeTime / MAX_CHARGE
        if (!input?.isDown('Mouse0')) {
          this.power = MIN_POWER + (1 - MIN_POWER) * this.progress
          this.phase = 'swinging'
          this.t = 0
          this.prevSwing = 0
          this.blocked = false
          this.struck.clear()
        }
        break
      case 'swinging': {
        const cfg = SWING[kind]
        this.t += dt
        const s = Math.min(1, this.t / cfg.duration)
        this.progress = s
        hits.push(...this.sweep(kind, this.prevSwing, s, weapon, camera, dt))
        this.prevSwing = s
        if (s >= 1 || this.blocked) {
          this.phase = 'recovering'
          this.t = 0
        }
        break
      }
      case 'recovering': {
        this.t += dt
        this.progress = Math.min(1, this.t / SWING[kind].recover)
        if (this.progress >= 1) this.reset()
        break
      }
    }
    return hits
  }

  /** Varre o trecho [from, to] do golpe com raios. */
  private sweep(kind: 'bat' | 'hands', from: number, to: number, weapon: WeaponDef, camera: THREE.Camera, dt: number) {
    const hits: MeleeHit[] = []
    const camPos = camera.getWorldPosition(new THREE.Vector3())
    const q = camera.getWorldQuaternion(new THREE.Quaternion())
    const reach = weapon.reach ?? 1.5
    const maxImpulse = weapon.meleeImpulse ?? 30
    const steps = 4
    for (let i = 1; i <= steps; i++) {
      const s = from + ((to - from) * i) / steps
      let origin: THREE.Vector3
      let dir: THREE.Vector3
      let swingDir: THREE.Vector3
      if (kind === 'bat') {
        // Ombro direito, arma girando em torno do eixo vertical da câmera.
        const cfg = SWING.bat
        const yaw = THREE.MathUtils.lerp(cfg.fromYaw, cfg.toYaw, s)
        origin = new THREE.Vector3(0.12, -0.2, 0).applyQuaternion(q).add(camPos)
        dir = new THREE.Vector3(0, 0, -1).applyEuler(new THREE.Euler(cfg.pitch, yaw, 0, 'YXZ')).applyQuaternion(q)
        // Direção do movimento da ponta: tangente do arco (para a esquerda) + um pouco à frente.
        swingDir = new THREE.Vector3(-Math.cos(yaw), 0, Math.sin(yaw) - 0.4).applyQuaternion(q).normalize()
      } else {
        // Soco: reto à frente, a partir do ombro.
        origin = new THREE.Vector3(0.1, -0.15, 0).applyQuaternion(q).add(camPos)
        dir = new THREE.Vector3(0, 0, -1).applyQuaternion(q)
        swingDir = dir.clone()
      }
      const length = kind === 'bat' ? reach : reach * (0.35 + 0.65 * s)
      const hit = this.physics.world.castRay(new RAPIER.Ray(origin, dir), length, true, undefined, undefined, this.excluded)
      if (!hit) continue
      const body = hit.collider.parent()
      const point = origin.clone().addScaledVector(dir, hit.timeOfImpact)
      if (!body || !body.isDynamic()) {
        // Bateu em algo fixo: o golpe para.
        this.blocked = true
        break
      }
      if (this.struck.has(body.handle)) continue
      this.struck.add(body.handle)
      // Mais forte perto da ponta (o taco gira: a ponta anda mais rápido).
      const leverage = kind === 'bat' ? THREE.MathUtils.clamp(hit.timeOfImpact / reach, 0.35, 1) : 1
      const impulse = swingDir.multiplyScalar(maxImpulse * this.power * leverage)
      body.applyImpulseAtPoint(impulse, point, true)
      hits.push({ body, point, impulse })
    }
    void dt
    return hits
  }
}
