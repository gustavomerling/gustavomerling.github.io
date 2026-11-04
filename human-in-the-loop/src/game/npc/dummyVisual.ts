import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import { JOINTS, type PartDef, type PartName } from './skeleton'

/**
 * Visual de boneco de crash test: corpo em tom de pele, juntas de metal
 * escuro discretas, etiquetas de alvo quadradas (peito e coxas), alvo
 * redondo nas laterais da cabeça e dois olhos que mostram para onde ele
 * olha. Só aparência: a física não muda.
 *
 * As juntas escuras ficam presas à parte FILHA, um pouco menores que o
 * membro: em pé quase não aparecem; quando a junta dobra ou separa num
 * impacto, aparece metal escuro em vez de um buraco.
 */

const SKIN = '#d29b7c'
const METAL = '#3b3c40'
const TARGET_YELLOW = '#f2c418'
const INK = '#1b1b1d'

export interface DummyMaterials {
  skin: THREE.MeshStandardMaterial
  metal: THREE.MeshStandardMaterial
  eye: THREE.MeshStandardMaterial
  sticker: THREE.MeshStandardMaterial
  roundTarget: THREE.MeshStandardMaterial
  dispose: () => void
}

/** Círculo de alvo em quadrantes alternados preto/amarelo. */
function drawTarget(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
  for (let i = 0; i < 4; i++) {
    ctx.beginPath()
    ctx.moveTo(cx, cy)
    ctx.arc(cx, cy, r, (i * Math.PI) / 2, ((i + 1) * Math.PI) / 2)
    ctx.closePath()
    ctx.fillStyle = i % 2 ? TARGET_YELLOW : INK
    ctx.fill()
  }
  ctx.lineWidth = r * 0.12
  ctx.strokeStyle = INK
  ctx.beginPath()
  ctx.arc(cx, cy, r, 0, Math.PI * 2)
  ctx.stroke()
}

function canvasTexture(draw: (ctx: CanvasRenderingContext2D, size: number) => void) {
  const size = 128
  const c = document.createElement('canvas')
  c.width = c.height = size
  draw(c.getContext('2d')!, size)
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 4
  return tex
}

/** Etiqueta quadrada: fundo branco, borda fina, alvo no meio. */
const stickerTexture = () =>
  canvasTexture((ctx, s) => {
    ctx.fillStyle = '#f4f2ec'
    ctx.fillRect(0, 0, s, s)
    ctx.lineWidth = 5
    ctx.strokeStyle = INK
    ctx.strokeRect(2.5, 2.5, s - 5, s - 5)
    drawTarget(ctx, s / 2, s / 2, s * 0.34)
  })

const roundTargetTexture = () =>
  canvasTexture((ctx, s) => {
    ctx.clearRect(0, 0, s, s)
    drawTarget(ctx, s / 2, s / 2, s / 2 - 4)
  })

/** Decalque "colado" na superfície, sem brigar com ela no z-buffer. */
function decalMaterial(map: THREE.Texture) {
  return new THREE.MeshStandardMaterial({
    map,
    transparent: true,
    roughness: 0.5,
    polygonOffset: true,
    polygonOffsetFactor: -2,
  })
}

export function createDummyMaterials(): DummyMaterials {
  const skin = new THREE.MeshStandardMaterial({ color: SKIN, roughness: 0.55 })
  const metal = new THREE.MeshStandardMaterial({ color: METAL, roughness: 0.45, metalness: 0.4 })
  const eye = new THREE.MeshStandardMaterial({ color: INK, roughness: 0.2 })
  const sticker = decalMaterial(stickerTexture())
  const roundTarget = decalMaterial(roundTargetTexture())
  return {
    skin,
    metal,
    eye,
    sticker,
    roundTarget,
    dispose() {
      for (const m of [skin, metal, eye, sticker, roundTarget]) {
        m.map?.dispose()
        m.dispose()
      }
    },
  }
}

/** Raio da junta escura (presa à parte filha); um pouco menor que o membro. */
const JOINT_BALL: Partial<Record<PartName, number>> = {
  upperArmL: 0.062,
  upperArmR: 0.062,
  forearmL: 0.04,
  forearmR: 0.04,
  handL: 0.03,
  handR: 0.03,
  thighL: 0.07,
  thighR: 0.07,
  shinL: 0.052,
  shinR: 0.052,
  footL: 0.042,
  footR: 0.042,
}

function mesh(geo: THREE.BufferGeometry, mat: THREE.Material) {
  const m = new THREE.Mesh(geo, mat)
  m.castShadow = true
  m.receiveShadow = true
  return m
}

/** Plano de decalque com a face virada para `normal` (no espaço da parte). */
function decal(size: number, mat: THREE.Material, pos: THREE.Vector3, normal: THREE.Vector3, circle = false) {
  const geo = circle ? new THREE.CircleGeometry(size / 2, 24) : new THREE.PlaneGeometry(size, size)
  const d = new THREE.Mesh(geo, mat)
  d.receiveShadow = true
  d.position.copy(pos)
  d.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal)
  return d
}

