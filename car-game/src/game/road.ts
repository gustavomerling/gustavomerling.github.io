import RAPIER from '@dimforge/rapier3d-compat'
import * as THREE from 'three'

/**
 * Estrada em circuito fechado: spline (Catmull-Rom) pelos pontos de controle, com curvas,
 * subida e descida. O asfalto é a face de cima; as laterais descem até o chão. O colisor
 * é uma malha estática com os mesmos triângulos.
 */

export type Road = { dispose: () => void }

const WIDTH = 8
const SAMPLES = 420
const BASE_Y = -1 // onde as laterais terminam (abaixo do chão, escondido)

// Pontos de controle (x, y, z) em metros. Circuito fechado, sem passar pela área de teste (origem).
const CONTROL: THREE.Vector3[] = [
  new THREE.Vector3(-60, 0, -60),
  new THREE.Vector3(-20, 0, -95),
  new THREE.Vector3(35, 0, -100),
  new THREE.Vector3(75, 2, -60),
  new THREE.Vector3(85, 4, -10),
  new THREE.Vector3(60, 5, 30),
  new THREE.Vector3(15, 3, 55),
  new THREE.Vector3(-35, 1, 45),
  new THREE.Vector3(-70, 0, 10),
]

export function buildRoad(scene: THREE.Scene, world: RAPIER.World): Road {
  const curve = new THREE.CatmullRomCurve3(CONTROL, true, 'centripetal')
  const pts = curve.getSpacedPoints(SAMPLES - 1)
  const up = new THREE.Vector3(0, 1, 0)

  // Para cada amostra: borda esquerda e direita (sobre a estrada) e a base de cada lateral
  const top: THREE.Vector3[] = []
  const left: THREE.Vector3[] = []
  const right: THREE.Vector3[] = []
  const center: THREE.Vector3[] = []
  for (let i = 0; i < SAMPLES; i++) {
    const p = pts[i]
    const next = pts[(i + 1) % SAMPLES]
    const prev = pts[(i - 1 + SAMPLES) % SAMPLES]
    const tangent = next.clone().sub(prev).normalize()
    const side = new THREE.Vector3().crossVectors(tangent, up).normalize()
    const l = p.clone().addScaledVector(side, -WIDTH / 2)
    const r = p.clone().addScaledVector(side, WIDTH / 2)
    center.push(p.clone())
    top.push(p.clone())
    left.push(l)
    right.push(r)
  }

  // Malha: topo (faixa de asfalto) + laterais que descem até BASE_Y
  const positions: number[] = []
  const indices: number[] = []
  const addVertex = (v: THREE.Vector3) => {
    positions.push(v.x, v.y, v.z)
    return positions.length / 3 - 1
  }
  const addQuad = (a: number, b: number, c: number, d: number) => {
    indices.push(a, b, c, a, c, d)
  }

  // Topo: uma tira por amostra (4 vértices por quad: esq e dir em i e i+1)
  for (let i = 0; i < SAMPLES; i++) {
    const j = (i + 1) % SAMPLES
    const a = addVertex(left[i])
    const b = addVertex(right[i])
    const c = addVertex(right[j])
    const d = addVertex(left[j])
    addQuad(a, b, c, d)
  }
  // Laterais: parede de cada lado, do topo até a base
  for (const side of [left, right]) {
    for (let i = 0; i < SAMPLES; i++) {
      const j = (i + 1) % SAMPLES
      const topI = addVertex(side[i])
      const topJ = addVertex(side[j])
      const baseJ = addVertex(new THREE.Vector3(side[j].x, BASE_Y, side[j].z))
      const baseI = addVertex(new THREE.Vector3(side[i].x, BASE_Y, side[i].z))
      addQuad(topI, topJ, baseJ, baseI)
    }
  }

  // Visual: asfalto escuro na frente, concreto nas laterais (cores por grupo de vértices)
  const geometry = new THREE.BufferGeometry()
  const topCount = SAMPLES * 4
  const colors: number[] = []
  const asphalt = new THREE.Color(0x2e3036)
  const concrete = new THREE.Color(0x6f7178)
  for (let v = 0; v < positions.length / 3; v++) {
    const c = v < topCount ? asphalt : concrete
    colors.push(c.r, c.g, c.b)
  }
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()

  const mesh = new THREE.Mesh(
    geometry,
    new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, side: THREE.DoubleSide }),
  )
  mesh.castShadow = true
  mesh.receiveShadow = true
  scene.add(mesh)

  // Faixa central tracejada (visual): traços de 3 m a cada 6 m, levemente acima do asfalto
  const dashGeo = new THREE.PlaneGeometry(0.15, 3)
  dashGeo.rotateX(-Math.PI / 2)
  const dashMat = new THREE.MeshStandardMaterial({ color: 0xeeeeea, roughness: 0.6 })
  const dashes: THREE.Mesh[] = []
  const totalLength = curve.getLength()
  for (let s = 0; s < totalLength; s += 6) {
    const u = s / totalLength
    const p = curve.getPointAt(u)
    const t = curve.getTangentAt(u)
    const dash = new THREE.Mesh(dashGeo, dashMat)
    dash.position.set(p.x, p.y + 0.012, p.z)
    dash.rotation.y = Math.atan2(t.x, t.z)
    dash.receiveShadow = true
    scene.add(dash)
    dashes.push(dash)
  }

  // Colisor: malha estática com os mesmos triângulos
  world.createCollider(
    RAPIER.ColliderDesc.trimesh(new Float32Array(positions), new Uint32Array(indices)),
  )

  return {
    dispose: () => {
      scene.remove(mesh)
      geometry.dispose()
      ;(mesh.material as THREE.Material).dispose()
      for (const d of dashes) scene.remove(d)
      dashGeo.dispose()
      dashMat.dispose()
    },
  }
}
