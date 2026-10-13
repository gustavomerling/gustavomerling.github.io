import * as THREE from 'three'
import type { Ground } from './Ramp.ts'

const PLAYER_RADIUS = 0.35
const PLAYER_HEIGHT = 1.75
const EYE_HEIGHT = 1.62

const GRAVITY = 24
const WALK_SPEED = 4.6
const RUN_SPEED = 8
const GROUND_DAMPING = 12
const AIR_DAMPING = 3
const JUMP_SPEED = 8.5
const STEP_HEIGHT = 0.55

// How fast the eye catches up with the feet. Smooths steps and moving platforms.
const EYE_SMOOTHING = 18

// A jump still works this long after walking off an edge ("coyote time")...
const COYOTE_TIME = 0.1
// ...and a jump pressed this long before landing fires on touchdown.
const JUMP_BUFFER = 0.12

// Landing dip: a spring pulls the eye back after the impact pushes it down.
const LAND_MIN_SPEED = 3
const LAND_KICK = 0.09
const LAND_KICK_MAX = 1.6
const KICK_STIFFNESS = 140
const KICK_DAMPING = 18

// Head bob: one step per half cycle; the stride lengthens with speed.
const BOB_HEIGHT = 0.045
const BOB_SWAY = 0.004
const STRIDE_BASE = 0.6
const STRIDE_PER_SPEED = 0.1

// Touching faces must not count as an overlap, otherwise the block you stand on
// blocks your horizontal movement.
const COLLISION_EPSILON = 1e-3

// How close the feet must be to a block's top for that block to support the player.
const SUPPORT_TOLERANCE = 0.05

// How far below the feet a slope may be and still be walked onto (covers a fast fall).
const SLOPE_SNAP = 0.75

const MAX_PITCH = Math.PI / 2 - 0.02
const TAU = Math.PI * 2

export type PlayerInput = {
  forward: number
  strafe: number
  jump: boolean
  run: boolean
}

/** What happened during the last `update`, for sounds and effects. */
export type PlayerEvents = {
  jumped: boolean
  /** Falling speed at touchdown, or 0 if the player did not land this frame. */
  landed: number
  /** A footstep fell on this frame. */
  step: boolean
}

/** A block that moves this frame: the player is carried by `delta` if it supports them. */
export type Platform = {
  box: THREE.Box3
  delta: THREE.Vector3
}

/** Keeps an angle in (-π, π], so the look angle never grows without bound. */
export function wrapAngle(angle: number) {
  return ((((angle + Math.PI) % TAU) + TAU) % TAU) - Math.PI
}

/**
 * First-person body: look angles, movement, collisions and the camera pose.
 * `position` is the feet; the camera eye is the feet plus EYE_HEIGHT, smoothed.
 */
export class Player {
  readonly position = new THREE.Vector3()
  readonly velocity = new THREE.Vector3()
  yaw = 0
  pitch = 0
  onGround = false

  readonly events: PlayerEvents = { jumped: false, landed: 0, step: false }

  private eyeY = 0
  private readonly box = new THREE.Box3()
  private support: THREE.Box3 | null = null
  private jumpHeld = false
  private airTime = 0
  private jumpBuffer = 0
  private jumpedSinceGround = false
  private kick = 0
  private kickVelocity = 0
  private bobPhase = 0
  private bobWeight = 0

  constructor(spawn: THREE.Vector3) {
    this.respawn(spawn)
  }

  respawn(spawn: THREE.Vector3) {
    this.position.copy(spawn)
    this.velocity.set(0, 0, 0)
    this.onGround = false
    this.jumpHeld = false
    this.support = null
    this.airTime = 0
    this.jumpBuffer = 0
    this.jumpedSinceGround = false
    this.kick = 0
    this.kickVelocity = 0
    this.bobPhase = 0
    this.bobWeight = 0
    this.eyeY = spawn.y + EYE_HEIGHT
    this.syncBox()
  }

  /** Mouse look. Movement in pixels, `sensitivity` in radians per pixel. */
  look(movementX: number, movementY: number, sensitivity: number) {
    this.yaw = wrapAngle(this.yaw - movementX * sensitivity)
    this.pitch = THREE.MathUtils.clamp(this.pitch - movementY * sensitivity, -MAX_PITCH, MAX_PITCH)
  }

