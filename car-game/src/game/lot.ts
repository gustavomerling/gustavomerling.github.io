import RAPIER from '@dimforge/rapier3d-compat'
import * as THREE from 'three'
import { buildCarBody, createCarKit } from './car-model'

/**
 * Estacionamento: asfalto murado com quatro fileiras de vagas perpendiculares (12 colunas)
 * e, ao sul, uma "rua" com vagas de baliza (paralelas) dos dois lados. Carros parados,
 * cones (nível 4 em diante) e postes. A vaga-alvo é sorteada conforme o tipo do nível.
 *
 *   z = +24  ───────── muro norte ─────────
 *            fileira A (perpendicular)
 *            corredor
 *            fileira B
 *            fileira C   (costas com costas)
 *            corredor
 *            fileira D
 *            ═══════ mureta ═══════
 *            baliza (norte da rua)
 *            rua  ← largada numa das pontas
 *            baliza (sul da rua)
 *   z = -24  ───────── muro sul ───────────
 */

export const LOT = { halfX: 26, halfZ: 24 }

/** Vaga perpendicular: comprida em z. */
export const PERP_W = 2.9
export const PERP_L = 5.2
/** Vaga de baliza: comprida em x. */
export const PAR_W = 2.7
export const PAR_L = 6.4

const COLS = 12
const PERP_ROWS = [21.4, 9.2, 4.0, -8.2]
const MURETA_Z = -10.95
const PAR_COUNT = 5
const PAR_ROWS = [MURETA_Z - 0.15 - PAR_W / 2, -LOT.halfZ + PAR_W / 2]
/** Centro (z) da rua entre as duas fileiras de baliza. */
const STREET_Z = (PAR_ROWS[0] - PAR_W / 2 + PAR_ROWS[1] + PAR_W / 2) / 2

export type SlotAxis = 'z' | 'x'
/** Vaga: centro, eixo comprido, largura (através) e comprimento (ao longo do eixo). */
export type Slot = { cx: number; cz: number; axis: SlotAxis; w: number; l: number; row: number; index: number }
export type Parked = { x: number; z: number; yaw: number; hx: number; hz: number }
export type LevelKind = 'perpendicular' | 'baliza'
export type Lot = {
  kind: LevelKind
  slots: Slot[]
  target: Slot
  parked: Parked[]
  cones: Array<{ x: number; z: number }>
  spawn: { x: number; z: number; yaw: number }
  /** Handles dos colisores que contam como batida. */
  obstacles: Set<number>
  update: (time: number) => void
  dispose: () => void
}

const COLORS = [0xb33a3a, 0x2f5d9e, 0xd9d9d4, 0x1c1c1f, 0x7a7d83, 0x2e7d4f, 0xd1a431, 0x6b3fa0, 0x8c5a35, 0x9fb7c9]

/** Tipo do nível: a cada três, o terceiro é baliza. */
export function levelKind(level: number): LevelKind {
  return level % 3 === 0 ? 'baliza' : 'perpendicular'
}

