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

/**
 * Aparência por tipo de NPC. O corpo é o mesmo; muda a cor da pele, das
 * juntas e dos olhos, e quais decalques aparecem (etiquetas de alvo do
 * boneco, ou podridão/feridas do zumbi). Decalques marcados com
 * `userData.look` só aparecem no visual daquele tipo.
 */
export type Look = 'dummy' | 'zombie' | 'swat'

export const LOOKS: Record<Look, { skin: string; metal: string; eye: string; eyeGlow: string; glow: number; damage: string; mottle: number }> = {
  dummy: { skin: SKIN, metal: METAL, eye: INK, eyeGlow: '#000000', glow: 0, damage: '#6e3f45', mottle: 0 },
  // Verde doente, juntas encardidas, olhos amarelo-esverdeados que brilham.
  // SWAT: uniforme azul-marinho, juntas pretas, visor escuro.
  swat: { skin: '#2c3a52', metal: '#16181b', eye: '#0d0f12', eyeGlow: '#3a6a8a', glow: 0.6, damage: '#5a2228', mottle: 0.03 },
  zombie: { skin: '#7e9a5b', metal: '#2c3127', eye: '#d9ff4a', eyeGlow: '#c6f03a', glow: 1.6, damage: '#3a2c1c', mottle: 0.09 },
}

