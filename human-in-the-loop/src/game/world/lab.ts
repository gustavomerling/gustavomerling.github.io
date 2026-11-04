import * as THREE from 'three'
import { Physics, RAPIER } from '../engine/physics'
import { type Materials, worldUvBox } from './materials'

/**
 * O laboratório: uma sala fechada de 30 × 40 m com pilares, muretas
 * (futuras coberturas para o NPC), escada e rampa até uma plataforma
 * (para testar o corpo do jogador no passo 3).
 *
 * Eixos: x = largura, z = comprimento (o jogador nasce em +z olhando para -z).
 */
export const LAB = {
  width: 30,
  length: 40,
  wallHeight: 6,
  wallThickness: 0.5,
  /** Posição dos pés do jogador ao nascer. */
  playerSpawn: new THREE.Vector3(0, 0, 15),
} as const

interface StaticBox {
  size: [number, number, number]
  pos: [number, number, number]
  /** Rotação em torno de x (radianos), usada pela rampa. */
  rotX?: number
  material: keyof Pick<Materials, 'floor' | 'wall' | 'structure'>
}

function layout(): StaticBox[] {
  const { width: W, length: L, wallHeight: H, wallThickness: T } = LAB
  const boxes: StaticBox[] = []

  // Piso (topo em y = 0)
  boxes.push({ size: [W, 1, L], pos: [0, -0.5, 0], material: 'floor' })

  // Paredes
  boxes.push({ size: [W + 2 * T, H, T], pos: [0, H / 2, -L / 2 - T / 2], material: 'wall' })
  boxes.push({ size: [W + 2 * T, H, T], pos: [0, H / 2, L / 2 + T / 2], material: 'wall' })
  boxes.push({ size: [T, H, L], pos: [-W / 2 - T / 2, H / 2, 0], material: 'wall' })
  boxes.push({ size: [T, H, L], pos: [W / 2 + T / 2, H / 2, 0], material: 'wall' })

  // Pilares
  for (const x of [-7, 7]) {
    for (const z of [-8, 6]) {
      boxes.push({ size: [1, H, 1], pos: [x, H / 2, z], material: 'structure' })
    }
  }

  // Muretas de cobertura (altura de cintura/peito)
  boxes.push({ size: [4, 1.1, 0.4], pos: [-3, 0.55, -2], material: 'wall' })
  boxes.push({ size: [0.4, 1.1, 3], pos: [4, 0.55, -6], material: 'wall' })
  boxes.push({ size: [3, 1.5, 0.4], pos: [2, 0.75, 3], material: 'wall' })

  // Plataforma elevada no fundo esquerdo (1,2 m de altura)
  const platH = 1.2
  boxes.push({ size: [8, platH, 6], pos: [-W / 2 + 4, platH / 2, -L / 2 + 3], material: 'structure' })

  // Escada até a plataforma: 6 degraus de 0,2 m
  const steps = 6
  const stepH = platH / steps
  const stepD = 0.35
  for (let i = 0; i < steps; i++) {
    const h = stepH * (i + 1)
    boxes.push({
      size: [2, h, stepD],
      pos: [-W / 2 + 1.5, h / 2, -L / 2 + 6 + (steps - i) * stepD - stepD / 2],
      material: 'structure',
    })
  }

  // Rampa até a plataforma (lado direito dela)
  const rampLen = 5
  const angle = Math.asin(platH / rampLen)
  const rampRun = Math.cos(angle) * rampLen
  boxes.push({
    size: [2.5, 0.2, rampLen],
    pos: [-W / 2 + 6.75, platH / 2 - 0.1 * Math.cos(angle), -L / 2 + 6 + rampRun / 2],
    rotX: angle,
    material: 'structure',
  })

  return boxes
}

export function buildLab(scene: THREE.Scene, physics: Physics, materials: Materials): () => void {
  const group = new THREE.Group()
  group.name = 'lab'
  const geometries: THREE.BufferGeometry[] = []

  for (const b of layout()) {
    const [w, h, d] = b.size
    const geo = worldUvBox(w, h, d)
    geometries.push(geo)
    const mesh = new THREE.Mesh(geo, materials[b.material])
    mesh.position.set(...b.pos)
    if (b.rotX) mesh.rotation.x = b.rotX
    mesh.castShadow = b.material !== 'floor'
    mesh.receiveShadow = true
    group.add(mesh)

    const q = mesh.quaternion
    physics.world.createCollider(
      RAPIER.ColliderDesc.cuboid(w / 2, h / 2, d / 2)
        .setTranslation(...b.pos)
        .setRotation({ x: q.x, y: q.y, z: q.z, w: q.w })
        .setFriction(0.8),
    )
  }

  scene.add(group)
  return () => {
    scene.remove(group)
    for (const g of geometries) g.dispose()
  }
}

/**
 * Ajusta a câmera ortográfica da sombra para cobrir exatamente a sala vista
 * pelo sol. Um quadrado fixo em volta do centro corta os cantos, porque o
 * sol vê a sala na diagonal (projetada, ela fica mais larga que 30 × 40).
 */
function fitShadowToRoom(sun: THREE.DirectionalLight) {
  const cam = sun.shadow.camera
  cam.position.copy(sun.position)
  cam.lookAt(sun.target.position)
  cam.updateMatrixWorld()
  const toLight = cam.matrixWorldInverse
  const min = new THREE.Vector3(Infinity, Infinity, Infinity)
  const max = new THREE.Vector3(-Infinity, -Infinity, -Infinity)
  const hx = LAB.width / 2 + LAB.wallThickness
  const hz = LAB.length / 2 + LAB.wallThickness
  const p = new THREE.Vector3()
  for (const x of [-hx, hx]) {
    for (const y of [-0.5, LAB.wallHeight]) {
      for (const z of [-hz, hz]) {
        p.set(x, y, z).applyMatrix4(toLight)
        min.min(p)
        max.max(p)
      }
    }
  }
  const margin = 0.5
  cam.left = min.x - margin
  cam.right = max.x + margin
  cam.bottom = min.y - margin
  cam.top = max.y + margin
  // A câmera olha para -z no espaço dela.
  cam.near = Math.max(0.1, -max.z - margin)
  cam.far = -min.z + margin
  cam.updateProjectionMatrix()
}

/** Luz ambiente de céu + "sol" alto com sombras cobrindo a sala inteira. */
export function buildLights(scene: THREE.Scene): () => void {
  const hemi = new THREE.HemisphereLight('#ffffff', '#9a958b', 1.4)
  const sun = new THREE.DirectionalLight('#fff6ea', 2.2)
  sun.position.set(12, 25, 8)
  sun.target.position.set(0, 0, 0)
  sun.castShadow = true
  sun.shadow.mapSize.set(2048, 2048)
  fitShadowToRoom(sun)
  sun.shadow.bias = -0.0003
  sun.shadow.normalBias = 0.02
  scene.add(hemi, sun, sun.target)
  return () => {
    sun.shadow.map?.dispose()
    scene.remove(hemi, sun, sun.target)
  }
}