  update(
    delta: number,
    input: PlayerInput,
    colliders: THREE.Box3[],
    platforms: Platform[] = [],
    grounds: Ground[] = [],
  ) {
    // A block that carried us last frame moves us by how far it moved.
    if (this.support) {
      const platform = platforms.find((p) => p.box === this.support)
      if (platform) {
        this.position.add(platform.delta)
        this.syncBox()
      }
    }

    const speed = input.run ? RUN_SPEED : WALK_SPEED
    const sin = Math.sin(this.yaw)
    const cos = Math.cos(this.yaw)

    let targetX = 0
    let targetZ = 0
    if (input.forward !== 0 || input.strafe !== 0) {
      const dirX = -sin * input.forward + cos * input.strafe
      const dirZ = -cos * input.forward - sin * input.strafe
      const length = Math.hypot(dirX, dirZ)
      targetX = (dirX / length) * speed
      targetZ = (dirZ / length) * speed
    }

    const damping = this.onGround ? GROUND_DAMPING : AIR_DAMPING
    this.velocity.x = THREE.MathUtils.damp(this.velocity.x, targetX, damping, delta)
    this.velocity.z = THREE.MathUtils.damp(this.velocity.z, targetZ, damping, delta)

    this.events.jumped = false
    this.events.landed = 0
    this.events.step = false

    // Jump only on the key press, not while held. The press is remembered for a
    // moment (buffer), and a jump is still allowed just after leaving an edge
    // (coyote time). No step-up on the frame we jump, or the step can "land" us
    // mid-jump and allow a double jump.
    const jumpPressed = input.jump && !this.jumpHeld
    this.jumpHeld = input.jump
    this.jumpBuffer = jumpPressed ? JUMP_BUFFER : Math.max(0, this.jumpBuffer - delta)
    const coyote = !this.jumpedSinceGround && this.airTime < COYOTE_TIME
    let jumped = false
    if (this.jumpBuffer > 0 && (this.onGround || coyote)) {
      this.velocity.y = JUMP_SPEED
      this.jumpBuffer = 0
      this.jumpedSinceGround = true
      this.events.jumped = true
      jumped = true
    }
    const mayStepUp = this.onGround && !jumped
    const wasOnGround = this.onGround && !jumped

    this.velocity.y -= GRAVITY * delta
    const fallSpeed = Math.max(0, -this.velocity.y)
    this.onGround = false

    this.moveHorizontal(this.velocity.x * delta, this.velocity.z * delta, colliders, mayStepUp)
    this.moveAxis('y', this.velocity.y * delta, colliders)

    // Slopes are surfaces, not boxes: snap the feet onto them when they are close.
    // Standing on a block already sets the height, so only check slopes when not on one.
    const slopeY = this.support === null ? this.groundUnder(grounds) : null
    if (
      slopeY !== null &&
      this.velocity.y <= 0 &&
      Math.abs(slopeY - this.position.y) <= SLOPE_SNAP &&
      !this.bodyBlockedAt(slopeY, colliders)
    ) {
      this.position.y = slopeY
      this.velocity.y = 0
      this.onGround = true
      this.syncBox()
    }

    // Standing on a block is decided by what is under the feet, not only by the
    // collision above, so a player on an edge does not flicker between air and ground.
    this.support = this.findSupport(colliders)
    if (this.support && this.velocity.y <= 0) {
      this.onGround = true
      this.velocity.y = 0
    }

    if (this.onGround) {
      if (!wasOnGround && fallSpeed >= LAND_MIN_SPEED) {
        this.events.landed = fallSpeed
        this.kickVelocity -= Math.min(fallSpeed * LAND_KICK, LAND_KICK_MAX)
      }
      this.airTime = 0
      this.jumpedSinceGround = false
    } else {
      this.airTime += delta
    }

    this.updateBob(delta)

    // Landing dip spring.
    this.kickVelocity += (-KICK_STIFFNESS * this.kick - KICK_DAMPING * this.kickVelocity) * delta
    this.kick += this.kickVelocity * delta

    const eyeTarget = this.position.y + EYE_HEIGHT
    this.eyeY += (eyeTarget - this.eyeY) * (1 - Math.exp(-EYE_SMOOTHING * delta))
  }

  /** The block under the feet, if any. */
  get standingOn() {
    return this.support
  }

  /** Throws the player upward (a trampoline). No coyote jump after it. */
  launch(speed: number) {
    this.velocity.y = speed
    this.onGround = false
    this.support = null
    this.jumpedSinceGround = true
    this.airTime = COYOTE_TIME
    this.jumpBuffer = 0
  }

  /** Horizontal speed, in units per second. */
  get speed() {
    return Math.hypot(this.velocity.x, this.velocity.z)
  }

  /** `bob` scales the head bob: 0 turns it off, 1 is full. */
  applyToCamera(camera: THREE.PerspectiveCamera, bob = 1) {
    const weight = this.bobWeight * bob
    const lift = Math.abs(Math.sin(this.bobPhase)) * BOB_HEIGHT * weight
    const sway = Math.sin(this.bobPhase) * BOB_SWAY * weight
    camera.position.set(this.position.x, this.eyeY + this.kick + lift, this.position.z)
    camera.rotation.set(this.pitch, this.yaw, sway, 'YXZ')
  }

  /** Advances the walk cycle with the distance covered; a step lands every half cycle. */
  private updateBob(delta: number) {
    const speed = this.speed
    const walking = this.onGround && speed > 0.5
    this.bobWeight = THREE.MathUtils.damp(this.bobWeight, walking ? Math.min(speed / 8, 1) : 0, 10, delta)
    if (!walking) return

    const stride = STRIDE_BASE + speed * STRIDE_PER_SPEED
    const before = Math.floor(this.bobPhase / Math.PI)
    this.bobPhase += (speed * delta * Math.PI) / stride
    if (Math.floor(this.bobPhase / Math.PI) !== before) this.events.step = true
    if (this.bobPhase > TAU * 1000) this.bobPhase -= TAU * 1000
  }

