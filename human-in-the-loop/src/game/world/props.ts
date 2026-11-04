import * as THREE from 'three'
import { Physics, RAPIER } from '../engine/physics'
import type { Materials } from './materials'

interface Prop {
  body: RAPIER.RigidBody
  mesh: THREE.Mesh
  start: { pos: THREE.Vector3; rot: THREE.Quaternion }
}

/**
 * Caixas soltas do cenário inicial. Guardam a pose de origem para o reset
 * da simulação.
 */
export function createProps(scene: THREE.Scene, physics: Physics, materials: Materials) {
  const geo = new THREE.BoxGeometry(0.6, 0.6, 0.6)
  const spots: [number, number][] = [
    [-1, 6],
    [0, 6.3],
    [1, 6],
    [0.5, 5.5],
  ]
  const props: Prop[] = spots.map(([x, z], i) => {
    const pos = new THREE.Vector3(x, 3 + i * 0.9, z)
    const rot = new THREE.Quaternion().setFromEuler(new THREE.Euler(i * 0.4, i * 0.7, 0))
    const body = physics.world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(pos.x, pos.y, pos.z).setRotation(rot))
    physics.world.createCollider(RAPIER.ColliderDesc.cuboid(0.3, 0.3, 0.3).setDensity(300).setFriction(0.7), body)
    const mesh = new THREE.Mesh(geo, materials.prop)
    mesh.castShadow = mesh.receiveShadow = true
    scene.add(mesh)
    physics.sync(body, mesh)
    return { body, mesh, start: { pos, rot } }
  })

  return {
    reset() {
      for (const p of props) {
        p.body.setTranslation(p.start.pos, true)
        p.body.setRotation(p.start.rot, true)
        p.body.setLinvel({ x: 0, y: 0, z: 0 }, true)
        p.body.setAngvel({ x: 0, y: 0, z: 0 }, true)
        physics.teleport(p.body)
      }
    },
    dispose() {
      for (const p of props) p.mesh.removeFromParent()
      geo.dispose()
    },
  }
}
