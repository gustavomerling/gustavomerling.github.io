import * as THREE from 'three'
import { RAPIER } from '../engine/physics'

/** Alcance para agarrar (m). */
export const GRAB_REACH = 2.5
/** Mais perto que isso o objeto não chega (fica à frente das mãos). */
const MIN_HOLD = 0.9
/**
 * Mola que puxa o ponto agarrado até a frente da câmera. Rigidez e
 * amortecimento são acelerações (1/s², 1/s): o mesmo "jeito" para tudo; a
 * força máxima é que separa o leve (vem na hora) do pesado (atrasa, arrasta).
 */
const STIFFNESS = 140
const DAMPING = 22
const MAX_FORCE = 2000
/** Até quanto da força máxima vai para sustentar o peso. */
const MAX_LIFT = 0.75
/** NPC: massa "sentida" (o corpo todo pesa, não só a parte) e força menor, para não desmontar. */
const NPC_MASS = 30
const NPC_MAX_FORCE = 1100
/** Se o ponto fica longe demais da mão (preso atrás de algo), solta. */
const BREAK_DIST = 1.6
/** Arremesso: velocidade de saída (m/s) e impulso máximo (N·s). */
const THROW_SPEED = 13
const MAX_THROW = 450
const NPC_THROW = 90

/**
 * Bit de "membro" do jogador nos grupos de colisão. Quem é segurado tira
 * esse bit do filtro: o objeto não colide com a cápsula (não empurra o
 * jogador nem é esmagado por ele), mas continua colidindo com o resto.
 */
const PLAYER_BIT = 0x8000

interface Held {
  body: RAPIER.RigidBody
  /** Ponto agarrado, no espaço local do corpo. */
  local: THREE.Vector3
  dist: number
  npc: boolean
  groups: { collider: RAPIER.Collider; groups: number }[]
}

/**
 * Mãos físicas (passo 27): agarra o corpo solto sob a mira e o puxa com
 * uma mola de força limitada aplicada no ponto agarrado. Caixas leves
 * vêm na hora, pesadas ficam para trás e arrastam no chão, o NPC é
 * puxado pela parte agarrada (braço, cabeça...) e o resto vem pelas juntas.
 */
export class Hands {
  private held: Held | null = null
  private readonly world: RAPIER.World
  private readonly playerCollider: RAPIER.Collider
  private readonly isNpc: (body: RAPIER.RigidBody) => boolean
  private readonly target = new THREE.Vector3()
  private readonly prevTarget = new THREE.Vector3()
  private hasPrev = false
  private readonly tmp = new THREE.Vector3()
  private readonly tmpQ = new THREE.Quaternion()

  constructor(world: RAPIER.World, playerCollider: RAPIER.Collider, isNpc: (body: RAPIER.RigidBody) => boolean) {
    this.world = world
    this.playerCollider = playerCollider
    this.isNpc = isNpc
    // Jogador: membro só do bit dele, filtra tudo.
    playerCollider.setCollisionGroups(((PLAYER_BIT << 16) | 0xffff) >>> 0)
  }

  get holding() {
    return this.held !== null
  }

  get heldBody() {
    return this.held?.body ?? null
  }

  get holdingNpc() {
    return this.held?.npc ?? false
  }

  /** Para o movimento do jogador ignorar o que está nas mãos. */
  ignores = (collider: RAPIER.Collider) => {
    const b = this.held?.body
    return !!b && collider.parent()?.handle === b.handle
  }

  /** Tenta agarrar o que está na mira. */
  tryGrab(origin: THREE.Vector3, dir: THREE.Vector3): boolean {
    this.release()
    const hit = this.world.castRay(new RAPIER.Ray(origin, dir), GRAB_REACH, true, undefined, undefined, this.playerCollider)
    const body = hit?.collider.parent()
    if (!hit || !body || !body.isDynamic()) return false
    const point = origin.clone().addScaledVector(dir, hit.timeOfImpact)
    const t = body.translation()
    const r = body.rotation()
    const local = point.sub(this.tmp.set(t.x, t.y, t.z)).applyQuaternion(this.tmpQ.set(r.x, r.y, r.z, r.w).invert())
    const groups: Held['groups'] = []
    for (let i = 0; i < body.numColliders(); i++) {
      const c = body.collider(i)
      const g = c.collisionGroups()
      groups.push({ collider: c, groups: g })
      c.setCollisionGroups((g & ~PLAYER_BIT) >>> 0)
    }
    this.held = { body, local, dist: THREE.MathUtils.clamp(hit.timeOfImpact, MIN_HOLD, GRAB_REACH), npc: this.isNpc(body), groups }
    this.hasPrev = false
    body.wakeUp()
    return true
  }

  release() {
    const h = this.held
    if (!h) return
    this.held = null
    if (!this.world.bodies.contains(h.body.handle)) return
    for (const { collider, groups } of h.groups) collider.setCollisionGroups(groups)
  }

  /** Solta se for este corpo (vai ser removido, congelado...). */
  releaseIf(body: RAPIER.RigidBody) {
    if (this.held?.body.handle === body.handle) this.release()
  }

  /** Arremessa na direção do olhar; mais pesado sai mais devagar. */
  throw(dir: THREE.Vector3) {
    const h = this.held
    if (!h) return
    this.release()
    const body = h.body
    if (!this.world.bodies.contains(body.handle)) return
    const j = h.npc ? NPC_THROW : Math.min(body.mass() * THROW_SPEED, MAX_THROW)
    body.applyImpulse(this.tmp.copy(dir).multiplyScalar(j), true)
  }

  /** Um passo de física: a mola puxa o ponto agarrado até a frente da câmera. */
  fixedUpdate(dt: number, origin: THREE.Vector3, dir: THREE.Vector3) {
    const h = this.held
    if (!h) return
    const body = h.body
    if (!this.world.bodies.contains(body.handle) || !body.isDynamic()) {
      this.release()
      return
    }
    this.target.copy(origin).addScaledVector(dir, h.dist)
    // Velocidade da mão (o alvo se move com o jogador e o olhar).
    const targetVel = this.hasPrev ? this.target.clone().sub(this.prevTarget).divideScalar(dt) : new THREE.Vector3()
    this.prevTarget.copy(this.target)
    this.hasPrev = true

    const t = body.translation()
    const r = body.rotation()
    const point = this.tmp.copy(h.local).applyQuaternion(this.tmpQ.set(r.x, r.y, r.z, r.w)).add(t as THREE.Vector3Like)
    const err = this.target.clone().sub(point)
    if (err.length() > BREAK_DIST) {
      this.release()
      return
    }
    const v = body.velocityAtPoint(point)
    const acc = err.multiplyScalar(STIFFNESS).addScaledVector(targetVel.sub(v as THREE.Vector3Like), DAMPING)
    const mass = h.npc ? NPC_MASS : body.mass()
    const maxF = h.npc ? NPC_MAX_FORCE : MAX_FORCE
    const force = acc.multiplyScalar(mass)
    force.y += Math.min(mass * 9.81, maxF * MAX_LIFT)
    if (force.length() > maxF) force.setLength(maxF)
    body.applyImpulseAtPoint(force.multiplyScalar(dt), point, true)
    // Segura o giro de objetos soltos (balançam, mas não ficam rodando).
    if (!h.npc) {
      const w = body.angvel()
      const k = Math.exp(-6 * dt)
      body.setAngvel({ x: w.x * k, y: w.y * k, z: w.z * k }, true)
    }
  }
}