export interface DummyMaterials {
  skin: THREE.MeshStandardMaterial
  metal: THREE.MeshStandardMaterial
  eye: THREE.MeshStandardMaterial
  sticker: THREE.MeshStandardMaterial
  roundTarget: THREE.MeshStandardMaterial
  /** Zumbi: manchas de podridão, feridas abertas, órbitas e boca escuras. */
  rot: THREE.MeshStandardMaterial
  wound: THREE.MeshStandardMaterial
  socket: THREE.MeshStandardMaterial
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

/** Gerador pseudoaleatório com semente (o visual sai igual sempre). */
function seeded(seed: number) {
  return () => {
    seed = (seed * 16807) % 2147483647
    return (seed - 1) / 2147483646
  }
}

/** Mancha de podridão: borrões esverdeados e marrons, bordas irregulares. */
const rotTexture = () =>
  canvasTexture((ctx, s) => {
    const rnd = seeded(7)
    ctx.clearRect(0, 0, s, s)
    for (let i = 0; i < 14; i++) {
      const x = s * (0.25 + 0.5 * rnd())
      const y = s * (0.25 + 0.5 * rnd())
      const r = s * (0.08 + 0.16 * rnd())
      const g = ctx.createRadialGradient(x, y, 0, x, y, r)
      const dark = rnd() < 0.5
      g.addColorStop(0, dark ? 'rgba(46,58,30,0.85)' : 'rgba(92,74,44,0.75)')
      g.addColorStop(0.7, dark ? 'rgba(58,74,38,0.45)' : 'rgba(104,90,52,0.35)')
      g.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.fillStyle = g
      ctx.beginPath()
      ctx.ellipse(x, y, r, r * (0.6 + 0.4 * rnd()), rnd() * Math.PI, 0, Math.PI * 2)
      ctx.fill()
    }
    // Veias escuras.
    ctx.strokeStyle = 'rgba(30,40,22,0.6)'
    ctx.lineWidth = 2
    for (let i = 0; i < 5; i++) {
      ctx.beginPath()
      let x = s * (0.3 + 0.4 * rnd())
      let y = s * (0.3 + 0.4 * rnd())
      ctx.moveTo(x, y)
      for (let k = 0; k < 4; k++) {
        x += (rnd() - 0.5) * s * 0.18
        y += (rnd() - 0.5) * s * 0.18
        ctx.lineTo(x, y)
      }
      ctx.stroke()
    }
  })

/** Ferida aberta: carne escura no centro, borda avermelhada, arranhões. */
const woundTexture = () =>
  canvasTexture((ctx, s) => {
    const rnd = seeded(11)
    ctx.clearRect(0, 0, s, s)
    const c = s / 2
    const g = ctx.createRadialGradient(c, c, 0, c, c, s * 0.42)
    g.addColorStop(0, 'rgba(40,10,10,1)')
    g.addColorStop(0.45, 'rgba(110,28,24,0.95)')
    g.addColorStop(0.75, 'rgba(84,60,38,0.6)')
    g.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.ellipse(c, c, s * 0.42, s * 0.3, 0.4, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = 'rgba(60,14,12,0.8)'
    ctx.lineWidth = 3
    for (let i = 0; i < 3; i++) {
      const y = s * (0.3 + 0.4 * rnd())
      ctx.beginPath()
      ctx.moveTo(s * 0.15, y)
      ctx.lineTo(s * 0.85, y + (rnd() - 0.5) * s * 0.3)
      ctx.stroke()
    }
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
  const rot = decalMaterial(rotTexture())
  rot.roughness = 0.85
  const wound = decalMaterial(woundTexture())
  wound.roughness = 0.35
  const socket = new THREE.MeshStandardMaterial({ color: '#1d1a14', roughness: 0.9, polygonOffset: true, polygonOffsetFactor: -1 })
  return {
    skin,
    metal,
    eye,
    sticker,
    roundTarget,
    rot,
    wound,
    socket,
    dispose() {
      for (const m of [skin, metal, eye, sticker, roundTarget, rot, wound, socket]) {
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

/** Marca um objeto como exclusivo de um visual (escondido nos outros). */
function only<T extends THREE.Object3D>(look: Look, o: T): T {
  o.userData.look = look
  o.visible = look === 'dummy'
  return o
}

/**
 * Decalques do zumbi por parte: [tamanho, material, posição, normal].
 * Planos pequenos, encostados na superfície (como as etiquetas).
 */
function zombieDecals(def: PartDef, m: DummyMaterials): THREE.Object3D[] {
  const s = def.shape
  const out: THREE.Object3D[] = []
  const add = (size: number, mat: THREE.Material, pos: [number, number, number], n: [number, number, number]) =>
    out.push(only('zombie', decal(size, mat, new THREE.Vector3(...pos), new THREE.Vector3(...n).normalize())))
  const side = def.name.endsWith('R') ? 1 : -1
  if (s.kind === 'box') {
    const [w, h, d] = s.size
    if (def.name === 'chest') {
      add(0.16, m.rot, [w * 0.12, -0.02, -d / 2 - 0.002], [0, 0, -1])
      add(0.08, m.wound, [-w * 0.2, 0.05, -d / 2 - 0.003], [0, 0, -1])
      add(0.18, m.rot, [-w * 0.1, 0, d / 2 + 0.002], [0, 0, 1])
    } else if (def.name === 'abdomen') {
      add(0.1, m.wound, [w * 0.15, 0, -d / 2 - 0.02], [0, 0, -1])
      add(0.12, m.rot, [-w * 0.46, 0, 0], [-1, 0, 0])
    } else if (def.name === 'pelvis') {
      add(0.14, m.rot, [0, 0.02, -d / 2 - 0.002], [0, 0, -1])
    } else if (def.name.startsWith('hand')) {
      add(0.07, m.rot, [side * (w / 2 + 0.006), 0, 0], [side, 0, 0])
    } else if (def.name.startsWith('foot')) {
      add(0.09, m.rot, [0, h / 2 + 0.002, 0], [0, 1, 0])
    }
  } else if (s.kind === 'capsule') {
    const r = s.radius + 0.002
    if (def.name.startsWith('upperArm')) add(0.08, m.rot, [side * r, 0.02, 0], [side, 0, 0])
    if (def.name.startsWith('forearm')) add(0.07, m.wound, [0, -0.02, -r], [0, 0, -1])
    if (def.name.startsWith('thigh')) {
      add(0.1, m.rot, [0, 0.05, -r], [0, 0, -1])
      if (side < 0) add(0.07, m.wound, [side * r, -0.06, 0], [side, 0, 0])
    }
    if (def.name.startsWith('shin')) add(0.08, m.rot, [0, 0.04, -r], [0, 0, -1])
  }
  return out
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
        g.add(only('dummy', decal(0.045, m.roundTarget, new THREE.Vector3(side * r * 0.87, 0.015, 0), new THREE.Vector3(side, 0, 0), true)))
      }
      // Zumbi: órbitas fundas atrás dos olhos, boca entreaberta, mancha na têmpora.
      for (const side of [-1, 1]) {
        const socket = only('zombie', mesh(new THREE.SphereGeometry(0.022, 12, 8), m.socket))
        socket.scale.set(1, 0.8, 0.5)
        socket.position.set(side * 0.034, 0.02, -r * 0.9)
        g.add(socket)
      }
      const mouth = only('zombie', mesh(new THREE.BoxGeometry(0.05, 0.014, 0.01), m.socket))
      mouth.position.set(0.004, -0.05, -r * 0.93)
      mouth.rotation.z = 0.12
      g.add(mouth)
      g.add(only('zombie', decal(0.07, m.rot, new THREE.Vector3(-r * 0.86, 0.03, -0.01), new THREE.Vector3(-1, 0, -0.2).normalize())))
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
      g.add(only('dummy', decal(0.075, m.sticker, new THREE.Vector3(-w * 0.22, 0.04, -d / 2 - 0.001), new THREE.Vector3(0, 0, -1))))
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
        g.add(only('dummy', decal(0.06, m.sticker, new THREE.Vector3(side * (s.radius + 0.001), 0.06, 0), new THREE.Vector3(side, 0, 0))))
      }
    }
  }

  for (const d of zombieDecals(def, m)) g.add(d)

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
