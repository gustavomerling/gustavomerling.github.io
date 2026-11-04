import * as THREE from 'three'
import { Physics, RAPIER } from '../engine/physics'
import { createViewmodelMaterials, worldWeaponModel, type ViewmodelMaterials } from '../weapons/viewmodels'
import { WEAPONS } from '../weapons/weapons'
import type { Materials } from '../world/materials'
import type { SpawnItem, SpawnMaterials } from './spawnCatalog'

export interface Spawned {
  item: SpawnItem
  body: RAPIER.RigidBody
  object: THREE.Object3D
}

/**
 * Cria e apaga os itens do menu de spawn. Todos são corpos dinâmicos comuns
 * do Rapier (o NPC enxerga objetos arremessados pela velocidade deles).
 */
export class Spawner {
  private readonly items: Spawned[] = []
  private readonly byCollider = new Map<number, Spawned>()
  private readonly materials: SpawnMaterials
  private readonly weaponMaterials: ViewmodelMaterials
  private readonly scene: THREE.Scene
  private readonly physics: Physics

  constructor(scene: THREE.Scene, physics: Physics, materials: Materials) {
    this.scene = scene
    this.physics = physics
    this.materials = {
      ...materials,
      dark: new THREE.MeshStandardMaterial({ color: '#3a3c42', roughness: 0.6 }),
      light: new THREE.MeshStandardMaterial({ color: '#efebe3', roughness: 0.5 }),
    }
    this.weaponMaterials = createViewmodelMaterials()
  }

  get count() {
    return this.items.length
  }

  find(collider: RAPIER.Collider): Spawned | undefined {
    return this.byCollider.get(collider.handle)
  }

  spawn(item: SpawnItem, pos: THREE.Vector3, rot: THREE.Quaternion): Spawned {
    const { object, colliders } = item.weaponId ? this.buildWeapon(item.weaponId) : item.build!(this.materials)
    const body = this.physics.world.createRigidBody(
      RAPIER.RigidBodyDesc.dynamic().setTranslation(pos.x, pos.y, pos.z).setRotation(rot),
    )
    const spawned: Spawned = { item, body, object }
    for (const c of colliders) this.byCollider.set(this.physics.world.createCollider(c, body).handle, spawned)
    this.scene.add(object)
    this.physics.sync(body, object)
    this.items.push(spawned)
    return spawned
  }

  remove(s: Spawned) {
    for (let i = 0; i < s.body.numColliders(); i++) this.byCollider.delete(s.body.collider(i).handle)
    this.physics.unsync(s.body)
    this.physics.world.removeRigidBody(s.body)
    s.object.removeFromParent()
    s.object.traverse((o) => {
      if (o instanceof THREE.Mesh) o.geometry.dispose()
    })
    this.items.splice(this.items.indexOf(s), 1)
  }

  /** Itens criados (cópia), para o reset limpar ligações antes de remover. */
  all() {
    return [...this.items]
  }

  dispose() {
    for (const s of this.all()) this.remove(s)
    this.materials.dark.dispose()
    this.materials.light.dispose()
    this.weaponMaterials.dispose()
  }

  /**
   * Arma no chão: o modelo da tela sem as mãos, centrado na caixa
   * envolvente, com um colisor de caixa e a massa da arma.
   */
  private buildWeapon(id: string) {
    const model = worldWeaponModel(id, this.weaponMaterials)
    const box = new THREE.Box3().setFromObject(model)
    const center = box.getCenter(new THREE.Vector3())
    const half = box.getSize(new THREE.Vector3()).multiplyScalar(0.5)
    model.position.sub(center)
    const group = new THREE.Group()
    group.add(model)
    const mass = Math.max(0.5, WEAPONS.find((w) => w.id === id)?.mass ?? 1)
    const collider = RAPIER.ColliderDesc.cuboid(Math.max(half.x, 0.02), Math.max(half.y, 0.02), Math.max(half.z, 0.02))
      .setMass(mass)
      .setFriction(0.8)
    return { object: group as THREE.Object3D, colliders: [collider] }
  }
}
