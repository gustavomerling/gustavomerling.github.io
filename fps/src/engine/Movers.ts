import * as THREE from 'three'
import type { Motion } from './blocks/types.ts'

const TAU = Math.PI * 2

/** A block that moves: its mesh and collision box are kept in sync each frame. */
export type Mover = {
  mesh: THREE.Object3D
  /** The same box object the engine collides with (colliders or hazards). */
  box: THREE.Box3
  size: THREE.Vector3
  home: THREE.Vector3
  center: THREE.Vector3
  motion: Motion
  /** How far the block moved in the last update. */
  delta: THREE.Vector3
}

/** Drives every moving block. The engine calls `update` once per frame. */
export class Movers {
  readonly items: Mover[]
  private time = 0

  constructor(items: Mover[]) {
    this.items = items
  }

  update(dt: number) {
    this.time += dt
    for (const mover of this.items) {
      const { axis, amplitude, period, phase = 0 } = mover.motion
      const next = mover.home.clone()
      const angle = (TAU * this.time) / period + phase
      if (axis === 'orbit') {
        next.x += amplitude * Math.cos(angle)
        next.z += amplitude * Math.sin(angle)
      } else {
        next[axis] += amplitude * Math.sin(angle)
      }

      mover.delta.subVectors(next, mover.center)
      mover.center.copy(next)
      mover.mesh.position.copy(next)
      mover.box.setFromCenterAndSize(next, mover.size)
    }
  }
}
