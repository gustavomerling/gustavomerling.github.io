import RAPIER from '@dimforge/rapier3d-compat'
import * as THREE from 'three'
import { FIXED_DT } from './loop'

export { RAPIER }

let initPromise: Promise<void> | undefined
/** Carrega o WASM do Rapier uma única vez. */
export function initPhysics(): Promise<void> {
  initPromise ??= RAPIER.init()
  return initPromise
}

/**
 * Liga um corpo rígido a um objeto 3D. Guarda a pose anterior e a atual para
 * o render interpolar entre os dois passos de física.
 */
interface SyncedBody {
  body: RAPIER.RigidBody
  object: THREE.Object3D
  prevPos: THREE.Vector3
  prevRot: THREE.Quaternion
  currPos: THREE.Vector3
  currRot: THREE.Quaternion
}

export class Physics {
  readonly world: RAPIER.World
  private synced: SyncedBody[] = []

  constructor() {
    this.world = new RAPIER.World({ x: 0, y: -9.81, z: 0 })
    this.world.timestep = FIXED_DT
  }

  /** Registra um corpo dinâmico/cinemático para ter a malha sincronizada. */
  sync(body: RAPIER.RigidBody, object: THREE.Object3D) {
    const t = body.translation()
    const r = body.rotation()
    const pos = new THREE.Vector3(t.x, t.y, t.z)
    const rot = new THREE.Quaternion(r.x, r.y, r.z, r.w)
    this.synced.push({ body, object, prevPos: pos.clone(), prevRot: rot.clone(), currPos: pos, currRot: rot })
    object.position.copy(pos)
    object.quaternion.copy(rot)
  }

  unsync(body: RAPIER.RigidBody) {
    this.synced = this.synced.filter((s) => s.body !== body)
  }

  step() {
    for (const s of this.synced) {
      s.prevPos.copy(s.currPos)
      s.prevRot.copy(s.currRot)
    }
    this.world.step()
    for (const s of this.synced) {
      const t = s.body.translation()
      const r = s.body.rotation()
      s.currPos.set(t.x, t.y, t.z)
      s.currRot.set(r.x, r.y, r.z, r.w)
    }
  }

  /** Aplica a pose interpolada nas malhas. */
  interpolate(alpha: number) {
    for (const s of this.synced) {
      s.object.position.lerpVectors(s.prevPos, s.currPos, alpha)
      s.object.quaternion.slerpQuaternions(s.prevRot, s.currRot, alpha)
    }
  }

  dispose() {
    this.synced = []
    this.world.free()
  }
}
