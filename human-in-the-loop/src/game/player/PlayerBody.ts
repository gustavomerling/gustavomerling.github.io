import * as THREE from 'three'
import { RAPIER } from '../engine/physics'

/** Medidas e "sensação" do movimento. Valores em metros e segundos. */
export const PLAYER = {
  radius: 0.3,
  standHeight: 1.8,
  crouchHeight: 1.15,
  /** Altura dos olhos medida a partir dos pés. */
  standEye: 1.65,
  crouchEye: 0.98,
  walkSpeed: 4.2,
  sprintSpeed: 6.8,
  crouchSpeed: 2.0,
  groundAccel: 45,
  airAccel: 10,
  gravity: 19,
  jumpSpeed: 6.2,
  /** Tolerâncias que deixam o pulo "justo": pular logo após sair da borda, ou apertar um pouco antes de tocar o chão. */
  coyoteTime: 0.1,
  jumpBuffer: 0.12,
  maxStep: 0.35,
  maxSlopeDeg: 50,
  /** Velocidade com que a câmera alcança a altura certa (agachar, degraus). */
  eyeSmoothing: 14,
  mass: 80,
  aimSpeedScale: 0.55,
} as const

export interface MoveInput {
  /** -1..1 para trás/frente e esquerda/direita. */
  forward: number
  right: number
  sprint: boolean
  crouch: boolean
  jump: boolean
  /** Mirando pela alça: anda mais devagar e não corre. */
  aiming?: boolean
}

const capsuleHalf = (height: number) => height / 2 - PLAYER.radius

/**
 * Corpo do jogador: cápsula cinemática movida pelo character controller do
 * Rapier (desliza em paredes, sobe degraus, gruda no chão em descidas,
 * empurra caixas). A câmera fica nos "olhos", com interpolação entre passos.
 */
export class PlayerBody {
  readonly body: RAPIER.RigidBody
  readonly collider: RAPIER.Collider
  private readonly world: RAPIER.World
  private readonly controller: RAPIER.KinematicCharacterController

  private readonly velocity = new THREE.Vector3()
  private height: number = PLAYER.standHeight
  private grounded = false
  private sinceGrounded = 0
  private sinceJumpPressed = Infinity

  /** Centro da cápsula no passo anterior e no atual (para interpolar). */
  private readonly prevCenter = new THREE.Vector3()
  private readonly currCenter = new THREE.Vector3()
  /** Distância do centro até os olhos, suavizada. */
  private prevEye = 0
  private currEye = 0

  private readonly spawnFeet: THREE.Vector3

  constructor(world: RAPIER.World, spawnFeet: THREE.Vector3) {
    this.world = world
    this.spawnFeet = spawnFeet.clone()
    const c = spawnFeet.clone().setY(spawnFeet.y + this.height / 2)
    this.body = world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(c.x, c.y, c.z))
    this.collider = world.createCollider(RAPIER.ColliderDesc.capsule(capsuleHalf(this.height), PLAYER.radius), this.body)

    this.controller = world.createCharacterController(0.02)
    this.controller.setUp({ x: 0, y: 1, z: 0 })
    this.controller.setMaxSlopeClimbAngle(THREE.MathUtils.degToRad(PLAYER.maxSlopeDeg))
    this.controller.setMinSlopeSlideAngle(THREE.MathUtils.degToRad(PLAYER.maxSlopeDeg))
    this.controller.enableAutostep(PLAYER.maxStep, 0.15, false)
    this.controller.enableSnapToGround(0.3)
    this.controller.setSlideEnabled(true)
    this.controller.setApplyImpulsesToDynamicBodies(true)
    this.controller.setCharacterMass(PLAYER.mass)