export function buildLot(scene: THREE.Scene, world: RAPIER.World, level: number): Lot {
  const kind = levelKind(level)
  const objects: THREE.Object3D[] = []
  const geos: THREE.BufferGeometry[] = []
  const mats: THREE.Material[] = []
  const colliders: RAPIER.Collider[] = []
  const obstacles = new Set<number>()
  const rand = (a: number, b: number) => a + Math.random() * (b - a)

  const add = <T extends THREE.Object3D>(o: T) => {
    scene.add(o)
    objects.push(o)
    return o
  }
  const geo = <T extends THREE.BufferGeometry>(g: T) => (geos.push(g), g)
  const mat = <T extends THREE.Material>(m: T) => (mats.push(m), m)
  const solid = (desc: RAPIER.ColliderDesc) => {
    const c = world.createCollider(desc)
    colliders.push(c)
    obstacles.add(c.handle)
    return c
  }
  const flat = (w: number, l: number, m: THREE.Material, x: number, z: number, y = 0.012) => {
    const p = add(new THREE.Mesh(geo(new THREE.PlaneGeometry(w, l)), m))
    p.rotation.x = -Math.PI / 2
    p.position.set(x, y, z)
    p.receiveShadow = true
    return p
  }

  // Terreno: gramado fora, asfalto dentro
  flat(400, 400, mat(new THREE.MeshStandardMaterial({ color: 0x2a3a2a, roughness: 1 })), 0, 0, -0.01)
  flat(LOT.halfX * 2, LOT.halfZ * 2, mat(new THREE.MeshStandardMaterial({ color: 0x34373c, roughness: 0.92 })), 0, 0, 0.002)

  // Muros externos e mureta entre as fileiras e a rua
  const wallMat = mat(new THREE.MeshStandardMaterial({ color: 0x8a8d92, roughness: 0.8 }))
  const curbMat = mat(new THREE.MeshStandardMaterial({ color: 0xb9b4a6, roughness: 0.85 }))
  const wall = (cx: number, cz: number, hx: number, hz: number, h = 0.9, m: THREE.Material = wallMat) => {
    const w = add(new THREE.Mesh(geo(new THREE.BoxGeometry(hx * 2, h, hz * 2)), m))
    w.position.set(cx, h / 2, cz)
    w.castShadow = w.receiveShadow = true
    solid(RAPIER.ColliderDesc.cuboid(hx, h / 2, hz).setTranslation(cx, h / 2, cz))
  }
  const T = 0.4
  wall(0, LOT.halfZ + T, LOT.halfX + T * 2, T)
  wall(0, -LOT.halfZ - T, LOT.halfX + T * 2, T)
  wall(LOT.halfX + T, 0, T, LOT.halfZ)
  wall(-LOT.halfX - T, 0, T, LOT.halfZ)
  wall(0, MURETA_Z, (COLS * PERP_W) / 2, 0.15, 0.6, curbMat)

  // Vagas e faixas
  const slots: Slot[] = []
  const lineMat = mat(new THREE.MeshBasicMaterial({ color: 0xe6e6e0 }))
  const yellowMat = mat(new THREE.MeshBasicMaterial({ color: 0xe0b23a }))
  PERP_ROWS.forEach((rz, row) => {
    for (let i = 0; i < COLS; i++)
      slots.push({ cx: (i - (COLS - 1) / 2) * PERP_W, cz: rz, axis: 'z', w: PERP_W, l: PERP_L, row, index: i })
    for (let i = 0; i <= COLS; i++) flat(0.12, PERP_L, lineMat, (i - COLS / 2) * PERP_W, rz)
  })
  PAR_ROWS.forEach((rz, k) => {
    const row = PERP_ROWS.length + k
    for (let i = 0; i < PAR_COUNT; i++)
      slots.push({ cx: (i - (PAR_COUNT - 1) / 2) * PAR_L, cz: rz, axis: 'x', w: PAR_W, l: PAR_L, row, index: i })
    for (let i = 0; i <= PAR_COUNT; i++) flat(0.12, PAR_W, lineMat, (i - PAR_COUNT / 2) * PAR_L, rz)
    // Linha contínua do lado da rua
    const edge = rz + (k === 0 ? -1 : 1) * (PAR_W / 2)
    flat(PAR_COUNT * PAR_L, 0.12, lineMat, 0, edge)
  })
  // Faixa central amarela tracejada na rua
  for (let x = -LOT.halfX + 2; x < LOT.halfX - 2; x += 3) flat(1.4, 0.12, yellowMat, x + 0.7, STREET_Z)

  // Largada: numa das pontas da rua, virado para dentro dela
  const side = Math.random() < 0.5 ? -1 : 1
  const spawn = { x: side * 22, z: STREET_Z, yaw: side > 0 ? -Math.PI / 2 : Math.PI / 2 }

  // Vaga-alvo conforme o tipo do nível. Perpendicular: longe da largada. Baliza: no meio da fileira.
  const candidates = slots.filter((s) =>
    kind === 'baliza'
      ? s.axis === 'x' && s.index > 0 && s.index < PAR_COUNT - 1
      : s.axis === 'z' && Math.hypot(s.cx - spawn.x, s.cz - spawn.z) > 16,
  )
  const target = candidates[Math.floor(Math.random() * candidates.length)]

  // Ocupação: vizinhos da vaga-alvo ocupados (baliza sempre; perpendicular a partir do nível 2),
  // o resto sorteado. Algumas vagas sempre livres para o estacionamento não parecer cheio demais.
  const occupancy = Math.min(0.5 + 0.06 * level, 0.9)
  const occ = new Set<Slot>()
  const neighbors = slots.filter((s) => s.row === target.row && Math.abs(s.index - target.index) === 1)
  if (kind === 'baliza' || level >= 2) neighbors.forEach((s) => occ.add(s))
  for (const s of slots) if (s !== target && !occ.has(s) && Math.random() < occupancy) occ.add(s)

  // Carros parados
  const parked: Parked[] = []
  const kit = createCarKit()
  const wheelGeo = geo(new THREE.CylinderGeometry(0.34, 0.34, 0.24, 16))
  wheelGeo.rotateZ(Math.PI / 2)
  const tyre = mat(new THREE.MeshStandardMaterial({ color: 0x151515, roughness: 0.8 }))
  const paints = COLORS.map((c) =>
    mat(new THREE.MeshPhysicalMaterial({ color: c, roughness: 0.4, clearcoat: 1, clearcoatRoughness: 0.12 })),
  )
  for (const s of occ) {
    const hx = rand(0.86, 0.98)
    const hz = rand(1.95, 2.2)
    const hy = 0.33
    // Folga: na baliza o carro fica rente ao meio-fio, com variação ao longo da vaga
    const along = s.axis === 'z' ? rand(-0.25, 0.25) : rand(-0.5, 0.5)
    const across = rand(-0.1, 0.1)
    const x = s.cx + (s.axis === 'z' ? across : along)
    const z = s.cz + (s.axis === 'z' ? along : across)
    const base = s.axis === 'z' ? (Math.random() < 0.5 ? 0 : Math.PI) : s.row === PERP_ROWS.length ? -Math.PI / 2 : Math.PI / 2
    const yaw = base + rand(-0.04, 0.04)
    const g = new THREE.Group()
    const body = buildCarBody(kit, paints[Math.floor(Math.random() * paints.length)], hx, hy, hz)
    body.position.y = 0.36 + hy
    g.add(body)
    for (const sx of [-1, 1])
      for (const sz of [-1, 1]) {
        const w = new THREE.Mesh(wheelGeo, tyre)
        w.position.set(sx * (hx - 0.06), 0.34, sz * (hz - 0.65))
        w.castShadow = true
        g.add(w)
      }
    g.position.set(x, 0, z)
    g.rotation.y = yaw
    add(g)
    solid(
      RAPIER.ColliderDesc.cuboid(hx, 0.65, hz)
        .setTranslation(x, 0.7, z)
        .setRotation({ x: 0, y: Math.sin(yaw / 2), z: 0, w: Math.cos(yaw / 2) }),
    )
    parked.push({ x, z, yaw, hx, hz })
  }

  // Cones nos corredores e na rua (nível 4 em diante), longe da vaga e da largada
  const cones: Array<{ x: number; z: number }> = []
  const nCones = Math.min(Math.max(level - 3, 0) * 2, 8)
  const coneGeo = geo(new THREE.ConeGeometry(0.22, 0.7, 14))
  const coneMat = mat(new THREE.MeshStandardMaterial({ color: 0xff6a1a, roughness: 0.5 }))
  const lanes: Array<[number, number]> = [
    [PERP_ROWS[1] + PERP_L / 2 + 1, PERP_ROWS[0] - PERP_L / 2 - 1],
    [PERP_ROWS[3] + PERP_L / 2 + 1, PERP_ROWS[2] - PERP_L / 2 - 1],
    [STREET_Z - 1.5, STREET_Z + 1.5],
  ]
  for (let tries = 0; cones.length < nCones && tries < 200; tries++) {
    const [z0, z1] = lanes[Math.floor(Math.random() * lanes.length)]
    const x = rand(-15, 15)
    const z = rand(z0, z1)
    if (Math.hypot(x - target.cx, z - target.cz) < 5 || Math.hypot(x - spawn.x, z - spawn.z) < 8) continue
    if (cones.some((c) => Math.hypot(c.x - x, c.z - z) < 3)) continue
    const c = add(new THREE.Mesh(coneGeo, coneMat))
    c.position.set(x, 0.35, z)
    c.castShadow = true
    solid(RAPIER.ColliderDesc.cylinder(0.35, 0.22).setTranslation(x, 0.35, z))
    cones.push({ x, z })
  }

  // Postes de luz nas pontas das fileiras (fora da boca dos corredores)
  const poleGeo = geo(new THREE.CylinderGeometry(0.1, 0.12, 6, 10))
  const poleMat = mat(new THREE.MeshStandardMaterial({ color: 0x555a60, metalness: 0.6, roughness: 0.5 }))
  const lampGeo = geo(new THREE.SphereGeometry(0.28, 12, 8))
  const lampMat = mat(new THREE.MeshStandardMaterial({ color: 0xfff2c0, emissive: 0xffe9a0, emissiveIntensity: 2 }))
  const poleX = (COLS * PERP_W) / 2 + 0.6
  for (const px of [-poleX, poleX])
    for (const pz of [PERP_ROWS[0], (PERP_ROWS[1] + PERP_ROWS[2]) / 2, PERP_ROWS[3]]) {
      const p = add(new THREE.Mesh(poleGeo, poleMat))
      p.position.set(px, 3, pz)
      p.castShadow = true
      const l = add(new THREE.Mesh(lampGeo, lampMat))
      l.position.set(px, 6.1, pz)
      solid(RAPIER.ColliderDesc.cylinder(3, 0.12).setTranslation(px, 3, pz))
    }

  // Marcação da vaga-alvo: placa verde, contorno e feixe de luz
  const tgtMat = mat(new THREE.MeshBasicMaterial({ color: 0x3dff7a, transparent: true, opacity: 0.3, depthWrite: false }))
  const tw = target.axis === 'z' ? target.w : target.l
  const tl = target.axis === 'z' ? target.l : target.w
  flat(tw - 0.14, tl - 0.08, tgtMat, target.cx, target.cz, 0.02)
  const edgeMat = mat(new THREE.MeshBasicMaterial({ color: 0x7dffa6 }))
  flat(tw, 0.1, edgeMat, target.cx, target.cz + tl / 2, 0.022)
  flat(tw, 0.1, edgeMat, target.cx, target.cz - tl / 2, 0.022)
  flat(0.1, tl, edgeMat, target.cx + tw / 2, target.cz, 0.022)
  flat(0.1, tl, edgeMat, target.cx - tw / 2, target.cz, 0.022)
  const beamMat = mat(
    new THREE.MeshBasicMaterial({
      color: 0x3dff7a,
      transparent: true,
      opacity: 0.35,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    }),
  )
  const beam = add(new THREE.Mesh(geo(new THREE.CylinderGeometry(0.5, 0.5, 14, 16, 1, true)), beamMat))
  beam.position.set(target.cx, 7, target.cz)

  return {
    kind,
    slots,
    target,
    parked,
    cones,
    spawn,
    obstacles,
    update: (t) => {
      tgtMat.opacity = 0.2 + 0.12 * Math.sin(t * 4)
      beamMat.opacity = 0.24 + 0.1 * Math.sin(t * 4)
    },
    dispose: () => {
      for (const o of objects) scene.remove(o)
      for (const c of colliders) world.removeCollider(c, false)
      for (const g of geos) g.dispose()
      for (const m of mats) m.dispose()
      kit.dispose()
    },
  }
}

