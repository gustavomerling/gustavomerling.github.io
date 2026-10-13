import * as THREE from 'three'
import type { BlockDef, BlockSpecial } from './blocks/types.ts'

/** A solid block with extra behaviour, as collected by the level builder. */
export type Special = {
  kind: BlockSpecial
  /** The same box the player collides with. Emptied while the block is gone. */
  box: THREE.Box3
  mesh: THREE.Object3D
  def: BlockDef
  center: THREE.Vector3
  size: THREE.Vector3
}

/** What the gimmicks need to know about the player. */
type Body = {
  readonly standingOn: THREE.Box3 | null
  overlaps(box: THREE.Box3): boolean
}

export type GimmickEvents = {
  /** Upward speed to launch the player with, or 0. */
  bounce: number
  /** A fragile floor started to break this frame. */
  cracked: boolean
}

const DEFAULT_POWER = 13
const SQUASH = 0.35

const CRUMBLE_DELAY = 0.55
const CRUMBLE_RETURN = 3.2
const CRUMBLE_SHAKE = 0.06
const CRUMBLE_GRAVITY = 22

const BLINK_ON = 0.6
// The platform flickers for this long (seconds) before it switches off.
const BLINK_WARNING = 0.5
const GHOST_OPACITY = 0.1

/** Fades every material of a mesh (and its outline) together. */
class Fader {
  private readonly materials: { material: THREE.Material; base: number }[] = []

  constructor(object: THREE.Object3D) {
    object.traverse((child) => {
      if (!(child instanceof THREE.Mesh || child instanceof THREE.LineSegments)) return
      const list = Array.isArray(child.material) ? child.material : [child.material]
      for (const material of list) {
        material.transparent = true
        this.materials.push({ material, base: material.opacity })
      }
    })
  }

  set(alpha: number) {
    for (const { material, base } of this.materials) material.opacity = base * alpha
  }
}

type Bouncer = { special: Special; power: number; squash: number }

type Crumble = {
  special: Special
  full: THREE.Box3
  fader: Fader
  state: 'idle' | 'shaking' | 'gone'
  timer: number
  drop: number
  speed: number
}

type Blinker = {
  special: Special
  full: THREE.Box3
  fader: Fader
  period: number
  on: number
  phase: number
  solid: boolean
}

/**
 * Drives the special blocks: trampolines, fragile floors and blinking
 * platforms. The engine calls `update` after moving the player each frame.
 */
export class Gimmicks {
  readonly events: GimmickEvents = { bounce: 0, cracked: false }
  private readonly bouncers: Bouncer[] = []
  private readonly crumbles: Crumble[] = []
  private readonly blinkers: Blinker[] = []

  constructor(specials: Special[]) {
    for (const special of specials) {
      if (special.kind === 'bounce') {
        this.bouncers.push({ special, power: special.def.power ?? DEFAULT_POWER, squash: 0 })
      } else if (special.kind === 'crumble') {
        this.crumbles.push({
          special,
          full: special.box.clone(),
          fader: new Fader(special.mesh),
          state: 'idle',
          timer: 0,
          drop: 0,
          speed: 0,
        })
      } else {
        const blink = special.def.blink ?? { period: 3 }
        this.blinkers.push({
          special,
          full: special.box.clone(),
          fader: new Fader(special.mesh),
          period: blink.period,
          on: blink.on ?? BLINK_ON,
          phase: blink.phase ?? 0,
          solid: true,
        })
      }
    }
  }

  update(delta: number, time: number, body: Body) {
    this.events.bounce = 0
    this.events.cracked = false
    for (const bouncer of this.bouncers) this.updateBouncer(bouncer, delta, body)
    for (const crumble of this.crumbles) this.updateCrumble(crumble, delta, body)
    for (const blinker of this.blinkers) this.updateBlinker(blinker, time, body)
    return this.events
  }

  /** Fragile floors come back right away, so a respawn always finds the level whole. */
  reset(body: Body) {
    for (const crumble of this.crumbles) {
      if (crumble.state !== 'idle' && !body.overlaps(crumble.full)) this.restore(crumble)
    }
  }

  private updateBouncer(bouncer: Bouncer, delta: number, body: Body) {
    const { special } = bouncer
    if (body.standingOn === special.box) {
      this.events.bounce = bouncer.power
      bouncer.squash = 1
    }
    bouncer.squash = Math.max(0, bouncer.squash - delta * 5)
    const squash = SQUASH * Math.sin(bouncer.squash * Math.PI)
    special.mesh.scale.set(1 + squash * 0.3, 1 - squash, 1 + squash * 0.3)
    special.mesh.position.y = special.center.y - (special.size.y * squash) / 2
  }

  private updateCrumble(crumble: Crumble, delta: number, body: Body) {
    const { special } = crumble
    if (crumble.state === 'idle') {
      if (body.standingOn === special.box) {
        crumble.state = 'shaking'
        crumble.timer = CRUMBLE_DELAY
        this.events.cracked = true
      }
      return
    }

    if (crumble.state === 'shaking') {
      crumble.timer -= delta
      const strength = CRUMBLE_SHAKE * (1 - crumble.timer / CRUMBLE_DELAY)
      special.mesh.position.set(
        special.center.x + (Math.random() - 0.5) * strength,
        special.center.y + (Math.random() - 0.5) * strength,
        special.center.z + (Math.random() - 0.5) * strength,
      )
      if (crumble.timer <= 0) {
        crumble.state = 'gone'
        crumble.timer = CRUMBLE_RETURN
        crumble.drop = 0
        crumble.speed = 0
        special.box.makeEmpty()
      }
      return
    }

    // Gone: falls and fades, then comes back once the spot is clear.
    crumble.timer -= delta
    crumble.speed += CRUMBLE_GRAVITY * delta
    crumble.drop += crumble.speed * delta
    special.mesh.position.set(special.center.x, special.center.y - crumble.drop, special.center.z)
    special.mesh.rotation.z = crumble.drop * 0.08
    const alpha = Math.max(0, 1 - crumble.drop / 6)
    crumble.fader.set(alpha)
    special.mesh.visible = alpha > 0
    if (crumble.timer <= 0 && !body.overlaps(crumble.full)) this.restore(crumble)
  }

  private restore(crumble: Crumble) {
    const { special } = crumble
    crumble.state = 'idle'
    special.box.copy(crumble.full)
    special.mesh.position.copy(special.center)
    special.mesh.rotation.z = 0
    special.mesh.visible = true
    crumble.fader.set(1)
  }

  private updateBlinker(blinker: Blinker, time: number, body: Body) {
    const { special } = blinker
    const cycle = (((time / blinker.period + blinker.phase) % 1) + 1) % 1
    const wantSolid = cycle < blinker.on

    if (wantSolid && !blinker.solid && !body.overlaps(blinker.full)) {
      blinker.solid = true
      special.box.copy(blinker.full)
    } else if (!wantSolid && blinker.solid) {
      blinker.solid = false
      special.box.makeEmpty()
    }

    if (!blinker.solid) {
      blinker.fader.set(GHOST_OPACITY)
      return
    }
    const left = (blinker.on - cycle) * blinker.period
    const warning = left < BLINK_WARNING && Math.sin(time * 40) > 0
    blinker.fader.set(warning ? 0.35 : 1)
  }
}
