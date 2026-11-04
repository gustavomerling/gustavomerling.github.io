import * as THREE from 'three'
import { CATALOG } from '../build/catalog'
import { RAPIER } from '../engine/physics'
import type { Materials } from '../world/materials'

/** Materiais extras dos objetos do menu de spawn (os da cena vêm de `Materials`). */
export interface SpawnMaterials extends Materials {
  dark: THREE.MeshStandardMaterial
  light: THREE.MeshStandardMaterial
}

/**
 * Item do menu de spawn. Objetos seguem o padrão do catálogo de construção
 * (malha + colisores com origem no centro da caixa `size`); armas usam o
 * modelo da arma sem as mãos e viram arma do jogador ao serem pegas.
 */
export interface SpawnItem {
  id: string
  name: string
  group: 'object' | 'weapon'
  /** Massa aproximada para mostrar no menu (kg). */
  mass?: number
  size: THREE.Vector3
  /** Só objetos. */
  build?: (m: SpawnMaterials) => { object: THREE.Object3D; colliders: RAPIER.ColliderDesc[] }
  /** Só armas: id em WEAPONS. */
  weaponId?: string
}

function mesh(geo: THREE.BufferGeometry, material: THREE.Material) {
  const m = new THREE.Mesh(geo, material)
  m.castShadow = m.receiveShadow = true
  return m
}

const fromCatalog = (id: string) => CATALOG.find((c) => c.id === id)!

export const SPAWN_ITEMS: SpawnItem[] = [
  {
    id: 'small-box',
    name: 'Caixinha',
    group: 'object',
    mass: 8,
    size: new THREE.Vector3(0.3, 0.3, 0.3),
    build: (m) => ({
      object: mesh(new THREE.BoxGeometry(0.3, 0.3, 0.3), m.prop),
      colliders: [RAPIER.ColliderDesc.cuboid(0.15, 0.15, 0.15).setDensity(300).setFriction(0.7)],
    }),
  },
  { id: 'crate', name: 'Caixa', group: 'object', mass: 65, size: fromCatalog('crate').size, build: fromCatalog('crate').build },
  { id: 'big-crate', name: 'Caixote', group: 'object', mass: 250, size: fromCatalog('big-crate').size, build: fromCatalog('big-crate').build },
  {
    id: 'heavy-crate',
    name: 'Caixa pesada',
    group: 'object',
    mass: 400,
    size: new THREE.Vector3(0.8, 0.8, 0.8),
    build: (m) => {
      const g = new THREE.Group()
      g.add(mesh(new THREE.BoxGeometry(0.8, 0.8, 0.8), m.structure))
      // Cintas escuras: lê como "pesado" de longe.
      for (const y of [-0.25, 0.25]) g.add(mesh(new THREE.BoxGeometry(0.82, 0.08, 0.82), m.dark).translateY(y))
      return { object: g, colliders: [RAPIER.ColliderDesc.cuboid(0.4, 0.4, 0.4).setDensity(780).setFriction(0.8)] }
    },
  },
  {
    id: 'barrel',
    name: 'Barril',
    group: 'object',
    mass: 60,
    size: new THREE.Vector3(0.6, 0.9, 0.6),
    build: (m) => {
      const g = new THREE.Group()
      g.add(mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.9, 20), m.prop))
      for (const y of [-0.3, 0.3]) g.add(mesh(new THREE.CylinderGeometry(0.305, 0.305, 0.05, 20), m.dark).translateY(y))
      return { object: g, colliders: [RAPIER.ColliderDesc.cylinder(0.45, 0.3).setDensity(235).setFriction(0.6)] }
    },
  },
  {
    id: 'ball',
    name: 'Bola',
    group: 'object',
    mass: 4,
    size: new THREE.Vector3(0.4, 0.4, 0.4),
    build: (m) => ({
      object: mesh(new THREE.SphereGeometry(0.2, 20, 14), m.light),
      colliders: [RAPIER.ColliderDesc.ball(0.2).setDensity(120).setFriction(0.6).setRestitution(0.55)],
    }),
  },
  {
    id: 'plank',
    name: 'Tábua',
    group: 'object',
    mass: 12,
    size: new THREE.Vector3(2, 0.05, 0.25),
    build: (m) => ({
      object: mesh(new THREE.BoxGeometry(2, 0.05, 0.25), m.structure),
      colliders: [RAPIER.ColliderDesc.cuboid(1, 0.025, 0.125).setDensity(480).setFriction(0.8)],
    }),
  },
  { id: 'table', name: 'Mesa', group: 'object', mass: 45, size: fromCatalog('table').size, build: fromCatalog('table').build },
  { id: 'w-pistol', name: 'Pistola', group: 'weapon', size: new THREE.Vector3(0.05, 0.15, 0.2), weaponId: 'pistol' },
  { id: 'w-rifle', name: 'Rifle', group: 'weapon', size: new THREE.Vector3(0.06, 0.18, 0.8), weaponId: 'rifle' },
  { id: 'w-shotgun', name: 'Espingarda', group: 'weapon', size: new THREE.Vector3(0.06, 0.16, 0.8), weaponId: 'shotgun' },
  { id: 'w-bat', name: 'Taco', group: 'weapon', size: new THREE.Vector3(0.07, 0.07, 0.7), weaponId: 'bat' },
]