/**
 * Estado do carro (na pose dada) em relação à vaga-alvo: se os quatro cantos estão dentro
 * das linhas, o desvio do centro (através e ao longo da vaga) e o ângulo com o eixo da vaga.
 */
export function checkSlot(
  target: Slot,
  pos: { x: number; z: number },
  fwd: { x: number; z: number },
  halfX: number,
  halfZ: number,
) {
  const fl = Math.hypot(fwd.x, fwd.z) || 1
  const fx = fwd.x / fl
  const fz = fwd.z / fl
  const sx = fz
  const sz = -fx
  // Coordenadas na vaga: "along" no eixo comprido, "across" no outro
  const local = (x: number, z: number) =>
    target.axis === 'z'
      ? { along: z - target.cz, across: x - target.cx }
      : { along: x - target.cx, across: z - target.cz }
  let inside = true
  for (const a of [-1, 1])
    for (const b of [-1, 1]) {
      const c = local(pos.x + sx * a * halfX + fx * b * halfZ, pos.z + sz * a * halfX + fz * b * halfZ)
      if (Math.abs(c.across) > target.w / 2 + 0.02 || Math.abs(c.along) > target.l / 2) inside = false
    }
  const axisDot = target.axis === 'z' ? fz : fx
  const angleDeg = (Math.acos(Math.min(1, Math.abs(axisDot))) * 180) / Math.PI
  const c = local(pos.x, pos.z)
  return { inside, lateral: Math.abs(c.across), longitudinal: Math.abs(c.along), angleDeg }
}
