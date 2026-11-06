import * as THREE from 'three'
import type { Vec3 } from './vehicle'

/**
 * Efeitos ligados à física: marcas de pneu (quando a roda escorrega) e poeira (em terra e areia).
 * Ambos usam pools de tamanho fixo: quando enchem, reaproveitam as posições mais antigas.
 */

export type WheelFx = {
  inContact: boolean
  point: Vec3 | null
  /** Aderência da superfície (1 = asfalto). Poeira só fora do asfalto. */
  mu: number
  slipRatio: number
  slipAngle: number
}

export type Effects = {
  /** Avança os efeitos um passo de física (dt em segundos). */
  update: (dt: number, wheels: WheelFx[], speed: number) => void
  dispose: () => void
}

const MARK_CAPACITY = 1500 // segmentos de marca de pneu
const DUST_CAPACITY = 320 // partículas de poeira
const MARK_WIDTH = 0.22
const MARK_MIN_STEP = 0.08 // distância mínima entre dois segmentos (m)
const SLIP_RATIO_MARK = 0.25
const SLIP_ANGLE_MARK = 0.1 // rad (~6°)
const DUST_RATE = 70 // partículas por segundo, por roda em movimento na terra
const DUST_LIFE = 1.4
const BG = new THREE.Color(0x1b1d22)