  overlaps(box: THREE.Box3) {
    this.syncBox()
    return (
      this.box.min.x < box.max.x - COLLISION_EPSILON &&
      this.box.max.x > box.min.x + COLLISION_EPSILON &&
      this.box.min.z < box.max.z - COLLISION_EPSILON &&
      this.box.max.z > box.min.z + COLLISION_EPSILON &&
      this.box.min.y < box.max.y - COLLISION_EPSILON &&
      this.box.max.y > box.min.y + COLLISION_EPSILON
    )
  }

  private moveHorizontal(dx: number, dz: number, colliders: THREE.Box3[], mayStepUp: boolean) {
    if (dx === 0 && dz === 0) return

    const startX = this.position.x
    const startY = this.position.y
    const startZ = this.position.z

    this.moveAxis('x', dx, colliders)
    this.moveAxis('z', dz, colliders)

    const wanted = Math.hypot(dx, dz)
    const moved = Math.hypot(this.position.x - startX, this.position.z - startZ)
    if (moved >= wanted - 1e-4 || !mayStepUp) return

    // Blocked: try to step up onto a low ledge, then drop back down onto it.
    this.position.set(startX, startY, startZ)
    this.syncBox()

    this.moveAxis('y', STEP_HEIGHT, colliders)
    this.moveAxis('x', dx, colliders)
    this.moveAxis('z', dz, colliders)

    const stepped = Math.hypot(this.position.x - startX, this.position.z - startZ)
    if (stepped > moved + 1e-4) {
      this.moveAxis('y', -STEP_HEIGHT, colliders)
      if (this.onGround) return
    }

    // The step did not help: go back to the plain horizontal result.
    this.position.set(startX, startY, startZ)
    this.syncBox()
    this.moveAxis('x', dx, colliders)
    this.moveAxis('z', dz, colliders)
  }

  private moveAxis(axis: 'x' | 'y' | 'z', amount: number, colliders: THREE.Box3[]) {
    if (amount === 0) return
    this.position[axis] += amount
    this.syncBox()

    for (const collider of colliders) {
      if (!this.overlaps(collider)) continue

      if (axis === 'x') {
        this.position.x += amount > 0 ? collider.min.x - this.box.max.x : collider.max.x - this.box.min.x
        this.velocity.x = 0
      } else if (axis === 'z') {
        this.position.z += amount > 0 ? collider.min.z - this.box.max.z : collider.max.z - this.box.min.z
        this.velocity.z = 0
      } else if (amount > 0) {
        this.position.y = collider.min.y - PLAYER_HEIGHT
        this.velocity.y = 0
      } else {
        this.position.y = collider.max.y
        this.velocity.y = 0
        this.onGround = true
      }

      this.syncBox()
    }
  }

  /**
   * Height of the slope under the body that is nearest to the feet, if one is within
   * reach. Several levels can have slopes over the same spot: the closest one is the
   * one to stand on, not the highest.
   */
  private groundUnder(grounds: Ground[]) {
    let best: number | null = null
    let bestGap = SLOPE_SNAP
    for (const ground of grounds) {
      const height = ground.height(this.position.x, this.position.z)
      if (height === null) continue
      const gap = Math.abs(height - this.position.y)
      if (gap <= bestGap) {
        best = height
        bestGap = gap
      }
    }
    return best
  }

  /** True if the body would sit inside a block with its feet at the given height. */
  private bodyBlockedAt(feetY: number, colliders: THREE.Box3[]) {
    const x = this.position.x
    const z = this.position.z
    for (const box of colliders) {
      if (
        x + PLAYER_RADIUS - COLLISION_EPSILON > box.min.x &&
        x - PLAYER_RADIUS + COLLISION_EPSILON < box.max.x &&
        z + PLAYER_RADIUS - COLLISION_EPSILON > box.min.z &&
        z - PLAYER_RADIUS + COLLISION_EPSILON < box.max.z &&
        feetY + COLLISION_EPSILON < box.max.y &&
        feetY + PLAYER_HEIGHT - COLLISION_EPSILON > box.min.y
      ) {
        return true
      }
    }
    return false
  }

  /** The block whose top is at the feet and under the body, if any. */
  private findSupport(colliders: THREE.Box3[]) {
    for (const box of colliders) {
      const feetOnTop = Math.abs(this.position.y - box.max.y) < SUPPORT_TOLERANCE
      const underBody =
        this.position.x + PLAYER_RADIUS > box.min.x &&
        this.position.x - PLAYER_RADIUS < box.max.x &&
        this.position.z + PLAYER_RADIUS > box.min.z &&
        this.position.z - PLAYER_RADIUS < box.max.z
      if (feetOnTop && underBody) return box
    }
    return null
  }

  private syncBox() {
    this.box.min.set(this.position.x - PLAYER_RADIUS, this.position.y, this.position.z - PLAYER_RADIUS)
    this.box.max.set(this.position.x + PLAYER_RADIUS, this.position.y + PLAYER_HEIGHT, this.position.z + PLAYER_RADIUS)
  }
}
