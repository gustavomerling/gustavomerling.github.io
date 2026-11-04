import * as THREE from 'three'
import { Physics, RAPIER } from '../engine/physics'
import { type Materials, worldUvBox } from './materials'
import { decorate, decorMaterials, MIDDLE_TYPES, type DecorMat, type Obstacle, type RoomType } from './roomTypes'

export type { Obstacle, RoomType }

/**
 * Masmorra dos modos zumbi/SWAT: salas quadradas numa grade (estilo
 * "Isaac"), ligadas por portas no meio das paredes. Cada sala tem de 2 a 4
 * portas; o mapa é um labirinto (árvore aleatória + alguns laços).
 *
 * Coordenadas: a sala (i, j) tem centro em (i·ROOM, 0, j·ROOM).
 */
export const DUNGEON = {
  /** Lado interno da sala (m). */
  room: 14,
  wallHeight: 4,
  wallThickness: 0.4,
  doorWidth: 2.4,
  doorHeight: 2.8,
  /** Quantas salas (início + meio + fim; o ajuste de 2 portas pode somar uma ou duas). */
  rooms: 6,
}

/** Direções: 0 = +x (leste), 1 = +z (sul), 2 = -x, 3 = -z. */
const DIRS: [number, number][] = [
  [1, 0],
  [0, 1],
  [-1, 0],
  [0, -1],
]

export interface Room {
  index: number
  i: number
  j: number
  center: THREE.Vector3
  /** Porta aberta em cada direção (DIRS). */
  doors: [boolean, boolean, boolean, boolean]
  /** Distância (em salas, pelas portas) até a sala inicial. */
  depth: number
  type: RoomType
  obstacles: Obstacle[]
}

export interface DungeonLayout {
  rooms: Room[]
  start: Room
  end: Room
  /** Sala na posição de grade (i, j), se existir. */
  at(i: number, j: number): Room | undefined
  /** Sala que contém o ponto (no plano), ou undefined (porta / fora). */
  roomAt(p: THREE.Vector3): Room | undefined
}