export function createEffects(scene: THREE.Scene): Effects {
  // Marcas: cada segmento é um quad com 4 vértices (6 índices)
  const markPos = new Float32Array(MARK_CAPACITY * 4 * 3)
  const markIdx = new Uint32Array(MARK_CAPACITY * 6)
  for (let s = 0; s < MARK_CAPACITY; s++) {
    const b = s * 4
    markIdx.set([b, b + 1, b + 2, b, b + 2, b + 3], s * 6)
  }
  const markGeo = new THREE.BufferGeometry()
  const markAttr = new THREE.BufferAttribute(markPos, 3)
  markAttr.setUsage(THREE.DynamicDrawUsage)
  markGeo.setAttribute('position', markAttr)
  markGeo.setIndex(new THREE.BufferAttribute(markIdx, 1))
  markGeo.setDrawRange(0, 0)
  const markMat = new THREE.MeshBasicMaterial({
    color: 0x0c0c0e,
    transparent: true,
    opacity: 0.55,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -2,
  })
  const marks = new THREE.Mesh(markGeo, markMat)
  marks.frustumCulled = false
  scene.add(marks)

  let markCount = 0
  const lastPoint: Array<THREE.Vector3 | null> = [null, null, null, null]

  const addMark = (a: THREE.Vector3, b: THREE.Vector3) => {
    const dir = b.clone().sub(a)
    dir.y = 0
    if (dir.lengthSq() < 1e-6) return
    dir.normalize()
    // Largura perpendicular ao trecho, no plano do chão
    const side = new THREE.Vector3(-dir.z, 0, dir.x).multiplyScalar(MARK_WIDTH / 2)
    const y = 0.015
    const verts = [
      [a.x - side.x, y, a.z - side.z],
      [a.x + side.x, y, a.z + side.z],
      [b.x + side.x, y, b.z + side.z],
      [b.x - side.x, y, b.z - side.z],
    ]
    const slot = markCount % MARK_CAPACITY // reaproveita o mais antigo quando o pool enche
    for (let v = 0; v < 4; v++) {
      markPos.set(verts[v], (slot * 4 + v) * 3)
    }
    markCount++
    markAttr.needsUpdate = true
    markGeo.setDrawRange(0, Math.min(markCount, MARK_CAPACITY) * 6)
  }

  // Poeira: pontos que sobem, se espalham e desvanecem (escurecem até o fundo)
  const dustPos = new Float32Array(DUST_CAPACITY * 3)
  const dustCol = new Float32Array(DUST_CAPACITY * 3)
  const dustVel = new Float32Array(DUST_CAPACITY * 3)
  const dustAge = new Float32Array(DUST_CAPACITY).fill(DUST_LIFE) // começa "morta"
  const dustBase = new THREE.Color(0xb09a72)
  const dustGeo = new THREE.BufferGeometry()
  const dustPosAttr = new THREE.BufferAttribute(dustPos, 3)
  const dustColAttr = new THREE.BufferAttribute(dustCol, 3)
  dustPosAttr.setUsage(THREE.DynamicDrawUsage)
  dustColAttr.setUsage(THREE.DynamicDrawUsage)
  dustGeo.setAttribute('position', dustPosAttr)
  dustGeo.setAttribute('color', dustColAttr)
  const dustMat = new THREE.PointsMaterial({ size: 0.7, sizeAttenuation: true, vertexColors: true, depthWrite: false })
  const dust = new THREE.Points(dustGeo, dustMat)
  dust.frustumCulled = false
  scene.add(dust)

  let dustNext = 0
  let dustSpawnAcc = 0

  const spawnDust = (p: Vec3, speed: number) => {
    const i = dustNext
    dustNext = (dustNext + 1) % DUST_CAPACITY
    dustPos.set([p.x, p.y + 0.05, p.z], i * 3)
    const rnd = () => (Math.random() - 0.5)
    dustVel.set([rnd() * 1.2, 1.2 + Math.random() * 1.6, rnd() * 1.2 - speed * 0.05], i * 3)
    dustAge[i] = 0
  }

  const update = (dt: number, wheels: WheelFx[], speed: number) => {
    // Marcas: segmento entre o último ponto e o atual, enquanto a roda escorrega
    wheels.forEach((w, i) => {
      const sliding = w.inContact && (Math.abs(w.slipRatio) > SLIP_RATIO_MARK || Math.abs(w.slipAngle) > SLIP_ANGLE_MARK)
      if (!sliding || !w.point) {
        lastPoint[i] = null
        return
      }
      const cur = new THREE.Vector3(w.point.x, w.point.y, w.point.z)
      const prev = lastPoint[i]
      if (prev && prev.distanceTo(cur) >= MARK_MIN_STEP) {
        addMark(prev, cur)
        lastPoint[i] = cur
      } else if (!prev) {
        lastPoint[i] = cur
      }
    })

    // Poeira: rodas em movimento sobre terra ou areia
    wheels.forEach((w) => {
      const offRoad = w.mu < 1
      if (!w.inContact || !w.point || !offRoad || speed < 2) return
      const wheelSlip = Math.abs(w.slipRatio) > 0.1 || Math.abs(w.slipAngle) > 0.05 || speed > 6
      if (!wheelSlip) return
      dustSpawnAcc += DUST_RATE * dt * Math.min(1, speed / 10)
    })
    while (dustSpawnAcc >= 1) {
      dustSpawnAcc -= 1
      const w = wheels.find((x) => x.inContact && x.point && x.mu < 1)
      if (w?.point) spawnDust(w.point, speed)
    }

    // Avança as partículas e atualiza as cores (escurecem até o fundo com a idade)
    for (let i = 0; i < DUST_CAPACITY; i++) {
      if (dustAge[i] >= DUST_LIFE) {
        dustPos[i * 3 + 1] = -100 // escondida fora da cena
        continue
      }
      dustAge[i] += dt
      const f = dustAge[i] / DUST_LIFE
      dustVel[i * 3 + 1] -= 0.6 * dt
      for (let k = 0; k < 3; k++) dustPos[i * 3 + k] += dustVel[i * 3 + k] * dt
      // Interpolação manual (sem alocar): da cor da poeira até o fundo
      dustCol.set(
        [
          dustBase.r + (BG.r - dustBase.r) * f,
          dustBase.g + (BG.g - dustBase.g) * f,
          dustBase.b + (BG.b - dustBase.b) * f,
        ],
        i * 3,
      )
    }
    dustPosAttr.needsUpdate = true
    dustColAttr.needsUpdate = true
  }

  return {
    update,
    dispose: () => {
      scene.remove(marks)
      scene.remove(dust)
      markGeo.dispose()
      markMat.dispose()
      dustGeo.dispose()
      dustMat.dispose()
    },
  }
}