    this.currCenter.copy(c)
    this.prevCenter.copy(c)
    this.currEye = this.prevEye = this.eyeOffsetTarget()
  }

  get isGrounded() {
    return this.grounded
  }

  get isCrouching() {
    return this.height < PLAYER.standHeight
  }

  /** Velocidade horizontal atual (m/s), para HUD/debug. */
  get speed() {
    return Math.hypot(this.velocity.x, this.velocity.z)
  }

  /** Um passo fixo de física. `yaw` é a direção para onde a câmera olha. */
  update(dt: number, input: MoveInput, yaw: number) {
    this.prevCenter.copy(this.currCenter)
    this.prevEye = this.currEye

    this.updateCrouch(input.crouch)

    // Direção desejada no plano, a partir do olhar.
    const sin = Math.sin(yaw)
    const cos = Math.cos(yaw)
    const wish = new THREE.Vector3(
      -sin * input.forward + cos * input.right,
      0,
      -cos * input.forward - sin * input.right,
    )
    if (wish.lengthSq() > 1) wish.normalize()
    const maxSpeed =
      (this.isCrouching
        ? PLAYER.crouchSpeed
        : input.sprint && input.forward > 0 && !input.aiming
          ? PLAYER.sprintSpeed
          : PLAYER.walkSpeed) * (input.aiming ? PLAYER.aimSpeedScale : 1)
    const target = wish.multiplyScalar(maxSpeed)

    // Acelera em direção à velocidade alvo (chão: firme; ar: pouco controle).
    const accel = (this.grounded ? PLAYER.groundAccel : PLAYER.airAccel) * dt
    const dx = target.x - this.velocity.x
    const dz = target.z - this.velocity.z
    const dLen = Math.hypot(dx, dz)
    if (dLen <= accel) {
      this.velocity.x = target.x
      this.velocity.z = target.z
    } else {
      this.velocity.x += (dx / dLen) * accel
      this.velocity.z += (dz / dLen) * accel
    }

    // Pulo com coyote time e buffer.
    this.sinceJumpPressed = input.jump ? 0 : this.sinceJumpPressed + dt
    this.sinceGrounded = this.grounded ? 0 : this.sinceGrounded + dt
    if (this.sinceJumpPressed <= PLAYER.jumpBuffer && this.sinceGrounded <= PLAYER.coyoteTime) {
      this.velocity.y = PLAYER.jumpSpeed
      this.sinceJumpPressed = Infinity
      this.sinceGrounded = Infinity
      this.grounded = false
    } else if (this.grounded) {
      this.velocity.y = -1 // mantém contato com o chão
    } else {
      this.velocity.y -= PLAYER.gravity * dt
    }

    const desired = { x: this.velocity.x * dt, y: this.velocity.y * dt, z: this.velocity.z * dt }
    this.controller.computeColliderMovement(this.collider, desired)
    const moved = this.controller.computedMovement()
    const wasGrounded = this.grounded
    this.grounded = this.controller.computedGrounded()

    // Bateu a cabeça no teto: zera a subida.
    if (this.velocity.y > 0 && moved.y < desired.y * 0.5) this.velocity.y = 0
    // A velocidade horizontal NÃO é corrigida pelo bloqueio: a velocidade já é
    // limitada pelo alvo, e manter o impulso é o que faz o autostep subir
    // degraus de forma confiável (parado contra o degrau ele falha).
    if (this.grounded && this.velocity.y < 0) this.velocity.y = 0

    // Degrau (autostep): o corpo sobe de uma vez, a câmera acompanha suave.
    if (wasGrounded && this.grounded && Math.abs(moved.y - desired.y) > 0.08) {
      this.currEye -= moved.y
    }

    const t = this.body.translation()
    const next = { x: t.x + moved.x, y: t.y + moved.y, z: t.z + moved.z }
    this.body.setNextKinematicTranslation(next)
    this.currCenter.set(next.x, next.y, next.z)

    // Suaviza a altura dos olhos rumo ao alvo (agachar/levantar, degraus).
    const k = 1 - Math.exp(-PLAYER.eyeSmoothing * dt)
    this.currEye += (this.eyeOffsetTarget() - this.currEye) * k

    if (next.y < -20) this.respawn()
  }

  /** Posição dos olhos interpolada para o frame atual. */
  eyePosition(alpha: number, out: THREE.Vector3) {
    out.lerpVectors(this.prevCenter, this.currCenter, alpha)
    out.y += THREE.MathUtils.lerp(this.prevEye, this.currEye, alpha)
    return out
  }

  respawn() {
    this.height = PLAYER.standHeight
    this.collider.setHalfHeight(capsuleHalf(this.height))
    const c = this.spawnFeet.clone().setY(this.spawnFeet.y + this.height / 2)
    this.body.setTranslation(c, true)
    this.velocity.set(0, 0, 0)
    this.currCenter.copy(c)
    this.prevCenter.copy(c)
    this.currEye = this.prevEye = this.eyeOffsetTarget()
  }

  private eyeOffsetTarget() {
    const eye = this.isCrouching ? PLAYER.crouchEye : PLAYER.standEye
    return eye - this.height / 2
  }

  /**
   * Agachar troca a altura da cápsula. No chão os pés ficam no lugar; no ar
   * a cabeça fica no lugar (encolhe as pernas, ajuda a passar por cima de coisas).
   * Só levanta se houver espaço acima.
   */
  private updateCrouch(wantCrouch: boolean) {
    const targetHeight = wantCrouch ? PLAYER.crouchHeight : PLAYER.standHeight
    if (targetHeight === this.height) return
    const delta = targetHeight - this.height // < 0 agachando
    const shift = this.grounded ? delta / 2 : -delta / 2
    const t = this.body.translation()
    const center = { x: t.x, y: t.y + shift, z: t.z }

    if (delta > 0 && !this.hasRoomFor(center, targetHeight)) return

    this.height = targetHeight
    this.collider.setHalfHeight(capsuleHalf(targetHeight))
    this.body.setTranslation(center, true)
    // Compensa a câmera para ela não pular junto com o centro.
    this.currCenter.y += shift
    this.prevCenter.y += shift
    this.currEye -= shift
    this.prevEye -= shift
  }

  private hasRoomFor(center: RAPIER.Vector, height: number) {
    const shape = new RAPIER.Capsule(capsuleHalf(height), PLAYER.radius - 0.02)
    let blocked = false
    this.world.intersectionsWithShape(
      center,
      { x: 0, y: 0, z: 0, w: 1 },
      shape,
      (other) => {
        if (other.isSensor()) return true
        blocked = true
        return false
      },
      undefined,
      undefined,
      this.collider,
    )
    return !blocked
  }
}