/** Monta o objeto visual de uma parte, com origem no centro da parte. */
export function buildPartVisual(def: PartDef, m: DummyMaterials): THREE.Object3D {
  const g = new THREE.Group()
  g.name = def.name
  const s = def.shape
  const right = def.name.endsWith('R')

  switch (def.name) {
    case 'head': {
      const r = s.kind === 'sphere' ? s.radius : 0.11
      // Cabeça ovalada, um pouco mais alta que larga.
      const head = mesh(new THREE.SphereGeometry(r, 28, 20), m.skin)
      head.scale.set(0.86, 1.15, 0.95)
      g.add(head)
      // Olhos: indicam para onde ele olha (-Z).
      for (const side of [-1, 1]) {
        const eye = mesh(new THREE.SphereGeometry(0.011, 10, 8), m.eye)
        eye.position.set(side * 0.034, 0.02, -r * 0.93)
        g.add(eye)
      }
      // Alvo redondo pequeno nas laterais.
      for (const side of [-1, 1]) {
        g.add(decal(0.045, m.roundTarget, new THREE.Vector3(side * r * 0.87, 0.015, 0), new THREE.Vector3(side, 0, 0), true))
      }
      // Pescoço de metal (cobre a emenda com o peito).
      const neck = mesh(new THREE.CylinderGeometry(0.04, 0.046, 0.12, 16), m.metal)
      neck.position.y = -r - 0.02
      g.add(neck)
      break
    }
    case 'chest': {
      if (s.kind !== 'box') break
      const [w, h, d] = s.size
      g.add(mesh(new RoundedBoxGeometry(w, h, d, 4, 0.05), m.skin))
      // Etiqueta no lado esquerdo do peito (lado -X dele), de frente.
      g.add(decal(0.075, m.sticker, new THREE.Vector3(-w * 0.22, 0.04, -d / 2 - 0.001), new THREE.Vector3(0, 0, -1)))
      break
    }
    case 'abdomen': {
      // Cintura: peça em tom de pele mais estreita, com emendas de metal.
      if (s.kind !== 'box') break
      const [w, h, d] = s.size
      const waist = mesh(new RoundedBoxGeometry(w * 0.92, h + 0.04, d * 0.95, 3, 0.04), m.skin)
      g.add(waist)
      const seam = mesh(new RoundedBoxGeometry(w * 0.8, h + 0.08, d * 0.8, 2, 0.03), m.metal)
      g.add(seam)
      break
    }
    case 'pelvis': {
      if (s.kind !== 'box') break
      const [w, h, d] = s.size
      g.add(mesh(new RoundedBoxGeometry(w, h, d, 4, 0.06), m.skin))
      break
    }
    case 'handL':
    case 'handR': {
      if (s.kind !== 'box') break
      const [w, h, d] = s.size
      g.add(mesh(new RoundedBoxGeometry(w + 0.008, h, d, 3, 0.018), m.skin))
      break
    }
    case 'footL':
    case 'footR': {
      if (s.kind !== 'box') break
      const [w, h, d] = s.size
      g.add(mesh(new RoundedBoxGeometry(w + 0.01, h, d, 3, 0.035), m.skin))
      break
    }
    default: {
      // Membros: cápsula um pouco mais longa que o colisor, para cobrir a junta.
      if (s.kind !== 'capsule') break
      g.add(mesh(new THREE.CapsuleGeometry(s.radius, s.length - 2 * s.radius + 0.02, 6, 16), m.skin))
      // Etiqueta na lateral de fora da coxa.
      if (def.name.startsWith('thigh')) {
        const side = right ? 1 : -1
        g.add(decal(0.06, m.sticker, new THREE.Vector3(side * (s.radius + 0.001), 0.06, 0), new THREE.Vector3(side, 0, 0)))
      }
    }
  }

  // Junta escura na ponta superior (presa a esta parte, que é a filha).
  const ball = JOINT_BALL[def.name]
  const joint = JOINTS.find((j) => j.child === def.name)
  if (ball && joint) {
    // No ombro, a "junta" é a calota arredondada do próprio braço (pele).
    const isShoulder = def.name.startsWith('upperArm')
    const sphere = mesh(new THREE.SphereGeometry(ball, 16, 12), isShoulder ? m.skin : m.metal)
    sphere.position.set(joint.anchor[0] - def.center[0], joint.anchor[1] - def.center[1], joint.anchor[2] - def.center[2])
    g.add(sphere)
  }
  return g
}

/** Libera as geometrias de um visual (os materiais são compartilhados). */
export function disposeVisual(o: THREE.Object3D) {
  o.traverse((c) => {
    if (c instanceof THREE.Mesh) c.geometry.dispose()
  })
}