/** Gerador pseudoaleatório com semente (mulberry32). */
export function makeRng(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const key = (i: number, j: number) => `${i},${j}`

/**
 * Gera a masmorra. O ajuste "toda sala com 2+ portas" pode inchar o mapa;
 * nesse caso tenta outra semente até ficar com no máximo `count + 1` salas.
 */
export function generateDungeon(seed: number, count = DUNGEON.rooms): DungeonLayout {
  let best: DungeonLayout | null = null
  for (let k = 0; k < 40; k++) {
    const d = generateOnce(seed + k * 7919, count)
    if (!best || d.rooms.length < best.rooms.length) best = d
    if (d.rooms.length <= count + 1) break
  }
  return best!
}

function generateOnce(seed: number, count: number): DungeonLayout {
  const rng = makeRng(seed)
  const pick = <T,>(a: T[]) => a[Math.floor(rng() * a.length)]
  const cells = new Map<string, [number, number]>()
  cells.set(key(0, 0), [0, 0])
  const neighbors = (i: number, j: number) =>
    DIRS.map(([di, dj], d) => ({ d, i: i + di, j: j + dj })).filter((n) => cells.has(key(n.i, n.j)))

  // 1) Cresce um blob: prefere células com poucos vizinhos (corredores, não um quadradão).
  let guard = 0
  // Só as salas do meio; início e saída entram depois, como folhas.
  while (cells.size < count - 2 && guard++ < 5000) {
    const [i, j] = pick([...cells.values()])
    const [di, dj] = pick(DIRS)
    const ni = i + di
    const nj = j + dj
    if (cells.has(key(ni, nj))) continue
    if (neighbors(ni, nj).length > 1 && rng() < 0.7) continue
    cells.set(key(ni, nj), [ni, nj])
  }

  // 2) Toda sala precisa de pelo menos 2 vizinhas possíveis: completa um quadrado 2×2 nas pontas.
  for (let changed = true; changed; ) {
    changed = false
    for (const [i, j] of [...cells.values()]) {
      const ns = neighbors(i, j)
      if (ns.length >= 2) continue
      const n = ns[0]
      const [di, dj] = DIRS[n.d]
      const [pi, pj] = rng() < 0.5 ? [dj, di] : [-dj, -di]
      for (const [ci, cj] of [
        [i + pi, j + pj],
        [n.i + pi, n.j + pj],
      ])
        cells.set(key(ci, cj), [ci, cj])
      changed = true
    }
  }

  // 3) Portas: árvore aleatória (labirinto) + o mínimo de 2 portas por sala + alguns laços.
  const list = [...cells.values()]
  const rooms: Room[] = list.map(([i, j], index) => ({
    index,
    i,
    j,
    center: new THREE.Vector3(i * DUNGEON.room, 0, j * DUNGEON.room),
    doors: [false, false, false, false],
    depth: 0,
    type: 'start' as RoomType,
    obstacles: [] as Obstacle[],
  }))
  const byKey = new Map(rooms.map((r) => [key(r.i, r.j), r]))
  const at = (i: number, j: number) => byKey.get(key(i, j))
  const open = (r: Room, d: number) => {
    const [di, dj] = DIRS[d]
    const o = at(r.i + di, r.j + dj)!
    r.doors[d] = true
    o.doors[(d + 2) % 4] = true
  }
  // Labirinto das salas do meio (a partir de qualquer uma).
  const root = rooms[0]
  const seen = new Set<Room>([root])
  const stack = [root]
  while (stack.length) {
    const r = stack[stack.length - 1]
    const options = DIRS.map((_, d) => d).filter((d) => {
      const o = at(r.i + DIRS[d][0], r.j + DIRS[d][1])
      return o && !seen.has(o)
    })
    if (!options.length) {
      stack.pop()
      continue
    }
    const d = pick(options)
    open(r, d)
    const o = at(r.i + DIRS[d][0], r.j + DIRS[d][1])!
    seen.add(o)
    stack.push(o)
  }
  const doorCount = (r: Room) => r.doors.filter(Boolean).length
  for (const r of rooms) {
    const closed = () => DIRS.map((_, d) => d).filter((d) => !r.doors[d] && at(r.i + DIRS[d][0], r.j + DIRS[d][1]))
    while (doorCount(r) < 2 && closed().length) open(r, pick(closed()))
    for (const d of closed()) if (rng() < 0.12) open(r, d)
  }

  // Início e saída: salas-folha com UMA porta, presas por fora do labirinto.
  const freeSides = (r: Room) => DIRS.map((_, d) => d).filter((d) => !at(r.i + DIRS[d][0], r.j + DIRS[d][1]))
  const addLeaf = (from: Room, d: number): Room => {
    const i = from.i + DIRS[d][0]
    const j = from.j + DIRS[d][1]
    const r: Room = {
      index: rooms.length,
      i,
      j,
      center: new THREE.Vector3(i * DUNGEON.room, 0, j * DUNGEON.room),
      doors: [false, false, false, false],
      depth: 0,
      type: 'start',
      obstacles: [],
    }
    rooms.push(r)
    byKey.set(key(i, j), r)
    open(from, d)
    return r
  }
  const sHost = pick(rooms.filter((r) => freeSides(r).length))
  const start = addLeaf(sHost, pick(freeSides(sHost)))

  // 4) Profundidade (BFS pelas portas): salas mais fundas têm mais inimigos.
  const queue = [start]
  const depthSeen = new Set([start])
  while (queue.length) {
    const r = queue.shift()!
    r.doors.forEach((o, d) => {
      if (!o) return
      const n = at(r.i + DIRS[d][0], r.j + DIRS[d][1])!
      if (depthSeen.has(n)) return
      depthSeen.add(n)
      n.depth = r.depth + 1
      queue.push(n)
    })
  }

  // A saída sai da sala do meio mais funda que tenha um lado livre.
  const hosts = rooms.filter((r) => r !== start && freeSides(r).length)
  const deepest = Math.max(...hosts.map((r) => r.depth))
  const eHost = pick(hosts.filter((r) => r.depth === deepest))
  const end = addLeaf(eHost, pick(freeSides(eHost)))
  end.depth = eHost.depth + 1

  // 5) Tipos: início, saída e os 4 tipos de meio, embaralhados.
  const middles = [...MIDDLE_TYPES].sort(() => rng() - 0.5)
  let m = 0
  for (const r of rooms) {
    r.type = r === start ? 'start' : r === end ? 'end' : middles[m++ % middles.length]
    r.obstacles = decorate(r.type, rng)
  }

  const half = DUNGEON.room / 2
  return {
    rooms,
    start,
    end,
    at,
    roomAt(p) {
      const i = Math.round(p.x / DUNGEON.room)
      const j = Math.round(p.z / DUNGEON.room)
      const r = at(i, j)
      if (!r) return undefined
      if (Math.abs(p.x - r.center.x) > half || Math.abs(p.z - r.center.z) > half) return undefined
      return r
    },
  }
}

interface Box {
  size: [number, number, number]
  pos: [number, number, number]
  material: 'floor' | DecorMat
  solid: boolean
}

function boxes(layout: DungeonLayout): Box[] {
  const { room: S, wallHeight: H, wallThickness: T, doorWidth: DW, doorHeight: DH } = DUNGEON
  const out: Box[] = []
  const len = S + T
  /** Parede no lado `d` da sala `r`, com ou sem porta. */
  const wall = (r: Room, d: number, door: boolean) => {
    const [di, dj] = DIRS[d]
    const cx = r.center.x + (di * S) / 2
    const cz = r.center.z + (dj * S) / 2
    const alongX = di === 0
    const put = (offset: number, length: number, h: number, y: number) =>
      out.push({
        size: alongX ? [length, h, T] : [T, h, length],
        pos: alongX ? [cx + offset, y, cz] : [cx, y, cz + offset],
        material: 'wall',
        solid: true,
      })
    if (!door) {
      put(0, len, H, H / 2)
      return
    }
    const side = (len - DW) / 2
    put(-(DW / 2 + side / 2), side, H, H / 2)
    put(DW / 2 + side / 2, side, H, H / 2)
    put(0, DW, H - DH, DH + (H - DH) / 2)
  }
  for (const r of layout.rooms) {
    out.push({ size: [S + T, 1, S + T], pos: [r.center.x, -0.5, r.center.z], material: 'floor', solid: false })
    for (let d = 0; d < 4; d++) {
      const n = layout.at(r.i + DIRS[d][0], r.j + DIRS[d][1])
      // Parede compartilhada: só a sala do lado +x/+z constrói.
      if (n && d >= 2) continue
      wall(r, d, r.doors[d])
    }
    for (const o of r.obstacles)
      out.push({
        size: [o.w, o.h, o.d],
        pos: [r.center.x + o.x, (o.y ?? 0) + o.h / 2, r.center.z + o.z],
        material: o.mat,
        solid: o.solid !== false,
      })
  }
  return out
}

export function buildDungeon(scene: THREE.Scene, physics: Physics, materials: Materials, layout: DungeonLayout): () => void {
  const group = new THREE.Group()
  group.name = 'dungeon'
  const geometries: THREE.BufferGeometry[] = []
  const colliders: RAPIER.Collider[] = []
  const decor = decorMaterials()
  const mats: Record<string, THREE.Material> = { ...decor, floor: materials.floor, wall: materials.wall, structure: materials.structure }
  for (const b of boxes(layout)) {
    const [w, h, d] = b.size
    const geo = worldUvBox(w, h, d)
    geometries.push(geo)
    const mesh = new THREE.Mesh(geo, mats[b.material])
    mesh.position.set(...b.pos)
    mesh.castShadow = b.solid
    mesh.receiveShadow = true
    group.add(mesh)
    // O chão vira um colisor só (abaixo): o controlador do jogador engasga
    // quando pisa bem no centro da face de uma caixa (centro de cada sala).
    if (!b.solid) continue
    colliders.push(
      physics.world.createCollider(
        RAPIER.ColliderDesc.cuboid(w / 2, h / 2, d / 2)
          .setTranslation(...b.pos)
          .setFriction(0.8),
      ),
    )
  }
  const xs = layout.rooms.map((r) => r.center.x)
  const zs = layout.rooms.map((r) => r.center.z)
  const pad = DUNGEON.room / 2 + DUNGEON.wallThickness + 1
  const minX = Math.min(...xs) - pad
  const maxX = Math.max(...xs) + pad
  const minZ = Math.min(...zs) - pad
  const maxZ = Math.max(...zs) + pad
  // Centro deslocado de propósito (nunca coincide com o centro de uma sala).
  colliders.push(
    physics.world.createCollider(
      RAPIER.ColliderDesc.cuboid((maxX - minX) / 2 + 0.37, 0.5, (maxZ - minZ) / 2 + 0.53)
        .setTranslation((minX + maxX) / 2 + 0.31, -0.5, (minZ + maxZ) / 2 + 0.47)
        .setFriction(0.8),
    ),
  )
  scene.add(group)
  return () => {
    scene.remove(group)
    for (const g of geometries) g.dispose()
    for (const m of Object.values(decor)) m.dispose()
    for (const c of colliders) physics.world.removeCollider(c, false)
  }
}

/**
 * Luz da masmorra: céu + sol cuja sombra acompanha o jogador (a masmorra
 * inteira é grande demais para um mapa de sombra só).
 */
export function buildDungeonLights(scene: THREE.Scene) {
  const hemi = new THREE.HemisphereLight('#f4f1ea', '#5d5850', 1.15)
  const sun = new THREE.DirectionalLight('#fff1dc', 2.0)
  const offset = new THREE.Vector3(10, 25, 6)
  sun.castShadow = true
  sun.shadow.mapSize.set(2048, 2048)
  const cam = sun.shadow.camera
  cam.left = cam.bottom = -22
  cam.right = cam.top = 22
  cam.near = 1
  cam.far = 60
  cam.updateProjectionMatrix()
  sun.shadow.bias = -0.0003
  sun.shadow.normalBias = 0.02
  scene.add(hemi, sun, sun.target)
  const snapped = new THREE.Vector3()
  return {
    /** Recentra a sombra perto do jogador (em passos, para não tremer). */
    follow(p: THREE.Vector3) {
      snapped.set(Math.round(p.x / 4) * 4, 0, Math.round(p.z / 4) * 4)
      sun.target.position.copy(snapped)
      sun.position.copy(snapped).add(offset)
    },
    dispose() {
      sun.shadow.map?.dispose()
      scene.remove(hemi, sun, sun.target)
    },
  }
}

/**
 * Sandbox: uma fileira com um exemplar de cada tipo de sala, ao sul do
 * laboratório (a partir de `origin`, o centro da primeira sala, seguindo +z).
 */
export function showcaseLayout(origin: THREE.Vector3): DungeonLayout {
  const types: RoomType[] = ['start', ...MIDDLE_TYPES, 'end']
  const rng = makeRng(7)
  const rooms: Room[] = types.map((type, j) => ({
    index: j,
    i: 0,
    j,
    center: origin.clone().add(new THREE.Vector3(0, 0, j * DUNGEON.room)),
    // Portas norte/sul em todas (a primeira abre para o laboratório).
    doors: [false, j < types.length - 1, false, true],
    depth: j,
    type,
    obstacles: decorate(type, rng),
  }))
  const at = (i: number, j: number) => (i === 0 ? rooms[j] : undefined)
  return {
    rooms,
    start: rooms[0],
    end: rooms[rooms.length - 1],
    at,
    roomAt: () => undefined,
  }
}
