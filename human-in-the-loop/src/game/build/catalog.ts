import * as THREE from 'three'
import { RAPIER } from '../engine/physics'
import type { Materials } from '../world/materials'
import { worldUvBox } from '../world/materials'

/**
 * Obstáculos que o jogador pode construir. Cada item define:
 * - `size`: caixa envolvente (usada para encaixe, prévia e teste de espaço);
 * - `build`: malha + colisores, com a origem no CENTRO dessa caixa.
 *
 * "fixo" = preso no mundo (serve de cobertura). "solto" = dinâmico, pode ser
 * empurrado, derrubado e arremessado.
 */
export interface CatalogItem {
  id: string
  name: string
  dynamic: boolean
  size: THREE.Vector3
  build: (m: Materials) => { object: THREE.Object3D; colliders: RAPIER.ColliderDesc[] }
}

function boxMesh(w: number, h: number, d: number, material: THREE.Material, worldUv = false) {
  const geo = worldUv ? worldUvBox(w, h, d) : new THREE.BoxGeometry(w, h, d)
  const mesh = new THREE.Mesh(geo, material)
  mesh.castShadow = mesh.receiveShadow = true
  return mesh
}

/** Rampa em cunha: sobe de 0 a `h` ao longo de -z (frente baixa em +z). */
function wedge(w: number, h: number, d: number) {
  const x = w / 2
  const y = h / 2
  const z = d / 2
  // 6 vértices: base retangular + aresta alta no fundo (-z).
  const v = {
    bl: [-x, -y, z],
    br: [x, -y, z],
    blb: [-x, -y, -z],
    brb: [x, -y, -z],
    tl: [-x, y, -z],
    tr: [x, y, -z],
  }
  const tris = [
    // rampa
    [v.bl, v.br, v.tr],
    [v.bl, v.tr, v.tl],
    // fundo
    [v.blb, v.tl, v.tr],
    [v.blb, v.tr, v.brb],
    // base
    [v.bl, v.blb, v.brb],
    [v.bl, v.brb, v.br],
    // laterais
    [v.bl, v.tl, v.blb],
    [v.br, v.brb, v.tr],
  ]
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(tris.flat(2), 3))
  geo.computeVertexNormals()
  const hull = new Float32Array(Object.values(v).flat())
  return { geo, hull }
}

export const CATALOG: CatalogItem[] = [
  {
    id: 'crate',
    name: 'Caixa',
    dynamic: true,
    size: new THREE.Vector3(0.6, 0.6, 0.6),
    build: (m) => ({
      object: boxMesh(0.6, 0.6, 0.6, m.prop),
      colliders: [RAPIER.ColliderDesc.cuboid(0.3, 0.3, 0.3).setDensity(300).setFriction(0.7)],
    }),
  },
  {
    id: 'big-crate',
    name: 'Caixote',
    dynamic: true,
    size: new THREE.Vector3(1, 1, 1),
    build: (m) => ({
      object: boxMesh(1, 1, 1, m.prop),
      colliders: [RAPIER.ColliderDesc.cuboid(0.5, 0.5, 0.5).setDensity(250).setFriction(0.7)],
    }),
  },
  {
    id: 'table',
    name: 'Mesa',
    dynamic: true,
    size: new THREE.Vector3(1.6, 0.76, 0.8),
    build: (m) => {
      const group = new THREE.Group()
      const colliders: RAPIER.ColliderDesc[] = []
      const h = 0.76
      const top = 0.05
      const topY = h / 2 - top / 2
      group.add(boxMesh(1.6, top, 0.8, m.structure).translateY(topY))
      colliders.push(RAPIER.ColliderDesc.cuboid(0.8, top / 2, 0.4).setTranslation(0, topY, 0).setDensity(500))
      const legH = h - top
      const legY = -h / 2 + legH / 2
      for (const x of [-0.74, 0.74]) {
        for (const z of [-0.34, 0.34]) {
          group.add(boxMesh(0.06, legH, 0.06, m.structure).translateX(x).translateY(legY).translateZ(z))
          colliders.push(
            RAPIER.ColliderDesc.cuboid(0.03, legH / 2, 0.03).setTranslation(x, legY, z).setDensity(500).setFriction(0.8),
          )
        }
      }
      return { object: group, colliders }
    },
  },
  {
    id: 'cover',
    name: 'Mureta',
    dynamic: false,
    size: new THREE.Vector3(2, 1.1, 0.3),
    build: (m) => ({
      object: boxMesh(2, 1.1, 0.3, m.wall, true),
      colliders: [RAPIER.ColliderDesc.cuboid(1, 0.55, 0.15).setFriction(0.8)],
    }),
  },
  {
    id: 'wall',
    name: 'Parede',
    dynamic: false,
    size: new THREE.Vector3(2, 2.6, 0.3),
    build: (m) => ({
      object: boxMesh(2, 2.6, 0.3, m.wall, true),
      colliders: [RAPIER.ColliderDesc.cuboid(1, 1.3, 0.15).setFriction(0.8)],
    }),
  },
  {
    id: 'ramp',
    name: 'Rampa',
    dynamic: false,
    size: new THREE.Vector3(2, 1, 3),
    build: (m) => {
      const { geo, hull } = wedge(2, 1, 3)
      const mesh = new THREE.Mesh(geo, m.structure)
      mesh.castShadow = mesh.receiveShadow = true
      return { object: mesh, colliders: [RAPIER.ColliderDesc.convexHull(hull)!.setFriction(0.9)] }
    },
  },
]
