import RAPIER from '@dimforge/rapier3d-compat'
import * as THREE from 'three'

/**
 * Pista de teste: chão, grade, faixas pintadas, cones de slalom e uma rampa.
 * Cada objeto tem visual (Three.js) e colisor estático (Rapier).
 */

export type Track = { dispose: () => void }

const CONE_RADIUS = 0.2
const CONE_HEIGHT = 0.7

const RAMP = {
  x: 0,
  zLow: 40, // onde a borda de baixo encosta no chão
  width: 6,
  length: 8,
  thickness: 0.4,
  angle: THREE.MathUtils.degToRad(8),
}

/** Cones do slalom: alternam de lado a cada 4 m, a partir de z = 8. */
const SLALOM = Array.from({ length: 5 }, (_, i) => ({
  x: i % 2 === 0 ? -2.2 : 2.2,
  z: 8 + i * 4,
}))

export function buildTrack(scene: THREE.Scene, world: RAPIER.World): Track {
  const geometries: THREE.BufferGeometry[] = []
  const materials: THREE.Material[] = []
  const objects: THREE.Object3D[] = []

  const add = <T extends THREE.Object3D>(obj: T): T => {
    scene.add(obj)
    objects.push(obj)
    return obj
  }
  const mat = (m: THREE.Material) => {
    materials.push(m)
    return m
  }
  const geo = <T extends THREE.BufferGeometry>(g: T): T => {
    geometries.push(g)
    return g
  }

  // Chão: visual e colisor (colisor em y ∈ [-1, 0])
  const ground = add(
    new THREE.Mesh(
      geo(new THREE.PlaneGeometry(400, 400)),
      mat(new THREE.MeshStandardMaterial({ color: 0x3a3d43, roughness: 0.9, metalness: 0 })),
    ),
  )
  ground.rotation.x = -Math.PI / 2
  ground.receiveShadow = true
  world.createCollider(RAPIER.ColliderDesc.cuboid(200, 0.5, 200).setTranslation(0, -0.5, 0))

  // Grade de 1 m: mostra movimento e escala
  const grid = add(new THREE.GridHelper(400, 400, 0x7a7f89, 0x4d525c))
  grid.position.y = 0.005
  geometries.push(grid.geometry)
  materials.push(grid.material as THREE.Material)

  // Faixas brancas: retângulo de 8 × 16 m à direita da largada
  const paint = mat(new THREE.MeshStandardMaterial({ color: 0xeeeeea, roughness: 0.6 }))
  const stripe = (w: number, d: number, x: number, z: number) => {
    const m = add(new THREE.Mesh(geo(new THREE.PlaneGeometry(w, d)), paint))
    m.rotation.x = -Math.PI / 2
    m.position.set(x, 0.012, z)
    m.receiveShadow = true
  }
  const RX = 14
  const RZ = 0
  stripe(8, 0.15, RX, RZ - 8) // borda de trás
  stripe(8, 0.15, RX, RZ + 8) // borda da frente
  stripe(0.15, 16, RX - 4, RZ) // lateral esquerda
  stripe(0.15, 16, RX + 4, RZ) // lateral direita

  // Cones do slalom: visual + colisor de cilindro (estático)
  const coneGeo = geo(new THREE.ConeGeometry(CONE_RADIUS, CONE_HEIGHT, 16))
  const coneMat = mat(new THREE.MeshStandardMaterial({ color: 0xe8742c, roughness: 0.5 }))
  for (const c of SLALOM) {
    const cone = add(new THREE.Mesh(coneGeo, coneMat))
    cone.position.set(c.x, CONE_HEIGHT / 2, c.z)
    cone.castShadow = true
    cone.receiveShadow = true
    world.createCollider(
      RAPIER.ColliderDesc.cylinder(CONE_HEIGHT / 2, CONE_RADIUS).setTranslation(c.x, CONE_HEIGHT / 2, c.z),
    )
  }

  // Rampa: a borda de baixo encosta no chão, a de cima sobe com o ângulo
  const { angle, length, thickness, width } = RAMP
  const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -angle)
  // Centro da caixa: a borda de baixo do topo fica em y = 0 e z = zLow
  const cy = (length / 2) * Math.sin(angle) - (thickness / 2) * Math.cos(angle)
  const cz = RAMP.zLow + (thickness / 2) * Math.sin(angle) + (length / 2) * Math.cos(angle)

  const ramp = add(
    new THREE.Mesh(
      geo(new THREE.BoxGeometry(width, thickness, length)),
      mat(new THREE.MeshStandardMaterial({ color: 0x8c8f96, roughness: 0.8 })),
    ),
  )
  ramp.position.set(RAMP.x, cy, cz)
  ramp.quaternion.copy(q)
  ramp.castShadow = true
  ramp.receiveShadow = true

  const rampCollider = RAPIER.ColliderDesc.cuboid(width / 2, thickness / 2, length / 2)
    .setTranslation(RAMP.x, cy, cz)
    .setRotation({ x: q.x, y: q.y, z: q.z, w: q.w })
  world.createCollider(rampCollider)

  return {
    dispose: () => {
      for (const o of objects) scene.remove(o)
      for (const g of geometries) g.dispose()
      for (const m of materials) m.dispose()
    },
  }
}
