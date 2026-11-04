import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import { palette } from '../palette'

/**
 * Modelos das armas na tela (estilo minimalista, primitivas). A origem de
 * cada modelo fica no ponto de empunhadura; o cano aponta para -Z.
 * As miras (alça e massa) existem de verdade para o passo 15 (iron sight):
 * cada modelo marca o ponto da mira em `userData.sight`.
 */

export interface ViewmodelMaterials {
  metal: THREE.MeshStandardMaterial
  polymer: THREE.MeshStandardMaterial
  accent: THREE.MeshStandardMaterial
  glove: THREE.MeshStandardMaterial
  wood: THREE.MeshStandardMaterial
  sight: THREE.MeshStandardMaterial
  dispose: () => void
}

export function createViewmodelMaterials(): ViewmodelMaterials {
  const metal = new THREE.MeshStandardMaterial({ color: '#3a3c42', roughness: 0.4, metalness: 0.6 })
  const polymer = new THREE.MeshStandardMaterial({ color: '#25262a', roughness: 0.75 })
  const accent = new THREE.MeshStandardMaterial({ color: palette.accent, roughness: 0.5 })
  const glove = new THREE.MeshStandardMaterial({ color: '#4a4b50', roughness: 0.9 })
  const wood = new THREE.MeshStandardMaterial({ color: '#b98a5a', roughness: 0.7 })
  // Pontos de mira claros, para ler bem contra o cenário.
  const sight = new THREE.MeshStandardMaterial({ color: '#f2efe8', emissive: '#f2efe8', emissiveIntensity: 0.4 })
  return {
    metal,
    polymer,
    accent,
    glove,
    wood,
    sight,
    dispose() {
      for (const m of [metal, polymer, accent, glove, wood, sight]) m.dispose()
    },
  }
}

function box(w: number, h: number, d: number, mat: THREE.Material, r = 0.004) {
  return new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 2, Math.min(r, w / 2, h / 2, d / 2)), mat)
}

function at<T extends THREE.Object3D>(o: T, x: number, y: number, z: number, rx = 0, ry = 0, rz = 0): T {
  o.position.set(x, y, z)
  o.rotation.set(rx, ry, rz)
  return o
}

/** Mão (luva) segurando: palma + dedos fechados + antebraço saindo da tela. */
function gloveHand(m: ViewmodelMaterials, side: 1 | -1 = 1) {
  const g = new THREE.Group()
  g.add(at(box(0.05, 0.075, 0.09, m.glove, 0.015), 0, -0.01, 0.005))
  g.add(at(box(0.055, 0.03, 0.06, m.glove, 0.012), -0.012 * side, 0.03, -0.01))
  const forearm = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.036, 0.3, 12), m.glove)
  g.add(at(forearm, 0.03 * side, -0.07, 0.15, 1.1, 0, 0))
  return g
}

function pistol(m: ViewmodelMaterials) {
  const g = new THREE.Group()
  // Ferrolho, armação, cano, empunhadura, guarda-mato.
  g.add(at(box(0.032, 0.034, 0.19, m.metal), 0, 0.055, -0.07))
  g.add(at(box(0.03, 0.022, 0.15, m.polymer), 0, 0.03, -0.05))
  g.add(at(box(0.03, 0.11, 0.045, m.polymer, 0.008), 0, -0.02, 0.0, 0.25))
  g.add(at(box(0.012, 0.018, 0.04, m.polymer), 0, 0.012, -0.04))
  // Detalhe laranja na lateral do ferrolho.
  g.add(at(box(0.034, 0.006, 0.05, m.accent, 0.002), 0, 0.06, -0.12))
  // Miras: massa (frente) e alça (trás, com entalhe).
  g.add(at(box(0.005, 0.012, 0.006, m.sight, 0.001), 0, 0.078, -0.158))
  for (const x of [-0.009, 0.009]) g.add(at(box(0.006, 0.012, 0.008, m.polymer, 0.001), x, 0.078, 0.012))
  g.userData.sight = new THREE.Vector3(0, 0.08, 0.012)
  g.add(gloveHand(m))
  return g
}

function rifle(m: ViewmodelMaterials) {
  const g = new THREE.Group()
  // Corpo, guarda-mão, cano, coronha, carregador, empunhadura.
  g.add(at(box(0.045, 0.065, 0.3, m.polymer, 0.008), 0, 0.045, -0.08))
  g.add(at(box(0.05, 0.05, 0.22, m.metal, 0.01), 0, 0.045, -0.33))
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.22, 10), m.metal)
  g.add(at(barrel, 0, 0.05, -0.53, Math.PI / 2))
  g.add(at(box(0.04, 0.08, 0.2, m.polymer, 0.01), 0, 0.02, 0.15))
  g.add(at(box(0.03, 0.12, 0.05, m.accent, 0.006), 0, -0.035, -0.13, -0.2))
  g.add(at(box(0.03, 0.09, 0.04, m.polymer, 0.008), 0, -0.02, 0.0, 0.3))
  // Trilho e miras: massa (frente, alta) e alça em anel (trás).
  g.add(at(box(0.02, 0.008, 0.28, m.metal, 0.002), 0, 0.081, -0.15))
  g.add(at(box(0.004, 0.03, 0.006, m.sight, 0.001), 0, 0.1, -0.4))
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.012, 0.0035, 8, 20), m.polymer)
  g.add(at(ring, 0, 0.105, 0.03))
  g.userData.sight = new THREE.Vector3(0, 0.105, 0.03)
  g.add(gloveHand(m))
  // Mão de apoio no guarda-mão.
  const support = gloveHand(m, -1)
  g.add(at(support, -0.01, 0.0, -0.3, 0, 0, 0.6))
  return g
}

function bat(m: ViewmodelMaterials) {
  const g = new THREE.Group()
  // Cabo na mão, corpo engrossando para a ponta (que sobe para -Z/+Y).
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.034, 0.016, 0.62, 16), m.wood)
  g.add(at(body, 0, 0, -0.31, -Math.PI / 2))
  const knob = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.015, 14), m.wood)
  g.add(at(knob, 0, 0, 0.06, Math.PI / 2))
  const tape = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.1, 14), m.polymer)
  g.add(at(tape, 0, 0, 0.01, Math.PI / 2))
  g.add(gloveHand(m))
  return g
}

function hands(m: ViewmodelMaterials) {
  const g = new THREE.Group()
  g.add(at(gloveHand(m, 1), 0.17, 0, 0, 0.2, 0, 0))
  g.add(at(gloveHand(m, -1), -0.17, 0, 0, 0.2, 0, 0))
  return g
}

export function buildViewmodel(id: string, m: ViewmodelMaterials): THREE.Group {
  switch (id) {
    case 'pistol':
      return pistol(m)
    case 'rifle':
      return rifle(m)
    case 'bat':
      return bat(m)
    default:
      return hands(m)
  }
}
